# Guide de Configuration Finum - Complet

**Date**: 28 janvier 2026
**Version**: 1.0 - Production Ready
**Durée estimée**: 30-45 minutes

---

## 📋 Vue d'Ensemble

Ce guide vous accompagne pas à pas pour configurer Finum de A à Z, du développement local jusqu'au déploiement en production.

### Prérequis

- Node.js v24.3.0 (via nvm)
- Git
- Compte GitHub
- Un éditeur de code (VS Code recommandé)

---

## 🚀 Étape 1: Installation Initiale

### 1.1 Cloner le Projet

```bash
cd /path/to/your/projects
git clone https://github.com/votre-username/finum.git
cd finum/finum-app
```

### 1.2 Installer Node.js v24

```bash
# Installer nvm si pas déjà fait
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Installer Node v24.3.0
nvm install 24.3.0
nvm use 24.3.0

# Vérifier
node --version  # Doit afficher v24.3.0
```

### 1.3 Installer les Dépendances

```bash
npm install --legacy-peer-deps
```

**Note**: Le flag `--legacy-peer-deps` résout un conflit de version zod entre le projet (v4) et OpenAI SDK (v3).

---

## 🗄️ Étape 2: Base de Données (Neon PostgreSQL)

### 2.1 Créer un Compte Neon

