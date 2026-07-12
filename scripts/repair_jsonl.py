"""
Validates and repairs fine_tuning_dataset.jsonl.
- Reads every line, tries to parse it as JSON
- Sanitizes string fields to remove control characters that break JSON parsers
- Writes only valid, clean records to fine_tuning_dataset_clean.jsonl
"""
import json
import re
import unicodedata

INPUT_FILE  = "fine_tuning_dataset.jsonl"
OUTPUT_FILE = "fine_tuning_dataset_clean.jsonl"


def sanitize_string(s: str) -> str:
    """
    Remove or replace characters that break JSON parsers in PyArrow/HuggingFace datasets.
    - Strips C0 and C1 control characters (except tab, newline, carriage return)
    - Normalizes excessive whitespace
    """
    if not isinstance(s, str):
        return str(s)

    # Remove null bytes and other problematic control characters
    s = s.replace('\x00', '')

    # Remove C0 control chars except \t (9), \n (10), \r (13)
    s = re.sub(r'[\x01-\x08\x0b\x0c\x0e-\x1f\x7f]', '', s)

    # Remove C1 control chars (U+0080 to U+009F)
    s = re.sub(r'[\x80-\x9f]', '', s)

    # Normalize unicode to NFC form (most compatible)
    s = unicodedata.normalize('NFC', s)

    return s


def sanitize_record(obj):
    """Recursively sanitize all string values in a JSON object."""
    if isinstance(obj, dict):
        return {k: sanitize_record(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_record(item) for item in obj]
    elif isinstance(obj, str):
        return sanitize_string(obj)
    return obj


def repair():
    total   = 0
    valid   = 0
    skipped = 0

    print(f"Reading: {INPUT_FILE}")
    print(f"Writing: {OUTPUT_FILE}")
    print("Validating and cleaning records...\n")

    with open(INPUT_FILE,  'r', encoding='utf-8', errors='replace') as fin, \
         open(OUTPUT_FILE, 'w', encoding='utf-8') as fout:

        for line_num, line in enumerate(fin, 1):
            total += 1
            line = line.strip()
            if not line:
                continue

            try:
                obj = json.loads(line)
            except json.JSONDecodeError as e:
                # Try to sanitize the raw string and re-parse
                try:
                    clean_line = sanitize_string(line)
                    obj = json.loads(clean_line)
                except json.JSONDecodeError:
                    skipped += 1
                    if skipped <= 10:
                        print(f"  [SKIP] Line {line_num}: {e}")
                    continue

            # Deep-sanitize all string fields in the parsed object
            obj = sanitize_record(obj)

            # Re-serialize to guarantee valid JSON with proper escaping
            try:
                clean_json = json.dumps(obj, ensure_ascii=False)
                # Final validation: re-parse the serialized string
                json.loads(clean_json)
                fout.write(clean_json + '\n')
                valid += 1
            except (json.JSONDecodeError, UnicodeEncodeError) as e:
                skipped += 1
                if skipped <= 10:
                    print(f"  [SKIP] Line {line_num} (re-serialize failed): {e}")

    print(f"\n{'='*50}")
    print(f"  Total lines   : {total:,}")
    print(f"  Valid & saved : {valid:,}")
    print(f"  Skipped       : {skipped:,}")
    retention = (valid / total * 100) if total > 0 else 0
    print(f"  Retention     : {retention:.1f}%")
    print(f"{'='*50}")
    print(f"\nClean file ready: {OUTPUT_FILE}")
    print("Upload this file to Google Colab instead of the original.")


if __name__ == "__main__":
    repair()
