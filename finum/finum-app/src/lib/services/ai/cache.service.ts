/**
 * AI Cache Service - Multi-level caching for AI responses
 * Reduces API calls and costs through intelligent caching
 */

import { prisma } from '@/lib/db';
import { createHash } from 'crypto';
import NodeCache from 'node-cache';

// In-memory cache (fast, short TTL)
const memoryCache = new NodeCache({
  stdTTL: 300, // 5 minutes
  checkperiod: 60,
  useClones: false,
});

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  contextHash?: string;
}

/**
 * Generate cache key from context
 */
export function generateCacheKey(
  userId: string,
  context: Record<string, any>
): string {
  const contextString = JSON.stringify({ userId, ...context });
  return createHash('sha256').update(contextString).digest('hex');
}

/**
 * Generate hash for context (for invalidation)
 */
export function generateContextHash(context: Record<string, any>): string {
  const contextString = JSON.stringify(context);
  return createHash('md5').update(contextString).digest('hex');
}

/**
 * Get cached response (checks memory cache first, then database)
 */
export async function getCachedResponse(
  cacheKey: string
): Promise<string | null> {
  // Check memory cache first (fastest)
  const memCached = memoryCache.get<string>(cacheKey);
  if (memCached) {
    return memCached;
  }

  // Check database cache
  try {
    const cached = await prisma.aICache.findUnique({
      where: { cacheKey },
    });

    if (!cached) {
      return null;
    }

    // Check if expired
    if (cached.expiresAt < new Date()) {
      // Delete expired cache entry
      await prisma.aICache.delete({
        where: { id: cached.id },
      }).catch(() => {}); // Ignore delete errors
      return null;
    }

    // Store in memory cache for faster subsequent access
    const ttl = Math.floor((cached.expiresAt.getTime() - Date.now()) / 1000);
    if (ttl > 0) {
      memoryCache.set(cacheKey, cached.response, ttl);
    }

    return cached.response;
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
}

/**
 * Store response in cache
 */
export async function setCachedResponse(
  cacheKey: string,
  response: string,
  options: CacheOptions = {}
): Promise<void> {
  const { ttl = 3600, contextHash = '' } = options;

  // Store in memory cache
  memoryCache.set(cacheKey, response, ttl);

  // Store in database cache
  try {
    const expiresAt = new Date(Date.now() + ttl * 1000);

    await prisma.aICache.upsert({
      where: { cacheKey },
      update: {
        response,
        contextHash,
        expiresAt,
        metadata: {
          lastAccessed: new Date().toISOString(),
        },
      },
      create: {
        cacheKey,
        response,
        contextHash,
        expiresAt,
        metadata: {
          created: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    console.error('Cache set error:', error);
    // Non-blocking error - memory cache still works
  }
}

/**
 * Invalidate cache by context hash (e.g., when user data changes)
 */
export async function invalidateCacheByContext(
  contextHash: string
): Promise<number> {
  try {
    const result = await prisma.aICache.deleteMany({
      where: { contextHash },
    });

    // Clear relevant entries from memory cache
    // Note: This clears ALL memory cache for simplicity
    memoryCache.flushAll();

    return result.count;
  } catch (error) {
    console.error('Cache invalidation error:', error);
    return 0;
  }
}

/**
 * Invalidate specific cache key
 */
export async function invalidateCache(cacheKey: string): Promise<void> {
  // Remove from memory cache
  memoryCache.del(cacheKey);

  // Remove from database cache
  try {
    await prisma.aICache.delete({
      where: { cacheKey },
    }).catch(() => {}); // Ignore if not found
  } catch (error) {
    console.error('Cache invalidation error:', error);
  }
}

/**
 * Clean up expired cache entries (run periodically)
 */
export async function cleanExpiredCache(): Promise<number> {
  try {
    const result = await prisma.aICache.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    return result.count;
  } catch (error) {
    console.error('Cache cleanup error:', error);
    return 0;
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  memoryKeys: number;
  memoryHits: number;
  memoryMisses: number;
  dbEntries: number;
  dbExpired: number;
}> {
  const memStats = memoryCache.getStats();

  try {
    const dbTotal = await prisma.aICache.count();
    const dbExpired = await prisma.aICache.count({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    return {
      memoryKeys: memoryCache.keys().length,
      memoryHits: memStats.hits,
      memoryMisses: memStats.misses,
      dbEntries: dbTotal,
      dbExpired,
    };
  } catch (error) {
    console.error('Cache stats error:', error);
    return {
      memoryKeys: memoryCache.keys().length,
      memoryHits: memStats.hits,
      memoryMisses: memStats.misses,
      dbEntries: 0,
      dbExpired: 0,
    };
  }
}

/**
 * Flush all caches (memory and database)
 */
export async function flushAllCaches(): Promise<void> {
  memoryCache.flushAll();

  try {
    await prisma.aICache.deleteMany({});
  } catch (error) {
    console.error('Cache flush error:', error);
  }
}
