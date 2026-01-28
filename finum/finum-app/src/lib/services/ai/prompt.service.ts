/**
 * Prompt Service - Structured prompt templates and engineering
 * Manages all AI prompts with consistent formatting and context injection
 */

export interface UserFinancialContext {
  userId: string;
  income?: number;
  totalBudget?: number;
  bucketsOverspent?: Array<{
    name: string;
    allocated: number;
    spent: number;
    overspend: number;
  }>;
  recentTransactions?: Array<{
    date: string;
    merchant: string;
    amount: number;
    category?: string;
  }>;
  patterns?: Array<{
    merchant: string;
    frequency: string;
    avgAmount: number;
    projectedAnnual: number;
  }>;
}

/**
 * System prompt for the Finum financial coach
 */
export function getCoachSystemPrompt(): string {
  return `Tu es le coach financier de Finum, une application française d'aide à la gestion budgétaire.

## Ton rôle
Tu aides les utilisateurs à mieux gérer leur argent de manière éthique, transparente et bienveillante.

## Principes éthiques
1. **Transparence**: Explique toujours ton raisonnement
2. **Autonomie**: Propose des choix, ne force jamais
3. **Bienveillance**: Encourage sans juger
4. **Réalisme**: Reste pragmatique et contextuel
5. **Sécurité**: Ne demande JAMAIS d'informations sensibles (mots de passe, numéros de compte)

## Style de communication
- Tutoiement (français informel mais respectueux)
- Phrases courtes et claires
- Exemples concrets
- Ton encourageant et positif
- Évite le jargon technique

## Interdictions absolues
- ❌ Conseiller d'emprunter pour investir
- ❌ Garantir des rendements
- ❌ Donner des conseils d'investissement complexes
- ❌ Critiquer ou juger les choix passés
- ❌ Demander des informations sensibles

## Ce que tu dois faire
- ✅ Analyser les données financières fournies
- ✅ Identifier les patterns de dépenses
- ✅ Suggérer des ajustements réalistes
- ✅ Expliquer le "pourquoi" de tes recommandations
- ✅ Citer les données sources ("selon tes dépenses de janvier...")
- ✅ Proposer plusieurs options quand c'est possible

## Format de réponse
Utilise le markdown pour structurer:
- **Gras** pour les points importants
- Listes à puces pour les recommandations
- Émojis occasionnels (💰 💡 📊) pour rendre agréable

Réponds toujours en français.`;
}

/**
 * Generate weekly review prompt with user context
 */
export function getWeeklyReviewPrompt(
  context: UserFinancialContext,
  ethicalGuidelines: string[]
): string {
  const {
    income,
    totalBudget,
    bucketsOverspent = [],
    recentTransactions = [],
    patterns = [],
  } = context;

  const hasOverspending = bucketsOverspent.length > 0;
  const totalOverspend = bucketsOverspent.reduce((sum, b) => sum + b.overspend, 0);

  let prompt = `# Contexte financier de l'utilisateur\n\n`;

  if (income) {
    prompt += `**Revenu mensuel**: ${income}€\n`;
  }

  if (totalBudget) {
    prompt += `**Budget total**: ${totalBudget}€\n`;
  }

  if (hasOverspending) {
    prompt += `\n## ⚠️ Buckets en dépassement (${bucketsOverspent.length})\n\n`;
    bucketsOverspent.forEach(bucket => {
      const percentage = ((bucket.spent / bucket.allocated) * 100).toFixed(0);
      prompt += `- **${bucket.name}**: ${bucket.spent}€ / ${bucket.allocated}€ (${percentage}%, +${bucket.overspend}€)\n`;
    });
    prompt += `\n**Dépassement total**: ${totalOverspend.toFixed(2)}€\n`;
  }

  if (recentTransactions.length > 0) {
    prompt += `\n## Transactions récentes (30 derniers jours)\n\n`;
    const topTransactions = recentTransactions.slice(0, 10);
    topTransactions.forEach(tx => {
      prompt += `- ${tx.date}: ${tx.merchant} - ${tx.amount}€${tx.category ? ` (${tx.category})` : ''}\n`;
    });
  }

  if (patterns.length > 0) {
    prompt += `\n## Dépenses récurrentes détectées\n\n`;
    patterns.slice(0, 5).forEach(pattern => {
      prompt += `- **${pattern.merchant}**: ${pattern.frequency}, ~${pattern.avgAmount}€/mois (${pattern.projectedAnnual}€/an)\n`;
    });
  }

  if (ethicalGuidelines.length > 0) {
    prompt += `\n---\n\n# Guidelines éthiques pertinentes\n\n`;
    ethicalGuidelines.forEach((guideline, idx) => {
      prompt += `### Guideline ${idx + 1}\n${guideline}\n\n`;
    });
  }

  prompt += `\n---\n\n# Ta mission

Génère une revue hebdomadaire personnalisée pour cet utilisateur.

**Structure attendue**:

1. **Résumé de la situation** (2-3 phrases)
   - État général du budget
   - Points positifs ou préoccupants

2. **Recommandations prioritaires** (3-5 actions)
   - Chaque recommandation doit:
     * Être spécifique et actionnable
     * Expliquer le "pourquoi"
     * Citer les données sources
     * Donner un impact estimé

3. **Insights** (optionnel)
   - Patterns intéressants détectés
   - Opportunités d'optimisation

**Ton**: Bienveillant, encourageant, pragmatique.
**Format**: Markdown structuré.
`;

  return prompt;
}

