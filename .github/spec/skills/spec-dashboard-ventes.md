# Spec — Dashboard des ventes

**Statut : brouillon de travail, non validé.** Les prompts ci-dessous sont provisoires. Aucune session d'implémentation du dashboard n'est lancée.

**Sources :** réunion Teams « Dashboard des ventes — lancement », 23 novembre 2026, sa synthèse WorkIQ et le code examiné. Les conclusions de la réunion sont rapportées par WorkIQ ; le transcript n'a pas été lu directement.

## Objectif

Donner aux responsables une vue fiable des ventes fictives dans le registre de données de l'application, sans modifier la boutique. La priorité est l'exactitude des chiffres, puis leur présentation et leur filtrage.

## 1. Ce que ça fait

- Afficher le total des ventes, le nombre de commandes et le panier moyen ; les ventes par point de vente et par canal, les 10 produits principaux et l'évolution mensuelle.
- Combiner les filtres de dates de début et de fin inclusives, de canal et de point de vente ; tous les chiffres et visuels reflètent le même ensemble de commandes. Deux périodes peuvent être consultées successivement, sans comparaison simultanée.
- Calculer une ligne avec `quantity × unitPriceCents` : le prix historique contient déjà la remise. Le canal provient de `orders.locationId → locations.channel`, non des préférences du client. Inclure les commandes simulées sauvegardées localement.
- Indiquer que les commandes sont fictives, et non des paiements ou encaissements réels. Afficher explicitement l'absence de résultats et les erreurs, sans chiffre partiel ni division par zéro.
- Montrer les tendances sans attribuer de causalité aux campagnes ou à la saisonnalité.

## 2. Comment on saura que ça marche

| Contrôle | Méthode | Résultat attendu |
|---|---|---|
| Réconciliation indépendante | Additionner `quantity × unitPriceCents` dans le seul jeu initial du 1 au 31 mars 2025 inclus | **55 commandes ; 646 092 cents, soit 6 460,92 USD**. Cette référence ne vaut pas pour un stockage local enrichi. |
| Prix historique et filtres | Jeu manuel avec prix catalogue différent, ligne remisée, deux canaux et deux dates | Seuls les prix historiques et les commandes sélectionnées comptent ; le portail n'est pas un magasin. |
| Interface | Tester filtres combinés, dates inclusives, sélection vide et dates invalides | Tous les visuels sont cohérents ; état vide explicite, panier non calculé et erreur visible si applicable. |
| Robustesse | Tester données invalides et dépassement de précision | Erreur explicite ; aucun chiffre approximatif ou partiel. |
| Régression | Consulter le registre et passer une commande simulée | Données inchangées par la consultation ; commande locale présente quand les filtres l'incluent ; parcours existants préservés. |

## 3. Ce que ça ne doit pas casser

La boutique, la recherche, le panier, la commande simulée, les données historiques, les clés de stockage, le registre brut et les erreurs existantes. Aucun serveur ni service externe n'est ajouté. Le registre est local au navigateur ; ne pas le présenter comme protégé tant qu'un contrôle d'accès n'est pas défini.

## Hors périmètre et limites

| Sujet | Raison |
|---|---|
| Marge | Les coûts d'achat ne figurent pas dans les données. |
| Export Excel ou CSV | Reporté hors V1 dans la spec initiale. |
| Paiements réels, taxes, expédition, prévisions | Absents des données ou non décidés au lancement. |
| Comparaison simultanée de périodes | Non décidée au lancement ; sélection successive seulement. |

Les montants sont en cents entiers USD et les dates en UTC. Les sources sont `src/data/sales.json`, `src/services/salesStorage.ts`, `src/types/sales.ts` et `src/services/money.ts`. Les totaux et regroupements doivent rester des entiers sûrs ; tout dépassement est une erreur, pas une approximation.

**Point ultérieur, distinct du lancement :** lors du point de suivi, un export CSV de la vue filtrée a été demandé. Il ne fait pas partie de cette spec V1 du lancement ; il nécessite son propre cadrage.

## Questions ouvertes avant lancement

1. **Top 10 :** classer par chiffre d'affaires ou quantité, et comment départager les égalités ? À consigner sur `topProducts` dans le contrat.
2. **Panier moyen :** quelle règle d'arrondi pour une fraction de cent ? À consigner sur `averageOrderCents`.
3. **Accès :** le registre local sans authentification suffit-il, ou faut-il une protection ? Si oui, en définir le périmètre avant la phase 0.

