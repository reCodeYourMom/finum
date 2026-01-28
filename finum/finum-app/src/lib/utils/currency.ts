/**
 * Currency conversion utilities
 * Uses European Central Bank API for exchange rates
 */

export interface ExchangeRate {
  base: string
  date: string
  rates: Record<string, number>
}

// Cache for exchange rates (1 hour TTL)
const ratesCache = new Map<string, { data: ExchangeRate; timestamp: number }>()
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

/**
 * Fetch latest exchange rates from ECB
 */
export async function fetchExchangeRates(
  base: string = 'EUR'
): Promise<ExchangeRate> {
  const cacheKey = `rates_${base}`
  const cached = ratesCache.get(cacheKey)

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  try {
    // Use exchangerate-api.com (free tier)
    const response = await fetch(
      `https://api.exchangerate-api.com/v4/latest/${base}`
    )

    if (!response.ok) {
      throw new Error('Failed to fetch exchange rates')
    }

    const data = await response.json()

    const rates: ExchangeRate = {
      base: data.base,
      date: data.date,
      rates: data.rates,
    }

    ratesCache.set(cacheKey, { data: rates, timestamp: Date.now() })

    return rates
  } catch (error) {
    console.error('Failed to fetch exchange rates:', error)

    // Fallback to static rates if API fails
    return {
      base: 'EUR',
      date: new Date().toISOString().split('T')[0],
      rates: {
        EUR: 1,
        USD: 1.1,
        GBP: 0.86,
        CHF: 0.97,
        CAD: 1.46,
        JPY: 162,
      },
    }
  }
}

/**
 * Convert amount from one currency to another
 */
export async function convertCurrency(
  amount: number,
  from: string,
  to: string = 'EUR'
): Promise<number> {
  if (from === to) return amount

  const rates = await fetchExchangeRates(from)

  if (!rates.rates[to]) {
    throw new Error(`Exchange rate not found for ${to}`)
  }

  return amount * rates.rates[to]
}

/**
 * Convert amount to EUR (base currency)
 */
export async function toEUR(amount: number, from: string): Promise<number> {
  return convertCurrency(amount, from, 'EUR')
}

/**
 * Format amount with currency symbol
 */
export function formatCurrency(
  amount: number,
  currency: string = 'EUR',
  locale: string = 'fr-FR'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Parse currency string to number
 */
export function parseCurrency(value: string): number {
  // Remove currency symbols and spaces
  const cleaned = value.replace(/[^0-9.,\-]/g, '').replace(/,/g, '.')

  const num = parseFloat(cleaned)

  if (isNaN(num)) {
    throw new Error(`Invalid currency value: ${value}`)
  }

  return num
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    EUR: '€',
    USD: '$',
    GBP: '£',
    CHF: 'CHF',
    CAD: 'CA$',
    JPY: '¥',
  }

  return symbols[currency] || currency
}

/**
 * List of supported currencies
 */
export const SUPPORTED_CURRENCIES = [
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
] as const
