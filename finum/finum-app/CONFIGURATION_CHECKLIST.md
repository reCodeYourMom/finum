# Configuration Checklist - Finum App

Checklist complète pour configurer l'application de zéro.

## ✅ Phase 1: Installation de Base

### 1.1 Node.js
- [ ] Node.js v24.3.0 installé (`node --version`)
- [ ] nvm configuré (optionnel mais recommandé)
- [ ] `nvm use` fonctionne dans le dossier projet

### 1.2 Dépendances
```bash
cd finum-app
npm install
```
- [ ] Installation réussie sans erreurs
- [ ] `node_modules/` créé
- [ ] `package-lock.json` créé

### 1.3 Prisma Client
```bash
npx prisma generate
```
- [ ] Client Prisma généré
- [ ] `node_modules/@prisma/client` existe
- [ ] Pas d'erreur "Cannot convert undefined"

## ✅ Phase 2: Configuration Base de Données (Neon)

### 2.1 Créer Compte Neon
- [ ] Aller sur https://neon.tech
- [ ] Sign up / Login
- [ ] Vérifier email (si demandé)

### 2.2 Créer Projet Neon
- [ ] Cliquer "Create Project"
- [ ] Nom: `finum-dev` (ou votre choix)
- [ ] Région: Sélectionner la plus proche
- [ ] Plan: Free tier
- [ ] Cliquer "Create Project"

### 2.3 Obtenir Connection String
- [ ] Dans le dashboard, cliquer sur votre projet
- [ ] Onglet "Connection Details"
- [ ] Mode: "Pooled connection" (recommandé)
- [ ] Copier la connection string
- [ ] Format doit ressembler à: `postgresql://user:password@ep-xxx.neon.tech/neondb`

### 2.4 Configurer .env.local
```bash
cp .env.example .env.local
```
- [ ] Fichier `.env.local` créé
- [ ] Éditer `.env.local`
- [ ] Remplacer `DATABASE_URL` par la connection string Neon
- [ ] Remplacer `DIRECT_URL` par la même connection string + `?sslmode=require`

**Exemple:**
```env
DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require"
```

### 2.5 Initialiser la DB
```bash
npx prisma db push
```
- [ ] Commande réussie
- [ ] Message "Your database is now in sync with your schema"
- [ ] Pas d'erreurs de connexion

### 2.6 Vérifier les Tables
```bash
npx prisma studio
```
- [ ] Prisma Studio s'ouvre dans le browser (localhost:5555)
- [ ] 8 tables visibles: User, Account, Session, Budget, Transaction, Bucket, Rule, Pattern, Decision
- [ ] Tables vides (normal)

## ✅ Phase 3: Configuration Google OAuth

### 3.1 Créer Projet Google Cloud
- [ ] Aller sur https://console.cloud.google.com
- [ ] Cliquer "Select a project" → "New Project"
- [ ] Nom: `Finum Dev`
- [ ] Cliquer "Create"
- [ ] Attendre création (quelques secondes)
- [ ] Sélectionner le projet créé

### 3.2 Activer Google+ API
- [ ] Menu hamburger → APIs & Services → Library
- [ ] Chercher "Google+ API"
- [ ] Cliquer sur "Google+ API"
- [ ] Cliquer "Enable"
- [ ] Attendre activation

### 3.3 Configurer OAuth Consent Screen
- [ ] APIs & Services → OAuth consent screen
- [ ] User Type: External
- [ ] Cliquer "Create"
- [ ] App name: `Finum`
- [ ] User support email: Votre email
- [ ] Developer contact: Votre email
- [ ] Cliquer "Save and Continue"
- [ ] Scopes: Skip (cliquer "Save and Continue")
- [ ] Test users: Ajouter votre email Google
- [ ] Cliquer "Add Users" puis "Save and Continue"
- [ ] Summary: Cliquer "Back to Dashboard"

### 3.4 Créer OAuth Client ID
- [ ] APIs & Services → Credentials
- [ ] Cliquer "Create Credentials" → "OAuth client ID"
- [ ] Application type: Web application
- [ ] Name: `Finum Dev`
- [ ] Authorized JavaScript origins:
  - [ ] Ajouter: `http://localhost:3000`
- [ ] Authorized redirect URIs:
  - [ ] Ajouter: `http://localhost:3000/api/auth/callback/google`
- [ ] Cliquer "Create"

### 3.5 Copier Credentials
- [ ] Client ID copié (format: `xxx.apps.googleusercontent.com`)
- [ ] Client Secret copié (format: `GOCSPX-xxx`)
- [ ] Coller dans `.env.local`:
```env
AUTH_GOOGLE_ID="xxx.apps.googleusercontent.com"
AUTH_GOOGLE_SECRET="GOCSPX-xxx"
```

## ✅ Phase 4: Configuration NextAuth

### 4.1 Générer AUTH_SECRET
```bash
openssl rand -base64 32
```
- [ ] Commande exécutée
- [ ] Secret généré (32+ caractères)
- [ ] Copié dans `.env.local`:
```env
AUTH_SECRET="votre-secret-généré"
```

### 4.2 Configurer AUTH_URL
- [ ] Ajouter dans `.env.local`:
```env
AUTH_URL="http://localhost:3000"
```

### 4.3 Vérifier .env.local Complet
Votre `.env.local` doit contenir:
```env
# Database
DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require"

# Auth
AUTH_SECRET="votre-secret-32-caracteres"
AUTH_URL="http://localhost:3000"

# Google OAuth
AUTH_GOOGLE_ID="xxx.apps.googleusercontent.com"
AUTH_GOOGLE_SECRET="GOCSPX-xxx"
```

