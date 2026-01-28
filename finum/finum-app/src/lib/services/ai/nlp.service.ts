/**
 * NLP Service - Natural Language Processing for transactions
 * Handles auto-categorization and semantic merchant matching
 */

import { generateResponse, generateStructuredResponse } from './ai.service';
import { generateEmbedding, storeTransactionEmbedding, findSimilarTransactions } from './rag.service';
import { prisma } from '@/lib/db';

export interface CategorizationSuggestion {
  transactionId: string;
  suggestedCategory: string;
  confidence: number;
  reasoning?: string;
}

export interface MerchantMatch {
  merchantId: string;
  merchant: string;
  matchedWith: string;
  similarity: number;
  transactionCount: number;
}

/**
 * Auto-categorize transactions using AI
 */
export async function categorizeTransactions(
  transactions: Array<{
    id: string;
    merchant: string;
    description?: string;
    amount: number;
  }>,
  availableCategories: string[]
): Promise<CategorizationSuggestion[]> {
  if (transactions.length === 0) {
    return [];
  }

  try {
    // Build prompt
    let prompt = `Catégorise ces transactions françaises.\n\n`;
    prompt += `**Catégories disponibles**: ${availableCategories.join(', ')}\n\n`;
    prompt += `**Transactions**:\n`;

    transactions.forEach((tx, idx) => {
      prompt += `${idx}. ${tx.merchant}${tx.description ? ` - ${tx.description}` : ''} (${tx.amount}€)\n`;
    });

    prompt += `\nRéponds avec un JSON array: [{"index": 0, "category": "Catégorie", "confidence": 0.95, "reasoning": "Explication"}]`;

    const schema = {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          index: { type: 'number' },
          category: { type: 'string' },
          confidence: { type: 'number' },
          reasoning: { type: 'string' },
        },
        required: ['index', 'category', 'confidence'],
      },
    };

    // Use Haiku for faster, cheaper categorization
    const result = await generateStructuredResponse<Array<{
      index: number;
      category: string;
      confidence: number;
      reasoning?: string;
    }>>(
      [{ role: 'user', content: prompt }],
      schema,
      {
        model: 'claude-3-5-haiku-20241022',
        maxTokens: 1000,
        systemPrompt: 'Tu es un expert en catégorisation de transactions bancaires françaises. Sois précis et cohérent.',
      }
    );

    return result.map(item => ({
      transactionId: transactions[item.index]?.id || '',
      suggestedCategory: item.category,
      confidence: item.confidence,
      reasoning: item.reasoning,
    }));
  } catch (error) {
    console.error('Failed to categorize transactions:', error);
    return [];
  }
}

/**
 * Generate and store embeddings for new transactions (batch)
 */
