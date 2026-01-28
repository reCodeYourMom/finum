/**
 * AI Coach Service - High-level service for financial coaching
 * Orchestrates AI, RAG, caching, and guardrails
 */

import { generateResponse } from './ai.service';
import { searchEthicalDocuments } from './rag.service';
import {
  generateCacheKey,
  generateContextHash,
  getCachedResponse,
  setCachedResponse,
  invalidateCacheByContext,
} from './cache.service';
import {
  validateUserInput,
  validateAIOutput,
  sanitizeInput,
  checkRateLimit,
  getFallbackResponse,
} from './guardrails.service';
import {
  getCoachSystemPrompt,
  getWeeklyReviewPrompt,
  getChatPrompt,
  type UserFinancialContext,
  parseRecommendations,
  type Recommendation,
} from './prompt.service';

export interface WeeklyReviewResult {
  summary: string;
  recommendations: Recommendation[];
  rawResponse: string;
  fromCache: boolean;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    cost: number;
  };
}

export interface ChatResponse {
  message: string;
  sources?: Array<{
    title: string;
    category: string;
    similarity: number;
  }>;
  fromCache: boolean;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    cost: number;
  };
}

/**
 * Generate AI-powered weekly review
 */
export async function generateWeeklyReview(
  context: UserFinancialContext
): Promise<WeeklyReviewResult> {
  try {
    // Generate cache key
    const cacheKey = generateCacheKey(context.userId, {
      type: 'weekly_review',
      bucketsOverspent: context.bucketsOverspent?.map(b => b.name),
      transactionCount: context.recentTransactions?.length || 0,
    });

    // Check cache first
    const cached = await getCachedResponse(cacheKey);
    if (cached) {
      const parsedCache = JSON.parse(cached) as WeeklyReviewResult;
      return { ...parsedCache, fromCache: true };
    }

    // Retrieve relevant ethical guidelines using RAG
    const query = `Financial coaching for user with${context.bucketsOverspent?.length ? ' budget overspending' : ' balanced budget'}. Provide guidance on${context.patterns?.length ? ' recurring expenses and' : ''} budget management.`;

    const ethicalDocs = await searchEthicalDocuments(query, {
      limit: 3,
      threshold: 0.7,
    });

    const guidelines = ethicalDocs.map(doc => `**${doc.title}**\n${doc.content}`);

    // Generate prompt
    const prompt = getWeeklyReviewPrompt(context, guidelines);

    // Call AI
    const response = await generateResponse(
      [{ role: 'user', content: prompt }],
      {
        systemPrompt: getCoachSystemPrompt(),
        maxTokens: 1500,
        temperature: 0.7,
      }
    );

    // Validate output
    const validation = validateAIOutput(response.content, {
      userIncome: context.income,
      userExpenses: context.bucketsOverspent?.reduce((sum, b) => sum + b.spent, 0),
    });

    if (!validation.valid) {
      console.error('AI output validation failed:', validation.reason);
      // Return safe fallback
      return {
        summary: 'Nous analysons votre situation budgétaire...',
        recommendations: [],
        rawResponse: '',
        fromCache: false,
      };
    }

    // Parse recommendations from response
    const recommendations = parseRecommendations(response.content);

    // Extract summary (first paragraph)
    const summaryMatch = response.content.match(/^(.+?)(?:\n\n|\n#)/s);
    const summary = summaryMatch ? summaryMatch[1].trim() : response.content.substring(0, 200);

    const result: WeeklyReviewResult = {
      summary,
      recommendations: recommendations.slice(0, 5), // Top 5 recommendations
      rawResponse: response.content,
      fromCache: false,
      usage: {
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
        cost: (response.usage.inputTokens / 1_000_000) * 3 + (response.usage.outputTokens / 1_000_000) * 15,
      },
    };

    // Cache the result (1 hour TTL)
    const contextHash = generateContextHash({ userId: context.userId });
    await setCachedResponse(
      cacheKey,
      JSON.stringify(result),
      { ttl: 3600, contextHash }
    );

    return result;
  } catch (error) {
    console.error('Failed to generate weekly review:', error);
    // Return graceful fallback
    return {
      summary: 'Analyse budgétaire en cours...',
      recommendations: [],
      rawResponse: '',
      fromCache: false,
    };
  }
}

/**
 * Handle chat message with AI coach
 */
export async function handleChatMessage(
  userMessage: string,
  context: UserFinancialContext,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
): Promise<ChatResponse> {
  try {
    // Rate limit check
    const rateLimitCheck = checkRateLimit(context.userId);
    if (!rateLimitCheck.valid) {
      return {
        message: rateLimitCheck.reason || 'Rate limit exceeded',
        fromCache: false,
      };
    }

    // Validate and sanitize input
    const validation = validateUserInput(userMessage);
    if (!validation.valid) {
      return {
        message: getFallbackResponse(validation.severity === 'high' ? 'credentials' : 'default'),
        fromCache: false,
      };
    }

    const sanitizedMessage = sanitizeInput(userMessage);

    // Generate cache key
    const cacheKey = generateCacheKey(context.userId, {
      type: 'chat',
      message: sanitizedMessage,
      historyLength: conversationHistory.length,
    });

    // Check cache
    const cached = await getCachedResponse(cacheKey);
    if (cached) {
      const parsedCache = JSON.parse(cached) as ChatResponse;
      return { ...parsedCache, fromCache: true };
    }

    // RAG: Search for relevant guidelines
    const ethicalDocs = await searchEthicalDocuments(sanitizedMessage, {
      limit: 3,
      threshold: 0.65,
    });

    const guidelines = ethicalDocs.map(doc => `**${doc.title}**\n${doc.content.substring(0, 300)}`);

    // Generate prompt
    const prompt = getChatPrompt(
      sanitizedMessage,
      context,
      conversationHistory.slice(-5), // Last 5 messages
      guidelines
    );

    // Call AI
    const response = await generateResponse(
      [{ role: 'user', content: prompt }],
      {
        systemPrompt: getCoachSystemPrompt(),
        maxTokens: 800,
        temperature: 0.7,
        model: 'claude-3-5-sonnet-20241022',
      }
    );

    // Validate output
    const outputValidation = validateAIOutput(response.content, {
      userIncome: context.income,
      userExpenses: context.bucketsOverspent?.reduce((sum, b) => sum + b.spent, 0),
    });

    if (!outputValidation.valid) {
      return {
        message: getFallbackResponse('dangerous_advice'),
        fromCache: false,
      };
    }

    const result: ChatResponse = {
      message: response.content,
      sources: ethicalDocs.map(doc => ({
        title: doc.title,
        category: doc.category,
        similarity: doc.similarity || 0,
      })),
      fromCache: false,
      usage: {
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
        cost: (response.usage.inputTokens / 1_000_000) * 3 + (response.usage.outputTokens / 1_000_000) * 15,
      },
    };

    // Cache the result (shorter TTL for chat)
    const contextHash = generateContextHash({ userId: context.userId });
    await setCachedResponse(
      cacheKey,
      JSON.stringify(result),
      { ttl: 1800, contextHash } // 30 minutes
    );

    return result;
  } catch (error) {
    console.error('Failed to handle chat message:', error);
    return {
      message: 'Désolé, je rencontre des difficultés. Peux-tu reformuler ta question ?',
      fromCache: false,
    };
  }
}

/**
 * Invalidate user's AI cache (call when financial data changes)
 */
export async function invalidateUserCache(userId: string): Promise<void> {
  const contextHash = generateContextHash({ userId });
  await invalidateCacheByContext(contextHash);
}
