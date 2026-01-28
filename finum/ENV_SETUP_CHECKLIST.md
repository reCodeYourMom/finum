# Checklist Variables d'Environnement - Finum

**Pour démarrer rapidement** - Copier `.env.example` vers `.env.local` et remplir ces valeurs.

---

## ⚠️ OBLIGATOIRE (App ne démarre pas sans)

### 1. Base de Données Neon

```bash
DATABASE_URL="postgresql://username:password@ep-xxx.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://username:password@ep-xxx.neon.tech/neondb?sslmode=require"
```

**Où obtenir:**
1. Créer un compte sur https://neon.tech
2. Créer un nouveau projet
3. Copier la connection string (cocher "Include password")
4. Activer pgvector: `CREATE EXTENSION IF NOT EXISTS vector;`

---

### 2. Authentication Secret

```bash
AUTH_SECRET="METTRE_LE_RESULTAT_CI_DESSOUS"
```

**Comment générer:**
```bash
openssl rand -base64 32
```

---

### 3. URL Application

```bash
AUTH_URL="http://localhost:3000"
```

**En production:** Remplacer par `https://votre-domaine.vercel.app`

---

### 4. Google OAuth

```bash
AUTH_GOOGLE_ID="xxxx.apps.googleusercontent.com"
AUTH_GOOGLE_SECRET="GOCSPX-xxxx"
```

**Où obtenir:**
1. Aller sur https://console.cloud.google.com
2. Créer un projet (ou sélectionner existant)
3. APIs & Services > Library > Activer "Google+ API"
4. Credentials > Create Credentials > OAuth 2.0 Client ID
5. Type: Web application
6. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://votre-domaine.vercel.app/api/auth/callback/google` (prod)
7. Copier Client ID et Client Secret

---

## 🤖 OPTIONNEL (Pour activer l'IA)

### 5. Anthropic Claude API

```bash
ANTHROPIC_API_KEY="sk-ant-api03-xxxx"
```

**Où obtenir:**
1. Créer un compte sur https://console.anthropic.com
2. Settings > API Keys > Create Key
3. Copier la clé

**Coût:** ~$5 offerts, puis ~$15-20/mois pour 100 utilisateurs actifs

---

### 6. OpenAI API

```bash
OPENAI_API_KEY="sk-xxxx"
```

**Où obtenir:**
1. Créer un compte sur https://platform.openai.com
2. API Keys > Create new secret key
3. Copier la clé

**Coût:** ~$1-2/mois pour embeddings

---

### 7. Configuration IA

```bash
AI_ENVIRONMENT="development"
AI_RATE_LIMIT_ENABLED="true"
AI_RATE_LIMIT_PER_HOUR="30"
```

**En production:** Changer `AI_ENVIRONMENT` à `"production"`

---

## 📊 OPTIONNEL (Production - Monitoring)

### 8. Sentry (Error Tracking)

```bash
NEXT_PUBLIC_SENTRY_DSN="https://xxxx@sentry.io/xxxx"
```

**Où obtenir:**
1. Créer un compte sur https://sentry.io
2. Créer un projet Next.js
3. Copier le DSN

---

### 9. Plausible Analytics

```bash
NEXT_PUBLIC_PLAUSIBLE_DOMAIN="votre-domaine.com"
NEXT_PUBLIC_PLAUSIBLE_API_HOST="https://plausible.io"
```

**Où obtenir:**
1. Créer un compte sur https://plausible.io
2. Ajouter votre site
3. Configurer le domaine

---

### 10. Email (Resend)

```bash
RESEND_API_KEY="re_xxxx"
```

**Où obtenir:**
1. Créer un compte sur https://resend.com
2. API Keys > Create API Key
3. Copier la clé

---

## 🚀 Configuration Rapide (Développement Local)

### Étape 1: Créer .env.local

```bash
cd finum-app
cp .env.example .env.local
```

### Étape 2: Remplir les 6 variables OBLIGATOIRES

1. ✅ DATABASE_URL (Neon)
2. ✅ DIRECT_URL (même valeur)
3. ✅ AUTH_SECRET (générer avec openssl)
4. ✅ AUTH_URL (localhost:3000)
5. ✅ AUTH_GOOGLE_ID (Google Console)
6. ✅ AUTH_GOOGLE_SECRET (Google Console)

### Étape 3: Installer et Démarrer

```bash
npm install --legacy-peer-deps
npx prisma generate
npx prisma db push
npm run dev
```

Ouvrir http://localhost:3000 → Login Google → ✅ Ça fonctionne!

---

## 🤖 Activer l'IA (Optionnel)

### Étape 1: Ajouter les 2 clés API

1. ✅ ANTHROPIC_API_KEY
2. ✅ OPENAI_API_KEY

### Étape 2: Seed le Corpus Éthique

```bash
npm run db:seed
```

### Étape 3: Redémarrer

```bash
npm run dev
```

Aller sur `/coach` → Tester le chat → ✅ L'IA fonctionne!

---

## 📝 Fichier .env.local Complet (Minimum)

Copier-coller ce template et remplacer les valeurs:

```bash
# ============================================
# CONFIGURATION MINIMALE - FINUM
# ============================================

# 1. DATABASE (OBLIGATOIRE)
DATABASE_URL="postgresql://user:password@ep-xxx.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://user:password@ep-xxx.neon.tech/neondb?sslmode=require"

# 2. AUTHENTICATION (OBLIGATOIRE)
AUTH_SECRET="GENERER_AVEC_OPENSSL_RAND_BASE64_32"
AUTH_URL="http://localhost:3000"

# 3. GOOGLE OAUTH (OBLIGATOIRE)
AUTH_GOOGLE_ID="votre-client-id.apps.googleusercontent.com"
AUTH_GOOGLE_SECRET="GOCSPX-votre-client-secret"

# 4. IA - OPTIONNEL (décommenter pour activer)
# ANTHROPIC_API_KEY="sk-ant-api03-..."
# OPENAI_API_KEY="sk-..."
# AI_ENVIRONMENT="development"
# AI_RATE_LIMIT_ENABLED="true"
# AI_RATE_LIMIT_PER_HOUR="30"
```

---

## ✅ Vérification

### Sans IA (Minimum)

- [ ] App démarre sur localhost:3000
- [ ] Login Google fonctionne
- [ ] Dashboard `/cockpit` accessible
- [ ] Import CSV budgets fonctionne
- [ ] Import CSV transactions fonctionne
- [ ] Métriques s'affichent

### Avec IA

- [ ] Chat coach (`/coach`) répond
- [ ] Recommandations IA dans revue hebdo
- [ ] Auto-catégorisation fonctionne
- [ ] Admin > AI Metrics affiche les stats

---

## 🆘 Problèmes Courants

### "Can't reach database server"
→ Vérifier DATABASE_URL, vérifier que Neon n'est pas en pause

### "Google OAuth failed"
→ Vérifier redirect URIs dans Google Console (doit matcher AUTH_URL)

### "AI service not configured"
→ Ajouter ANTHROPIC_API_KEY et OPENAI_API_KEY, redémarrer l'app

### "Prisma schema out of sync"
→ Exécuter `npx prisma generate` puis `npx prisma db push`

---

## 📚 Documentation Complète

Pour plus de détails, voir:
- `CONFIGURATION.md` - Guide complet pas à pas (500+ lignes)
- `.env.example` - Toutes les variables avec explications (200 lignes)
- `FINAL_COMPLETION_REPORT.md` - Rapport de complétion

---

*Dernière mise à jour: 28 janvier 2026*
