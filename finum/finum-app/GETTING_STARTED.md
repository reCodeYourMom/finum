# Getting Started - Finum App

Guide de démarrage ultra-rapide pour configurer et tester l'application.

## 🚀 Installation (5 minutes)

### 1. Vérifier Node.js

```bash
node --version  # Doit afficher v24.3.0 ou supérieur
```

Si besoin:
```bash
nvm use 24.3.0
# ou
nvm install 24.3.0 && nvm use 24.3.0
```

### 2. Installer les dépendances

```bash
cd finum-app
npm install
```

### 3. Générer Prisma Client

```bash
npx prisma generate
```

## 🔧 Configuration (10 minutes)

### Option A: Configuration Minimale (Frontend uniquement)

Pour tester l'interface sans DB ni OAuth:

```bash
cp .env.example .env.local
```

Éditer `.env.local`:
```env
DATABASE_URL="postgresql://localhost:5432/finum"
DIRECT_URL="postgresql://localhost:5432/finum"
AUTH_SECRET="dev-secret-for-testing"
AUTH_URL="http://localhost:3000"
AUTH_GOOGLE_ID=""
AUTH_GOOGLE_SECRET=""
```

**Limitations**: Pas de login, pas de sauvegarde de données.

### Option B: Configuration Complète (Recommandé)

#### 1. Créer DB Neon (3 minutes)

1. Aller sur https://neon.tech
2. Sign up / Login
3. Create New Project → Nom: `finum-dev`
4. Copier la **Connection string**

Mettre dans `.env.local`:
```env
DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require"
```

#### 2. Pousser le schema

```bash
npx prisma db push
```

Vérifier:
```bash
npx prisma studio
# Tables créées: User, Budget, Transaction, etc.
```

#### 3. Configurer Google OAuth (5 minutes)

1. Aller sur https://console.cloud.google.com
2. Create Project → Nom: `Finum Dev`
3. APIs & Services → Enable APIs → Chercher "Google+ API" → Enable
4. APIs & Services → Credentials → Create Credentials → OAuth client ID
5. Configure consent screen (si demandé):
   - External
   - App name: Finum
   - Support email: votre email
   - Skip les scopes
   - Test users: Ajouter votre email
6. Create OAuth Client ID:
   - Application type: Web application
   - Name: Finum Dev
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
   - Create

Copier dans `.env.local`:
```env
AUTH_GOOGLE_ID="xxx.apps.googleusercontent.com"
AUTH_GOOGLE_SECRET="GOCSPX-xxx"
```

#### 4. Générer AUTH_SECRET

```bash
openssl rand -base64 32
```

Copier dans `.env.local`:
```env
AUTH_SECRET="le-secret-généré"
AUTH_URL="http://localhost:3000"
```

## ▶️ Lancer l'Application

```bash
npm run dev
```

Ouvrir http://localhost:3000

**Flow**:
1. Click "Se connecter avec Google"
2. Login avec votre compte Google
3. Redirect vers `/cockpit`

## 🧪 Tester avec les Données d'Exemple

### 1. Importer les Budgets

1. Aller sur http://localhost:3000/budget
2. Cliquer "Importer CSV"
3. Sélectionner `sample-data/example-budgets.csv`
4. Importer
5. Voir 10 budgets créés

### 2. Importer les Transactions

1. Aller sur http://localhost:3000/transactions
2. Cliquer "Importer CSV"
3. Sélectionner `sample-data/example-transactions.csv`
4. Importer
5. Voir 19 transactions créées

### 3. Voir le Dashboard

1. Aller sur http://localhost:3000/cockpit
2. Voir toutes les métriques:
   - Score santé
   - Run-rate
   - Projection EOM
   - Runway
   - Top catégories
   - Budget vs Réel
   - Graphique 6 mois

## ✅ Checklist de Vérification

