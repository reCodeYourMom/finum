# Commandes Utiles - Finum

Référence rapide de toutes les commandes courantes.

## 🚀 Développement

### Démarrage

```bash
# Lancer le serveur de développement
npm run dev

# Sur un port différent
PORT=3001 npm run dev

# Avec logs détaillés
DEBUG="*" npm run dev
```

### Build & Production

```bash
# Build pour production
npm run build

# Lancer en mode production (après build)
npm run start

# Build + Start
npm run build && npm run start
```

## 📦 Gestion des Dépendances

### Installation

```bash
# Installer toutes les dépendances
npm install

# Ajouter une dépendance
npm install package-name

# Ajouter une dépendance de dev
npm install -D package-name

# Supprimer une dépendance
npm uninstall package-name
```

### Nettoyage

```bash
# Nettoyer node_modules
rm -rf node_modules package-lock.json
npm install

# Nettoyer le cache npm
npm cache clean --force

# Nettoyer .next
rm -rf .next
```

## 🗄️ Prisma (Base de Données)

### Client Prisma

```bash
# Générer le client Prisma
npx prisma generate

# Régénérer après changement du schema
npx prisma generate
```

### Schema & Migrations

```bash
# Pousser le schema vers la DB (dev)
npx prisma db push

# Créer une migration (production)
npx prisma migrate dev --name nom_migration

# Appliquer les migrations
npx prisma migrate deploy

# Réinitialiser la DB (⚠️ SUPPRIME TOUTES LES DONNÉES)
npx prisma migrate reset
```

### Synchronisation

```bash
# Récupérer le schema depuis la DB
npx prisma db pull

# Formater le schema
npx prisma format

# Valider le schema
npx prisma validate
```

### Studio (DB Viewer)

```bash
# Ouvrir Prisma Studio
npx prisma studio

# Sur un port différent
npx prisma studio --port 5556
```

### Seed (Données de test)

```bash
# Exécuter le seed (si configuré)
npx prisma db seed
```

## 🎨 shadcn/ui

### Ajouter des Composants

```bash
# Ajouter un composant
npx shadcn add button

# Ajouter plusieurs composants
npx shadcn add button card input

# Lister tous les composants disponibles
npx shadcn add
```

### Composants Courants

```bash
# Forms
npx shadcn add form input label textarea select checkbox radio-group

# Layout
npx shadcn add card separator tabs sheet

# Feedback
npx shadcn add alert dialog toast

# Navigation
npx shadcn add dropdown-menu navigation-menu

# Data
npx shadcn add table data-table

# Charts
npx shadcn add chart
```

## 🔧 TypeScript

### Type Checking

```bash
# Vérifier les types
npx tsc --noEmit

# Vérifier avec watch mode
npx tsc --noEmit --watch
```

## 🧪 Tests (À configurer)

```bash
# Lancer les tests (quand configurés)
npm test

# Tests en watch mode
npm test -- --watch

# Coverage
npm test -- --coverage
```

## 🌐 Vercel

### Déploiement

```bash
# Installer Vercel CLI
npm install -g vercel

# Login
vercel login

# Déployer (preview)
vercel

# Déployer en production
vercel --prod

# Lister les déploiements
vercel list

# Voir les logs
vercel logs
```

### Variables d'Environnement

```bash
# Ajouter une variable
vercel env add

# Lister les variables
vercel env ls

# Supprimer une variable
vercel env rm
```

## 🔍 Debugging

### Logs

```bash
# Logs détaillés Next.js
DEBUG="*" npm run dev

# Logs Prisma uniquement
DEBUG="prisma:*" npm run dev

# Logs d'une query spécifique
DEBUG="prisma:query" npm run dev
```

### Inspection

```bash
# Analyser le bundle
npm run build && npx @next/bundle-analyzer

# Vérifier les variables d'environnement
node -e "console.log(process.env)"
```

## 🧹 Nettoyage & Reset

### Nettoyage Complet

```bash
# Supprimer tous les fichiers générés
rm -rf node_modules .next out dist build
rm package-lock.json

# Réinstaller
npm install
```

### Reset DB

```bash
# Reset complet de la DB (⚠️ SUPPRIME TOUT)
npx prisma migrate reset

# Recréer le schema
npx prisma db push

# Ouvrir Studio pour vérifier
npx prisma studio
```

## 🔐 Auth & Sécurité

### Générer des Secrets

