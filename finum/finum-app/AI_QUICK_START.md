# 🚀 AI Features - Quick Start Guide

## Prerequisites

- Neon PostgreSQL database (pgvector-enabled)
- Anthropic API key
- OpenAI API key

---

## ⚡ Quick Setup (5 minutes)

### 1. Configure Environment Variables

Edit `.env.local`:

```env
# Database (Replace with your Neon credentials)
DATABASE_URL="postgresql://user:pass@host.neon.tech/finum?sslmode=require"
DIRECT_URL="postgresql://user:pass@host.neon.tech/finum?sslmode=require"

# AI Services (Get from provider consoles)
ANTHROPIC_API_KEY="sk-ant-api03-..."
OPENAI_API_KEY="sk-..."
AI_ENVIRONMENT="development"
AI_RATE_LIMIT_ENABLED="true"
AI_RATE_LIMIT_PER_HOUR="30"
```

### 2. Install Dependencies

```bash
npm install --legacy-peer-deps
```

### 3. Setup Database

```bash
# Run migrations (creates AI tables + enables pgvector)
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Seed ethical corpus (30 documents with embeddings)
npm run db:seed
```

### 4. Start Development

```bash
npm run dev
```

Visit http://localhost:3000/coach to see AI features!

---

## 🎯 What's Available

### 1. AI-Powered Weekly Reviews
- Go to `/coach` page
- See intelligent, personalized budget recommendations
- Recommendations reference your actual spending patterns

### 2. Interactive Chat Coach
- Right sidebar on `/coach` page
- Ask questions in natural French:
  - "Comment réduire mes dépenses en courses ?"
  - "Pourquoi ai-je dépassé mon budget ?"
- Responses include source citations from ethical guidelines

### 3. Auto-Categorization
```bash
# API: POST /api/transactions/categorize
{
  "transactionIds": ["tx_123", "tx_456"]
}
```

### 4. Transaction Analysis
```bash
# API: POST /api/transactions/analyze
{
  "timeframeMonths": 3
}
```

---

## 🐛 Troubleshooting

### "AI service not configured"
→ Check `.env.local` has valid API keys

### "Can't reach database"
→ Verify Neon connection string format

### Empty recommendations
→ Run `npm run db:seed` to populate ethical corpus

### Slow first response
→ Normal! First request has no cache, subsequent ones are faster

---

## 📊 Verify Setup

```bash
# Check database tables exist
npx prisma studio

# Tables to verify:
# - EthicalDocument (should have 30 rows)
# - Conversation
# - Message
# - AICache
# - TransactionEmbedding
```

---

## 💰 Cost Estimate

**Per 100 active users/month:**
- Weekly reviews: $3.60
- Chat messages: $14.00
- Categorization: $2.50
- Embeddings: $1.00
**Total: ~$21/month**

With caching, actual cost will be lower!

---

## 📚 Full Documentation

See `AI_IMPLEMENTATION_SUMMARY.md` for:
- Complete architecture details
- All API endpoints
- Service documentation
- Advanced configuration
- Monitoring & debugging

---

## 🎉 You're Ready!

AI features are live. Start testing and enjoy intelligent financial coaching!
