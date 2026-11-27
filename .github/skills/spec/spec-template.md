# Spec — <titre>

| | |
|---|---|
| Source | <réunion, transcript ou issue : titre, date, participants> |
| Statut | Brouillon, à valider ; décisions à obtenir avant le lancement |
| Validée par | <nom de l'humain qui relit> |

## Contexte

<2 à 4 phrases : le problème métier, pour qui, et pourquoi maintenant.>

## 1. Ce que ça fait

- <comportement attendu, vu de l'utilisateur>

## 2. Comment on saura que ça marche

| Contrôle | Comment | Résultat attendu |
|---|---|---|
| <ex. : CA de mars 2025> | <recalcul indépendant à partir des données brutes> | <identique au centime> |
| <ex. : nouveau calcul> | <test qui échoue avant le changement> | <passe après> |

## 3. Ce que ça ne doit pas casser

- <parcours, données ou comportement existant à préserver>

## Hors périmètre

| Demande | Raison |
|---|---|
| <ex. : marge> | <les données ne contiennent pas les coûts> |
| <ex. : export> | <reporté au prochain point> |

## Hypothèses

- <ce qu'on suppose faute d'information, et comment le vérifier>

## Questions ouvertes (3 maximum)

1. <question, à qui, et ce qui bloque sans réponse>

## Organisation : développement parallèle, intégration empilée

| Ordre | Tâche | Base de la PR |
|---|---|---|
| 1 | <fondation, ex. : calculs> | `main` |
| 2 | <ex. : widgets> | Branche de la PR 1 |
| 3 | <ex. : filtres> | Branche de la PR 2 |

| Phase | Acteur | Contenu | Mode |
|---|---|---|---|
| 0 | Coordinateur | Décisions, contrat, branche `<sujet>/0-contrat` | Avant lancement |
| 1 | Sessions 1, 2 et 3 | Développement et tests dans leurs propres fichiers | Parallèle |
| 2 | Sessions 1, puis 2, puis 3 | Rebase sur la couche parente, `npm test`, `npm run build`, PR | Séquentiel et court |
| 3 | Coordinateur | Enregistrement de la pile dans l'ordre 1 → 2 → 3 | Final |

### Phase 0 — Contrat partagé

<Les fichiers du contrat (types, signatures, composants vides) avec leur code. Le contrat est figé : une session qui doit le modifier s'arrête et le demande au coordinateur.>

### Propriété des fichiers

| Fichiers | Propriétaire |
|---|---|
| <spec, contrat, package.json> | Coordinateur, en phase 0 uniquement |
| <fichiers de la tâche 1 et leurs tests> | Session 1 |
| <fichiers de la tâche 2 et leurs tests> | Session 2 |
| <fichiers de la tâche 3 et leurs tests> | Session 3 |
| Tous les autres fichiers | Aucun : ne pas modifier |

## Tâches

### PR 1 — <titre>

**Prompt pour l'agent :** Lis la spec `docs/specs/<fichier>.md` depuis la branche `<sujet>/0-contrat`. <objectif unique, fichiers possédés, ce qu'il ne faut pas toucher.>
**Phase 1 (parallèle) :** <ce qui se fait sans attendre les autres>
**Phase 2 (après rebase) :** <ce qui demande la couche parente>
**Test qui doit échouer avant le changement :** <description>
**Critère d'acceptation :** <contrôle de la section 2>

### PR 2 — <titre>

<même structure>

### PR 3 — <titre>

<même structure>

## Décisions à obtenir avant la phase 0

1. <règle que ni la réunion ni le code ne tranche> : <où elle sera consignée dans le contrat>

Ces règles ne doivent pas être inventées : aucune session n'est lancée tant qu'elles ne sont pas consignées.