- [ ] `npm run dev` lance sans erreur
- [ ] Page http://localhost:3000 s'affiche
- [ ] Login Google fonctionne
- [ ] Import budgets CSV fonctionne
- [ ] Import transactions CSV fonctionne
- [ ] Dashboard affiche les métriques
- [ ] Réimport transactions → doublons détectés
- [ ] Navigation entre pages fonctionne
- [ ] Logout fonctionne

## 🔍 Troubleshooting

### Port 3000 déjà utilisé

```bash
# Trouver et tuer le processus
lsof -ti:3000 | xargs kill -9

# Ou utiliser un autre port
PORT=3001 npm run dev
```

### "Unauthorized" dans l'app

**Causes possibles**:
1. Google OAuth mal configuré
2. Session expirée
3. Redirect URI incorrect

**Solution**:
```bash
# Vérifier .env.local
cat .env.local

# Vérifier Google Cloud Console
# Redirect URI doit être: http://localhost:3000/api/auth/callback/google

# Re-login
# Logout puis re-login avec Google
```

### "Prisma Client did not initialize"

```bash
npx prisma generate
```

### Erreurs DB

```bash
# Vérifier connection DB
npx prisma db execute --stdin < /dev/null

# Reset DB (⚠️ supprime tout)
npx prisma migrate reset

# Repousser schema
npx prisma db push
```

### Page blanche / erreur 500

```bash
# Voir les logs dans le terminal
# Généralement: problème .env ou DB

# Check logs détaillés
DEBUG="*" npm run dev
```

## 📚 Documentation

Une fois l'app lancée, consulter:

- **README.md** - Vue d'ensemble complète
- **SETUP_GUIDE.md** - Configuration détaillée pas à pas
- **TEST_SPRINT_1.md** - Tests complets des fonctionnalités
- **COMMANDS.md** - Référence des commandes
- **sample-data/README.md** - Détails fichiers CSV exemples

## 🎯 Prochaines Étapes

Après avoir testé l'app:

1. **Explorer les pages**
   - Budget: Voir budgets, créer, importer
   - Transactions: Voir table, filtrer, importer
   - Cockpit: Dashboard complet
   - Patterns: À venir (Sprint 2)
   - Coach: À venir (Sprint 3+)

2. **Tester avec vos données**
   - Créer vos propres CSV
   - Format: voir `sample-data/README.md`
   - Importer

3. **Développement**
   - Lire `SPRINT_1_COMPLETE.md` pour comprendre l'archi
   - Check `src/lib/services/` pour la logique métier
   - Check `src/components/dashboard/` pour les composants

## 🛠️ Commandes Utiles

```bash
# Dev
npm run dev                 # Lancer dev server
npm run build              # Build production
npm run start              # Lancer production

# Database
npx prisma studio          # DB viewer GUI
npx prisma generate        # Régénérer client
npx prisma db push         # Sync schema
npx prisma format          # Formater schema

# Types
npx tsc --noEmit           # Check types

# Clean
rm -rf .next node_modules  # Nettoyage complet
npm install                # Réinstaller
```

## 💡 Tips

1. **Prisma Studio** est votre ami
   ```bash
   npx prisma studio
   # Voir/éditer données directement
   ```

2. **DevTools Network** pour debug API
   - Ouvrir DevTools → Network
   - Voir requêtes `/api/*`
   - Check status codes et payloads

3. **Les logs sont dans le terminal**
   - `console.error()` côté client → Browser console
   - API errors → Terminal où tourne `npm run dev`

4. **Fichiers CSV exemples**
   - `sample-data/` contient 3 fichiers prêts à l'emploi
   - Copier/modifier pour vos tests

5. **Hot Reload**
   - Modification code → Auto-refresh
   - Si ça ne marche pas: Ctrl+C et relancer `npm run dev`

## 🎉 Vous êtes prêt!

L'application devrait maintenant tourner sur http://localhost:3000

Questions? Check la documentation dans le dossier.

Bugs? Voir les logs dans le terminal.

**Happy coding! 🚀**