**Décisions de référence, non attribuées à la réunion :** les PR #10–#12 utilisent un classement par chiffre d'affaires décroissant, puis quantité décroissante et identifiant croissant ; un arrondi au cent le plus proche, demi-cent vers le haut ; et un accès local sans authentification. Elles constituent des exemples d'implémentation, pas des réponses acquises pour ce brouillon. Le contrat proposé ci-dessous conserve ces trois décisions ouvertes ; il ne fige pas ces choix de référence.

## Organisation : développement parallèle, intégration séquentielle

Après validation humaine et réponse aux trois questions, le coordinateur publie sur `dashboard/0-contrat` un contrat figé et cette spec sous `.github/spec/skills/spec-dashboard-ventes.md`. Les trois sessions développent **en parallèle** depuis ce même contrat. L'intégration seule est séquentielle : **calculs → widgets du registre → filtres** ; PR 1 vers `main`, PR 2 vers la branche de PR 1, PR 3 vers la branche de PR 2. Une session qui doit changer le contrat s'arrête et le signale au coordinateur. Aucun lancement avant validation.

### Phase 0 — Contrat proposé, à compléter après décisions

Le code ci-dessous est copiable ; les commentaires marqués « décision » doivent être complétés avant de geler le contrat. Les signatures et composants vides ne sont pas une implémentation du dashboard.

**`src/types/salesDashboard.ts`**

```ts
import type { SalesChannel } from './sales'

export interface SalesDashboardFilters {
  startDate?: string // YYYY-MM-DD UTC, inclus
  endDate?: string // YYYY-MM-DD UTC, inclus
  channel?: SalesChannel
  locationId?: string
}

export interface SalesTotals {
  orderCount: number
  totalCents: number
}

export interface SalesKpis extends SalesTotals {
  // null sans commande ; décision à consigner : règle d'arrondi.
  averageOrderCents: number | null
}

export interface LocationSales extends SalesTotals {
  locationId: string
  locationName: string
  channel: SalesChannel
}

export interface ChannelSales extends SalesTotals {
  channel: SalesChannel
}

export interface ProductSales {
  productId: number
  productName: string
  category: string
  quantity: number
  totalCents: number
}

export interface MonthlySales extends SalesTotals {
  month: string // YYYY-MM UTC
}

export interface SalesDashboardResult {
  kpis: SalesKpis
  byLocation: LocationSales[]
  byChannel: ChannelSales[]
  topProducts: ProductSales[] // au plus 10 ; décision à consigner : classement et égalités
  monthly: MonthlySales[] // ordre chronologique croissant
}

export type SalesDashboardErrorCode =
  | 'INVALID_FILTER'
  | 'INVALID_DATA'
  | 'UNREPRESENTABLE_AMOUNT'
```

**`src/services/salesDashboard.ts`**

```ts
import type { SalesData } from '../types/sales'
import type {
  SalesDashboardErrorCode,
  SalesDashboardFilters,
  SalesDashboardResult
} from '../types/salesDashboard'

export class SalesDashboardError extends Error {
  readonly code: SalesDashboardErrorCode

  constructor(code: SalesDashboardErrorCode, message: string) {
    super(message)
    this.name = 'SalesDashboardError'
    this.code = code
  }
}

export function computeSalesDashboard(
  _data: SalesData,
  _filters: SalesDashboardFilters = {}
): SalesDashboardResult {
  throw new Error('Calcul du dashboard non implémenté')
}
```

Le service final est pur. Dates mal formées ou inversées et localisation inconnue : `INVALID_FILTER` ; canal et localisation incompatibles : résultat vide ; commandes, lignes ou références invalides : `INVALID_DATA` ; précision impossible : `UNREPRESENTABLE_AMOUNT`. Les erreurs sont affichées, jamais remplacées par un succès fictif.

**`src/components/SalesDashboardFilters.vue`**

```vue
<script setup lang="ts">
import type { SalesLocation } from '../types/sales'
import type { SalesDashboardFilters } from '../types/salesDashboard'

defineProps<{
  modelValue: SalesDashboardFilters
  locations: readonly SalesLocation[]
}>()
defineEmits<{
  'update:modelValue': [value: SalesDashboardFilters]
}>()
</script>

<template>
  <div />
</template>
```