1. Aller sur [https://neon.tech](https://neon.tech)
2. Se connecter avec GitHub (recommandé)
3. Créer un nouveau projet:
   - Nom: `finum-production` (ou `finum-dev` pour dev)
   - Région: Choisir la plus proche (Europe: `eu-west-1`)
   - PostgreSQL version: Latest

### 2.2 Récupérer la Connection String

1. Dans le dashboard Neon, cliquer sur votre projet
2. Onglet "Connection Details"
3. Copier la connection string (format Prisma)
4. **Important**: Cocher "Include password" pour avoir le mot de passe

Format attendu:
```
postgresql://username:password@ep-xxx-xxx.eu-west-1.aws.neon.tech/neondb?sslmode=require
```

### 2.3 Activer pgvector Extension

Dans le SQL Editor de Neon:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

---

## 🔐 Étape 3: Configuration Environnement

### 3.1 Créer le Fichier .env.local

```bash
cp .env.example .env.local
```

### 3.2 Variables OBLIGATOIRES (Minimum Viable)

Ouvrir `.env.local` et remplir:

```bash
# 1. DATABASE
DATABASE_URL="postgresql://user:password@ep-xxx.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://user:password@ep-xxx.neon.tech/neondb?sslmode=require"

# 2. AUTH SECRET (générer ci-dessous)
AUTH_SECRET="REMPLACER_PAR_SECRET_CI_DESSOUS"
AUTH_URL="http://localhost:3000"

# 3. GOOGLE OAUTH (à configurer dans l'étape 4)
AUTH_GOOGLE_ID="your-client-id.apps.googleusercontent.com"
AUTH_GOOGLE_SECRET="GOCSPX-your-client-secret"
```

### 3.3 Générer AUTH_SECRET

```bash
openssl rand -base64 32
```

Copier le résultat dans `AUTH_SECRET`.

---

## 🔑 Étape 4: Google OAuth

### 4.1 Créer un Projet Google Cloud

1. Aller sur [https://console.cloud.google.com](https://console.cloud.google.com)
2. Créer un nouveau projet:
   - Nom: `Finum Production` (ou `Finum Dev`)
   - Organization: (laisser par défaut si personnel)

### 4.2 Activer Google+ API

1. Dans le menu, aller à "APIs & Services" > "Library"
2. Chercher "Google+ API"
3. Cliquer "Enable"

### 4.3 Créer les Credentials OAuth

1. "APIs & Services" > "Credentials"
2. Cliquer "Create Credentials" > "OAuth 2.0 Client ID"
3. Configurer l'écran de consentement si demandé:
   - User Type: External
   - App name: `Finum`
   - User support email: Votre email
   - Developer contact: Votre email
   - Scopes: Laisser par défaut
   - Test users: Ajouter votre email Google
4. Créer OAuth Client ID:
   - Application type: **Web application**
   - Name: `Finum Web Client`
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google` (dev)
     - `https://votre-domaine.vercel.app/api/auth/callback/google` (prod)

### 4.4 Copier les Credentials

- Copier **Client ID** dans `AUTH_GOOGLE_ID`
- Copier **Client secret** dans `AUTH_GOOGLE_SECRET`

---

## 💾 Étape 5: Initialiser la Base de Données

### 5.1 Générer le Client Prisma

```bash
npx prisma generate
```

### 5.2 Appliquer les Migrations

```bash
# Pousser le schema vers Neon
npx prisma db push

# Alternative (avec migrations versionnées):
npx prisma migrate deploy
```

### 5.3 Vérifier la DB

```bash
# Ouvrir Prisma Studio (interface graphique)
npx prisma studio
```

Doit ouvrir http://localhost:5555 avec tous les modèles visibles.

---

## 🧪 Étape 6: Premier Démarrage (Sans IA)

### 6.1 Lancer l'App

```bash
npm run dev
```

Doit afficher:
```
✓ Ready in X ms
○ Local: http://localhost:3000
```

### 6.2 Tester le Login

1. Ouvrir http://localhost:3000
2. Cliquer "Se connecter avec Google"
3. Autoriser l'app (avec votre compte test)
4. Être redirigé vers `/cockpit`

### 6.3 Tester les Fonctionnalités de Base

✅ Navigation entre les pages (Cockpit, Budget, Transactions, etc.)
✅ Import CSV budgets
✅ Import CSV transactions
✅ Dashboard affiche les métriques

**À ce stade, l'app fonctionne mais SANS fonctionnalités IA.**

---

## 🤖 Étape 7: Activer l'IA (Optionnel mais Recommandé)

### 7.1 Créer un Compte Anthropic

1. Aller sur [https://console.anthropic.com](https://console.anthropic.com)
2. Se connecter ou créer un compte
3. "Settings" > "API Keys"
4. Créer une nouvelle clé API
5. Copier dans `.env.local`:

```bash
ANTHROPIC_API_KEY="sk-ant-api03-..."
```

**Coût**: ~$5 de crédits offerts, puis $3/$15 per 1M tokens (input/output).

### 7.2 Créer un Compte OpenAI

1. Aller sur [https://platform.openai.com](https://platform.openai.com)
2. Se connecter ou créer un compte
3. "API Keys" > "Create new secret key"
4. Copier dans `.env.local`:

```bash
OPENAI_API_KEY="sk-..."
```

**Coût**: $0.02 per 1M tokens (text-embedding-3-small).

### 7.3 Configuration AI

Dans `.env.local`:

```bash
AI_ENVIRONMENT="development"
AI_RATE_LIMIT_ENABLED="true"
AI_RATE_LIMIT_PER_HOUR="30"
```

### 7.4 Seed le Corpus Éthique

```bash
npm run db:seed
```

Doit afficher:
```
✓ Seeded 30 ethical documents
✓ Generated embeddings
```

### 7.5 Tester les Fonctionnalités IA

1. Redémarrer l'app: `npm run dev`
2. Aller sur `/coach`
3. Utiliser le chat dans la sidebar droite
4. Tester une question: "Comment réduire mes dépenses ?"

✅ Le coach IA doit répondre avec des conseils personnalisés.

---

## 📊 Étape 8: Admin Dashboard

### 8.1 Accéder à l'Admin

1. Aller sur http://localhost:3000/admin/dashboard
2. Voir les métriques:
   - Utilisateurs
   - Feedback
   - Erreurs
   - Audit logs

### 8.2 Explorer les Sections

- `/admin/logs` - Audit logs
- `/admin/errors` - Erreurs système
- `/admin/feedback` - Feedback utilisateurs
- `/admin/users` - Gestion utilisateurs
- `/admin/ai/metrics` - Métriques IA
- `/admin/ai/corpus` - Corpus éthique

**Note**: Par défaut, tous les utilisateurs authentifiés ont accès. En production, ajouter un rôle admin dans la DB.

---

## 🚀 Étape 9: Déploiement Production (Vercel)

### 9.1 Préparer le Projet

```bash
# Commit tous les changements
git add .
git commit -m "feat: configuration complete"
git push origin main
```

### 9.2 Créer un Projet Vercel

1. Aller sur [https://vercel.com](https://vercel.com)
2. Se connecter avec GitHub
3. "New Project"
4. Importer le repo `finum`
5. Root Directory: `finum-app`
6. Framework: Next.js (détecté automatiquement)

### 9.3 Configurer les Variables d'Environnement

Dans Vercel > Project Settings > Environment Variables, ajouter:

**Production:**
```bash
DATABASE_URL=postgresql://... (Neon connection)
DIRECT_URL=postgresql://... (même valeur)
AUTH_SECRET=... (même valeur que dev)
AUTH_URL=https://votre-app.vercel.app (URL Vercel)
AUTH_GOOGLE_ID=... (même valeur)
AUTH_GOOGLE_SECRET=... (même valeur)
ANTHROPIC_API_KEY=... (même valeur)
OPENAI_API_KEY=... (même valeur)
AI_ENVIRONMENT=production
AI_RATE_LIMIT_ENABLED=true
AI_RATE_LIMIT_PER_HOUR=30
```

### 9.4 Mettre à Jour Google OAuth

Retourner sur Google Cloud Console:
1. Credentials > votre OAuth Client
2. Ajouter dans "Authorized redirect URIs":
   - `https://votre-app.vercel.app/api/auth/callback/google`

### 9.5 Déployer

1. Cliquer "Deploy" dans Vercel
2. Attendre le build (2-3 minutes)
3. Visiter l'URL de production

### 9.6 Run Migrations en Production

```bash
# Dans votre terminal local
npx prisma migrate deploy --schema=./prisma/schema.prisma
npm run db:seed
```

---

## 📈 Étape 10: Monitoring & Analytics (Optionnel)

### 10.1 Sentry (Error Tracking)

1. Créer un compte sur [https://sentry.io](https://sentry.io)
2. Créer un projet Next.js
3. Copier le DSN
4. Ajouter dans `.env.local` et Vercel:

```bash
NEXT_PUBLIC_SENTRY_DSN="https://...@sentry.io/..."
```

5. Installer le SDK:

```bash
npm install @sentry/nextjs
npx @sentry/wizard -i nextjs
```

### 10.2 Plausible Analytics

1. Créer un compte sur [https://plausible.io](https://plausible.io)
2. Ajouter votre domaine
3. Ajouter dans `.env.local`:

```bash
NEXT_PUBLIC_PLAUSIBLE_DOMAIN="votre-domaine.com"
NEXT_PUBLIC_PLAUSIBLE_API_HOST="https://plausible.io"
```

4. Intégrer dans `app/layout.tsx`:

```tsx
<Script
  defer
  data-domain={process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN}
  src={`${process.env.NEXT_PUBLIC_PLAUSIBLE_API_HOST}/js/script.js`}
/>
```

---

## 🔧 Étape 11: Configuration Avancée (Production)

### 11.1 Email (Resend)

Pour envoyer des notifications par email:

```bash
npm install resend
```

Dans `.env.local`:
```bash
RESEND_API_KEY="re_..."
```

### 11.2 Redis Cache (Upstash)

Pour améliorer les performances:

1. Créer un compte sur [https://upstash.com](https://upstash.com)
2. Créer une database Redis
3. Copier la connection string

```bash
REDIS_URL="redis://default:...@upstash.redis.com:6379"
```

### 11.3 File Storage (Cloudflare R2)

Pour stocker des fichiers (exports PDF, uploads):

```bash
npm install @aws-sdk/client-s3
```

Dans `.env.local`:
```bash
R2_ACCOUNT_ID="..."
R2_ACCESS_KEY_ID="..."
R2_SECRET_ACCESS_KEY="..."
R2_BUCKET_NAME="finum-uploads"
```

---

## ✅ Checklist Finale

### Minimum Viable (Local Dev)
- [ ] Node.js v24.3.0 installé
- [ ] Database Neon configurée + pgvector activé
- [ ] `.env.local` créé avec DATABASE_URL, AUTH_SECRET, Google OAuth
- [ ] `npm install` exécuté
- [ ] `npx prisma generate` exécuté
- [ ] `npx prisma db push` exécuté
- [ ] App démarre sur localhost:3000
- [ ] Login Google fonctionne
- [ ] Import CSV budgets/transactions fonctionne

### Avec IA
- [ ] ANTHROPIC_API_KEY configuré
- [ ] OPENAI_API_KEY configuré
- [ ] `npm run db:seed` exécuté
- [ ] Chat coach fonctionne
- [ ] Recommandations IA s'affichent

### Production
- [ ] Projet déployé sur Vercel
- [ ] Variables d'environnement configurées dans Vercel
- [ ] AUTH_URL mis à jour avec domaine production
- [ ] Google OAuth redirect URI ajouté pour production
- [ ] Migrations exécutées en production
- [ ] Corpus éthique seedé en production
- [ ] Sentry configuré (error tracking)
- [ ] Analytics configuré (Plausible)

### Admin Dashboard
- [ ] Accès à `/admin/dashboard` fonctionne
- [ ] Métriques affichées correctement
- [ ] Feedback widget visible sur toutes les pages
- [ ] Onboarding flow testé

---

## 🆘 Troubleshooting

### Erreur: "Can't reach database server"

- Vérifier la connection string Neon
- Vérifier que le projet Neon n'est pas en pause
- Vérifier `?sslmode=require` à la fin de l'URL

### Erreur: "Google OAuth failed"

- Vérifier les redirect URIs dans Google Console
- Vérifier que le domaine correspond (localhost:3000 ou production)
- Vérifier que l'app est en mode "Testing" si en dev

### Erreur: "AI service not configured"

- Vérifier que ANTHROPIC_API_KEY et OPENAI_API_KEY sont dans `.env.local`
- Redémarrer le serveur après ajout des clés
- Vérifier les crédits API restants

### Build Fails on Vercel

- Vérifier que toutes les variables d'environnement sont configurées
- Vérifier que `DATABASE_URL` est accessible depuis Vercel
- Checker les logs de build pour l'erreur exacte

---

## 📞 Support

- **Documentation**: Voir les fichiers `*.md` dans `/finum-app`
- **Logs**: Checker les logs console en mode développement
- **Admin Dashboard**: `/admin/errors` pour voir les erreurs système
- **Email Support**: support@finum.com (fictif pour l'instant)

---

## 🎉 Félicitations!

Votre instance Finum est maintenant configurée et prête pour la production!

**Prochaines étapes recommandées:**
1. Inviter des beta testers
2. Monitorer les métriques dans `/admin/dashboard`
3. Répondre aux feedbacks dans `/admin/feedback`
4. Optimiser les coûts IA avec le cache

---

*Dernière mise à jour: 28 janvier 2026*
*Version: 1.0 - Production Ready*
