#!/usr/bin/env python3
import argparse
import json
from pathlib import Path

from faster_whisper import WhisperModel


def main() -> None:
    parser = argparse.ArgumentParser(description="Transcribe audio with faster-whisper word timestamps.")
    parser.add_argument("--audio", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--language", default=None)
    parser.add_argument("--model", default="mobiuslabsgmbh/faster-whisper-large-v3-turbo")
    parser.add_argument("--device", default="cpu")
    parser.add_argument("--compute-type", default="int8")
    args = parser.parse_args()

    model = WhisperModel(args.model, device=args.device, compute_type=args.compute_type)
    segments_iter, info = model.transcribe(
        args.audio,
        language=args.language or None,
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
        "language": getattr(info, "language", args.language),
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