Le stub n'émet rien. Le composant final émet un nouvel objet à chaque changement, ne mute pas la prop et omet les champs effacés.

### Propriété exclusive des fichiers

| Fichiers | Propriétaire |
|---|---|
| Spec, `src/types/salesDashboard.ts`, création initiale des deux stubs, dépendances et verrouillage éventuels | Coordinateur, phase 0 uniquement |
| Corps de `src/services/salesDashboard.ts`, `src/services/salesDashboard.test.ts` | Session 1 |
| `src/components/SalesDashboard.vue`, ses widgets et tests sauf `SalesDashboardFilters.*`, `src/components/WorkshopDataView.vue`, `src/App.vue` si nécessaire | Session 2 |
| Corps de `src/components/SalesDashboardFilters.vue`, `src/components/SalesDashboardFilters.test.ts` | Session 3 |
| Tous les autres fichiers existants | Aucun ; ne pas modifier sans accord du coordinateur |

Les stubs sont créés par le coordinateur avant le travail parallèle ; leurs corps sont ensuite détenus par les sessions indiquées. Chaque session crée ses propres données de test ; aucun fichier de fixtures partagé. Les dépendances éventuelles sont fixées en phase 0. Toute évolution des fichiers transverses exige une décision du coordinateur.

## Trois tâches — prompts provisoires à valider

### PR 1 — Calculs

**Prompt :** Lis la spec `.github/spec/skills/spec-dashboard-ventes.md` depuis `dashboard/0-contrat`. Implémente uniquement le corps de `src/services/salesDashboard.ts` et ses tests `src/services/salesDashboard.test.ts`, selon le contrat figé et les décisions consignées. Calcule KPI, canaux, localisations, top produits et mois avec les prix historiques, les filtres combinés et des cents exacts. Ne modifie ni stockage, ni interface, ni contrat.

**Parallèle :** service et tests isolés. **Intégration :** première couche vers `main`. **Test qui échoue avant :** réconciliation de mars et jeu remisé à deux canaux. **Acceptation :** 55 commandes / 646 092 cents sur le jeu initial ; erreurs et précision conformes.

### PR 2 — Widgets du registre

**Prompt :** Lis la spec `.github/spec/skills/spec-dashboard-ventes.md` depuis `dashboard/0-contrat`. Construis `SalesDashboard.vue` et ses widgets et intègre-les à `WorkshopDataView.vue` ; modifie `App.vue` uniquement si nécessaire. Respecte la table de propriété et utilise exclusivement le service de calcul. Préserve le registre brut, les parcours existants et la mention de données fictives. Initialise les filtres à `{}` et utilise le stub `SalesDashboardFilters` avec `v-model`.

**Parallèle :** tester les widgets avec des résultats construits à la main et les erreurs avec le stub. **Après rebase sur PR 1 :** vérifier les vrais calculs et les commandes locales. **Test qui échoue avant :** les KPI et visuels sur un jeu connu. **Acceptation :** chiffres cohérents, états vide et erreur explicites, registre préservé.

### PR 3 — Filtres

**Prompt :** Lis la spec `.github/spec/skills/spec-dashboard-ventes.md` depuis `dashboard/0-contrat`. Implémente uniquement `SalesDashboardFilters.vue` et ses tests, sans changer ses props ni son événement. Ajoute dates inclusives, canal et localisation ; émets un objet neuf, sans muter `modelValue`, et retire les champs effacés. Transmets les dates invalides pour traitement explicite par le service.

**Parallèle :** composant et tests isolés. **Après rebase sur PR 2 :** vérifier que chaque filtre met à jour tous les widgets. **Test qui échoue avant :** changement d'un contrôle et émission de l'objet attendu. **Acceptation :** filtres individuels et combinés, période vide, dates inversées et commande locale fonctionnent selon la spec.

## Différences intentionnelles

La spec initiale proposait deux tâches séquentielles ; ici, trois tâches distinctes développent en parallèle sur un contrat gelé puis s'intègrent dans l'ordre demandé ci-dessus. Les choix utilisés dans les PR de référence sont documentés comme références, sans les attribuer à la réunion ni les présenter comme approuvés pour cette nouvelle spec.