- [ ] Toutes les variables présentes
- [ ] Pas de valeurs vides
- [ ] Pas de "xxx" ou "your-xxx"

## ✅ Phase 5: Premier Lancement

### 5.1 Démarrer l'Application
```bash
npm run dev
```
- [ ] Serveur démarre sans erreur
- [ ] Message "Ready" ou "compiled" affiché
- [ ] Port 3000 en écoute

### 5.2 Tester la Page d'Accueil
- [ ] Ouvrir http://localhost:3000
- [ ] Redirect automatique vers http://localhost:3000/login
- [ ] Page de login affichée
- [ ] Bouton "Se connecter avec Google" visible

### 5.3 Tester le Login
- [ ] Cliquer "Se connecter avec Google"
- [ ] Popup Google OAuth s'ouvre
- [ ] Sélectionner votre compte Google test
- [ ] Accepter les permissions
- [ ] Redirect vers http://localhost:3000/cockpit
- [ ] Page cockpit affichée

### 5.4 Vérifier la Session
```bash
# Dans Prisma Studio
npx prisma studio
```
- [ ] Table `User`: 1 entrée (votre compte)
- [ ] Table `Account`: 1 entrée (provider: google)
- [ ] Table `Session`: 1 entrée (session active)

## ✅ Phase 6: Test des Fonctionnalités

### 6.1 Test Navigation
- [ ] Cliquer "Budget" → Page budget s'affiche
- [ ] Cliquer "Transactions" → Page transactions s'affiche
- [ ] Cliquer "Patterns" → Page patterns s'affiche
- [ ] Cliquer "Coach" → Page coach s'affiche
- [ ] Cliquer "Cockpit" → Retour cockpit

### 6.2 Test Import Budgets
- [ ] Sur page /budget
- [ ] Cliquer "Importer CSV"
- [ ] Modal s'ouvre
- [ ] Sélectionner `sample-data/example-budgets.csv`
- [ ] Cliquer "Importer"
- [ ] Message succès: "10 budget(s) créé(s)"
- [ ] Liste budgets affichée
- [ ] Stats mises à jour

### 6.3 Test Import Transactions
- [ ] Sur page /transactions
- [ ] Cliquer "Importer CSV"
- [ ] Modal s'ouvre
- [ ] Sélectionner `sample-data/example-transactions.csv`
- [ ] Cliquer "Importer"
- [ ] Message succès: "19 transaction(s) créée(s)"
- [ ] Table transactions affichée
- [ ] Stats mises à jour

### 6.4 Test Dashboard Cockpit
- [ ] Sur page /cockpit
- [ ] Score santé affiché (0-100)
- [ ] Run-rate quotidien affiché
- [ ] Projection fin de mois affichée
- [ ] Runway affiché
- [ ] Top catégories affichées
- [ ] Graphique 6 mois affiché (si données suffisantes)

### 6.5 Test Logout
- [ ] Cliquer sur avatar (en haut à droite)
- [ ] Dropdown s'ouvre
- [ ] Cliquer "Déconnexion"
- [ ] Redirect vers /login
- [ ] Session terminée

### 6.6 Test Re-login
- [ ] Login à nouveau avec Google
- [ ] Redirect vers /cockpit
- [ ] Données toujours présentes (budgets + transactions)
- [ ] Même session utilisateur

## ✅ Phase 7: Vérifications Finales

### 7.1 Performance
- [ ] Page cockpit charge en < 2s
- [ ] Navigation entre pages instantanée
- [ ] Import CSV < 5s pour 20 lignes

### 7.2 Responsive
- [ ] Tester en desktop (width > 1024px)
- [ ] Tester en tablet (width 768px)
- [ ] Tester en mobile (width 375px)
- [ ] Layout s'adapte correctement

### 7.3 Browser Compatibility
- [ ] Tester sur Chrome
- [ ] Tester sur Firefox (optionnel)
- [ ] Tester sur Safari (optionnel)

## 🐛 Troubleshooting Rapide

### Erreur: "Cannot convert undefined or null"
**Solution**:
```bash
npx prisma generate
```

### Erreur: "Unauthorized"
**Causes**: OAuth mal configuré, session expirée
**Solution**: Vérifier Google Cloud Console redirect URI

### Erreur: "Failed to connect to database"
**Causes**: Connection string incorrecte, DB en pause
**Solution**: Vérifier .env.local, réactiver DB sur Neon

### Erreur: Port 3000 déjà utilisé
**Solution**:
```bash
lsof -ti:3000 | xargs kill -9
npm run dev
```

### Page blanche ou erreur 500
**Solution**: Check les logs dans le terminal

## 📊 Checklist Résumé

Configuration minimale requise:
- ✅ Node.js v24.3.0
- ✅ npm install
- ✅ npx prisma generate
- ✅ .env.local configuré (6 variables)
- ✅ npx prisma db push
- ✅ npm run dev fonctionne
- ✅ Login Google fonctionne
- ✅ Import CSV fonctionne

**Si tous les ✅ sont cochés, l'app est prête! 🎉**

## 📚 Ressources

- **GETTING_STARTED.md** - Guide démarrage complet
- **SETUP_GUIDE.md** - Setup détaillé pas à pas
- **TEST_SPRINT_1.md** - Guide de test approfondi
- **sample-data/README.md** - Détails fichiers CSV

---

**Configuration terminée! Bon développement! 🚀**
