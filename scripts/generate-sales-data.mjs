import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const target = fileURLToPath(new URL('../src/data/sales.json', import.meta.url))
const seed = 20240101
let state = seed
const random = () => {
  state = (Math.imul(state, 1664525) + 1013904223) >>> 0
  return state / 4294967296
}
const pick = values => values[Math.floor(random() * values.length)]
const weightedPick = (values, weight) => {
  let remaining = random() * values.reduce((sum, value) => sum + weight(value), 0)
  for (const value of values) {
    remaining -= weight(value)
    if (remaining < 0) return value
  }
  return values.at(-1)
}
const poisson = mean => {
  const limit = Math.exp(-mean)
  let product = 1
  let count = 0
  do {
    product *= random()
    count++
  } while (product > limit)
  return count - 1
}
const dayMs = 86400000
const dateAt = time => new Date(time).toISOString().slice(0, 10)
const startDate = '2024-01-01'
const endDate = '2025-12-31'
const startTime = Date.parse(startDate)
const endTime = Date.parse(endDate)

const products = [
  { id: 1, name: 'Manuel des principes de transmutation', category: 'Ouvrages et recherches', description: 'Guide de terrain annoté sur l’équivalence, la préparation des matériaux et les protocoles de sécurité en laboratoire.', priceCents: 2840, supplier: 'Archives de Central', origin: 'Central', status: 'Courant', illustration: 'illustrations/books.svg', imageAlt: 'Manuel relié posé sur une fiche d’archive', saleStartDate: '2024-01-01', themes: ['research', 'school'] },
  { id: 2, name: 'Traité avancé de métamatière', category: 'Ouvrages et recherches', description: 'Étude technique des structures composites, avec schémas de réactions et notes pour praticiens expérimentés.', priceCents: 6240, supplier: 'Institut de recherche de Central', origin: 'Central', status: 'Édition d’étude', illustration: 'illustrations/books.svg', imageAlt: 'Traité scientifique à couverture sombre', saleStartDate: '2024-01-01', themes: ['research'] },
  { id: 3, name: 'Compendium d’alkahestrie de Xing', category: 'Ouvrages et recherches', description: 'Recueil de méthodes de détection et de circulation, préparé pour les échanges entre ateliers.', priceCents: 4980, supplier: 'Comptoir des échanges de l’Est', origin: 'Xing', status: 'Import', illustration: 'illustrations/books.svg', imageAlt: 'Compendium relié avec marque-page cuivré', saleStartDate: '2024-01-01', themes: ['research', 'summer'] },
  { id: 4, name: 'Carnet de recherche ignifugé', category: 'Ouvrages et recherches', description: 'Pages résistantes aux projections et couverture à fermeture mécanique pour consigner des essais en atelier.', priceCents: 1680, supplier: 'Papeterie militaire de Central', origin: 'Central', status: 'Courant', illustration: 'illustrations/books.svg', imageAlt: 'Carnet d’atelier protégé par une couverture épaisse', saleStartDate: '2024-01-01', themes: ['research', 'school'] },
  { id: 5, name: 'Craie de transmutation renforcée', category: 'Composants alchimiques', description: 'Craie minérale à tracé net, conditionnée par six bâtons pour les cercles temporaires et exercices de terrain.', priceCents: 760, supplier: 'Atelier minéral de South City', origin: 'South City', status: 'Consommable', illustration: 'illustrations/components.svg', imageAlt: 'Bâtons de craie minérale sur fond d’atelier', saleStartDate: '2024-01-01', themes: ['school', 'military'] },
  { id: 6, name: 'Compas de précision pour cercle', category: 'Équipements de laboratoire', description: 'Compas à pointe réglable, graduations gravées et étui rigide pour tracer des géométries régulières.', priceCents: 3920, supplier: 'Instrument Works de Central', origin: 'Central', status: 'Courant', illustration: 'illustrations/lab.svg', imageAlt: 'Compas de précision métallique et règle graduée', saleStartDate: '2024-01-01', themes: ['research', 'school'] },
  { id: 7, name: 'Plaques métalliques de transmutation', category: 'Composants alchimiques', description: 'Jeu de plaques d’essai en alliage gravable, fourni avec repères de mesure et pochette de rangement.', priceCents: 5460, supplier: 'Fonderie de East City', origin: 'East City', status: 'Courant', illustration: 'illustrations/components.svg', imageAlt: 'Plaques métalliques gravées et empilées', saleStartDate: '2024-01-01', themes: ['military', 'research'] },
  { id: 8, name: 'Fil conducteur en argent', category: 'Composants alchimiques', description: 'Bobine de fil fin pour assemblages délicats et montages de mesure; chaque lot est contrôlé à réception.', priceCents: 2380, supplier: 'Silverbrook Materials', origin: 'East City', status: 'Lot contrôlé', illustration: 'illustrations/components.svg', imageAlt: 'Bobine de fil argenté dans un étui de rangement', saleStartDate: '2024-01-01', themes: ['research', 'rare'] },
  { id: 9, name: 'Sel minéral de Resembool', category: 'Consommables', description: 'Cristaux tamisés issus de lots de démonstration, emballés en sachet scellé pour essais contrôlés.', priceCents: 920, supplier: 'Coopérative des plaines de Resembool', origin: 'Resembool', status: 'Consommable', illustration: 'illustrations/components.svg', imageAlt: 'Sachet de cristaux minéraux à étiquette de lot', saleStartDate: '2024-01-01', themes: ['summer', 'school'] },
  { id: 10, name: 'Charbon purifié de Briggs', category: 'Consommables', description: 'Combustible à faible résidu, préparé pour les tests thermiques et le fonctionnement des petits creusets.', priceCents: 1240, supplier: 'Northern Outpost Stores', origin: 'Briggs', status: 'Consommable', illustration: 'illustrations/components.svg', imageAlt: 'Barrettes de charbon purifié dans une boîte métallique', saleStartDate: '2024-01-01', themes: ['winter', 'military'] },
  { id: 11, name: 'Trousse d’analyse minérale', category: 'Équipements de laboratoire', description: 'Loupes, pinces, bandelettes et étuis d’échantillons dans une mallette compartimentée pour relevés sur site.', priceCents: 7840, supplier: 'Field Instruments Bureau', origin: 'Central', status: 'Équipement', illustration: 'illustrations/lab.svg', imageAlt: 'Mallette ouverte avec outils d’analyse rangés', saleStartDate: '2024-01-01', themes: ['exploration', 'research'] },
  { id: 12, name: 'Creuset renforcé', category: 'Équipements de laboratoire', description: 'Cuve de laboratoire à paroi épaisse avec poignées isolantes et couvercle ventilé pour réactions contrôlées.', priceCents: 9160, supplier: 'South City Foundry', origin: 'South City', status: 'Équipement', illustration: 'illustrations/lab.svg', imageAlt: 'Creuset renforcé en métal avec poignées isolantes', saleStartDate: '2024-01-01', themes: ['military', 'winter'] },
  { id: 13, name: 'Flacons anti-réaction thermique', category: 'Consommables', description: 'Ensemble de quatre flacons gradués à enveloppe protectrice, conçus pour le transport d’échantillons scellés.', priceCents: 3180, supplier: 'Central Glassworks', origin: 'Central', status: 'Courant', illustration: 'illustrations/lab.svg', imageAlt: 'Flacons gradués protégés par une enveloppe métallique', saleStartDate: '2024-01-01', themes: ['research', 'summer'] },
  { id: 14, name: 'Balance alchimique de précision', category: 'Équipements de laboratoire', description: 'Balance mécanique à deux plateaux, calibrée en atelier et livrée avec poids de référence sous étui.', priceCents: 11600, supplier: 'Instrument Works de Central', origin: 'Central', status: 'Équipement', illustration: 'illustrations/lab.svg', imageAlt: 'Balance de précision à plateaux avec poids de calibrage', saleStartDate: '2024-01-01', themes: ['research', 'school'] },
  { id: 15, name: 'Gants d’allumage certifiés', category: 'Équipements d’alchimistes d’État', description: 'Paire de gants isolants en textile technique, avec renforts aux doigts et certification de l’atelier militaire.', priceCents: 6840, supplier: 'Central Command Quartermaster', origin: 'Central', status: 'Certification militaire', illustration: 'illustrations/field.svg', imageAlt: 'Paire de gants techniques renforcés sur fiche de contrôle', saleStartDate: '2024-01-01', themes: ['military', 'winter'] },
  { id: 16, name: 'Montre d’argent de service', category: 'Équipements d’alchimistes d’État', description: 'Montre de poche en acier argenté, gravure institutionnelle originale et numéro de série fictif.', priceCents: 15800, supplier: 'Central Command Supply Office', origin: 'Central', status: 'Émission contrôlée', illustration: 'illustrations/artifacts.svg', imageAlt: 'Montre de poche argentée sur une fiche d’inventaire', saleStartDate: '2024-01-01', themes: ['military', 'rare'] },
  { id: 17, name: 'Mallette d’investigation militaire', category: 'Équipements d’alchimistes d’État', description: 'Mallette robuste avec plateaux amovibles, serrure mécanique et pochettes pour rapports de terrain.', priceCents: 13200, supplier: 'Central Command Quartermaster', origin: 'Central', status: 'Équipement de service', illustration: 'illustrations/field.svg', imageAlt: 'Mallette d’investigation fermée avec verrou renforcé', saleStartDate: '2024-01-01', themes: ['military', 'exploration'] },
  { id: 18, name: 'Uniforme de terrain renforcé', category: 'Matériel d’exploration', description: 'Veste de travail doublée, poches d’échantillons et renforts aux coudes; tailles de démonstration disponibles.', priceCents: 9680, supplier: 'North Valley Outfitters', origin: 'Briggs', status: 'Série limitée', illustration: 'illustrations/field.svg', imageAlt: 'Veste de terrain renforcée représentée sur une fiche textile', saleStartDate: '2024-01-01', themes: ['winter', 'military', 'exploration'] },
  { id: 19, name: 'Kit d’entretien pour automail', category: 'Automails et pièces mécaniques', description: 'Outils de réglage, brosses et clés de petit format pour l’entretien courant des articulations mécaniques.', priceCents: 4480, supplier: 'Resembool Mechanics Depot', origin: 'Resembool', status: 'Courant', illustration: 'illustrations/mechanics.svg', imageAlt: 'Kit mécanique avec clés et outils de réglage', saleStartDate: '2024-01-01', themes: ['summer', 'school'] },
  { id: 20, name: 'Bras d’automail modèle atelier', category: 'Automails et pièces mécaniques', description: 'Maquette d’étude articulée pour exercices d’assemblage, fabriquée en série de démonstration par un atelier local.', priceCents: 42800, supplier: 'Rockbell Mechanics Workshop', origin: 'Resembool', status: 'Pièce d’atelier', illustration: 'illustrations/mechanics.svg', imageAlt: 'Maquette mécanique articulée sur support de présentation', saleStartDate: '2024-01-01', themes: ['rare', 'exploration'] },
  { id: 21, name: 'Articulation mécanique d’entraînement', category: 'Automails et pièces mécaniques', description: 'Module d’articulation démontable pour entraînement technique, avec repères de montage et pièces de rechange.', priceCents: 17400, supplier: 'Resembool Mechanics Depot', origin: 'Resembool', status: 'Équipement', illustration: 'illustrations/mechanics.svg', imageAlt: 'Module d’articulation mécanique présenté démonté', saleStartDate: '2024-01-01', themes: ['summer', 'research'] },
  { id: 22, name: 'Huile de maintenance mécanique', category: 'Consommables', description: 'Huile de précision en flacon doseur, conditionnée pour réduire les dépôts pendant l’entretien des mécanismes.', priceCents: 1460, supplier: 'Resembool Mechanics Depot', origin: 'Resembool', status: 'Consommable', illustration: 'illustrations/mechanics.svg', imageAlt: 'Flacon doseur d’huile de maintenance avec étiquette technique', saleStartDate: '2024-01-01', themes: ['summer', 'winter'] },
  { id: 23, name: 'Pierre rouge expérimentale', category: 'Artefacts rares', description: 'Objet de démonstration sous capsule scellée, fourni avec fiche de traçabilité et avertissement de manipulation.', priceCents: 68400, supplier: 'Central Research Archive', origin: 'Central', status: 'Accès réglementé', illustration: 'illustrations/artifacts.svg', imageAlt: 'Cristal rouge sous capsule scellée avec étiquette de traçabilité', saleStartDate: '2024-01-01', themes: ['rare', 'winter'] },
  { id: 24, name: 'Carte topographique d’Amestris', category: 'Matériel d’exploration', description: 'Carte de terrain pliable avec quadrillage, repères logistiques et annotations d’itinéraires fictifs.', priceCents: 2240, supplier: 'Survey Office of Central', origin: 'Amestris', status: 'Courant', illustration: 'illustrations/field.svg', imageAlt: 'Carte topographique pliée avec quadrillage et repères', saleStartDate: '2024-01-01', themes: ['exploration', 'summer'] },
  { id: 25, name: 'Étui d’échantillons de Briggs', category: 'Matériel d’exploration', description: 'Étui rigide à compartiments étanches, destiné au transport des échantillons collectés en conditions froides.', priceCents: 5680, supplier: 'Briggs Northern Outpost', origin: 'Briggs', status: 'Série saisonnière', illustration: 'illustrations/field.svg', imageAlt: 'Étui de prélèvement rigide à compartiments', saleStartDate: '2024-03-15', themes: ['winter', 'exploration'] },
  { id: 26, name: 'Kit de balisage de terrain', category: 'Matériel d’exploration', description: 'Rubans résistants, fanions et marqueurs réutilisables pour délimiter une zone d’étude ou un campement.', priceCents: 1920, supplier: 'North Valley Outfitters', origin: 'Briggs', status: 'Courant', illustration: 'illustrations/field.svg', imageAlt: 'Fanions et balises de terrain dans une pochette', saleStartDate: '2024-05-01', themes: ['summer', 'exploration'] },
  { id: 27, name: 'Registre de réquisition scellé', category: 'Ouvrages et recherches', description: 'Registre numéroté à papier sécurisé pour consigner mouvements de matériel et signatures de remise.', priceCents: 1980, supplier: 'Archives de Central', origin: 'Central', status: 'Émission contrôlée', illustration: 'illustrations/books.svg', imageAlt: 'Registre administratif fermé par un sceau de papier', saleStartDate: '2024-08-01', themes: ['military', 'school'] },
  { id: 28, name: 'Lampe d’atelier à capot', category: 'Équipements de laboratoire', description: 'Lampe de bureau orientable à capot métallique, conçue pour éclairer un plan de travail sans éblouir.', priceCents: 7360, supplier: 'South City Workshop Supply', origin: 'South City', status: 'Série limitée', illustration: 'illustrations/lab.svg', imageAlt: 'Lampe d’atelier orientable à capot en acier', saleStartDate: '2024-10-10', themes: ['winter', 'research'] },
  { id: 29, name: 'Étui de transport anti-choc', category: 'Automails et pièces mécaniques', description: 'Coque rembourrée avec attaches réglables pour transporter un module mécanique sans le dérégler.', priceCents: 6240, supplier: 'Resembool Mechanics Depot', origin: 'Resembool', status: 'Courant', illustration: 'illustrations/mechanics.svg', imageAlt: 'Étui rembourré ouvert avec attaches de maintien', saleStartDate: '2025-02-01', themes: ['summer', 'exploration'] },
  { id: 30, name: 'Sceau d’inventaire en cuivre', category: 'Artefacts rares', description: 'Sceau de bureau fabriqué en petite série, livré dans un coffret avec plaque d’essai et notice d’archivage.', priceCents: 21600, supplier: 'Central Archives Workshop', origin: 'Central', status: 'Petite série', illustration: 'illustrations/artifacts.svg', imageAlt: 'Sceau en cuivre dans un coffret d’archive', saleStartDate: '2025-06-15', themes: ['rare', 'military'] }
]

