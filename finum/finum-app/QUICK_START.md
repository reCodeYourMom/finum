# Quick Start Guide - Finum

Guide de démarrage rapide en 5 minutes.

## Prérequis

- Node.js v24.3.0 (via nvm)
- Compte GitHub (pour OAuth)

## Installation Express

```bash
# 1. Installer les dépendances
nvm use
npm install

# 2. Configurer l'environnement
cp .env.example .env.local

# 3. Générer le client Prisma
npx prisma generate
```

## Configuration Minimale (Dev Local)

### Option A: Sans DB (Frontend uniquement)

Éditer `.env.local`:
```env
# DB placeholder (ne sera pas utilisée)
DATABASE_URL="postgresql://localhost:5432/finum"
DIRECT_URL="postgresql://localhost:5432/finum"

# Auth (temporaire)
AUTH_SECRET="dev-secret-change-me"
AUTH_URL="http://localhost:3000"

# Google OAuth (laisser vide pour tester le frontend)
AUTH_GOOGLE_ID=""
AUTH_GOOGLE_SECRET=""
```

```bash
npm run dev
```

**Limitations:**
- Pas de login fonctionnel
- Pas d'accès aux pages protégées
- Frontend uniquement

### Option B: Avec DB Neon (Complet)

#### 1. Créer DB Neon (2 min)

1. Aller sur https://neon.tech
2. Sign up (GitHub OAuth)
3. Create project → `finum-dev`
4. Copier la connection string

#### 2. Configurer Google OAuth (3 min)

1. https://console.cloud.google.com
2. Create project → `Finum Dev`
3. APIs & Services → Credentials
4. Create OAuth Client ID → Web application
5. Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Copier Client ID et Secret

#### 3. Configurer .env.local

```env
DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require"
AUTH_SECRET="$(openssl rand -base64 32)"
AUTH_URL="http://localhost:3000"
AUTH_GOOGLE_ID="xxx.apps.googleusercontent.com"
AUTH_GOOGLE_SECRET="GOCSPX-xxx"
```

#### 4. Initialiser la DB

```bash
npx prisma db push
```

#### 5. Lancer l'app

```bash
npm run dev
```

Ouvrir http://localhost:3000 → Login Google → Dashboard! 🎉

## Structure du Code

```
src/
├── app/                    # Pages Next.js
│   ├── (auth)/login/      # Page de login
│   ├── (dashboard)/       # Pages protégées
│   └── api/               # API routes
├── components/            # Composants React
│   ├── layout/           # Nav, Header
│   └── ui/               # shadcn components
└── lib/                  # Logique métier
    ├── auth.ts           # NextAuth config
    ├── prisma.ts         # DB client
    └── utils.ts          # Helpers
```

## Commandes Essentielles

```bash
npm run dev          # Dev server
npm run build        # Build production
npm run start        # Start production
npx prisma studio    # DB viewer
npx prisma generate  # Régénérer client
npx prisma db push   # Sync DB schema
```

## Développement

### Ajouter une nouvelle page

1. Créer `src/app/(dashboard)/ma-page/page.tsx`
2. Ajouter dans `DashboardNav.tsx`
3. Done!

### Ajouter un composant shadcn

```bash
npx shadcn add <component-name>
# Exemple: npx shadcn add button
```

### Modifier le schema DB

1. Éditer `prisma/schema.prisma`
2. `npx prisma db push`
3. `npx prisma generate`

## Problèmes Fréquents

### "Cannot find module '@/lib/...'"

```bash
# Vérifier tsconfig.json contient:
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### "Prisma Client did not initialize"

```bash
npx prisma generate
```

### "Node version not supported"

```bash
nvm use 24.3.0
```

### Port 3000 déjà utilisé

```bash
# Utiliser un autre port
PORT=3001 npm run dev
```

## Documentation Complète

- **README.md** - Vue d'ensemble
- **SETUP_GUIDE.md** - Configuration détaillée pas à pas
- **SPRINT_0_COMPLETE.md** - Architecture et design

## Support

Logs détaillés: `npm run dev` affiche toutes les erreurs.

---

**Ready to code! 🚀**