/**
 * Generate chat message prompt with conversation context
 */
export function getChatPrompt(
  userMessage: string,
  context: UserFinancialContext,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  relevantGuidelines: string[]
): string {
  let prompt = `# Contexte utilisateur\n\n`;

  if (context.income) {
    prompt += `- Revenu mensuel: ${context.income}€\n`;
  }

  if (context.totalBudget) {
    prompt += `- Budget total: ${context.totalBudget}€\n`;
  }

  if (context.bucketsOverspent && context.bucketsOverspent.length > 0) {
    prompt += `- Buckets en dépassement: ${context.bucketsOverspent.map(b => b.name).join(', ')}\n`;
  }

  if (context.recentTransactions && context.recentTransactions.length > 0) {
    prompt += `\n## Transactions récentes (extrait)\n`;
    context.recentTransactions.slice(0, 5).forEach(tx => {
      prompt += `- ${tx.merchant}: ${tx.amount}€\n`;
    });
  }

  if (relevantGuidelines.length > 0) {
    prompt += `\n## Guidelines pertinentes\n\n`;
    relevantGuidelines.forEach(g => prompt += `${g}\n\n`);
  }

  if (conversationHistory.length > 0) {
    prompt += `\n## Historique de conversation\n\n`;
    conversationHistory.slice(-5).forEach(msg => {
      prompt += `**${msg.role === 'user' ? 'Utilisateur' : 'Coach'}**: ${msg.content}\n\n`;
    });
  }

  prompt += `\n---\n\n# Question de l'utilisateur\n\n${userMessage}\n\n`;
  prompt += `Réponds de manière personnalisée en utilisant les données financières de l'utilisateur. Sois concis mais utile.`;

  return prompt;
}

/**
 * Generate transaction categorization prompt
 */
export function getCategorizationPrompt(
  transactions: Array<{
    merchant: string;
    description?: string;
    amount: number;
  }>,
  existingCategories: string[]
): string {
  let prompt = `# Catégorisation de transactions\n\n`;
  prompt += `Analyse ces transactions et suggère la catégorie la plus appropriée.\n\n`;
  prompt += `**Catégories disponibles**: ${existingCategories.join(', ')}\n\n`;
  prompt += `## Transactions à catégoriser\n\n`;

  transactions.forEach((tx, idx) => {
    prompt += `${idx + 1}. ${tx.merchant}${tx.description ? ` - ${tx.description}` : ''} (${tx.amount}€)\n`;
  });

  prompt += `\n**Format de réponse**: JSON array avec { "index": number, "category": string, "confidence": number }\n`;
  prompt += `Exemple: [{"index": 0, "category": "Alimentation", "confidence": 0.95}]`;

  return prompt;
}

/**
 * Extract structured recommendations from AI response
 */
export interface Recommendation {
  title: string;
  description: string;
  reasoning: string;
  impact?: string;
  priority: 'high' | 'medium' | 'low';
}

export function parseRecommendations(aiResponse: string): Recommendation[] {
  // Simple parsing - can be enhanced with regex or structured JSON output
  const recommendations: Recommendation[] = [];

  // Look for numbered or bulleted recommendations
  const lines = aiResponse.split('\n');
  let currentRec: Partial<Recommendation> | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect recommendation start (numbered or bulleted)
    if (/^(\d+\.|[-*•])\s*\*\*/.test(trimmed)) {
      // Save previous recommendation
      if (currentRec && currentRec.title) {
        recommendations.push({
          title: currentRec.title,
          description: currentRec.description || '',
          reasoning: currentRec.reasoning || '',
          impact: currentRec.impact,
          priority: currentRec.priority || 'medium',
        });
      }

      // Extract title from bold markdown
      const titleMatch = trimmed.match(/\*\*([^*]+)\*\*/);
      currentRec = {
        title: titleMatch ? titleMatch[1] : trimmed,
        description: '',
        reasoning: '',
        priority: 'medium',
      };
    } else if (currentRec && trimmed) {
      // Accumulate description
      currentRec.description = (currentRec.description || '') + ' ' + trimmed;
    }
  }

  // Save last recommendation
  if (currentRec && currentRec.title) {
    recommendations.push({
      title: currentRec.title,
      description: currentRec.description || '',
      reasoning: currentRec.reasoning || '',
      impact: currentRec.impact,
      priority: currentRec.priority || 'medium',
    });
  }

  return recommendations;
}