const storeDetails = [
  ['Central Command Supply Office', 'Central'],
  ['East City Alchemy Store', 'East'],
  ['South City Workshop', 'South'],
  ['Resembool Mechanics Depot', 'West'],
  ['Briggs Northern Outpost', 'North'],
  ['Dublith Requisition Hall', 'South'],
  ['Liore Research Exchange', 'East'],
  ['East Command Annex', 'East'],
  ['Fort Bastion Material Desk', 'North'],
  ['North Valley Field Station', 'North']
]
const locations = [
  { id: 'online', name: 'Online Requisition Portal', channel: 'online', region: 'Network', openedOn: '2020-01-01' },
  ...storeDetails.map(([name, region], index) => ({
    id: `store-${String(index + 1).padStart(2, '0')}`,
    name,
    channel: 'store',
    region,
    openedOn: '2020-01-01'
  }))
]
const categories = [...new Set(products.map(product => product.category))]
const customers = Array.from({ length: 600 }, (_, index) => {
  const homeStore = locations[1 + index % storeDetails.length]
  return {
    id: `Requisition-${String(index + 1).padStart(4, '0')}`,
    region: homeStore.region,
    homeStoreId: homeStore.id,
    joinedOn: index < 450
      ? dateAt(startTime - (30 + Math.floor(random() * 1000)) * dayMs)
      : dateAt(startTime + Math.floor(random() * 680) * dayMs),
    preferredCategory: pick(categories),
    preferredChannel: random() < 0.45 ? 'online' : 'store'
  }
})
const events = [2024, 2025].flatMap(year => [
  { id: `winter-${year}`, name: 'Approvisionnement hivernal', startDate: `${year}-12-01`, endDate: `${year}-12-31`, theme: 'winter', demandMultiplier: 2.8 },
  { id: `summer-${year}`, name: 'Campagne de terrain estivale', startDate: `${year}-06-01`, endDate: `${year}-08-31`, theme: 'summer', demandMultiplier: 2.4 },
  { id: `school-${year}`, name: 'Rentrée des ateliers', startDate: `${year}-08-15`, endDate: `${year}-09-30`, theme: 'school', demandMultiplier: 3.2 },
  { id: `halloween-${year}`, name: 'Semaine des archives nocturnes', startDate: `${year}-10-01`, endDate: `${year}-10-31`, theme: 'rare', demandMultiplier: 1.8 },
  { id: `military-${year}`, name: 'Inspection des équipements de service', startDate: `${year}-07-01`, endDate: `${year}-09-30`, theme: 'military', demandMultiplier: 2.6 }
])
const orders = []

