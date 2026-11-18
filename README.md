# Central Alchemy Supply

Central Alchemy Supply est une boutique de démonstration Vue 3 / TypeScript et le point de départ d’un atelier de développement agentique. Le dashboard de ventes est à construire par les participants pendant la session : ce projet fournit la boutique et les données locales, pas une analyse prête à l’emploi.

## Contenu

- Catalogue fictif de 30 produits, illustré par des SVG locaux.
- Recherche et filtres de catégorie, fiches d’inventaire et panier.
- Parcours de commande simulé, sans paiement réel, adresse ni service externe.
- Registre consultable des collections brutes : catalogue, points de vente, clients pseudonymisés, périodes de démonstration et commandes.
- Données de ventes initiales du 1er janvier 2024 au 31 décembre 2025, en USD; les prix des lignes sont des entiers en cents et conservent le prix historique payé.

Catégories : Ouvrages et recherches; Composants alchimiques; Équipements de laboratoire; Automails et pièces mécaniques; Équipements d’alchimistes d’État; Artefacts rares; Matériel d’exploration; Consommables.

Points de vente : Central Command Supply Office, East City Alchemy Store, South City Workshop, Resembool Mechanics Depot, Briggs Northern Outpost, Dublith Requisition Hall, Liore Research Exchange, East Command Annex, Fort Bastion Material Desk, North Valley Field Station et le canal distinct Online Requisition Portal.

La boutique et les données fonctionnent entièrement dans le navigateur. Les clés versionnées de produits, ventes et panier sont distinctes; les anciennes données du navigateur sont laissées intactes. Les commandes de démonstration ajoutées ensuite sont datées en UTC et enregistrées localement. Les données sont fictives et ne contiennent ni coût ni marge.

## Démarrer

Prérequis : Node.js 22 ou supérieur et npm.

```sh
npm ci
npm run dev
```

Vite affiche l’adresse locale, par défaut `http://localhost:3001`.

## Vérification

```sh
npm test
npm run type-check
npm run build
npm run data:check
```

`npm run type-check` et `npm run build` contrôlent le projet applicatif `tsconfig.app.json`.

`npm run data:generate` régénère de façon déterministe le jeu de données fictif de `src/data/sales.json`.

## Stockage local

- `central-alchemy-supply.products.v1` : catalogue initial et disponibilité de démonstration.
- `central-alchemy-supply.sales.v1` : données de ventes initiales et commandes simulées.
- `central-alchemy-supply.cart.v1` : panier.

Une erreur de lecture, de validation ou d’écriture est affichée; les données invalides ne sont pas remplacées silencieusement. Les quantités et montants dont le total en cents dépasse la précision entière exacte sont refusés. Réinitialiser les données de démonstration n’efface que les clés propres à cette application.
