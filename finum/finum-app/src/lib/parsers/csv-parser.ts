import Papa from 'papaparse'
import { z } from 'zod'

export interface CSVParseResult<T> {
  data: T[]
  errors: Array<{ row: number; field: string; message: string }>
  meta: {
    totalRows: number
    validRows: number
    invalidRows: number
  }
}

export interface CSVColumn {
  name: string
  required: boolean
  validator?: (value: any) => boolean
  transform?: (value: any) => any
}

/**
 * Parse CSV file with validation
 */
export function parseCSV<T>(
  file: File | string,
  schema: z.ZodSchema<T>
): Promise<CSVParseResult<T>> {
  return new Promise((resolve) => {
    const errors: Array<{ row: number; field: string; message: string }> = []
    const validData: T[] = []

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase(),
      complete: (results) => {
        results.data.forEach((row: any, index: number) => {
          try {
            const validated = schema.parse(row)
            validData.push(validated)
          } catch (error) {
            if (error instanceof z.ZodError) {
              error.errors.forEach((err) => {
                errors.push({
                  row: index + 2, // +2 because: 0-indexed + header row
                  field: err.path.join('.'),
                  message: err.message,
                })
              })
            }
          }
        })

        resolve({
          data: validData,
          errors,
          meta: {
            totalRows: results.data.length,
            validRows: validData.length,
            invalidRows: errors.length,
          },
        })
      },
      error: (error) => {
        resolve({
          data: [],
          errors: [
            {
              row: 0,
              field: 'file',
              message: error.message,
            },
          ],
          meta: {
            totalRows: 0,
            validRows: 0,
            invalidRows: 1,
          },
        })
      },
    })
  })
}

/**
 * Detect CSV delimiter
 */
export function detectDelimiter(sample: string): string {
  const delimiters = [',', ';', '\t', '|']
  const counts = delimiters.map((delimiter) => ({
    delimiter,
    count: sample.split('\n')[0]?.split(delimiter).length || 0,
  }))

  return counts.sort((a, b) => b.count - a.count)[0]?.delimiter || ','
}

/**
 * Normalize column names (remove accents, spaces, special chars)
 */
export function normalizeColumnName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

/**
 * Map common column name variations to standard names
 */
export function mapColumnName(name: string): string {
  const normalized = normalizeColumnName(name)

  const mappings: Record<string, string> = {
    // Budget mappings
    nom: 'name',
    montant: 'amount',
    somme: 'amount',
    total: 'amount',
    budget: 'amount',
    categorie: 'category',
    type: 'category',
    periode: 'period',

    // Transaction mappings
    date: 'date',
    jour: 'date',
    marchand: 'merchant',
    commercant: 'merchant',
    magasin: 'merchant',
    description: 'description',
    libelle: 'description',
    commentaire: 'description',
    devise: 'currency',
    monnaie: 'currency',
  }

  return mappings[normalized] || normalized
}

/**
 * Preview CSV file (first N rows)
 */
export function previewCSV(
  file: File,
  maxRows: number = 5
): Promise<{ headers: string[]; rows: any[] }> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      preview: maxRows,
      skipEmptyLines: true,
      complete: (results) => {
        resolve({
          headers: results.meta.fields || [],
          rows: results.data,
        })
      },
      error: (error) => {
        reject(error)
      },
    })
  })
}
