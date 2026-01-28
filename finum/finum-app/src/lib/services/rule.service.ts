import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export type RuleType = 'merchant' | 'category' | 'amount_range' | 'merchant_category'

export interface RuleCondition {
  merchant?: string
  merchantContains?: string
  category?: string
  minAmount?: number
  maxAmount?: number
}

export interface RuleCreateInput {
  bucketId: string
  type: RuleType
  condition: RuleCondition
  priority?: number
}

export interface RuleUpdateInput {
  type?: RuleType
  condition?: RuleCondition
  priority?: number
}

export interface Transaction {
  id: string
  merchantNorm: string
  merchant: string
  category?: string | null
  amount: number | Prisma.Decimal
  amountEur?: number | Prisma.Decimal | null
}

/**
 * Créer une nouvelle règle
 */
export async function createRule(data: RuleCreateInput) {
  return prisma.rule.create({
    data: {
      bucketId: data.bucketId,
      type: data.type,
      condition: data.condition as Prisma.InputJsonValue,
      priority: data.priority || 0,
    },
    include: {
      bucket: {
        select: {
          id: true,
          name: true,
          allocated: true,
          spent: true,
        },
      },
    },
  })
}

/**
 * Récupérer toutes les règles d'un bucket
 */
export async function getRulesByBucket(bucketId: string) {
  return prisma.rule.findMany({
    where: { bucketId },
    include: {
      bucket: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { priority: 'desc' },
  })
}

/**
 * Récupérer toutes les règles d'un utilisateur (via ses buckets)
 */
export async function getRulesByUser(userId: string) {
  return prisma.rule.findMany({
    where: {
      bucket: {
        userId,
      },
    },
    include: {
      bucket: {
        select: {
          id: true,
          name: true,
          userId: true,
        },
      },
    },
    orderBy: { priority: 'desc' },
  })
}

/**
 * Mettre à jour une règle
 */
export async function updateRule(ruleId: string, data: RuleUpdateInput) {
  return prisma.rule.update({
    where: { id: ruleId },
    data: {
      ...(data.type && { type: data.type }),
      ...(data.condition && { condition: data.condition as Prisma.InputJsonValue }),
      ...(data.priority !== undefined && { priority: data.priority }),
    },
    include: {
      bucket: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })
}

/**
 * Supprimer une règle
 */
export async function deleteRule(ruleId: string) {
  return prisma.rule.delete({
    where: { id: ruleId },
  })
}

/**
 * Vérifier si une transaction match une règle
 */
export function matchRule(
  rule: { type: string; condition: unknown },
  transaction: Transaction
): boolean {
  const condition = rule.condition as RuleCondition

  switch (rule.type) {
    case 'merchant': {
      if (!condition.merchant) return false
      const merchantLower = condition.merchant.toLowerCase()
      const transactionMerchant = (transaction.merchantNorm || transaction.merchant).toLowerCase()
      return transactionMerchant === merchantLower
    }

    case 'merchant_category': {
      // Match si merchant ET category correspondent
      let merchantMatch = true
      let categoryMatch = true

      if (condition.merchantContains) {
        const searchTerm = condition.merchantContains.toLowerCase()
        const transactionMerchant = (transaction.merchantNorm || transaction.merchant).toLowerCase()
        merchantMatch = transactionMerchant.includes(searchTerm)
      }

      if (condition.category) {
        const categoryLower = condition.category.toLowerCase()
        const transactionCategory = (transaction.category || '').toLowerCase()
        categoryMatch = transactionCategory === categoryLower
      }

      return merchantMatch && categoryMatch
    }

    case 'category': {
      if (!condition.category) return false
      const categoryLower = condition.category.toLowerCase()
      const transactionCategory = (transaction.category || '').toLowerCase()
      return transactionCategory === categoryLower
    }

    case 'amount_range': {
      const amount = Number(transaction.amountEur || transaction.amount)
      const min = condition.minAmount ?? -Infinity
      const max = condition.maxAmount ?? Infinity
      return amount >= min && amount <= max
    }

    default:
      return false
  }
}

/**
 * Appliquer les règles à une transaction et retourner le bucketId correspondant
 * Retourne null si aucune règle ne match
 */
export async function applyRules(
  userId: string,
  transaction: Transaction
): Promise<string | null> {
  // Récupérer toutes les règles de l'utilisateur, triées par priorité
  const rules = await getRulesByUser(userId)

  // Parcourir les règles par ordre de priorité (décroissant)
  for (const rule of rules) {
    if (matchRule(rule, transaction)) {
      return rule.bucketId
    }
  }

  return null
}

/**
 * Appliquer les règles à plusieurs transactions et retourner un mapping
 */
export async function applyRulesToMany(
  userId: string,
  transactions: Transaction[]
): Promise<Map<string, string | null>> {
  const rules = await getRulesByUser(userId)
  const mapping = new Map<string, string | null>()

  for (const transaction of transactions) {
    let bucketId: string | null = null

    for (const rule of rules) {
      if (matchRule(rule, transaction)) {
        bucketId = rule.bucketId
        break
      }
    }

    mapping.set(transaction.id, bucketId)
  }

  return mapping
}

/**
 * Créer automatiquement une règle depuis une transaction assignée manuellement
 */
export async function createRuleFromTransaction(
  transactionId: string,
  bucketId: string,
  ruleType: 'merchant' | 'category' = 'merchant'
) {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    select: {
      merchantNorm: true,
      merchant: true,
      category: true,
    },
  })

  if (!transaction) {
    throw new Error('Transaction not found')
  }

  const condition: RuleCondition = {}

  if (ruleType === 'merchant') {
    condition.merchant = transaction.merchantNorm || transaction.merchant
  } else if (ruleType === 'category' && transaction.category) {
    condition.category = transaction.category
  } else {
    throw new Error('Cannot create rule: missing category')
  }

  // Vérifier si une règle similaire existe déjà
  const existingRules = await getRulesByBucket(bucketId)
  const duplicate = existingRules.find((rule) => {
    const c = rule.condition as RuleCondition
    return (
      rule.type === ruleType &&
      ((ruleType === 'merchant' && c.merchant === condition.merchant) ||
        (ruleType === 'category' && c.category === condition.category))
    )
  })

  if (duplicate) {
    throw new Error('Une règle similaire existe déjà')
  }

  return createRule({
    bucketId,
    type: ruleType,
    condition,
    priority: 0,
  })
}

/**
 * Obtenir les transactions non assignées d'un utilisateur
 */
export async function getUnassignedTransactions(userId: string, limit = 50) {
  return prisma.transaction.findMany({
    where: {
      userId,
      bucketId: null,
    },
    orderBy: { date: 'desc' },
    take: limit,
  })
}

/**
 * Obtenir les stats des règles (combien de transactions assignées par règle)
 */
export async function getRulesStats(userId: string) {
  const rules = await getRulesByUser(userId)
  const stats = []

  for (const rule of rules) {
    const transactionCount = await prisma.transaction.count({
      where: {
        userId,
        bucketId: rule.bucketId,
      },
    })

    stats.push({
      ruleId: rule.id,
      bucketId: rule.bucketId,
      bucketName: rule.bucket.name,
      type: rule.type,
      condition: rule.condition,
      priority: rule.priority,
      transactionCount,
    })
  }

  return stats
}