for (let time = startTime; time <= endTime; time += dayMs) {
  const date = dateAt(time)
  const weekday = new Date(time).getUTCDay()
  const yearTwo = date.startsWith('2025')
  const activeEvents = events.filter(event => date >= event.startDate && date <= event.endDate)
  const availableProducts = products.filter(product => product.saleStartDate <= date)
  const eligibleCustomers = customers.filter(customer => customer.joinedOn <= date)

  for (const product of availableProducts) {
    const seasonal = Math.max(1, ...activeEvents
      .filter(event => product.themes.includes(event.theme))
      .map(event => event.demandMultiplier))
    const launchAge = (time - Date.parse(product.saleStartDate)) / dayMs
    const launchLift = launchAge < 28 ? 1.8 : 1
    const baseDemand = product.themes.includes('rare') ? 0.018 : product.themes.includes('military') ? 0.035 : 0.065
    const militaryLift = yearTwo && date >= '2025-07-01' && date <= '2025-09-30'
      && product.themes.includes('military') ? 2.2 : 1
    const demand = baseDemand * seasonal * launchLift * (weekday === 0 || weekday === 6 ? 1.12 : 1)
      * (yearTwo ? 1.14 : 1) * militaryLift

    for (let count = 0; count < poisson(demand); count++) {
      const onlineChance = yearTwo ? 0.56 : 0.34
      const channel = random() < onlineChance ? 'online' : 'store'
      const customer = weightedPick(eligibleCustomers, candidate =>
        (candidate.preferredCategory === product.category ? 3 : 1)
        * (candidate.preferredChannel === channel ? 3 : 1)
      )
      const physicalLocations = locations.slice(1)
      const location = channel === 'online' ? locations[0]
        : product.origin === 'Resembool'
          ? weightedPick(physicalLocations, place => place.id === 'store-04' ? 18 : 1)
          : product.themes.includes('rare')
            ? weightedPick(physicalLocations, place => place.id === 'store-05' ? 15 : 1)
            : weightedPick(physicalLocations, place => place.id === customer.homeStoreId ? 5 : 1)
      const basketProducts = [product]
      if (random() < 0.31) {
        const companion = weightedPick(
          availableProducts.filter(item => item.id !== product.id),
          item => item.category === product.category ? 3 : 1
        )
        basketProducts.push(companion)
      }

      const lines = basketProducts.map(item => {
        const yearFactor = yearTwo ? 1.04 : 1
        const listUnitPriceCents = Math.round(item.priceCents * yearFactor)
        const promoted = random() < 0.12
        return {
          product: { id: item.id, name: item.name, category: item.category },
          quantity: random() < 0.12 ? 2 : 1,
          listUnitPriceCents,
          unitPriceCents: promoted ? Math.round(listUnitPriceCents * 0.9) : listUnitPriceCents,
          promotionCode: promoted ? 'ATELIER-10' : null
        }
      })

      orders.push({
        id: `REQ-${String(orders.length + 1).padStart(6, '0')}`,
        date,
        customerId: customer.id,
        locationId: location.id,
        eventIds: activeEvents.map(event => event.id),
        lines
      })
    }
  }
}

const dataset = {
  metadata: {
    schemaVersion: 1,
    fictional: true,
    seed,
    startDate,
    endDate,
    currency: 'USD',
    timezone: 'UTC',
    description: 'Jeu de démonstration entièrement fictif; les identifiants clients sont pseudonymisés.',
    limitations: 'Prix historiques en cents USD. Aucune donnée de coût, de marge, de taxe, d’expédition ou de paiement réel.'
  },
  products,
  locations,
  customers,
  events,
  orders
}

const { orders: rows, ...dimensions } = dataset
const json = `${JSON.stringify(dimensions, null, 2).slice(0, -2)},\n  "orders": [\n${rows.map(order => `    ${JSON.stringify(order)}`).join(',\n')}\n  ]\n}\n`
if (process.argv.includes('--check')) {
  if (readFileSync(target, 'utf8') !== json) {
    throw new Error('Sales fixture is out of date. Run npm run data:generate.')
  }
} else {
  writeFileSync(target, json)
}
console.log(`${orders.length} orders, ${orders.reduce((sum, order) => sum + order.lines.length, 0)} lines, ${products.length} products; ${startDate} through ${endDate}.`)
