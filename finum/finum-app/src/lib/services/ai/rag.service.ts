/**
 * RAG Service - Retrieval Augmented Generation
 * Handles vector embeddings and similarity search
 */

import OpenAI from 'openai';
import { prisma } from '@/lib/db';

// Initialize OpenAI client for embeddings
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;

export interface RAGDocument {
  id: string;
  title: string;
  content: string;
  category: string;
  source?: string;
  similarity?: number;
  metadata?: any;
}

/**
 * Generate embedding vector for text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
      dimensions: EMBEDDING_DIMENSIONS,
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Failed to generate embedding:', error);
    throw new Error('Failed to generate text embedding');
  }
}

/**
 * Generate embeddings for multiple texts (batch)
 */
export async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  try {
    // OpenAI allows up to 2048 inputs per request
    const batchSize = 2048;
    const results: number[][] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: batch,
        dimensions: EMBEDDING_DIMENSIONS,
      });

      results.push(...response.data.map(item => item.embedding));
    }

    return results;
  } catch (error) {
    console.error('Failed to generate batch embeddings:', error);
    throw new Error('Failed to generate batch embeddings');
  }
}

/**
 * Search for relevant ethical documents using vector similarity
 */
export async function searchEthicalDocuments(
  query: string,
  options: {
    limit?: number;
    category?: string;
    threshold?: number;
  } = {}
): Promise<RAGDocument[]> {
  const { limit = 5, category, threshold = 0.7 } = options;

  try {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);
    const embeddingString = `[${queryEmbedding.join(',')}]`;

    // Build the WHERE clause
    const categoryFilter = category ? `AND category = '${category}'` : '';

    // Perform cosine similarity search using pgvector
    const results = await prisma.$queryRawUnsafe<any[]>(`
      SELECT
        id,
        title,
        content,
        category,
        source,
        metadata,
        1 - (embedding <=> $1::vector) as similarity
      FROM "EthicalDocument"
      WHERE embedding IS NOT NULL
        ${categoryFilter}
        AND 1 - (embedding <=> $1::vector) >= $2
      ORDER BY embedding <=> $1::vector
      LIMIT $3
    `, embeddingString, threshold, limit);

    return results.map(row => ({
      id: row.id,
      title: row.title,
      content: row.content,
      category: row.category,
      source: row.source,
      similarity: parseFloat(row.similarity),
      metadata: row.metadata,
    }));
  } catch (error) {
    console.error('Failed to search ethical documents:', error);
    // Return empty array on error (graceful degradation)
    return [];
  }
}

/**
 * Find similar transactions using semantic search
 */
export async function findSimilarTransactions(
  transactionId: string,
  limit: number = 10
): Promise<any[]> {
  try {
    // Get the embedding for the target transaction
    const targetEmbedding = await prisma.transactionEmbedding.findUnique({
      where: { transactionId },
      select: { embedding: true },
    });

    if (!targetEmbedding) {
      return [];
    }

    // Search for similar transactions
    const results = await prisma.$queryRawUnsafe<any[]>(`
      SELECT
        t.id,
        t.merchant,
        t.description,
        t.category,
        t.amount,
        t.date,
        1 - (te.embedding <=> $1::vector) as similarity
      FROM "TransactionEmbedding" te
      JOIN "Transaction" t ON te."transactionId" = t.id
      WHERE te."transactionId" != $2
      ORDER BY te.embedding <=> $1::vector
      LIMIT $3
    `, targetEmbedding.embedding, transactionId, limit);

    return results;
  } catch (error) {
    console.error('Failed to find similar transactions:', error);
    return [];
  }
}

/**
 * Store embedding for an ethical document
 */
export async function storeEthicalDocumentEmbedding(
  documentId: string,
  content: string
): Promise<void> {
  try {
    const embedding = await generateEmbedding(content);
    const embeddingString = `[${embedding.join(',')}]`;

    await prisma.$executeRawUnsafe(`
      UPDATE "EthicalDocument"
      SET embedding = $1::vector
      WHERE id = $2
    `, embeddingString, documentId);
  } catch (error) {
    console.error('Failed to store document embedding:', error);
    throw error;
  }
}

/**
 * Store embedding for a transaction
 */
export async function storeTransactionEmbedding(
  transactionId: string,
  merchant: string,
  description: string | null,
  semanticTags: string[] = []
): Promise<void> {
  try {
    // Create semantic text from transaction data
    const semanticText = [
      merchant,
      description || '',
      ...semanticTags,
    ].filter(Boolean).join(' ');

    const embedding = await generateEmbedding(semanticText);
    const embeddingString = `[${embedding.join(',')}]`;

    // Check if embedding already exists
    const existing = await prisma.transactionEmbedding.findUnique({
      where: { transactionId },
    });

    if (existing) {
      await prisma.$executeRawUnsafe(`
        UPDATE "TransactionEmbedding"
        SET embedding = $1::vector, "semanticTags" = $2
        WHERE "transactionId" = $3
      `, embeddingString, semanticTags, transactionId);
    } else {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "TransactionEmbedding" (id, "transactionId", embedding, "semanticTags", "createdAt")
        VALUES ($1, $2, $3::vector, $4, NOW())
      `, `te_${transactionId}`, transactionId, embeddingString, semanticTags);
    }
  } catch (error) {
    console.error('Failed to store transaction embedding:', error);
    throw error;
  }
}

/**
 * Calculate embedding cost estimate
 */
export function estimateEmbeddingCost(textCount: number, avgTokensPerText: number = 100): number {
  // text-embedding-3-small costs $0.02 per 1M tokens
  const totalTokens = textCount * avgTokensPerText;
  return (totalTokens / 1_000_000) * 0.02;
}

/**
 * Check if OpenAI API is configured
 */
export function isConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}
