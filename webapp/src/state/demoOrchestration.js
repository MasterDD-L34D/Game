import { computed, reactive } from 'vue';

export const demoSpecies = reactive({
  id: 'lupus-nebulis',
  display_name: 'Lupo delle Nebbie',
  summary: 'Predatore d\'élite che sfrutta condensazioni luminose per disorientare gli intrusi.',
  description:
    'Questa variante evolutiva è stata selezionata per operare in squadre coordinate, sfruttando la nebbia fotoreattiva del bioma per creare imboscate multi-angolo.',
  traits: {
    core: ['Coordinazione di branco', 'Visione spettrale', 'Fase di camuffamento'],
    derived: ['Risonanza ululante', 'Scatto fulmineo'],
  },
  morphology: {
    adaptations: ['Membrane respiratorie anti-nebbia', 'Vibrisse fotocromatiche', 'Artigli polifasici'],
  },
  behavior: {
    tags: ['Predatore sinergico', 'Agguato opportunistico', 'Reazione a stimoli luminosi'],
  },
  statistics: {
    threat_tier: 'T2',
    rarity: 'Rara',
    energy_profile: 'Alta intensità',
    synergy_score: 0.62,
  },
});

export const demoBiomes = reactive([
  {
    id: 'twilight-marsh',
    name: 'Paludi del Crepuscolo',
    climate: 'Umido temperato',
    risk: 'Moderato',
    focus: 'Nebbia fotonica pulsante',
    opportunities: ['Creare corridoi acustici', 'Reindirizzare i riflettori naturali'],
    readiness: 3,
    total: 5,
  },
  {
    id: 'obsidian-ridge',
    name: 'Cresta di Ossidiana',
    climate: 'Freddo secco',
    risk: 'Elevato',
    focus: 'Canaloni lavici cristallizzati',
    opportunities: ['Proiezioni sonore a lunga distanza', 'Nascondigli naturali multilivello'],
    readiness: 2,
    total: 4,
  },
]);

export const demoEncounter = reactive({
  templateName: 'Assalto Nella Nebbia',
  biomeName: 'Paludi del Crepuscolo',
  parameterLabels: {
    density: 'Densità del branco',
    cadence: 'Cadenza offensiva',
  },
  variants: [
    {
      id: 'strike-team',
      summary: 'Intercettazione rapida con due nuclei coordinati.',
      description:
        'La squadra entra dal fronte orientale sfruttando micro-lampi per disgregare la formazione nemica mentre il branco primario chiude da nord.',
      parameters: {
        density: { label: 'Compatta', value: 'compact' },
        cadence: { label: 'Impulsi rapidi', value: 'burst' },
      },
      slots: [
        {
          id: 'alpha',
          title: 'Alfa nebulare',
          quantity: 1,
          species: [demoSpecies],
        },
        {
          id: 'stalker',
          title: 'Predatori di supporto',
          quantity: 3,
          species: [
            { ...demoSpecies, id: 'support-1', display_name: 'Lupo delle Nebbie - Scout' },
            { ...demoSpecies, id: 'support-2', display_name: 'Lupo delle Nebbie - Distruttore' },
          ],
        },
      ],
      metrics: {
        threat: { tier: 'T2' },
      },
      warnings: [
        { code: 'ATTENTION_SPIKES', slot: 'stalker' },
      ],
    },
    {
      id: 'stealth',
      summary: 'Pattuglia silente con cariche differite.',
      description:
        'Una squadra distaccata prepara i rifugi mentre il branco principale attiva le trappole di luce in sequenza.',
      parameters: {
        density: { label: 'Diluita', value: 'spread' },
        cadence: { label: 'Sincronizzata', value: 'sync' },
      },
      slots: [
        {
          id: 'alpha',
          title: 'Alfa nebulare',
          quantity: 1,
          species: [demoSpecies],
        },
        {
          id: 'saboteur',
          title: 'Sabotatori luminescenti',
          quantity: 2,
          species: [
            { ...demoSpecies, id: 'saboteur-1', display_name: 'Sabotatore Prismico' },
            { ...demoSpecies, id: 'saboteur-2', display_name: 'Sabotatore Obscura' },
          ],
        },
      ],
      metrics: {
        threat: { tier: 'T3' },
      },
      warnings: [],
    },
  ],
});

export const orchestratorSnapshot = reactive({
  overview: {
    objectives: ['Stabilire punto di vista narrativo', 'Definire palette emozionale', 'Vincolare escalation a 12 minuti'],
    blockers: ['In attesa di conferma sul canale di distribuzione'],
    completion: { completed: 3, total: 4 },
  },
  species: {
    curated: 8,
    total: 12,
    shortlist: ['Lupo delle Nebbie', 'Cefalo Prisma', 'Draco delle Tife'],
  },
  biomes: {
    validated: 2,
    pending: 1,
  },
  encounter: {
    seeds: 2,
    variants: 4,
    warnings: 1,
  },
  publishing: {
    artifactsReady: 2,
    totalArtifacts: 5,
    channels: ['Compendio digitale', 'Brief video'],
  },
});

export const globalTimeline = computed(() => {
  const totalSteps = orchestratorSnapshot.overview.completion.total;
  const completed = orchestratorSnapshot.overview.completion.completed;
  const percent = totalSteps === 0 ? 0 : Math.round((completed / totalSteps) * 100);
  return {
    label: `Sincronizzazione ${percent}%`,
    percent,
  };
});
