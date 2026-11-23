# Boutique d'albums — atelier Copilot

Cette application Vue 3 / TypeScript est le point de départ d'un atelier : la boutique et l'espace administrateur exposent des données fictives brutes, **sans dashboard**. Les participants construisent celui-ci pendant la démonstration à partir de la réunion obtenue via Work IQ.

Le jeu de données généré couvre 2024–2025 : 30 albums, 10 magasins physiques, une boutique en ligne distincte, 600 clients et 9 937 commandes. La boutique présente les albums et permet de créer des commandes locales de démonstration, sans paiement réel. L'espace administrateur permet de parcourir les données brutes en lecture seule.

Les montants des commandes sont des centimes USD entiers. Le chiffre d'affaires d'une ligne est sa quantité multipliée par son prix unitaire historique, pas le prix actuel du catalogue. Le panier moyen est le chiffre d'affaires divisé par le nombre de commandes sur le même périmètre filtré. Les coûts ne sont pas disponibles : aucune marge ne peut être calculée.

## Démarrer

Prérequis : Node.js 22 ou supérieur et npm.

```sh
npm ci
npm run dev
```

Ouvrir `http://localhost:3001`, puis **Admin login** pour explorer les collections. L'application fonctionne entièrement dans le navigateur, sans backend ni service externe.

## Données locales

Les clés distinctes et versionnées `exec-agenticdev-workshop.albums.v1`, `exec-agenticdev-workshop.sales.v1` et `exec-agenticdev-workshop.cart.v1` conservent respectivement le catalogue, les ventes et le panier. Les autres données localStorage restent intactes. Les erreurs de lecture, validation et écriture sont affichées ; les montants dépassant la précision entière sont refusés. La réinitialisation proposée dans la boutique ne remplace que le catalogue, après confirmation.

Le fichier `src/data/sales.json` est généré, jamais modifié à la main :

```sh
npm run data:generate
npm run data:check
```

## Vérification

```sh
npm test
npm run type-check
npm run build
npm run data:check
```

`type-check` et `build` vérifient `tsconfig.app.json`.
