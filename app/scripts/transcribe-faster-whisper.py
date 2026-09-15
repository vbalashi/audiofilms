#!/usr/bin/env python3
import argparse
import json
from pathlib import Path

from faster_whisper import WhisperModel

WHISPER_LANGUAGE_ALIASES = {"iw": "he", "in": "id", "ji": "yi", "jv": "jw"}
WHISPER_LANGUAGE_CODES = {
    "af", "am", "ar", "as", "az", "ba", "be", "bg", "bn", "bo", "br", "bs", "ca", "cs", "cy",
    "da", "de", "el", "en", "es", "et", "eu", "fa", "fi", "fo", "fr", "gl", "gu", "ha", "haw",
    "he", "hi", "hr", "ht", "hu", "hy", "id", "is", "it", "ja", "jw", "ka", "kk", "km", "kn",
    "ko", "la", "lb", "ln", "lo", "lt", "lv", "mg", "mi", "mk", "ml", "mn", "mr", "ms", "mt",
    "my", "ne", "nl", "nn", "no", "oc", "pa", "pl", "ps", "pt", "ro", "ru", "sa", "sd", "si",
    "sk", "sl", "sn", "so", "sq", "sr", "su", "sv", "sw", "ta", "te", "tg", "th", "tk", "tl",
    "tr", "tt", "uk", "ur", "uz", "vi", "yi", "yo", "yue", "zh",
}


def whisper_language(value: str | None) -> str | None:
    if not value:
        return None
    base = value.replace("_", "-").split("-", 1)[0].lower()
    normalized = WHISPER_LANGUAGE_ALIASES.get(base, base)
    if normalized not in WHISPER_LANGUAGE_CODES:
        raise ValueError(f"unsupported_language:{normalized}")
    return normalized


def main() -> None:
    parser = argparse.ArgumentParser(description="Transcribe audio with faster-whisper word timestamps.")
    parser.add_argument("--audio", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--language", default=None)
    parser.add_argument("--model", default="mobiuslabsgmbh/faster-whisper-large-v3-turbo")
    parser.add_argument("--device", default="cpu")
    parser.add_argument("--compute-type", default="int8")
    args = parser.parse_args()

    language = whisper_language(args.language)
    model = WhisperModel(args.model, device=args.device, compute_type=args.compute_type)
    segments_iter, info = model.transcribe(
        args.audio,
        language=language,
        word_timestamps=True,
        vad_filter=True,
    )

    segments = []
    words = []
    for index, segment in enumerate(segments_iter):
        segment_words = []
        for word in segment.words or []:
            item = {
                "word": word.word.strip(),
                "start": word.start,
                "end": word.end,
                "probability": word.probability,
            }
            segment_words.append(item)
            words.append({**item, "segmentIndex": index})

        segments.append(
            {
                "id": segment.id,
                "seek": segment.seek,
                "start": segment.start,
                "end": segment.end,
                "text": segment.text.strip(),
                "avgLogprob": segment.avg_logprob,
                "noSpeechProb": segment.no_speech_prob,
                "words": segment_words,
            }
        )

    payload = {
        "audio": str(Path(args.audio).resolve()),
        "engine": "faster-whisper",
        "model": args.model,
        "device": args.device,
        "computeType": args.compute_type,
        "language": getattr(info, "language", language),
        "languageProbability": getattr(info, "language_probability", None),
        "duration": getattr(info, "duration", None),
        "segments": segments,
        "words": words,
    }

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
