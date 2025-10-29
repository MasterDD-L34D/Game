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
    hazard: 'Nebbia fotonica instabile',
    risk: 'Moderato',
    focus: 'Nebbia fotonica pulsante',
    opportunities: ['Creare corridoi acustici', 'Reindirizzare i riflettori naturali'],
    readiness: 3,
    total: 5,
    validators: [
      {
        id: 'fog-density',
        label: 'Densità della nebbia',
        status: 'passed',
        message: 'Gradienti fotonici entro la banda consentita per i branchi nebulosi.',
      },
      {
        id: 'thermal-vents',
        label: 'Sfiati termici',
        status: 'warning',
        message: 'Rilevate pulsazioni sporadiche: consigliare modulazione dei filtri respiratori.',
      },
    ],
  },
  {
    id: 'obsidian-ridge',
    name: 'Cresta di Ossidiana',
    climate: 'Freddo secco',
    hazard: 'Venti taglienti cristallizzati',
    risk: 'Elevato',
    focus: 'Canaloni lavici cristallizzati',
    opportunities: ['Proiezioni sonore a lunga distanza', 'Nascondigli naturali multilivello'],
    readiness: 2,
    total: 4,
    validators: [
      {
        id: 'stability',
        label: 'Stabilità dei camminamenti',
        status: 'failed',
        message: 'Cedimenti ripetuti nelle passerelle basalte: richiede rinforzo prima del deploy.',
      },
      {
        id: 'visibility',
        label: 'Visibilità notturna',
        status: 'passed',
        message: 'Rifrazioni luminose controllate: i marker tattici sono visibili ai branchi.',
      },
    ],
  },
]);

export const biomeSynthesisConfig = reactive({
  hazard: 'Nebbia fotonica instabile',
  hazardOptions: [
    'Nebbia fotonica instabile',
    'Radiazione prismatica impulsiva',
    'Correnti elettrostatiche latenti',
  ],
  climate: 'Umido temperato',
  climateOptions: ['Umido temperato', 'Freddo secco', 'Subtropicale ventilato'],
  requiredRoles: ['Scout fotonico', 'Controller ambientale'],
  roleCatalog: ['Scout fotonico', 'Controller ambientale', 'Supporto tattico', 'Biologo da campo'],
  graphicSeed: 'NEBULA-42A',
});

