# Sample Data - Finum

Ce dossier contient des fichiers CSV d'exemple pour tester rapidement les fonctionnalités d'import.

## Fichiers Disponibles

### 1. example-budgets.csv

**Contenu**: 10 budgets (8 mensuels + 2 objectifs)

**Total alloué**: 2 800 € mensuel + 5 000 € objectifs

**Catégories**:
- Alimentation: 500 €
- Loyer: 1 200 €
- Transport: 150 €
- Loisirs: 200 €
- Épargne: 300 €
- Santé: 100 €
- Shopping: 150 €
- Restaurants: 200 €
- Vacances: 2 000 € (objectif)
- Réserve Urgence: 3 000 € (objectif)

### 2. example-transactions.csv

**Contenu**: 19 transactions de janvier 2026

**Total dépensé**: ~2 200 €

**Transactions récurrentes**:
- Carrefour (5x) - Courses alimentaires
- Loyer, Netflix, Spotify - Abonnements mensuels

**Catégories représentées**:
- Alimentation, Transport, Loisirs, Logement, Restaurants, Santé, Shopping

### 3. example-transactions-multi-currency.csv

**Contenu**: 9 transactions en devises étrangères

**Devises**: USD, GBP, CHF, CAD, JPY

**Utilité**: Tester la conversion automatique vers EUR

## Comment Utiliser

### Méthode 1: Via l'Interface Web

1. **Importer les budgets**
   ```
   http://localhost:3000/budget
   → Cliquer "Importer CSV"
   → Sélectionner "example-budgets.csv"
   → Importer
   ```

2. **Importer les transactions**
   ```
   http://localhost:3000/transactions
   → Cliquer "Importer CSV"
   → Sélectionner "example-transactions.csv"
   → Importer
   ```

3. **Voir le dashboard**
   ```
   http://localhost:3000/cockpit
   → Toutes les métriques s'affichent automatiquement
   ```

### Méthode 2: Via API (curl)

```bash
# Import budgets
curl -X POST http://localhost:3000/api/budget/import \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -F "file=@sample-data/example-budgets.csv"

# Import transactions
curl -X POST http://localhost:3000/api/transactions/import \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -F "file=@sample-data/example-transactions.csv"
```

**Note**: Remplacer `YOUR_TOKEN` par votre session token (voir DevTools → Application → Cookies)

## Test de Déduplication

Pour tester la déduplication:

1. Importer `example-transactions.csv` une première fois
2. Réimporter le même fichier
3. Vérifier le message: "0 transaction(s) créée(s), 19 doublons ignorés"

## Test de Conversion Devises

1. Importer `example-transactions.csv` (EUR)
2. Importer `example-transactions-multi-currency.csv` (multi-devises)
3. Aller sur `/cockpit`
4. Vérifier que toutes les stats sont en EUR (conversion automatique)
5. Aller sur `/transactions`
6. Voir les montants originaux avec leur devise dans la table

## Métriques Attendues (après import complet)

Après avoir importé `example-budgets.csv` + `example-transactions.csv`:

### Budget
- Total Budgets: 10
- Total Alloué: 7 800 €
- Total Dépensé: ~2 200 €

### Cockpit
- Run-rate quotidien: ~79 €/jour (2200 ÷ 28)
- Projection EOM: ~2 450 €
- Budget mensuel: 2 800 €
- % utilisé: ~79%
- Top catégorie: Logement (1 200 €)

### Transactions
- Total: 19 transactions
- Montant total: ~2 200 €
- Montant moyen: ~116 €
- Plus grande: 1 200 € (Loyer)

## Créer Vos Propres CSV

### Format Budget

```csv
name,amount,currency,period,category
Mon Budget,500,EUR,monthly,Ma Catégorie
```

**Colonnes**:
- `name` (requis): Nom du budget
- `amount` (requis): Montant numérique
- `currency` (optionnel, défaut EUR): EUR, USD, GBP, CHF, CAD, JPY
- `period` (optionnel, défaut monthly): monthly, annual, goal
- `category` (optionnel): Texte libre

### Format Transaction

```csv
date,amount,merchant,currency,description,category
2026-01-15,45.50,Carrefour,EUR,Courses,Alimentation
```

**Colonnes**:
- `date` (requis): YYYY-MM-DD, DD/MM/YYYY, ou DD-MM-YYYY
- `amount` (requis): Montant numérique (toujours positif)
- `merchant` (requis): Nom du marchand
- `currency` (optionnel, défaut EUR): Devise
- `description` (optionnel): Description
- `category` (optionnel): Catégorie

**Notes**:
- Les montants sont toujours positifs (dépenses uniquement)
- La détection de doublons utilise: date + amount + merchant
- La normalisation marchands aide à détecter les patterns (ex: "Carrefour Paris 15" → "carrefour")

## Formats de Date Acceptés

```csv
2026-01-15      # ISO (recommandé)
15/01/2026      # Format français
15-01-2026      # Format français alt
```

## Nettoyage Montants

Ces formats sont acceptés et nettoyés automatiquement:

```csv
45.50           # Standard
45,50           # Virgule décimale (FR)
1 234,56        # Avec espaces
1.234,56        # Avec points séparateurs
€45.50          # Avec symbole devise
-45.50          # Négatif (converti en positif)
```

## Troubleshooting

### "Invalid date format"
- Vérifier le format de date (YYYY-MM-DD recommandé)
- Pas de dates futures acceptées

### "Invalid amount"
- Vérifier que la colonne amount contient un nombre
- Pas de texte dans amount

### "Merchant is required"
- Chaque ligne doit avoir un merchant
- Pas de lignes vides

### Erreurs de parsing
- Ouvrir le CSV dans un éditeur texte
- Vérifier l'encodage (UTF-8 recommandé)
- Vérifier les virgules dans les champs (utiliser guillemets si nécessaire)

---

**Prêt pour les tests!** 🚀
