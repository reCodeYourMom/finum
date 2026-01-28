# Guide de Test - Sprint 1

Ce guide vous permet de tester rapidement toutes les fonctionnalités du Sprint 1.

## Prérequis

1. **Base de données configurée** (Neon)
2. **Google OAuth configuré**
3. **Application lancée**: `npm run dev`

## Étape 1: Préparer les Fichiers CSV de Test

### Fichier: test-budgets.csv

```csv
name,amount,currency,period,category
Alimentation,500,EUR,monthly,Nourriture
Loyer,1200,EUR,monthly,Logement
Transport,150,EUR,monthly,Mobilité
Loisirs,200,EUR,monthly,Divertissement
Épargne,300,EUR,monthly,Économies
Vacances,2000,EUR,goal,Voyage
```

### Fichier: test-transactions.csv

```csv
date,amount,merchant,currency,description,category
2024-01-05,45.50,Carrefour,EUR,Courses hebdo,Alimentation
2024-01-06,12.90,Uber,EUR,Course domicile,Transport
2024-01-08,120.00,Netflix,EUR,Abonnement streaming,Loisirs
2024-01-10,1200.00,Propriétaire,EUR,Loyer janvier,Logement
2024-01-12,35.20,Monoprix,EUR,Courses,Alimentation
2024-01-15,89.00,SNCF,EUR,Billet train,Transport
2024-01-18,52.40,Carrefour,EUR,Courses,Alimentation
2024-01-20,25.00,Cinema Gaumont,EUR,Film,Loisirs
2024-01-22,150.50,EDF,EUR,Electricité,Logement
2024-01-25,42.80,Carrefour,EUR,Courses,Alimentation
2024-01-28,15.90,Spotify,EUR,Abonnement musique,Loisirs
```

**Note:** Ajuster les dates au mois actuel pour voir les métriques MTD.

## Étape 2: Test Import Budgets

### Actions

1. **Naviguer vers la page Budget**
   ```
   http://localhost:3000/budget
   ```

2. **Cliquer sur "Importer CSV"**

3. **Drag & Drop ou sélectionner `test-budgets.csv`**

4. **Vérifier la prévisualisation**
   - Nom fichier affiché
   - Taille fichier
   - Possibilité d'annuler

5. **Cliquer "Importer"**

6. **Vérifier le feedback**
   - ✅ "6 budget(s) créé(s)"
   - Liste des budgets affichée

### Résultat Attendu

- 6 budgets dans la liste
- Stats overview:
  - Total Budgets: 6
  - Total Alloué: 3 750 €
  - Total Dépensé: 0 € (pas encore de transactions)

## Étape 3: Test Import Transactions

### Actions

1. **Naviguer vers la page Transactions**
   ```
   http://localhost:3000/transactions
   ```

2. **Cliquer sur "Importer CSV"**

3. **Drag & Drop `test-transactions.csv`**

4. **Cliquer "Importer"**

5. **Vérifier le feedback**
   - ✅ "11 transaction(s) créée(s)"
   - 0 doublon (premier import)

### Résultat Attendu

- 11 transactions dans la table
- Stats overview:
  - Total Transactions: 11
  - Montant Total: 1 789,20 €
  - Montant Moyen: ~162 €
  - Plus Grande Transaction: 1 200 €

### Test Déduplication

1. **Réimporter le même fichier `test-transactions.csv`**

2. **Vérifier le feedback**
   - ✅ "0 transaction(s) créée(s)"
   - 11 doublons ignorés

3. **Vérifier dans la table**
   - Toujours 11 transactions (aucune duplication)

## Étape 4: Test Dashboard Cockpit

### Actions

1. **Naviguer vers le Cockpit**
   ```
   http://localhost:3000/cockpit
   ```

2. **Vérifier toutes les métriques affichées**

### Résultat Attendu

#### 1. Score de Santé
- Valeur entre 0-100 affichée
- Emoji approprié (🎉, 👍, ⚠️, ou 🚨)
- Label status (Excellent, Bon, À surveiller, Critique)

#### 2. Run-rate Quotidien
- Valeur en €/jour calculée
- Jour X/Y du mois affiché
- Icône calendrier

#### 3. Projection Fin de Mois
- Estimation basée sur tendance
- Couleur rouge si > budget total

#### 4. Budget Mensuel
- Total: 2 250 € (sum des budgets mensuels)
- % utilisé affiché

#### 5. Runway
- Nombre de mois ou ∞
- Cash actuel: 0 € (par défaut)
- Couleur selon le nombre

#### 6. Dépenses MTD
- Montant total dépensé
- Progress bar vs budget
- Budget restant calculé

#### 7. Top Catégories
- 5 catégories maximum
- Montants décroissants
- Progress bars proportionnelles
- % du total affiché

#### 8. Budget vs Réel
- Aucun bucket (pas créés dans sprint 1)
- Section vide ou message

#### 9. Graphique Tendances
- Si plusieurs mois de données
- Line chart avec points
- Stats résumées en dessous

## Étape 5: Test Conversion Devises

### Créer fichier: test-transactions-usd.csv

```csv
date,amount,merchant,currency,description,category
2024-01-29,50.00,Amazon,USD,Livres en ligne,Loisirs
2024-01-29,100.00,Apple Store,USD,App,Loisirs
```

### Actions

1. **Importer `test-transactions-usd.csv`**

2. **Vérifier dans la table transactions**
   - Montants affichés en USD
   - Conversion EUR automatique en backend