export const demoBiomeGraph = reactive({
  nodes: [
    { id: 'hub', label: 'Nodo di staging', type: 'staging', intensity: 0.82 },
    { id: 'ambush', label: 'Set ambush', type: 'ambush', intensity: 0.67 },
    { id: 'lure', label: 'Piazzola esca', type: 'lure', intensity: 0.54 },
    { id: 'retreat', label: 'Ritro retrattile', type: 'safe', intensity: 0.73 },
  ],
  connections: [
    { id: 'edge-1', from: 'hub', to: 'ambush', weight: 3 },
    { id: 'edge-2', from: 'ambush', to: 'lure', weight: 2 },
    { id: 'edge-3', from: 'lure', to: 'retreat', weight: 1 },
    { id: 'edge-4', from: 'hub', to: 'retreat', weight: 2 },
  ],
});

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
  qualityRelease: {
    checks: {
      species: { passed: 2, total: 3 },
      biomes: { passed: 1, total: 2 },
      foodweb: { passed: 1, total: 1 },
    },
    lastRun: '2024-05-18T09:20:00Z',
    owners: ['QA Core', 'Narrative QA'],
  },
  publishing: {
    artifactsReady: 2,
    totalArtifacts: 5,
    channels: ['Compendio digitale', 'Brief video'],
    workflow: {
      preview: {
        status: 'ready',
        owner: 'QA Core',
        eta: 'Oggi · 15:00',
        notes: 'Build promossa in staging con fixture aggiornate.',
      },
      approval: {
        status: 'pending',
        owner: 'Creative Lead',
        eta: 'Domani · 10:30',
        notes: 'In attesa di sign-off narrativo e marketing.',
      },
      deploy: {
        status: 'scheduled',
        owner: 'Web Ops',
        eta: 'Domani · 18:00',
        notes: 'Deploy su CDN con finestra di rollback di 30 minuti.',
      },
    },
    history: [
      {
        id: 'preview-generated',
        label: 'Preview generata',
        author: 'QA Core',
        timestamp: '2024-05-18 09:10',
        details: 'Snapshot giocabile caricata sul portale interno.',
      },
      {
        id: 'qa-sync',
        label: 'Sync QA & Narrative',
        author: 'Narrative QA',
        timestamp: '2024-05-18 11:45',
        details: 'Definite correzioni di localizzazione per il briefing video.',
      },
    ],
    notifications: [
      {
        id: 'notif-slack',
        channel: 'Slack #release-alerts',
        message: 'Richiesta approvazione finale pubblicazione patch 1.2.',
        recipients: ['Creative Lead', 'Web Ops'],
        time: '2024-05-18 11:50',
      },
      {
        id: 'notif-email',
        channel: 'Email Team Marketing',
        message: 'Disponibile anteprima aggiornata per campagna social.',
        recipients: ['Marketing'],
        time: '2024-05-18 12:05',
      },
    ],
  },
  biomeSetup: {
    prepared: 1,
    total: 3,
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

export const qualityReleaseContext = reactive({
  orchestrator: {
    stage: 'QA Freeze',
    releaseWindow: 'Patch 1.2 · 48h',
    coordinator: 'QA Core',
    focusAreas: ['Specie prioritarie', 'Bilanciamento biomi', 'Foodweb narrativo'],
  },
  speciesBatch: {
    entries: [
      {
        trait_ids: ['shadow_pack', 'luminous_feral'],
        biome_id: 'twilight-marsh',
        seed: 'QA-NEB-01',
        base_name: 'Lupi Nebbiosi',
        request_id: 'spec-check-01',
      },
      {
        trait_ids: ['echo_stalker', 'prism_lurker'],
        biome_id: 'obsidian-ridge',
        seed: 'QA-OBS-05',
        base_name: 'Predatori di Risonanza',
        request_id: 'spec-check-02',
      },
      {
        trait_ids: ['mist_rider', 'thermal_climber'],
        biome_id: 'twilight-marsh',
        seed: 'QA-NEB-07',
        base_name: 'Assaltatori Nebulari',
        request_id: 'spec-check-03',
      },
    ],
    biomeId: 'twilight-marsh',
  },
  biomeCheck: {
    biome: {
      id: 'twilight-marsh',
      hazard: { id: null, label: null },
      stability: { erosion: 'medio', vents: 'variabile' },
      fauna: { apex: ['lupus-nebulis'], support: ['support-1'] },
      brief: 'Bioma di riferimento per il branch orchestrato in fase di QA.',
    },
    defaultHazard: 'Nebbia fotonica instabile',
  },
  foodwebCheck: {
    foodweb: {
      anchors: [
        { id: 'alpha-pack', role: 'predatore_apice' },
        { id: 'lure-flora', role: 'flora_reagente' },
      ],
      links: [
        { from: 'alpha-pack', to: 'lure-flora', weight: 0.7 },
        { from: 'lure-flora', to: 'alpha-pack', weight: 0.4 },
      ],
      focus: 'Sincronizzazione tra branchi e flora prismatica.',
    },
  },
  suggestions: [
    {
      id: 'species-duplicates',
      scope: 'species',
      title: 'Allineare trait duplicati',
      description: 'Rimuovere il tratto ripetuto per il branch QA-NEB-07 e riallineare il seed.',
      action: 'fix',
      payload: {
        biomeId: 'badlands',
        entries: [
          {
            id: 'spec-runtime-node',
            display_name: 'Predatore Nodo QA',
            role_trofico: 'predatore_apice_test',
            functional_tags: 'predatore',
            vc: {},
            playable_unit: false,
            spawn_rules: {},
            balance: {},
          },
        ],
      },
    },
    {
      id: 'biome-hazard',
      scope: 'biome',
      title: 'Impostare hazard predefinito',
      description: 'Forzare l\'hazard Nebbia fotonica instabile per evitare fallback in produzione.',
      action: 'fix',
      payload: {
        biome: {
          id: 'twilight-marsh',
          hazard: { id: null, label: null },
          stability: { erosion: 'medio', vents: 'variabile' },
          fauna: { apex: ['lupus-nebulis'], support: ['support-1'] },
          brief: 'Bioma di riferimento per il branch orchestrato in fase di QA.',
        },
        defaultHazard: 'Nebbia fotonica instabile',
      },
    },
    {
      id: 'foodweb-refresh',
      scope: 'foodweb',
      title: 'Rigenerare anelli secondari',
      description: 'Eseguire una rigenerazione mirata dei link con peso < 0.5 per ampliare le sinergie.',
      action: 'regenerate',
      payload: {
        foodweb: {
          anchors: [
            { id: 'alpha-pack', role: 'predatore_apice' },
            { id: 'lure-flora', role: 'flora_reagente' },
          ],
          links: [
            { from: 'alpha-pack', to: 'lure-flora', weight: 0.4 },
          ],
          focus: 'Ricalibrazione archi secondari sotto soglia 0.5',
        },
      },
    },
    {
      id: 'species-reroll',
      scope: 'species',
      title: 'Rigenerare blueprint prioritari',
      description: 'Richiedi una generazione mirata per i seed QA-OBS-05 con fallback controllato.',
      action: 'regenerate',
      payload: {
        entries: [
          {
            trait_ids: ['echo_stalker', 'prism_lurker'],
            biome_id: 'obsidian-ridge',
            seed: 'QA-OBS-05',
            request_id: 'regen-obsidian-05',
            fallback_trait_ids: ['shadow_pack'],
          },
        ],
      },
    },
  ],
  notifications: [
    {
      id: 'notify-qa',
      channel: 'Slack #qa-ops',
      message: 'Runtime validator completato per i branch Nebbia/Obsydian.',
      time: '09:45',
    },
    {
      id: 'notify-release',
      channel: 'Email Release Team',
      message: 'In attesa approvazione finale per deploy patch 1.2.',
      time: '10:05',
    },
  ],
  logs: [
    {
      id: 'log-species',
      scope: 'species',
      level: 'info',
      message: 'Batch QA-NEB completato con 2 fix automatici.',
      timestamp: '2024-05-18T09:12:00Z',
    },
    {
      id: 'log-biome',
      scope: 'biome',
      level: 'warning',
      message: 'Hazard non impostato, applicare default QA.',
      timestamp: '2024-05-18T09:18:00Z',
    },
  ],
});
