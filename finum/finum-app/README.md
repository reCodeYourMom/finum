# Finum App - CFO Personnel Premium

Plateforme SaaS web premium de gestion financière personnelle.

## Sprint 0 - Fondations ✅

### Stack Technique
- **Frontend**: Next.js 15 + TypeScript + TailwindCSS + shadcn/ui
- **Backend**: Vercel Serverless + Neon PostgreSQL + Prisma ORM (v5)
- **Auth**: NextAuth.js v5 (Google SSO uniquement)
- **Fonts**: Inter (body) + JetBrains Mono (chiffres)

### Structure du Projet

```
finum-app/
├── prisma/
│   └── schema.prisma          # Schema DB avec models User, Budget, Transaction, etc.
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/         # Page de login Google SSO
│   │   ├── (dashboard)/       # Groupe routes protégées
│   │   │   ├── cockpit/       # Dashboard trésorerie
│   │   │   ├── budget/        # Gestion budgets
│   │   │   ├── transactions/  # Liste transactions
│   │   │   ├── patterns/      # Détection récurrence
│   │   │   ├── coach/         # Revue hebdo
│   │   │   └── layout.tsx     # Layout avec nav + header
│   │   ├── api/
│   │   │   └── auth/[...nextauth]/  # NextAuth routes
│   │   └── layout.tsx         # Root layout avec fonts
│   ├── components/
│   │   ├── layout/
│   │   │   ├── DashboardNav.tsx    # Navigation verticale
│   │   │   └── DashboardHeader.tsx # Header avec user dropdown
│   │   └── ui/                # shadcn/ui components
│   ├── lib/
│   │   ├── prisma.ts          # Prisma client singleton
│   │   ├── auth.ts            # NextAuth config
│   │   └── utils.ts           # Utils shadcn
│   └── middleware.ts          # Protection des routes
├── .env.local                 # Variables d'environnement (git-ignored)
├── .env.example               # Template variables
└── .nvmrc                     # Node v24.3.0
```

## Configuration Requise

### 1. Node.js

Le projet utilise Node.js v24.3.0 (requis par Prisma 5.x).

```bash
nvm use
# ou
nvm use 24.3.0
```

### 2. Variables d'Environnement

Créer `.env.local` à partir de `.env.example`:

```bash
cp .env.example .env.local
```

**Variables à configurer:**

#### Database (Neon)
1. Créer un compte sur [neon.tech](https://neon.tech)
2. Créer un nouveau projet
3. Copier la connection string dans `DATABASE_URL` et `DIRECT_URL`

#### NextAuth
1. Générer un secret: `openssl rand -base64 32`
2. Coller dans `AUTH_SECRET`

#### Google OAuth
1. Aller sur [Google Cloud Console](https://console.cloud.google.com)
2. Créer un projet
3. Activer Google+ API
4. Créer credentials OAuth 2.0:
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google`
     - `https://your-domain.com/api/auth/callback/google`
5. Copier Client ID et Client Secret dans `.env.local`

### 3. Base de Données

```bash
# Générer le client Prisma
npx prisma generate

# Pousser le schema vers Neon (pour dev)
npx prisma db push

# Ouvrir Prisma Studio pour visualiser les données
npx prisma studio
```

## Développement

```bash
# Installer les dépendances
npm install

# Lancer le serveur de dev
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

## Palette de Couleurs Premium

- **finum-dark**: `#0A0E1A` - Arrière-plans dark mode
- **finum-gray**: Échelle 50-900 - Textes et bordures
- **finum-blue**: `#3B82F6` - Actions principales
- **finum-green**: `#10B981` - Succès
- **finum-red**: `#EF4444` - Danger

## Fonctionnalités Implémentées

### ✅ Sprint 0 (Fondations)
- [x] Setup monorepo Next.js 15
- [x] Configuration Prisma + Neon
- [x] NextAuth v5 (Google SSO)
- [x] Design system premium (fonts, couleurs)
- [x] Structure de routes avec groupes
- [x] Layout dashboard avec navigation
- [x] Pages de base (vides)

### ✅ Sprint 1 (Import & Dashboard)
- [x] Import CSV budgets (drag & drop)
- [x] Import CSV transactions (déduplication)
- [x] Dashboard cockpit complet:
  - [x] Run-rate quotidien
  - [x] Projection fin de mois
  - [x] Score santé financière (0-100)
  - [x] Runway (mois restants)
  - [x] Top catégories de dépenses
  - [x] Budget vs Réel (tous buckets)
  - [x] Graphique tendances 6 mois
- [x] Conversion multi-devises (EUR, USD, GBP, CHF, CAD, JPY)
- [x] Statistiques budgets et transactions
- [x] Table transactions avec filtres

### 🚧 Sprint 2 (En cours)
- [ ] CRUD Buckets UI
- [ ] Règles d'assignation automatique
- [ ] Engine règles par priorité
- [ ] Liste transactions non assignées

### 📋 Sprint 3+ (Planifiés)
- [ ] Sauvegarder patterns récurrents
- [ ] Revue hebdomadaire coach
- [ ] Alertes budgétaires
- [ ] Export PDF/CSV
- [ ] IA/RAG pour conseils

## Tests Manuels Sprint 0

1. **Démarrage**: `npm run dev` → app lance sur localhost:3000
2. **Login**: Cliquer "Se connecter avec Google" → OAuth redirect
3. **Auth**: Login Google → redirect vers /cockpit
4. **Navigation**: Tester les 5 sections du menu
5. **Logout**: User dropdown → Déconnexion

## Déploiement

### Vercel (Recommandé)

1. Push le code sur GitHub
2. Connecter le repo à Vercel
3. Configurer les variables d'environnement:
   - `DATABASE_URL`
   - `DIRECT_URL`
   - `AUTH_SECRET`
   - `AUTH_GOOGLE_ID`
   - `AUTH_GOOGLE_SECRET`
   - `AUTH_URL` (URL de production)
4. Déployer

## Conventions de Code

- **Composants**: PascalCase (`DashboardNav.tsx`)
- **Fichiers utilitaires**: camelCase (`prisma.ts`)
- **Routes API**: kebab-case folders
- **CSS**: Classes Tailwind uniquement
- **Imports**: Alias `@/` pour `src/`

## Principes de Design

1. **Une fonction = un espace UX distinct**
2. **Aucune IA dans les calculs** (uniquement conseil)
3. **Décision humaine obligatoire**
4. **Friction assumée** (pas de "magie")
5. **Design premium** (dense + moderne)

## Support

Pour les questions ou bugs, créer une issue sur GitHub.

---

## 📊 Statistiques du Projet

- **Version**: Sprint 1 - Import & Dashboard
- **Date**: 28 janvier 2026
- **Stack**: Next.js 15 + Prisma 5 + NextAuth v5 + Neon
- **Fichiers**: 40+ composants et services
- **LOC**: ~3300 lignes
- **API Endpoints**: 5
- **Pages**: 5
- **Tests**: Manuels ✅

---

## 📚 Documentation

- **README.md** (ce fichier) - Vue d'ensemble
- **SETUP_GUIDE.md** - Guide de configuration pas à pas
- **QUICK_START.md** - Démarrage rapide 5 minutes
- **COMMANDS.md** - Référence des commandes utiles
- **SPRINT_0_COMPLETE.md** - Détails Sprint 0
- **SPRINT_1_COMPLETE.md** - Détails Sprint 1

---

**Dernière mise à jour**: 28 janvier 2026 - Sprint 1 complété 🎉
