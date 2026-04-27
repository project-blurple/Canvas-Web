#!/usr/bin/env python3
"""One-time utility for anonymizing user IDs in raw seed data.

Usage:
  python scripts/anonymize_user_ids.py --input raw.txt --output anonymized.txt
  cat raw.txt | python scripts/anonymize_user_ids.py > anonymized.txt

Behavior:
  - Extracts all user IDs that look like long decimal identifiers.
  - Sorts the unique IDs ascending.
  - Leaves 204778476102877187 and 546792825023365121 unchanged.
  - Maps all other IDs onto the 20 generated IDs from packages/backend/prisma/seedData/users.ts.
  - Cycles back to the first generated ID after the 20th mapping.
"""

from __future__ import annotations

import argparse
import csv
import io
import re
import sys
from pathlib import Path


PRESERVED_USER_IDS = {
    204778476102877187,
    546792825023365121,
}

GENERATED_USER_IDS = [100_000 + offset for offset in range(20)]

# Long decimal identifiers are treated as user IDs.
USER_ID_PATTERN = re.compile(r"\b\d{15,}\b")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, help="Path to the raw data file.")
    parser.add_argument("--output", type=Path, help="Path to write the anonymized result.")
    return parser.parse_args()


def read_input(path: Path | None) -> str:
    if path is None:
        return sys.stdin.read()
    return path.read_text(encoding="utf-8")


def extract_unique_ids(text: str) -> list[int]:
    return sorted({int(match) for match in USER_ID_PATTERN.findall(text)})


def build_mapping(unique_ids: list[int]) -> dict[int, int]:
    mapping: dict[int, int] = {}
    generated_index = 0

    for user_id in unique_ids:
        if user_id in PRESERVED_USER_IDS:
            mapping[user_id] = user_id
            continue

        mapping[user_id] = GENERATED_USER_IDS[generated_index % len(GENERATED_USER_IDS)]
        generated_index += 1

    return mapping


def anonymize_csv(text: str, mapping: dict[int, int]) -> str:
    input_buffer = io.StringIO(text)
    output_buffer = io.StringIO(newline="")

    reader = csv.reader(input_buffer)
    writer = csv.writer(output_buffer, lineterminator="\n")

    for row in reader:
        anonymized_row: list[str] = []
        for cell in row:
            def replace(match: re.Match[str]) -> str:
                original_id = int(match.group(0))
                return str(mapping.get(original_id, original_id))

            anonymized_row.append(USER_ID_PATTERN.sub(replace, cell))
        writer.writerow(anonymized_row)

    return output_buffer.getvalue()


def main() -> int:
    args = parse_args()
    text = read_input(args.input)
    unique_ids = extract_unique_ids(text)
    mapping = build_mapping(unique_ids)
    anonymized_text = anonymize_csv(text, mapping)

    if args.output is None:
        sys.stdout.write(anonymized_text)
    else:
        args.output.write_text(anonymized_text, encoding="utf-8")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
