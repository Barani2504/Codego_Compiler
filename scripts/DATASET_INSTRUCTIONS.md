# How to Run the Dataset Preparation Script

This script downloads the full `deepmind/code_contests` dataset and
formats it into a fine-tuning JSONL file for Python, C, C++, Java, and JavaScript
across easy / medium / hard difficulties.

---

## Step 1 — Install Python Dependencies

Open a terminal (PowerShell or Command Prompt) and run:

```bash
pip install datasets tqdm huggingface_hub
```

If you are using a Python virtual environment (recommended):

```bash
python -m venv venv
venv\Scripts\activate
pip install datasets tqdm huggingface_hub
```

---

## Step 2 — Run the Script

Navigate to the scripts folder and run the script:

```bash
cd C:\Users\baran\Downloads\codego\scripts
python prepare_training_data.py
```

**What happens:**
- The script downloads all 3 splits of `deepmind/code_contests` (train, valid, test)
- It processes every single problem with no cap
- It filters only Python, C, C++, Java, and JavaScript problems with at least 5 verified test cases
- It outputs a `fine_tuning_dataset.jsonl` file in the `scripts/` directory

**Expected output:**
```
============================================================
  CodeGo Fine-Tuning Dataset Builder
  Source    : deepmind/code_contests  (ALL splits)
  Languages : c, cpp, java, javascript, python
  Difficulty: easy (<1200)  medium (1200-1799)  hard (>=1800)
  Output    : fine_tuning_dataset.jsonl
============================================================

  Processing 'train' split...
  -> 8,000+ records saved from 'train'.
  Processing 'valid' split...
  -> ...
  Processing 'test' split...
  -> ...

  COMPLETE — 25,000+ total training records written.
```

---

## Step 3 — Fine-Tune with Unsloth (Google Colab)

1. Go to [Google Colab](https://colab.research.google.com/)
2. Upload your `fine_tuning_dataset.jsonl` to Colab storage
3. Use the free Unsloth notebook:
   - [Unsloth Qwen2.5 Fine-tuning Notebook](https://colab.research.google.com/drive/1Ys44kVvmeZtnICzWz0xgpRnrIOjZAe6L)
4. Set `model_name = "unsloth/Qwen2.5-Coder-1.5B-Instruct-bnb-4bit"`
5. Point it to your `fine_tuning_dataset.jsonl`
6. Run all cells. Training takes ~1-2 hours on a free T4 GPU.

---

## Step 4 — Export and Load into Ollama

After training, Unsloth will export a `.gguf` file.
Download it and place it in the `codego` folder, then run:

```bash
# Create a Modelfile
echo "FROM ./my-codego-model.gguf" > Modelfile
ollama create codego-generator -f Modelfile
```

Then update your backend `.env`:

```env
OLLAMA_MODEL=codego-generator
```

Restart your backend and the platform will now use YOUR fine-tuned model!
