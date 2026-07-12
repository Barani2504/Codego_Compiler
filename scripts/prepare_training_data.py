import json
import random
from datasets import load_dataset
from tqdm import tqdm


def get_difficulty_label(rating):
    """
    Code Contests uses Codeforces ratings (roughly 800 to 3500+).
    We map these to easy / medium / hard.
    """
    if rating is None or rating == 0:
        return random.choice(["easy", "medium"])
    if rating < 1200:
        return "easy"
    elif rating < 1800:
        return "medium"
    else:
        return "hard"


def map_language(lang_id):
    """
    Normalize the Code Contests language field to one of our 5 target languages.
    The dataset uses both numeric IDs and descriptive strings from Codeforces.
    """
    lang_str = str(lang_id).lower().strip()

    # Numeric IDs used by Codeforces / Code Contests dataset
    # Reference: https://codeforces.com/api/help/objects#Language
    LANG_ID_MAP = {
        "1":  "cpp",   # GNU G++
        "2":  "cpp",   # GNU G++ 11
        "3":  "cpp",   # GNU G++ 14
        "4":  "cpp",   # GNU G++ 17
        "50": "cpp",   # GNU G++ 17 (64 bit)
        "54": "cpp",   # GNU G++ 17 Diagnostics
        "73": "cpp",   # GNU G++20 11.2
        "89": "cpp",   # GNU G++23 14.2
        "6":  "java",  # Java 8
        "36": "java",  # Java 11
        "60": "java",  # Java 17
        "7":  "python",# Python 3
        "31": "python",# Python 3
        "41": "python",# PyPy 3
        "70": "python",# PyPy 3-64
        "74": "python",# PyPy 3.9
        "43": "c",     # GNU C11
        "75": "c",     # GNU C17 (7.3)
        "52": "c",     # GNU C11 32bit
        "34": "javascript",  # JavaScript V8 4.8.0
        "55": "javascript",  # JavaScript
    }

    if lang_str in LANG_ID_MAP:
        return LANG_ID_MAP[lang_str]

    # Fallback: string matching
    if "python" in lang_str or "pypy" in lang_str:
        return "python"
    if "c++" in lang_str or "cpp" in lang_str or "g++" in lang_str:
        return "cpp"
    if "java" in lang_str and "javascript" not in lang_str:
        return "java"
    if "javascript" in lang_str or "node" in lang_str or "v8" in lang_str:
        return "javascript"
    # Plain C: must NOT be c++, c#, css
    if lang_str in ("c", "gnu c") or ("gnu c" in lang_str and "c++" not in lang_str):
        return "c"
    return None


def format_record(lang, difficulty, description, sample_input, sample_output, test_cases):
    """Return a ChatML-formatted dict ready to write as JSONL."""
    payload = {
        "_reasoning": (
            f"This is a {difficulty} {lang} problem. "
            f"Sample input: '{sample_input[:60].strip()}' → "
            f"verified output: '{sample_output[:60].strip()}'. "
            f"All {len(test_cases)} test cases come from official judge data."
        ),
        "problemStatement": description,
        "constraints": "Standard competitive programming constraints apply.",
        "sampleInput": sample_input.strip(),
        "sampleOutput": sample_output.strip(),
        "testCases": test_cases,
        "hints": [
            "Read the problem statement carefully and identify the core algorithm.",
            "Consider edge cases such as empty inputs, maximum values, and boundary conditions.",
            "Optimize your solution to meet the time limit before submitting."
        ],
        "timeLimitMinutes": 15 if difficulty == "easy" else 30 if difficulty == "medium" else 45
    }

    return {
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a strict, highly accurate college programming assessment "
                    "question generator. Return ONLY a raw, valid JSON object. "
                    "DO NOT wrap the output in markdown code blocks. "
                    "The response must start with { and end with }."
                )
            },
            {
                "role": "user",
                "content": (
                    f"TASK: Generate ONE original coding question.\n"
                    f"LANGUAGE: {lang.upper()}\n"
                    f"DIFFICULTY: {difficulty.upper()}"
                )
            },
            {
                "role": "assistant",
                "content": json.dumps(payload, ensure_ascii=False, indent=2)
            }
        ]
    }


