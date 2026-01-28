# Guide de Configuration Finum

Ce guide vous aide à configurer complètement l'environnement de développement Finum.

## Prérequis

- Node.js v24.3.0 (via nvm)
- Compte Neon (PostgreSQL)
- Compte Google Cloud (OAuth)
- Git

## Installation Pas à Pas

### 1. Clone et Installation

```bash
cd finum-app
nvm use  # Utilise Node v24.3.0
npm install
```

### 2. Configuration Base de Données (Neon)

#### a. Créer un compte Neon

1. Aller sur https://neon.tech
2. S'inscrire / Se connecter
3. Créer un nouveau projet:
   - Nom: `finum-dev` (ou votre choix)
   - Région: Choisir la plus proche
   - Plan: Free tier suffit pour dev

#### b. Obtenir la Connection String

1. Dans votre projet Neon, cliquer sur "Connection Details"
2. Copier la connection string (format: `postgresql://user:password@ep-xxx.neon.tech/neondb`)
3. **Important**: Il y a deux strings:
   - `DATABASE_URL`: Pour Prisma Client
   - `DIRECT_URL`: Pour migrations Prisma

#### c. Configurer .env.local

```bash
# Copier le template
cp .env.example .env.local
```

Éditer `.env.local` et remplacer:
```env
DATABASE_URL="postgresql://user:password@ep-xxx.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://user:password@ep-xxx.neon.tech/neondb?sslmode=require"
```

#### d. Initialiser la DB

```bash
# Générer le client Prisma
npx prisma generate

# Pousser le schema vers Neon (crée les tables)
npx prisma db push

# Vérifier que les tables sont créées
npx prisma studio
```

Prisma Studio ouvrira un navigateur où vous pouvez voir toutes les tables vides.

### 3. Configuration Google OAuth

#### a. Créer un Projet Google Cloud

1. Aller sur https://console.cloud.google.com
2. Créer un nouveau projet:
   - Nom: `Finum Dev` (ou votre choix)
3. Sélectionner le projet

#### b. Activer Google+ API

1. Menu hamburger → APIs & Services → Library
2. Rechercher "Google+ API"
3. Cliquer et activer

#### c. Créer OAuth Credentials

1. APIs & Services → Credentials
2. Cliquer "Create Credentials" → OAuth client ID
3. Si demandé, configurer l'écran de consentement OAuth:
   - User Type: External
   - App name: Finum
   - User support email: Votre email
   - Developer contact: Votre email
   - Scopes: Laisser par défaut
   - Test users: Ajouter votre email Google
   - Save and Continue

4. Retourner à Credentials → Create Credentials → OAuth client ID
5. Application type: Web application
6. Name: Finum Dev
7. Authorized JavaScript origins:
   ```
   http://localhost:3000
   ```
8. Authorized redirect URIs:
   ```
   http://localhost:3000/api/auth/callback/google
   ```
9. Create

#### d. Copier les Credentials

Vous obtiendrez:
- Client ID: `xxx.apps.googleusercontent.com`
- Client Secret: `GOCSPX-xxx`

Ajouter dans `.env.local`:
```env
AUTH_GOOGLE_ID="xxx.apps.googleusercontent.com"
AUTH_GOOGLE_SECRET="GOCSPX-xxx"
```

### 4. Configuration NextAuth

#### a. Générer le Secret

```bash
openssl rand -base64 32
```

Copier le résultat dans `.env.local`:
```env
AUTH_SECRET="le-secret-généré-ici"
```

#### b. Vérifier AUTH_URL

Pour dev local:
```env
AUTH_URL="http://localhost:3000"
```

### 5. Vérification de la Configuration

Votre `.env.local` devrait ressembler à:

```env
# Database (Neon)
DATABASE_URL="postgresql://user:password@ep-xxx.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://user:password@ep-xxx.neon.tech/neondb?sslmode=require"

# NextAuth
AUTH_SECRET="dGVzdC1zZWNyZXQtY2hhbmdlLWluLXByb2R1Y3Rpb24K"
AUTH_URL="http://localhost:3000"

# Google OAuth
AUTH_GOOGLE_ID="123456789-abc.apps.googleusercontent.com"
AUTH_GOOGLE_SECRET="GOCSPX-AbCdEfGhIjKlMnOpQrSt"
```

### 6. Lancer l'Application

```bash
npm run dev
```

Ouvrir http://localhost:3000

## Tests de Validation

### Test 1: Page de Login

1. Naviguer vers http://localhost:3000
2. Devrait rediriger vers http://localhost:3000/login
3. Page de login avec bouton Google devrait s'afficher

✅ **Configuration de base OK**

### Test 2: Connexion Google