3. **Vérifier dans le cockpit**
   - Stats incluent les transactions USD converties
   - Tous les montants en EUR

### Résultat Attendu

- 2 nouvelles transactions USD
- Montants USD visibles dans colonne "Montant"
- Calculs cockpit incluent conversion EUR

## Étape 6: Test Filtres (Backend Ready)

### Via URL Parameters

```
# Filtrer par date
http://localhost:3000/transactions?startDate=2024-01-01&endDate=2024-01-15

# Filtrer par merchant
http://localhost:3000/transactions?merchant=Carrefour

# Filtrer par catégorie
http://localhost:3000/transactions?category=Alimentation

# Pagination
http://localhost:3000/transactions?skip=0&take=5
```

**Note:** UI filtres pas encore implémentée, mais API fonctionne.

## Étape 7: Test Responsive

### Desktop (1920px)
- Toutes les grids en 3-4 colonnes
- Graphique en full width
- Table complète

### Tablet (768px)
- Grids en 2 colonnes
- Navigation compacte
- Table scrollable horizontalement

### Mobile (375px)
- Grids en 1 colonne
- Métriques empilées
- Table scrollable

## Étape 8: Test Prisma Studio

### Actions

1. **Ouvrir Prisma Studio**
   ```bash
   npx prisma studio
   ```

2. **Vérifier les données en DB**
   - Table `Budget`: 6 entrées
   - Table `Transaction`: 13 entrées (11 + 2 USD)
   - Table `User`: 1 entrée (votre compte Google)

3. **Vérifier les conversions**
   - Colonne `amountEur` remplie pour toutes les transactions
   - Colonne `merchantNorm` lowercase et nettoyée

## Étape 9: Test Navigation

### Actions

1. **Cliquer sur chaque section du menu**
   - Cockpit
   - Budget
   - Transactions
   - Patterns
   - Coach

2. **Vérifier l'état actif**
   - Section active avec fond bleu
   - Texte blanc
   - Icône colorée

3. **Vérifier le header**
   - Avatar/nom utilisateur
   - Dropdown au clic
   - Option "Déconnexion"

## Étape 10: Test Logout & Re-Login

### Actions

1. **Cliquer sur avatar → Déconnexion**

2. **Vérifier redirect vers `/login`**

3. **Re-login avec Google**

4. **Vérifier redirect vers `/cockpit`**

5. **Vérifier que les données sont toujours là**
   - Budgets conservés
   - Transactions conservées
   - Métriques recalculées

## Checklist Complète

### Import
- [ ] Import budgets CSV fonctionne
- [ ] Import transactions CSV fonctionne
- [ ] Déduplication transactions fonctionne
- [ ] Conversion devises fonctionne
- [ ] Feedback d'erreurs affiché
- [ ] Auto-refresh après import

### Cockpit
- [ ] Score santé calculé et affiché
- [ ] Run-rate quotidien correct
- [ ] Projection fin de mois affichée
- [ ] Budget mensuel total correct
- [ ] Runway calculé (ou ∞)
- [ ] Dépenses MTD avec progress bar
- [ ] Top 5 catégories affichées
- [ ] Graphique tendances rendu

### UI/UX
- [ ] Design premium respecté
- [ ] Animations smooth
- [ ] Loading states affichés
- [ ] Empty states appropriés
- [ ] Responsive sur tous devices
- [ ] Navigation fonctionne
- [ ] Logout/login fonctionne

### Performance
- [ ] Cockpit charge en < 1s
- [ ] Budget list charge en < 500ms
- [ ] Transactions list charge en < 500ms
- [ ] Import CSV < 3s pour 100 lignes
- [ ] Pas de lag UI

## Problèmes Courants

### "Unauthorized" dans les API calls

**Cause:** Session expirée ou pas de Google OAuth configuré

**Solution:**
1. Vérifier `.env.local`
2. Vérifier Google Cloud Console redirect URIs
3. Re-login

### "Failed to fetch exchange rates"

**Cause:** API externe down ou rate limit

**Solution:**
- App utilise fallback static rates
- Pas d'impact fonctionnel
- Retry après quelques minutes

### "Cannot convert undefined to Decimal"

**Cause:** Montant invalide dans CSV

**Solution:**
- Vérifier format CSV
- Montants doivent être numériques
- Voir erreurs détaillées dans modal

### Transactions ne s'affichent pas dans cockpit

**Cause:** Transactions hors du mois actuel

**Solution:**
- Ajuster dates CSV au mois actuel
- MTD = Month To Date (mois en cours)

## Commandes Utiles

```bash
# Lancer l'app
npm run dev

# Voir les logs Prisma
DEBUG="prisma:*" npm run dev

# Ouvrir Prisma Studio
npx prisma studio

# Réinitialiser la DB (⚠️ supprime tout)
npx prisma migrate reset

# Vérifier les types
npx tsc --noEmit
```

## Prochains Tests (Sprint 2)

- [ ] Création buckets UI
- [ ] Assignment manuel transactions
- [ ] Création règles d'assignation
- [ ] Auto-assignment sur import
- [ ] Édition/suppression budgets
- [ ] Édition transactions

---

**Tous les tests passent? Sprint 1 validé! ✅**

Si problème, check:
1. `.env.local` configuré
2. DB Neon active
3. `npx prisma generate` exécuté
4. Node v24.3.0 (`nvm use`)
