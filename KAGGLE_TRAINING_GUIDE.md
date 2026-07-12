# 🚀 CodeGo Fine-Tuning Guide (Kaggle)

This guide provides the complete, end-to-end process for fine-tuning the **Qwen2.5-Coder-1.5B-Instruct** model on Kaggle using your `fine_tuning_dataset_clean.jsonl` dataset. Kaggle is ideal because it gives you up to 30 hours of free T4x2 GPU time per week and allows long-running sessions.

---

## 🛠️ Step 1: Prepare Kaggle

1. **Create an account** or log in to [Kaggle](https://www.kaggle.com/).
2. **Upload your dataset:**
   - Go to [kaggle.com/datasets](https://www.kaggle.com/datasets) and click **"New Dataset"**.
   - Title it `codego-training-data`.
   - Upload your `fine_tuning_dataset_clean.jsonl` file.
   - Click **"Create"** and wait a moment for it to process.
3. **Create a Notebook:**
   - Go to [kaggle.com/code](https://www.kaggle.com/code) and click **"New Notebook"**.
4. **Configure the Notebook Environment:**
   - Look at the right-side panel under **"Settings"** (or click the three dots `⋮` at the top right -> Session Options).
   - **Accelerator:** Set to **"GPU T4 x2"**.
   - **Internet:** Make sure the toggle is **"ON"** (this is critical to download dependencies).
5. **Attach Data:**
   - Click **"Add Data"** (top right area or right panel).
   - Search for your uploaded dataset `codego-training-data`.
   - Click the `+` icon to attach it to the notebook.

---

## 💻 Step 2: The Training Code

Copy and paste the following code blocks into individual cells in your Kaggle notebook, and run them sequentially from top to bottom.

### Cell 1: Install Dependencies
```python
# Install Unsloth and other required libraries from PyPI (safe for Kaggle)
!pip install unsloth trl datasets transformers --quiet
```

### Cell 2: Load the Base Model and Apply LoRA
```python
from unsloth import FastLanguageModel
import torch

print("Loading base model...")
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name     = "unsloth/Qwen2.5-Coder-1.5B-Instruct",
    max_seq_length = 2048,
    load_in_4bit   = True,
    dtype          = None,
)

print("Applying LoRA adapters...")
model = FastLanguageModel.get_peft_model(
    model,
    r              = 16,
    target_modules = ["q_proj", "k_proj", "v_proj", "o_proj",
                      "gate_proj", "up_proj", "down_proj"],
    lora_alpha     = 16,
    lora_dropout   = 0,
    bias           = "none",
    use_gradient_checkpointing = "unsloth",
    random_state   = 42,
)
print("✅ Model and LoRA ready!")
```

### Cell 3: Validate and Format Dataset
```python
import json
from datasets import load_dataset

# Path where Kaggle mounted your dataset
JSONL_PATH = "/kaggle/input/codego-training-data/fine_tuning_dataset_clean.jsonl"

valid_records = []
skipped = 0

print("Validating dataset...")
with open(JSONL_PATH, "r", encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if not line: continue
        
        try:
            rec = json.loads(line)
            msgs = rec.get("messages", [])
            
            if len(msgs) != 3:
                skipped += 1; continue
                
            payload = json.loads(msgs[2]["content"])
            if not payload.get("testCases") or not payload.get("problemStatement"):
                skipped += 1; continue
                
            # Enforce strict system prompt matching the backend expectation
            msgs[0]["content"] = (
                "You are a strict, highly accurate college programming assessment "
                "question generator. Return ONLY a raw, valid JSON object. "
                "DO NOT wrap the output in markdown code blocks. "
                "The response must start with { and end with }."
            )
            valid_records.append(rec)
        except Exception:
            skipped += 1

print(f"✅ Valid: {len(valid_records)} | ❌ Skipped: {skipped}")

# Save the cleaned version to the working directory
clean_path = "/kaggle/working/clean_dataset.jsonl"
with open(clean_path, "w", encoding="utf-8") as f:
    for rec in valid_records:
        f.write(json.dumps(rec, ensure_ascii=False) + "\n")

# Load and format using the tokenizer's chat template
raw = load_dataset("json", data_files=clean_path, split="train")

def format_example(ex):
    return {"text": tokenizer.apply_chat_template(
        ex["messages"], tokenize=False, add_generation_prompt=False
    )}

dataset = raw.map(format_example, remove_columns=raw.column_names)
print(f"✅ Dataset ready: {len(dataset)} examples formatted for ChatML.")
```

### Cell 4: Start Training
```python
from trl import SFTTrainer
from transformers import TrainingArguments

trainer = SFTTrainer(
    model              = model,
    tokenizer          = tokenizer,
    train_dataset      = dataset,
    dataset_text_field = "text",
    max_seq_length     = 2048,
    dataset_num_proc   = 4,
    args = TrainingArguments(
        per_device_train_batch_size  = 2,
        gradient_accumulation_steps  = 4, # Effective batch size = 8
        warmup_steps    = 100,
        max_steps       = 3000,
        learning_rate   = 2e-4,
        fp16            = not torch.cuda.is_bf16_supported(),
        bf16            = torch.cuda.is_bf16_supported(),
        logging_steps   = 50,
        save_steps      = 500,
        output_dir      = "/kaggle/working/checkpoints",
        optim           = "adamw_8bit",
        weight_decay    = 0.01,
        lr_scheduler_type = "linear",
        seed            = 42,
    ),
)

print("🚀 Starting training... (This will take a few hours)")
trainer.train()
print("✅ Training complete!")
```

### Cell 5: Test Model Inference (Sanity Check)
```python
FastLanguageModel.for_inference(model)

def test_generate(lang, diff):
    msgs = [
        {"role": "system", "content": "You are a strict, highly accurate college programming assessment question generator. Return ONLY a raw, valid JSON object. DO NOT wrap the output in markdown code blocks. The response must start with { and end with }."},
        {"role": "user",   "content": f"TASK: Generate ONE original coding question.\nLANGUAGE: {lang.upper()}\nDIFFICULTY: {diff.upper()}"}
    ]
    inputs = tokenizer.apply_chat_template(msgs, tokenize=True, add_generation_prompt=True, return_tensors="pt").to("cuda")
    
    out = model.generate(
        input_ids=inputs, 
        max_new_tokens=800, 
        temperature=0.2, 
        repetition_penalty=1.15, 
        do_sample=True
    )
    
    resp = tokenizer.decode(out[0][inputs.shape[1]:], skip_special_tokens=True)
    
    try:
        s, e = resp.index('{'), resp.rindex('}')
        parsed = json.loads(resp[s:e+1])
        print(f"✅ {lang}/{diff} → Valid JSON! | Extracted {len(parsed.get('testCases',[]))} test cases.")
    except Exception as e:
        print(f"⚠️ {lang}/{diff} → JSON parse failed ({e}). Raw response snippet:\n{resp[:300]}")

print("Running inference tests...")
test_generate("python", "easy")
test_generate("cpp", "hard")
```

### Cell 6: Export to GGUF
```python
print("📦 Exporting to GGUF format (q4_k_m)...")
model.save_pretrained_gguf(
    "/kaggle/working/codego_model",
    tokenizer,
    quantization_method = "q4_k_m",
)
print("✅ Export complete! The file is ready for download.")
```

---

## 📥 Step 3: Download and Deploy

1. After **Cell 6** completes, look at the **right-side panel** in Kaggle.
2. Under the **"Output"** section, expand `/kaggle/working`.
3. You will see a file named `codego_model-unsloth.Q4_K_M.gguf`.
4. Click the **three dots `⋮`** next to the file and select **"Download"**.

### Registering the model in Ollama
Once downloaded to your local machine (e.g., to your `C:\Users\baran\Downloads\codego` folder), register it with Ollama:

1. Open a terminal in the folder containing the `.gguf` file.
2. Create a file named `Modelfile` with the following content:
    ```dockerfile
    FROM ./codego_model-unsloth.Q4_K_M.gguf
    SYSTEM "You are a strict, highly accurate college programming assessment question generator. Return ONLY a raw, valid JSON object. DO NOT wrap the output in markdown code blocks. The response must start with { and end with }."
    PARAMETER repeat_penalty 1.15
    PARAMETER temperature 0.2
    PARAMETER num_predict 2048
    ```
3. Run the following command:
    ```bash
    ollama create codego-generator -f Modelfile
    ```
4. Update your backend `.env` file to use the new model:
    ```env
    OLLAMA_MODEL=codego-generator
    ```

You are now ready to run your application!


//in faculty dashboard if we click foudational, intermediate and advanced, it should display the students that attempted the tests on those levels and their marks and they are pass or not and keep filters like high marks low marks, pass or fail, or registeration number or keep a search bar to search the studetns . and it shoukd show the student name too in the live submission tab like who submitted the assignment and finally inthe pass or fail tier graph in pass and faill too it should show which student has passed and which student has fiailed and fix their ui designs and animations properly