export async function generateTransactionEmbeddingsBatch(
  transactionIds: string[]
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  try {
    // Fetch transactions
    const transactions = await prisma.transaction.findMany({
      where: { id: { in: transactionIds } },
      select: {
        id: true,
        merchant: true,
        description: true,
        category: true,
      },
    });

    // Process in batches of 50
    const batchSize = 50;
    for (let i = 0; i < transactions.length; i += batchSize) {
      const batch = transactions.slice(i, i + batchSize);

      await Promise.allSettled(
        batch.map(async tx => {
          try {
            const semanticTags = [
              tx.category || '',
              // Add more semantic tags as needed
            ].filter(Boolean);

            await storeTransactionEmbedding(
              tx.id,
              tx.merchant,
              tx.description,
              semanticTags
            );

            success++;
          } catch (err) {
            console.error(`Failed to generate embedding for transaction ${tx.id}:`, err);
            failed++;
          }
        })
      );

      // Small delay to avoid rate limiting
      if (i + batchSize < transactions.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return { success, failed };
  } catch (error) {
    console.error('Failed to generate transaction embeddings batch:', error);
    return { success, failed };
  }
}

/**
 * Find duplicate merchants using semantic similarity
 */
export async function findDuplicateMerchants(
  userId: string,
  threshold: number = 0.85
): Promise<MerchantMatch[]> {
  try {
    // Get all merchants for user
    const merchants = await prisma.transaction.groupBy({
      by: ['merchant'],
      where: { userId },
      _count: { id: true },
    });

    if (merchants.length < 2) {
      return [];
    }

    // Generate embeddings for all merchants
    const merchantNames = merchants.map(m => m.merchant);
    const embeddings: number[][] = [];

    for (const name of merchantNames) {
      try {
        const emb = await generateEmbedding(name);
        embeddings.push(emb);
      } catch (err) {
        embeddings.push([]);
      }
    }

    // Calculate cosine similarity between all pairs
    const matches: MerchantMatch[] = [];

    for (let i = 0; i < merchantNames.length; i++) {
      for (let j = i + 1; j < merchantNames.length; j++) {
        const sim = cosineSimilarity(embeddings[i], embeddings[j]);

        if (sim >= threshold) {
          matches.push({
            merchantId: `${i}-${j}`,
            merchant: merchantNames[i],
            matchedWith: merchantNames[j],
            similarity: sim,
            transactionCount: merchants[i]._count.id + merchants[j]._count.id,
          });
        }
      }
    }

    // Sort by similarity descending
    return matches.sort((a, b) => b.similarity - a.similarity);
  } catch (error) {
    console.error('Failed to find duplicate merchants:', error);
    return [];
  }
}

/**
 * Suggest category for a single transaction based on similar past transactions
 */
export async function suggestCategoryFromHistory(
  transactionId: string,
  userId: string
): Promise<string | null> {
  try {
    // Find similar transactions
    const similar = await findSimilarTransactions(transactionId, 5);

    if (similar.length === 0) {
      return null;
    }

    // Count categories from similar transactions
    const categoryCounts = new Map<string, number>();

    similar.forEach(tx => {
      if (tx.category) {
        categoryCounts.set(tx.category, (categoryCounts.get(tx.category) || 0) + 1);
      }
    });

    // Return most common category
    let maxCount = 0;
    let bestCategory: string | null = null;

    for (const [category, count] of categoryCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        bestCategory = category;
      }
    }

    return bestCategory;
  } catch (error) {
    console.error('Failed to suggest category from history:', error);
    return null;
  }
}

/**
 * Analyze transaction patterns for a user
 */
export async function analyzeTransactionPatterns(
  userId: string,
  timeframeMonths: number = 3
): Promise<{
  topCategories: Array<{ category: string; total: number; count: number }>;
  unusualSpending: Array<{ merchant: string; amount: number; reason: string }>;
  suggestions: string[];
}> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - timeframeMonths);

    // Get transactions
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: cutoffDate },
      },
      select: {
        merchant: true,
        amount: true,
        category: true,
        date: true,
      },
      orderBy: { date: 'desc' },
    });

    // Analyze by category
    const categoryStats = new Map<string, { total: number; count: number }>();

    transactions.forEach(tx => {
      const cat = tx.category || 'Uncategorized';
      const stats = categoryStats.get(cat) || { total: 0, count: 0 };
      stats.total += parseFloat(tx.amount.toString());
      stats.count++;
      categoryStats.set(cat, stats);
    });

    const topCategories = Array.from(categoryStats.entries())
      .map(([category, stats]) => ({ category, ...stats }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    // Detect unusual spending (simple heuristic)
    const avgAmount = transactions.reduce((sum, tx) => sum + parseFloat(tx.amount.toString()), 0) / transactions.length;
    const stdDev = Math.sqrt(
      transactions.reduce((sum, tx) => sum + Math.pow(parseFloat(tx.amount.toString()) - avgAmount, 2), 0) / transactions.length
    );

    const unusualSpending = transactions
      .filter(tx => parseFloat(tx.amount.toString()) > avgAmount + 2 * stdDev)
      .slice(0, 5)
      .map(tx => ({
        merchant: tx.merchant,
        amount: parseFloat(tx.amount.toString()),
        reason: 'Montant inhabituellement élevé',
      }));

    // Generate AI suggestions
    let suggestions: string[] = [];

    if (topCategories.length > 0) {
      const prompt = `Analyse ces statistiques de dépenses:\n\n${topCategories.map(c => `- ${c.category}: ${c.total.toFixed(2)}€ (${c.count} transactions)`).join('\n')}\n\nDonne 2-3 suggestions d'optimisation courtes (1 phrase chacune).`;

      try {
        const response = await generateResponse(
          [{ role: 'user', content: prompt }],
          {
            model: 'claude-3-5-haiku-20241022',
            maxTokens: 300,
            systemPrompt: 'Tu es un conseiller budgétaire. Sois concis et actionnable.',
          }
        );

        suggestions = response.content
          .split('\n')
          .filter(line => line.trim().match(/^[-•\d]/))
          .map(line => line.replace(/^[-•\d.)\s]+/, '').trim())
          .slice(0, 3);
      } catch (err) {
        console.error('Failed to generate suggestions:', err);
      }
    }

    return {
      topCategories,
      unusualSpending,
      suggestions,
    };
  } catch (error) {
    console.error('Failed to analyze transaction patterns:', error);
    return {
      topCategories: [],
      unusualSpending: [],
      suggestions: [],
    };
  }
}

/**
 * Helper: Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length === 0 || vecB.length === 0 || vecA.length !== vecB.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
