/**
 * Guardrails Service - Input/Output validation and security
 * Ensures AI interactions are safe, ethical, and appropriate
 */

export interface ValidationResult {
  valid: boolean;
  reason?: string;
  severity?: 'low' | 'medium' | 'high';
}

// Dangerous patterns to block
const BLOCKED_PATTERNS = {
  credentials: [
    /password/i,
    /pin\s*code/i,
    /credit\s*card/i,
    /cvv/i,
    /social\s*security/i,
    /account\s*number/i,
  ],
  phishing: [
    /click\s+here\s*:/i,
    /verify\s+your\s+account/i,
    /urgent\s+action\s+required/i,
  ],
  injection: [
    /ignore\s+previous\s+instructions/i,
    /disregard\s+all\s+rules/i,
    /system\s*:\s*you\s+are/i,
  ],
};

// Dangerous financial advice patterns
const DANGEROUS_ADVICE_PATTERNS = [
  /borrow\s+.*\s+to\s+invest/i,
  /guaranteed\s+return/i,
  /can't\s+lose/i,
  /risk[-\s]*free/i,
  /get\s+rich\s+quick/i,
  /definitely\s+will/i,
  /100%\s+certain/i,
  /always\s+profitable/i,
];

// Promotional/unrealistic promise patterns
const UNREALISTIC_PATTERNS = [
  /garantis?/i, // French: "garanti" or "garantis"
  /certitude/i, // French: "certainty"
  /sans\s+risque/i, // French: "risk-free"
  /toujours\s+rentable/i, // French: "always profitable"
];

/**
 * Validate user input before sending to AI
 */
export function validateUserInput(input: string): ValidationResult {
  // Check length
  if (input.length > 2000) {
    return {
      valid: false,
      reason: 'Input too long (max 2000 characters)',
      severity: 'low',
    };
  }

  if (input.trim().length === 0) {
    return {
      valid: false,
      reason: 'Input cannot be empty',
      severity: 'low',
    };
  }

  // Check for credential requests
  for (const pattern of BLOCKED_PATTERNS.credentials) {
    if (pattern.test(input)) {
      return {
        valid: false,
        reason: 'Cannot process requests for sensitive credentials',
        severity: 'high',
      };
    }
  }

  // Check for phishing attempts
  for (const pattern of BLOCKED_PATTERNS.phishing) {
    if (pattern.test(input)) {
      return {
        valid: false,
        reason: 'Suspicious content detected',
        severity: 'high',
      };
    }
  }

  // Check for prompt injection attempts
  for (const pattern of BLOCKED_PATTERNS.injection) {
    if (pattern.test(input)) {
      return {
        valid: false,
        reason: 'Invalid input format',
        severity: 'high',
      };
    }
  }

  return { valid: true };
}

/**
 * Validate AI output before returning to user
 */
export function validateAIOutput(output: string, context: {
  userIncome?: number;
  userExpenses?: number;
}): ValidationResult {
  // Check for dangerous financial advice
  for (const pattern of DANGEROUS_ADVICE_PATTERNS) {
    if (pattern.test(output)) {
      return {
        valid: false,
        reason: 'Response contains potentially dangerous financial advice',
        severity: 'high',
      };
    }
  }

  // Check for unrealistic promises
  for (const pattern of UNREALISTIC_PATTERNS) {
    if (pattern.test(output)) {
      return {
        valid: false,
        reason: 'Response contains unrealistic promises',
        severity: 'medium',
      };
    }
  }

  // Check for contextual coherence
  if (context.userIncome && context.userExpenses) {
    const monthlyAvailable = context.userIncome - context.userExpenses;

    // Look for unrealistic savings suggestions
    const savingsMatch = output.match(/économiser?\s+(\d+)\s*€/i);
    if (savingsMatch) {
      const suggestedSavings = parseInt(savingsMatch[1], 10);
      if (suggestedSavings > monthlyAvailable * 0.8) {
        return {
          valid: false,
          reason: 'Savings suggestion exceeds realistic capacity',
          severity: 'medium',
        };
      }
    }
  }

  // Check output length (should not be empty or too short)
  if (output.trim().length < 10) {
    return {
      valid: false,
      reason: 'Response too short or empty',
      severity: 'low',
    };
  }

  return { valid: true };
}

/**
 * Sanitize user input (remove potentially harmful content)
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
    .replace(/<[^>]+>/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .substring(0, 2000); // Enforce max length
}

/**
 * Check if response requires human review
 */
export function requiresHumanReview(output: string): boolean {
  const reviewKeywords = [
    /consultation\s+professionnelle/i,
    /conseiller\s+financier/i,
    /situation\s+complexe/i,
    /expert/i,
    /avocat/i,
    /situation\s+grave/i,
  ];

  return reviewKeywords.some(pattern => pattern.test(output));
}

/**
 * Generate safe fallback response
 */
export function getFallbackResponse(reason: string): string {
  const fallbacks: Record<string, string> = {
    credentials: 'Je ne peux pas vous aider avec des informations sensibles comme les mots de passe ou numéros de compte. Pour votre sécurité, ne partagez jamais ces informations.',
    dangerous_advice: 'Je ne peux pas fournir ce type de conseil financier. Pour des décisions importantes, consultez un conseiller financier professionnel.',
    unrealistic: 'Mes suggestions doivent être réalistes. Analysons ensemble votre situation de manière pragmatique.',
    empty: 'Pouvez-vous reformuler votre question ? Je n\'ai pas bien compris.',
    default: 'Je ne peux pas répondre à cette demande. Comment puis-je vous aider autrement avec votre budget ?',
  };

  return fallbacks[reason] || fallbacks.default;
}

/**
 * Rate limiting check (simple in-memory counter)
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(userId: string): ValidationResult {
  const enabled = process.env.AI_RATE_LIMIT_ENABLED === 'true';
  if (!enabled) {
    return { valid: true };
  }

  const limit = parseInt(process.env.AI_RATE_LIMIT_PER_HOUR || '30', 10);
  const now = Date.now();
  const hourMs = 60 * 60 * 1000;

  const userLimit = rateLimitStore.get(userId);

  if (!userLimit || now > userLimit.resetAt) {
    // Create new counter
    rateLimitStore.set(userId, {
      count: 1,
      resetAt: now + hourMs,
    });
    return { valid: true };
  }

  if (userLimit.count >= limit) {
    return {
      valid: false,
      reason: `Rate limit exceeded. Please try again in ${Math.ceil((userLimit.resetAt - now) / 60000)} minutes.`,
      severity: 'low',
    };
  }

  // Increment counter
  userLimit.count++;
  rateLimitStore.set(userId, userLimit);

  return { valid: true };
}

/**
 * Clean up expired rate limit entries (call periodically)
 */
export function cleanupRateLimits(): void {
  const now = Date.now();
  for (const [userId, data] of rateLimitStore.entries()) {
    if (now > data.resetAt) {
      rateLimitStore.delete(userId);
    }
  }
}