```bash
# Générer AUTH_SECRET
openssl rand -base64 32

# Générer un UUID
node -e "console.log(require('crypto').randomUUID())"

# Générer un token aléatoire
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 📊 Monitoring & Stats

### Analyse du Projet

```bash
# Compter les lignes de code
find src -name "*.ts" -o -name "*.tsx" | xargs wc -l

# Taille du build
du -sh .next

# Taille de node_modules
du -sh node_modules

# Nombre de packages
npm list --depth=0 | wc -l
```

### Performance

```bash
# Analyser les performances
npm run build && npm run start &
# Puis: http://localhost:3000?performance=true
```

## 🔄 Git

### Commits

```bash
# Status
git status

# Add all
git add .

# Commit
git commit -m "message"

# Push
git push origin main
```

### Branches

```bash
# Créer une branche
git checkout -b feature/nom

# Changer de branche
git checkout main

# Lister les branches
git branch -a

# Supprimer une branche
git branch -d feature/nom
```

## 📱 PWA (À configurer)

```bash
# Générer les icons PWA (si configuré)
npx pwa-asset-generator logo.svg public/icons

# Valider le manifest
npx web-app-manifest-validator public/manifest.json
```

## 🛠️ Utilitaires

### Node Version

```bash
# Utiliser la bonne version de Node
nvm use

# Vérifier la version
node --version

# Installer une nouvelle version
nvm install 24.3.0
```

### Find & Replace

```bash
# Trouver tous les fichiers contenant un texte
grep -r "texte à chercher" src/

# Remplacer dans tous les fichiers (macOS)
find src -type f -name "*.ts*" -exec sed -i '' 's/ancien/nouveau/g' {} +

# Remplacer dans tous les fichiers (Linux)
find src -type f -name "*.ts*" -exec sed -i 's/ancien/nouveau/g' {} +
```

### Port Management

```bash
# Trouver ce qui utilise le port 3000
lsof -i :3000

# Tuer le processus sur le port 3000
lsof -ti:3000 | xargs kill -9
```

## 🎯 Workflows Courants

### Nouveau Composant

```bash
# 1. Créer le fichier
touch src/components/MonComposant.tsx

# 2. Si besoin d'un composant shadcn
npx shadcn add button

# 3. Développer avec hot reload
npm run dev
```

### Nouveau Model Prisma

```bash
# 1. Éditer schema.prisma
# 2. Pousser vers la DB
npx prisma db push

# 3. Régénérer le client
npx prisma generate

# 4. Vérifier dans Studio
npx prisma studio
```

### Nouvelle Page

```bash
# 1. Créer le dossier
mkdir -p src/app/\(dashboard\)/ma-page

# 2. Créer page.tsx
touch src/app/\(dashboard\)/ma-page/page.tsx

# 3. Ajouter la route dans DashboardNav.tsx
# 4. Développer
npm run dev
```

### Debug d'un Bug

```bash
# 1. Vérifier les logs
npm run dev  # Regarder les erreurs dans le terminal

# 2. Vérifier la DB
npx prisma studio

# 3. Vérifier les variables d'env
cat .env.local

# 4. Vérifier les types
npx tsc --noEmit

# 5. Nettoyer si nécessaire
rm -rf .next node_modules
npm install
```

## 📚 Documentation

### Générer la Doc

```bash
# Générer la doc TypeScript (si configuré)
npx typedoc src

# Générer le diagramme du schema Prisma
npx prisma-erd-generator
```

## 🚨 Urgences

### L'app ne démarre pas

```bash
# 1. Vérifier Node version
node --version  # Doit être 24.3.0
nvm use 24.3.0

# 2. Nettoyer et réinstaller
rm -rf node_modules .next package-lock.json
npm install

# 3. Régénérer Prisma
npx prisma generate

# 4. Relancer
npm run dev
```

### Erreur Prisma

```bash
# 1. Régénérer le client
npx prisma generate

# 2. Vérifier la connection DB
npx prisma db execute --stdin < /dev/null

# 3. Reset si nécessaire
npx prisma migrate reset
```

### Erreur Auth

```bash
# 1. Vérifier .env.local
cat .env.local

# 2. Vérifier les credentials Google Cloud Console

# 3. Régénérer AUTH_SECRET
openssl rand -base64 32
# Mettre à jour dans .env.local

# 4. Restart
npm run dev
```

---

## 🔗 Liens Rapides

- Next.js Docs: https://nextjs.org/docs
- Prisma Docs: https://www.prisma.io/docs
- shadcn/ui: https://ui.shadcn.com
- NextAuth: https://next-auth.js.org
- Tailwind: https://tailwindcss.com

---

**Copier-coller et c'est parti! 🚀**
