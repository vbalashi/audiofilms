#!/usr/bin/env python3
import argparse
import json
from pathlib import Path

import stable_whisper


def word_value(word, *names, default=None):
    for name in names:
        if hasattr(word, name):
            return getattr(word, name)
        if isinstance(word, dict) and name in word:
            return word[name]
    return default


def main() -> None:
    parser = argparse.ArgumentParser(description="Transcribe audio with stable-ts word timestamps.")
    parser.add_argument("--audio", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--language", default=None)
    parser.add_argument("--model", default="base")
    parser.add_argument("--device", default="cpu")
    parser.add_argument("--compute-type", default="dq")
    args = parser.parse_args()

    use_dynamic_quantization = args.compute_type == "dq" and args.device == "cpu"
    model = stable_whisper.load_model(
        args.model,
        device=args.device,
        dq=use_dynamic_quantization,
    )
    result = model.transcribe(
        args.audio,
        language=args.language or None,
        word_timestamps=True,
        verbose=False,
    )

    segments = []
    words = []
    for segment_index, segment in enumerate(result.segments):
        segment_words = []
        for word in segment.words or []:
            item = {
                "word": str(word_value(word, "word", "text", default="")).strip(),
                "start": word_value(word, "start"),
                "end": word_value(word, "end"),
                "probability": word_value(word, "probability", "prob", default=None),
            }
            if not item["word"]:
                continue
            segment_words.append(item)
            words.append({**item, "segmentIndex": segment_index})

        segments.append(
            {
                "id": getattr(segment, "id", segment_index),
                "start": getattr(segment, "start", None),
                "end": getattr(segment, "end", None),
                "text": str(getattr(segment, "text", "")).strip(),
                "words": segment_words,
            }
        )

    payload = {
        "audio": str(Path(args.audio).resolve()),
        "engine": "stable-ts",
        "model": args.model,
        "device": args.device,
        "computeType": args.compute_type,
        "language": args.language,
        "segments": segments,
        "words": words,
    }

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
