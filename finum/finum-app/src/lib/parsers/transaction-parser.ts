import { z } from 'zod'
import { parseCSV, mapColumnName } from './csv-parser'

/**
 * Transaction CSV schema
 */
export const TransactionCSVSchema = z.object({
  date: z.string().transform((val) => {
    // Support multiple date formats
    const formats = [
      /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
      /^\d{2}\/\d{2}\/\d{4}$/, // DD/MM/YYYY
      /^\d{2}-\d{2}-\d{4}$/, // DD-MM-YYYY
    ]

    const isValid = formats.some((format) => format.test(val))
    if (!isValid) {
      throw new Error('Invalid date format. Expected: YYYY-MM-DD, DD/MM/YYYY, or DD-MM-YYYY')
    }

    // Convert to ISO format
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(val)) {
      const [day, month, year] = val.split('/')
      return new Date(`${year}-${month}-${day}`).toISOString()
    }
    if (/^\d{2}-\d{2}-\d{4}$/.test(val)) {
      const [day, month, year] = val.split('-')
      return new Date(`${year}-${month}-${day}`).toISOString()
    }
    return new Date(val).toISOString()
  }),
  amount: z
    .union([z.string(), z.number()])
    .transform((val) => {
      const str = String(val).replace(/[^\d.,-]/g, '').replace(',', '.')
      const num = parseFloat(str)
      if (isNaN(num)) throw new Error('Invalid amount')
      return Math.abs(num) // Always positive
    }),
  merchant: z.string().min(1, 'Merchant is required'),
  description: z.string().optional(),
  currency: z.string().default('EUR').transform((val) => val.toUpperCase()),
  category: z.string().optional(),
})

export type TransactionCSVRow = z.infer<typeof TransactionCSVSchema>

/**
 * Normalize merchant name for pattern detection
 */
export function normalizeMerchant(merchant: string): string {
  return merchant
    .toLowerCase()
    .trim()
    // Remove common prefixes/suffixes
    .replace(/^(le|la|les|l'|un|une)\s+/gi, '')
    .replace(/\s+(sarl|sas|sa|eurl|sci)$/gi, '')
    // Remove numbers and special chars at the end (often transaction IDs)
    .replace(/[\d\s\-_]+$/, '')
    // Remove multiple spaces
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Generate transaction hash for deduplication
 */
export function generateTransactionHash(
  date: string,
  amount: number,
  merchant: string
): string {
  const data = `${date}|${amount}|${normalizeMerchant(merchant)}`
  // Simple hash (in production, use crypto.createHash)
  return Buffer.from(data).toString('base64')
}

/**
 * Parse transaction CSV file
 */
export async function parseTransactionCSV(file: File) {
  // First pass: map column names
  const reader = new FileReader()
  const text = await new Promise<string>((resolve) => {
    reader.onload = (e) => resolve(e.target?.result as string)
    reader.readAsText(file)
  })

  const lines = text.split('\n')
  const headers = lines[0]?.split(',').map(mapColumnName) || []
  const mappedText = [headers.join(','), ...lines.slice(1)].join('\n')

  // Create a new file with mapped headers
  const mappedFile = new File([mappedText], file.name, { type: 'text/csv' })

  // Parse with schema
  const result = await parseCSV(mappedFile, TransactionCSVSchema)

  // Add normalized merchant and hash
  const dataWithMeta = result.data.map((row) => ({
    ...row,
    merchantNorm: normalizeMerchant(row.merchant),
    hash: generateTransactionHash(row.date, row.amount, row.merchant),
  }))

  return {
    ...result,
    data: dataWithMeta,
  }
}

/**
 * Detect recurring patterns in transactions
 */
export function detectRecurringPatterns(
  transactions: Array<{ date: string; amount: number; merchantNorm: string }>
) {
  // Group by normalized merchant
  const byMerchant = new Map<
    string,
    Array<{ date: Date; amount: number }>
  >()

  transactions.forEach((t) => {
    if (!byMerchant.has(t.merchantNorm)) {
      byMerchant.set(t.merchantNorm, [])
    }
    byMerchant.get(t.merchantNorm)!.push({
      date: new Date(t.date),
      amount: t.amount,
    })
  })

  // Detect patterns
  const patterns: Array<{
    merchantNorm: string
    frequency: 'weekly' | 'monthly' | 'quarterly'
    avgAmount: number
    count: number
  }> = []

  byMerchant.forEach((txs, merchant) => {
    if (txs.length < 2) return // Need at least 2 transactions

    // Sort by date
    txs.sort((a, b) => a.date.getTime() - b.date.getTime())

    // Calculate average interval in days
    const intervals: number[] = []
    for (let i = 1; i < txs.length; i++) {
      const days =
        (txs[i].date.getTime() - txs[i - 1].date.getTime()) /
        (1000 * 60 * 60 * 24)
      intervals.push(days)
    }

    const avgInterval =
      intervals.reduce((sum, val) => sum + val, 0) / intervals.length

    // Determine frequency
    let frequency: 'weekly' | 'monthly' | 'quarterly' | null = null
    if (avgInterval >= 6 && avgInterval <= 8) frequency = 'weekly'
    else if (avgInterval >= 28 && avgInterval <= 32) frequency = 'monthly'
    else if (avgInterval >= 88 && avgInterval <= 95) frequency = 'quarterly'

    if (frequency) {
      const avgAmount =
        txs.reduce((sum, t) => sum + t.amount, 0) / txs.length

      patterns.push({
        merchantNorm: merchant,
        frequency,
        avgAmount: Math.round(avgAmount * 100) / 100,
        count: txs.length,
      })
    }
  })

  return patterns
}
