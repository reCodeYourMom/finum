# Sprint 2 - Buckets & Règles ✅ TERMINÉ

## Résumé

Le Sprint 2 introduit la gestion complète des buckets, l'engine de règles d'assignation, et l'assignation automatique des transactions à l'import.

## Réalisations

### 1. Buckets CRUD ✅

**Fichiers créés / mis à jour :**
- `src/lib/services/bucket.service.ts` - CRUD buckets + stats
- `src/app/api/buckets/route.ts` - GET/POST buckets
- `src/app/api/buckets/[id]/route.ts` - GET/PATCH/DELETE bucket
- `src/components/dashboard/BucketFormModal.tsx` - Form modal création/édition
- `src/app/(dashboard)/budget/page.tsx` - UI gestion buckets

**Fonctionnalités :**
- Création, édition, suppression de buckets
- Association optionnelle à un budget
- Montants alloués + dépensés affichés
- Détachement des transactions lors suppression

### 2. Règles d'assignation ✅

**Fichiers créés / mis à jour :**
- `src/lib/services/rule.service.ts` - Engine de règles + matching
- `src/app/api/rules/route.ts` - GET/POST règles
- `src/app/api/rules/[id]/route.ts` - PATCH/DELETE règle
- `src/components/dashboard/RuleFormModal.tsx` - Builder de règles
- `src/app/(dashboard)/transactions/page.tsx` - UI règles

**Types de règles supportés :**
- Marchand exact
- Catégorie
- Montant (intervalle)
- Marchand + catégorie

**Caractéristiques :**
- Priorité décroissante (plus haut = appliqué en premier)
- Validation côté API
- Listing + édition/suppression

### 3. Assignation automatique & manuelle ✅

**Fichiers créés / mis à jour :**
- `src/lib/services/transaction.service.ts` - Auto-assignation à l'import
- `src/app/api/transactions/[id]/route.ts` - Assignation + création règle
- `src/app/api/transactions/unassigned/route.ts` - Liste non assignées
- `src/components/dashboard/TransactionImportModal.tsx` - Feedback assignation
- `src/app/(dashboard)/transactions/page.tsx` - UI assignation

**Fonctionnalités :**
- Auto-assignation sur import CSV selon règles
- Liste “Transactions à assigner”
- Assignation manuelle + option création règle
- Mise à jour automatique des montants dépensés par bucket

## Nouveaux Endpoints API

```
GET  /api/buckets
POST /api/buckets
GET  /api/buckets/[id]
PATCH /api/buckets/[id]
DELETE /api/buckets/[id]

GET  /api/rules
POST /api/rules
PATCH /api/rules/[id]
DELETE /api/rules/[id]

PATCH /api/transactions/[id]          # Assignation bucket + règle optionnelle
GET   /api/transactions/unassigned    # Liste transactions non assignées
```

## UI/UX

- Section Buckets sur la page Budget
- Section “Transactions à assigner”
- Section “Règles d'assignation”
- Modals dédiés pour buckets et règles
- Feedback import avec nombre auto‑assigné

## Résultat

Sprint 2 complété avec :
- Gestion complète des buckets
- Assignation automatique & manuelle
- Règles d'assignation prêtes pour production

*Dernière mise à jour : 28 janvier 2026*
