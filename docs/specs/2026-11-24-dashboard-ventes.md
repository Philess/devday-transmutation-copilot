# Spec — Dashboard des ventes

**Statut :** périmètre fonctionnel validé ; décisions confirmées le 24 novembre 2026 (voir « Décisions validées »).

**Source :** [Dashboard des ventes — lancement](https://microsofteur-my.sharepoint.com/personal/asmaeyadaoui_microsoft_com/Documents/Recordings/Dashboard%20des%20ventes%20-%20lancement-20261123_223224-Meeting%20Recording.mp4?web=1), réunion du 23 novembre 2026.

## Objectif

Ajouter au registre de l’application une vue des ventes fictives, sans modifier la boutique. La priorité est l’exactitude des chiffres, puis leur présentation et leur filtrage.

Le dashboard doit préciser qu’il présente des **commandes fictives**, et non des paiements ou encaissements réels.

## Fonctionnement attendu

### Indicateurs et visuels

Pour les commandes correspondant aux filtres actifs, afficher :

- Le montant total des ventes, le nombre de commandes et le panier moyen.
- Les ventes par point de vente, en distinguant les magasins du portail en ligne.
- Les 10 produits principaux.
- L’évolution mensuelle des ventes.

Tous les indicateurs et visuels reposent sur le **même ensemble de commandes filtrées**. La sélection successive de périodes permet de les examiner l’une après l’autre ; aucune comparaison simultanée n’est prévue.

### Règles de calcul

- Une ligne vaut `quantity × unitPriceCents` : le prix historique enregistré comprend déjà la remise. Ne jamais utiliser le prix actuel du catalogue pour recalculer une vente passée.
- Une commande est comptée une seule fois ; le panier moyen est le total des ventes divisé par le nombre de commandes.
- Le canal provient de `orders.locationId → locations.channel` : `online` pour le portail et `store` pour les magasins. Les préférences du client ne déterminent pas le canal.
- Les montants sont calculés en cents entiers et affichés en USD. Les dépassements de précision et les données invalides doivent produire une erreur visible, jamais un chiffre approximatif ou inventé.
- Les dates de commande sont des dates UTC.
- Les commandes simulées ajoutées localement sont incluses au même titre que les données initiales.

### Filtres

La troisième tâche ajoute des filtres par **dates de début et de fin inclusives**, canal et point de vente. Les filtres se combinent ; sans restriction, toutes les commandes disponibles sont prises en compte.

Une période vide affiche un état explicite : zéro commande, zéro vente et aucun panier moyen calculé. Une saisie de dates invalide ou inversée doit être signalée visiblement.

## Données et limites

- Source initiale : `src/data/sales.json` ; copie locale et commandes simulées : `src/services/salesStorage.ts`. Modèles : `src/types/sales.ts` ; opérations monétaires existantes : `src/services/money.ts`.
- L’application reste Vue 3 / TypeScript, locale au navigateur, sans serveur ni service externe. Le registre brut et les données existantes restent accessibles et inchangés par la consultation du dashboard.
- Ne pas présenter le registre comme protégé : aucun contrôle d’accès administrateur n’a été identifié dans l’application actuelle.
- Hors périmètre : marge, export Excel ou CSV, paiements réels, taxes, expédition et prévisions.

## Critères de validation

1. **Réconciliation :** sur le seul jeu initial, du 1er au 31 mars 2025 inclus, obtenir **55 commandes et 646 092 cents**, soit **6 460,92 USD**. Cette référence ne s’applique pas à un stockage local enrichi.
2. **Prix et filtres :** un jeu de test avec prix catalogue différent, ligne remisée, deux canaux et deux dates démontre que les calculs utilisent les prix historiques et excluent les commandes hors sélection. Le portail n’est pas compté comme magasin.
3. **Interface :** les chiffres et visuels restent cohérents après filtrage ; une sélection vide et des données invalides sont signalées explicitement.
4. **Régression :** boutique, recherche, panier, commande simulée, registre brut et erreurs existantes restent fonctionnels. Une commande locale apparaît dans le dashboard lorsque les filtres la comprennent.
5. **Précision :** les totaux et regroupements conservent les cents exacts et signalent tout dépassement. La consultation ne modifie pas les données de ventes enregistrées.

## Découpage en trois tâches et trois PR

Chaque tâche est confiée à **sa propre session cloud**. Chaque session lit d’abord cette spec et s’arrête à son périmètre. Les tâches sont séquentielles ; les branches et fichiers partagés ne sont pas modifiés en parallèle.

| Ordre | Tâche | Base de la PR |
| --- | --- | --- |
| 1 | Calculs fiables | `main` |
| 2 | Widgets du dashboard | Branche de la PR 1 |
| 3 | Filtres | Branche de la PR 2 |

Chaque couche est testée, commitée, poussée et ouvre sa propre PR avant la création de la session suivante. Une fois les trois PR ouvertes, elles sont enregistrées comme pile GitHub dans cet ordre. Chaque PR exécute `npm test` et `npm run build`.

### PR 1 — Calculs de ventes fiables

**Périmètre :** créer dans `src/services/` un service de calcul réutilisable et ses tests. Il reçoit les données de ventes et les filtres, puis fournit les KPI, les ventes par localisation et canal, le top 10 et les totaux mensuels.

Le service applique les dates UTC inclusives et l’intersection des filtres ; il réutilise les garde-fous monétaires existants et ne modifie ni stockage, ni boutique, ni interface. Une période sans commande ne provoque aucune division par zéro.

**Tests :** référence de mars 2025 ; prix historique différent du catalogue ; remise ; deux canaux et dates ; combinaisons de filtres ; période vide ; dépassement ; classement et arrondi selon les décisions validées.

### PR 2 — Widgets dans le registre

**Périmètre :** construire la vue du dashboard dans `src/components/`, l’intégrer au registre via `src/App.vue` et/ou `src/components/WorkshopDataView.vue`, et réutiliser exclusivement les calculs de la PR 1. À ce stade, les widgets présentent toutes les commandes disponibles ; les contrôles de filtre arrivent en PR 3.

Afficher les trois KPI, les ventes par magasin et portail, le top 10 et l’évolution mensuelle, avec les mentions de données fictives et les états vide et erreur. Conserver l’accès au registre brut et les parcours de la boutique.

**Tests :** accès au dashboard, valeurs et visuels sur des données connues, erreurs visibles, consultation après une commande simulée, préservation des données et parcours existants.

### PR 3 — Filtres du dashboard

**Périmètre :** ajouter les contrôles de dates, canal et point de vente et les relier au service de la PR 1. Chaque modification actualise ensemble les KPI et tous les visuels. Ne pas ajouter de comparaison simultanée ni modifier la boutique.

**Tests :** dates inclusives, chaque filtre et leurs combinaisons, distinction portail/magasins, sélection vide, dates invalides et inclusion ou exclusion d’une commande simulée locale. Vérifier également l’accès au registre et les parcours existants.

## Décisions validées

1. **Top 10 :** classement par chiffre d’affaires décroissant ; en cas d’égalité, identifiant produit croissant.
2. **Panier moyen :** arrondi au cent le plus proche, demi-cent arrondi au supérieur ; aucun panier moyen lorsqu’il n’y a aucune commande.
3. **Accès :** le registre local sans authentification suffit ; aucune protection n’est revendiquée.
4. **Consigne projet :** la consigne qui réservait la construction du dashboard aux participants est remplacée dans `.github/copilot-instructions.md`.