def process_split(split_name, stats, f, target_languages):
    print(f"\n{'='*60}")
    print(f"Loading split: '{split_name}'  (this may take a while)...")
    
    dataset = None
    max_retries = 5
    for attempt in range(1, max_retries + 1):
        try:
            dataset = load_dataset(
                "deepmind/code_contests",
                split=split_name,
                download_config=None,  # uses cached files automatically
            )
            break
        except Exception as e:
            print(f"  -> Attempt {attempt}/{max_retries} failed: {e}")
            if attempt == max_retries:
                print(f"  -> Giving up on split '{split_name}' after {max_retries} attempts.")
                return 0
            print(f"  -> Retrying in 5 seconds...")
            import time; time.sleep(5)

    saved = 0

    for item in tqdm(dataset, desc=f"  '{split_name}'"):
        difficulty = get_difficulty_label(item.get("cf_rating", 0))

        description = (item.get("description") or "").strip()
        if len(description) < 50:
            continue

        # Collect all official test cases (public + private + generated)
        all_inputs, all_outputs = [], []
        for bucket in ("public_tests", "private_tests", "generated_tests"):
            bucket_data = item.get(bucket) or {}
            all_inputs  += [x for x in (bucket_data.get("input")  or []) if x and x.strip()]
            all_outputs += [x for x in (bucket_data.get("output") or []) if x and x.strip()]

        pairs = list(zip(all_inputs, all_outputs))
        if len(pairs) < 5:
            continue  # must have at least 5 verified pairs

        test_cases = [
            {"input": inp.strip(), "expectedOutput": out.strip()}
            for inp, out in pairs[:5]
        ]
        sample_input  = test_cases[0]["input"]
        sample_output = test_cases[0]["expectedOutput"]

        # Find which of our 5 target languages this problem has solutions for
        solutions = item.get("solutions") or {}
        viable_langs = set()
        for lang_id in (solutions.get("language") or []):
            mapped = map_language(lang_id)
            if mapped and mapped in target_languages:
                viable_langs.add(mapped)

        if not viable_langs:
            continue

        for lang in viable_langs:
            record = format_record(lang, difficulty, description, sample_input, sample_output, test_cases)
            f.write(json.dumps(record) + "\n")
            stats[lang][difficulty] = stats[lang].get(difficulty, 0) + 1
            saved += 1

    print(f"  -> {saved:,} records saved from '{split_name}'.")
    return saved


def process_dataset():
    TARGET_LANGUAGES = {"python", "c", "cpp", "java", "javascript"}
    SPLITS = ["train", "valid", "test"]
    OUTPUT_FILE = "fine_tuning_dataset.jsonl"

    stats   = {lang: {} for lang in TARGET_LANGUAGES}
    total   = 0

    print("=" * 60)
    print("  CodeGo Fine-Tuning Dataset Builder")
    print(f"  Source    : deepmind/code_contests  (ALL splits)")
    print(f"  Languages : {', '.join(sorted(TARGET_LANGUAGES))}")
    print(f"  Difficulty: easy (<1200)  medium (1200-1799)  hard (>=1800)")
    print(f"  Output    : {OUTPUT_FILE}")
    print("=" * 60)

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        for split in SPLITS:
            total += process_split(split, stats, f, TARGET_LANGUAGES)

    print("\n" + "=" * 60)
    print(f"  COMPLETE — {total:,} total training records written.")
    print(f"  File: {OUTPUT_FILE}")
    print("\n  Breakdown by language × difficulty:")
    for lang in sorted(stats):
        d = stats[lang]
        lang_total = sum(d.values())
        row = "  |  ".join(f"{k}: {v:,}" for k, v in sorted(d.items()))
        print(f"    {lang:12s}  total={lang_total:6,}   [{row}]")
    print("=" * 60)
    print("\n  Next → Upload fine_tuning_dataset.jsonl to Google Colab")
    print("         and fine-tune with Unsloth (see TRAINING_DATASETS.md).")


if __name__ == "__main__":
    process_dataset()
