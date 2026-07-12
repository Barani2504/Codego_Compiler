const OLLAMA_URL  = process.env.OLLAMA_URL  || 'http://localhost:11434';
const CHROMA_URL  = process.env.CHROMA_URL  || 'http://localhost:8000';
const MODEL       = process.env.OLLAMA_MODEL || 'codego-generator';

const LANGUAGES   = ['python', 'java', 'cpp', 'c', 'javascript']; // Focus on trained languages
const DIFFICULTIES = ['easy', 'medium', 'hard'];
const PER_COMBO   = 2;   // 2 questions × 5 languages × 3 difficulties = 30 seed questions

async function generateOne(language: string, difficulty: string, index: number) {
  const prompt = `TASK: Generate ONE original coding question.
LANGUAGE: ${language.toUpperCase()}
DIFFICULTY: ${difficulty.toUpperCase()}`;

  const res  = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      model: MODEL, 
      prompt, 
      stream: false, 
      format: 'json', 
      options: { temperature: 0.3 } 
    }),
  });

  const data  = await res.json() as any;
  
  if (data.error) {
    throw new Error(`Ollama Error: ${data.error}`);
  }

  if (!data.response) {
    throw new Error("Ollama returned an empty response.");
  }

  let clean = data.response.trim();
  clean = clean.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
  
  return JSON.parse(clean);
}

async function seed() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ChromaClient } = require('chromadb');
  const client = new ChromaClient({ path: CHROMA_URL });

  const embedder = {
    generate: async (texts: string[]) => {
      const embeddings: number[][] = [];
      for (const text of texts) {
        const res = await fetch(`${OLLAMA_URL}/api/embeddings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'nomic-embed-text', prompt: text })
        });
        const data = await res.json() as any;
        embeddings.push(data.embedding);
      }
      return embeddings;
    }
  };

  try { await client.deleteCollection({ name: 'coding_questions' }); } catch {} // Wipe old plain-text entries
  const collection = await client.getOrCreateCollection({ name: 'coding_questions', embeddingFunction: embedder });

  let total = 0;

  for (const language of LANGUAGES) {
    for (const difficulty of DIFFICULTIES) {
      console.log(`Seeding ${language}/${difficulty}...`);

      for (let i = 0; i < PER_COMBO; i++) {
        const id = `seed-${language}-${difficulty}-${i}`;
        
        try {
          // Skip if already seeded
          const existing = await collection.get({ ids: [id] });
          if (existing && existing.ids.length > 0) {
            console.log(`  - ${id} (already exists)`);
            total++;
            continue;
          }

          const q  = await generateOne(language, difficulty, i + 1);
          
          // Store full JSON so the RAG layer can reconstruct a complete question
          const description = q.problemStatement || q.description || q.problem || 'Problem description missing.';
          const fullJson = JSON.stringify({ ...q, problemStatement: description });

          await collection.add({
            ids:       [id],
            documents: [fullJson],
            metadatas: [{ language, difficulty }],
          });

          console.log(`  ✓ ${id}`);
          total++;
        } catch (e) {
          console.error(`  ✗ ${language}/${difficulty}/${i}: ${e}`);
        }
      }
    }
  }

  console.log(`\nSeed complete. Total: ${total} questions in ChromaDB.`);
}

seed().catch(console.error);
