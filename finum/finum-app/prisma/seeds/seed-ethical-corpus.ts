/**
 * Seed Script: Ethical Corpus
 * Loads ethical documents into database and generates embeddings
 */

import { PrismaClient } from '@prisma/client';
import { generateEmbedding } from '../../src/lib/services/ai/rag.service';
import corpusData from './ethical-corpus.json';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding ethical corpus...');

  let successCount = 0;
  let errorCount = 0;

  for (const doc of corpusData) {
    try {
      console.log(`\n📄 Processing: ${doc.title}...`);

      // Generate embedding for the document content
      console.log('  Generating embedding...');
      const embedding = await generateEmbedding(doc.content);
      const embeddingString = `[${embedding.join(',')}]`;

      // Check if document already exists (by title)
      const existing = await prisma.ethicalDocument.findFirst({
        where: { title: doc.title },
      });

      if (existing) {
        console.log('  Document exists, updating...');
        await prisma.$executeRawUnsafe(`
          UPDATE "EthicalDocument"
          SET
            content = $1,
            category = $2,
            source = $3,
            embedding = $4::vector,
            "updatedAt" = NOW()
          WHERE id = $5
        `, doc.content, doc.category, doc.source, embeddingString, existing.id);
      } else {
        console.log('  Creating new document...');
        await prisma.$executeRawUnsafe(`
          INSERT INTO "EthicalDocument" (id, title, content, category, source, embedding, metadata, "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, $6::vector, $7, NOW(), NOW())
        `,
          `ed_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          doc.title,
          doc.content,
          doc.category,
          doc.source || null,
          embeddingString,
          JSON.stringify({ imported: new Date().toISOString() })
        );
      }

      console.log('  ✅ Success');
      successCount++;

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`  ❌ Error processing ${doc.title}:`, error);
      errorCount++;
    }
  }

  console.log(`\n\n🎉 Seeding complete!`);
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${errorCount}`);
  console.log(`   📊 Total: ${corpusData.length}`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
