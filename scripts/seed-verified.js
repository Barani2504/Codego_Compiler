const fs = require('fs');
const path = require('path');

const CHROMA_URL = process.env.CHROMA_URL || 'http://localhost:8000';

async function seed() {
  const { ChromaClient } = require('chromadb');
  const client = new ChromaClient({ path: CHROMA_URL });

  // Minimal fallback embedder (just enough to satisfy Chroma API if Ollama isn't used for embedding)
  // In a true RAG setup, we use embeddings. Here we'll just insert direct text since we query by metadata (language + difficulty)
  const embedder = {
    generate: async (texts) => {
      // Return dummy embeddings for metadata-only querying
      return texts.map(() => Array(384).fill(0.1));
    }
  };

  try { await client.deleteCollection({ name: 'verified_questions' }); } catch {}
  const collection = await client.createCollection({ name: 'verified_questions', embeddingFunction: embedder });

  const dataPath = path.join(__dirname, 'seed-data.json');
  const questions = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  let total = 0;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const id = `verified-${q.language}-${q.difficulty}-${i}`;
    
    await collection.add({
      ids: [id],
      documents: [JSON.stringify(q)], // Store the entire JSON string in the document
      metadatas: [{ language: q.language, difficulty: q.difficulty }],
    });
    console.log(`  ✓ Added ${id}`);
    total++;
  }

  console.log(`\nRAG Seed complete. Total: ${total} highly verified questions in ChromaDB.`);
}

seed().catch(console.error);