1. Cliquer sur "Se connecter avec Google"
2. Popup Google OAuth devrait s'ouvrir
3. Sélectionner votre compte Google test
4. Accepter les permissions
5. Devrait rediriger vers http://localhost:3000/cockpit

✅ **Auth Google OK**

### Test 3: Base de Données

1. Après connexion, ouvrir Prisma Studio:
   ```bash
   npx prisma studio
   ```
2. Vérifier dans la table `User`:
   - Votre compte Google devrait apparaître
3. Vérifier dans la table `Account`:
   - Une entrée avec provider "google"

✅ **DB Integration OK**

### Test 4: Navigation

1. Dans l'app, tester les 5 sections du menu:
   - Cockpit
   - Budget
   - Transactions
   - Patterns
   - Coach
2. Chaque page devrait s'afficher (même si vide)

✅ **Routing OK**

### Test 5: Logout

1. Cliquer sur votre avatar en haut à droite
2. Cliquer "Déconnexion"
3. Devrait rediriger vers /login

✅ **Session Management OK**

## Problèmes Courants

### Erreur: "Cannot convert undefined or null to object"

**Cause**: Variables d'environnement non chargées ou version Prisma incompatible

**Solution**:
```bash
# Vérifier que .env.local existe et contient les bonnes valeurs
cat .env.local

# Régénérer le client Prisma
npx prisma generate
```

### Erreur: "Prisma Client did not initialize yet"

**Cause**: Base de données non configurée

**Solution**:
```bash
npx prisma db push
```

### Erreur: "Invalid redirect_uri"

**Cause**: URI de callback non configurée dans Google Cloud Console

**Solution**:
1. Retourner dans Google Cloud Console
2. Credentials → Votre OAuth Client
3. Vérifier que `http://localhost:3000/api/auth/callback/google` est dans les Authorized redirect URIs
4. Sauvegarder

### Erreur: "Failed to connect to database"

**Cause**: Connection string Neon incorrecte

**Solution**:
1. Vérifier que la DB Neon est active (pas en pause)
2. Revérifier la connection string dans .env.local
3. S'assurer qu'il y a `?sslmode=require` à la fin

### App ne démarre pas

**Solution**:
```bash
# Vérifier la version de Node
node --version  # Doit être v24.3.0

# Si différent, utiliser nvm
nvm use 24.3.0

# Nettoyer et réinstaller
rm -rf node_modules package-lock.json
npm install
```

## Commandes Utiles

### Développement
```bash
npm run dev              # Lancer dev server
npx prisma studio        # Ouvrir DB viewer
npx prisma format        # Formater schema.prisma
```

### Base de Données
```bash
npx prisma generate      # Régénérer client Prisma
npx prisma db push       # Pousser schema vers DB (dev)
npx prisma db pull       # Récupérer schema depuis DB
npx prisma migrate dev   # Créer migration (prod)
```

### Debugging
```bash
# Voir les logs détaillés Prisma
export DEBUG="prisma:*"
npm run dev

# Tester connection DB
npx prisma db execute --stdin < /dev/null
```

## Configuration pour Production (Vercel)

### 1. Variables d'Environnement Vercel

Dans Vercel Dashboard → Settings → Environment Variables:

```
DATABASE_URL          = [Neon connection string PRODUCTION]
DIRECT_URL            = [Neon connection string PRODUCTION]
AUTH_SECRET           = [Nouveau secret généré]
AUTH_GOOGLE_ID        = [Client ID Google]
AUTH_GOOGLE_SECRET    = [Client Secret Google]
AUTH_URL              = https://votre-domaine.vercel.app
```

### 2. Google OAuth Redirect URIs (Production)

Ajouter dans Google Cloud Console:
```
https://votre-domaine.vercel.app/api/auth/callback/google
```

### 3. Déploiement

```bash
# Connecter à Vercel
vercel

# Déployer
git push origin main
```

Vercel déploiera automatiquement.

## Sécurité

### ⚠️ Fichiers à NE JAMAIS commiter

- `.env.local`
- `.env`
- `*.env`

Ces fichiers sont déjà dans `.gitignore`.

### ✅ Bonnes Pratiques

1. **Jamais** mettre de secrets dans le code
2. **Toujours** utiliser des secrets différents entre dev et prod
3. **Régénérer** AUTH_SECRET pour la production
4. **Créer** une DB Neon séparée pour production
5. **Limiter** les test users Google OAuth en production

## Support

Si vous rencontrez des problèmes non couverts ici:

1. Vérifier les logs: `npm run dev` affiche les erreurs détaillées
2. Vérifier Prisma Studio: `npx prisma studio`
3. Consulter la documentation:
   - Next.js: https://nextjs.org/docs
   - Prisma: https://www.prisma.io/docs
   - NextAuth: https://next-auth.js.org
   - Neon: https://neon.tech/docs

---

**Bon développement! 🚀**
