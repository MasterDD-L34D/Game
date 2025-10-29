import { computed, reactive } from 'vue';

const baseDataset = reactive({
  id: 'nebula-atlas',
  title: 'Nebula Predation Initiative',
  summary:
    'Branch orchestrato dedicato alla variante Nebula, ottimizzato per branchi sincronizzati in ambienti a nebbia fotonica.',
  releaseWindow: 'Patch 1.2 · Focus Nebbia',
  curator: 'QA Core · Narrative Ops',
  metrics: {
    species: 6,
    biomes: 3,
    encounters: 4,
  },
  highlights: [
    'Preset coordinati per branchi ad alta cadenza con segnalazione sinergie fotoniche.',
    'Blueprint ambientali con punti di infiltrazione già bilanciati per staging Nebula.',
    'Encounter lab calibrato per QA freeze con varianti approvate.',
  ],
  species: [
    {
      id: 'nebula-alpha',
      name: 'Lupo Nebulare Alfa',
      archetype: 'Predatore sinergico',
      rarity: 'Rara',
      threatTier: 'T2',
      energyProfile: 'Alta intensità',
      synopsis:
        'Leader del branco Nebula, specializzato in disorientamento luminoso e coordinamento multi-branch.',
      traits: {
        core: ['coordinazione_spettrale', 'fase_di_camuffamento', 'risonanza_di_branco'],
        optional: ['eco_di_nebbia', 'corsa_fotonica'],
        synergy: ['aurora_di_blindo', 'richiamo_corale'],
      },
      habitats: ['Paludi del Crepuscolo'],
      readiness: 'Pronto per staging',
      telemetry: {
        coverage: 0.82,
        lastValidation: '2024-05-18T08:35:00Z',
        curatedBy: 'QA Core',
      },
    },
    {
      id: 'nebula-scout',
      name: 'Scout Nebulare',
      archetype: 'Ricognitore tattico',
      rarity: 'Non comune',
      threatTier: 'T1',
      energyProfile: 'Media intensità',
      synopsis:
        'Esploratore leggero che mantiene canali acustici attivi per guidare i branchi principali.',
      traits: {
        core: ['sensori_geomagnetici', 'ricognizione_sonora'],
        optional: ['oscillazione_prismatica', 'ancora_risonante'],
        synergy: ['pattugliamento_mimetico'],
      },
      habitats: ['Paludi del Crepuscolo', 'Cresta di Ossidiana'],
      readiness: 'Validazione completata',
      telemetry: {
        coverage: 0.76,
        lastValidation: '2024-05-17T21:10:00Z',
        curatedBy: 'Narrative QA',
      },
    },
    {
      id: 'obsidian-enforcer',
      name: "Vincolatore d'Ossidiana",
      archetype: 'Controllo territoriale',
      rarity: 'Rara',
      threatTier: 'T2',
      energyProfile: 'Alta intensità',
      synopsis:
        'Stabilizza i corridoi cristallini e genera micro-punti ciechi per incursioni Nebula coordinate.',
      traits: {
        core: ['armatura_cristallina', 'anelli_vorticanti'],
        optional: ['presa_geomagnetica', 'eco_del_bastione'],
        synergy: ['contrappunto_di_luce'],
      },
      habitats: ['Cresta di Ossidiana'],
      readiness: 'QA freeze',
      telemetry: {
        coverage: 0.68,
        lastValidation: '2024-05-18T07:05:00Z',
        curatedBy: 'Biome Ops',
      },
    },
    {
      id: 'mist-reclaimer',
      name: 'Reclaimer della Nebbia',
      archetype: 'Supporto metabolico',
      rarity: 'Non comune',
      threatTier: 'T1',
      energyProfile: 'Bassa intensità',
      synopsis:
        'Gestisce la saturazione fotonica e mantiene i branchi oltre soglia in scenari di durata prolungata.',
      traits: {
        core: ['riciclo_fotoforico', 'membrane_nebulose'],
        optional: ['catalisi_mirata', 'respiro_di_sospensione'],
        synergy: ['ridistribuzione_nebbia'],
      },
      habitats: ['Paludi del Crepuscolo', 'Crinali di Bruma'],
      readiness: 'Staging completato',
      telemetry: {
        coverage: 0.74,
        lastValidation: '2024-05-18T10:45:00Z',
        curatedBy: 'Field Lab',
      },
    },
    {
      id: 'rift-pouncer',
      name: 'Balzo di Rift',
      archetype: 'Assalto rapido',
      rarity: 'Rara',
      threatTier: 'T2',
      energyProfile: 'Alta intensità',
      synopsis:
        'Unita impiegata nelle finestre di corridoio temporaneo per neutralizzare gli obiettivi di comando.',
      traits: {
        core: ['frattura_intermittente', 'impulsi_lamellari'],
        optional: ['richiamo_sincronico', 'falcata_prismatica'],
        synergy: ['telemetria_di_branchia'],
      },
      habitats: ['Corridoi di Rift', 'Cresta di Ossidiana'],
      readiness: 'In attesa di approvazione',
      telemetry: {
        coverage: 0.63,
        lastValidation: '2024-05-18T09:55:00Z',
        curatedBy: 'Ops QA',
      },
    },
    {
      id: 'veil-harbinger',
      name: 'Araldo del Velo',
      archetype: 'Controllo psicotattico',
      rarity: 'Epica',
      threatTier: 'T3',
      energyProfile: 'Alta intensità',
      synopsis:
        'Amplifica i segnali di nebbia psicoattiva e imposta le condizioni per l\'ingaggio finale del branco.',
      traits: {
        core: ['egida_fotonica', 'trasmissione_aurorale'],
        optional: ['anelito_sinaptico', 'cicli_di_sovrapposizione'],
        synergy: ['corruzione_di_velo'],
      },
      habitats: ['Paludi del Crepuscolo'],
      readiness: 'Richiede validazione narrativa',
      telemetry: {
        coverage: 0.58,
        lastValidation: '2024-05-16T18:15:00Z',
        curatedBy: 'Narrative Ops',
      },
    },
  ],
  biomes: [
    {
      id: 'twilight-marsh',
      name: 'Paludi del Crepuscolo',
      hazard: 'Nebbia fotonica instabile',
      stability: 'Moderata',
      operations: ['Hub Nebula', 'Corridori acustici'],
      lanes: ['Ambush', 'Risonanza', 'Fallback'],
      infiltration: 'Ingressi modulati tramite luci fase',
      storyHook: 'La nebbia fotonica è modulata per proteggere i branchi: mantenere i fari di fase sincronizzati.',
    },
    {
      id: 'obsidian-ridge',
      name: 'Cresta di Ossidiana',
      hazard: 'Venti cristallizzati',
      stability: 'Bassa',
      operations: ['Balzi di Rift', 'Gallerie cristalline'],
      lanes: ['Vertical Strike', 'Echo Corridor'],
      infiltration: 'Punti ciechi generati dai vincolatori cristallini.',
      storyHook: 'I cristalli rifrangono i richiami Nebula; mantenere i segnali entro la finestra di risonanza.',
    },
    {
      id: 'lumina-basin',
      name: 'Bacino di Lumina',
      hazard: 'Tempeste fotoioniche',
      stability: 'Alta',
      operations: ['Staging supporto metabolico', 'Depositi di cariche aurorali'],
      lanes: ['Support Corridor', 'Supply Loop'],
      infiltration: 'Sfruttare i canali ridistribuiti dagli specialisti metabolici.',
      storyHook: 'Il bacino alimenta gli assalti prolungati: coordinare i reclaimers con i branchi principali.',
    },
  ],
  encounters: [
    {
      id: 'nebula-strike',
      name: 'Incursione Nebula',
      focus: 'Intercettazione rapida su nebbia controllata',
      biomeId: 'twilight-marsh',
      cadence: 'Impulsi rapidi',
      density: 'Compatta',
      entryPoints: ['Hub Nebula', 'Flusso laterale'],
      squads: [
        {
          role: 'Avanguardia',
          units: ['Lupo Nebulare Alfa', 'Scout Nebulare'],
        },
        {
          role: 'Supporto metabolico',
          units: ['Reclaimer della Nebbia'],
        },
      ],
      readiness: 'In staging',
      approvals: ['QA Core', 'Ops QA'],
    },
    {
      id: 'obsidian-collapse',
      name: 'Collasso a Ossidiana',
      focus: 'Neutralizzare i pilastri cristallini prima del reset',
      biomeId: 'obsidian-ridge',
      cadence: 'Sequenza tattica',
      density: 'Diluita',
      entryPoints: ['Canalone principale'],
      squads: [
        {
          role: 'Vincolatori',
          units: ["Vincolatore d'Ossidiana", 'Balzo di Rift'],
        },
        {
          role: 'Ricognizione',
          units: ['Scout Nebulare'],
        },
      ],
      readiness: 'Richiede approvazione narrativa',
      approvals: ['Narrative QA'],
    },
    {
      id: 'lumina-siphon',
      name: 'Sifone Lumina',
      focus: 'Assicurare pipeline energetiche nel bacino',
      biomeId: 'lumina-basin',
      cadence: 'Sostenuta',
      density: 'Bilanciata',
      entryPoints: ['Depositi aurorali'],
      squads: [
        {
          role: 'Supporto metabolico',
          units: ['Reclaimer della Nebbia'],
        },
        {
          role: 'Psicotattica',
          units: ['Araldo del Velo'],
        },
      ],
      readiness: 'Monitoraggio log validazione',
      approvals: ['QA Core', 'Narrative Ops'],
    },
    {
      id: 'veil-convergence',
      name: 'Convergenza del Velo',
      focus: 'Stabilizzare la sovrapposizione aurorale per ingaggio finale',
      biomeId: 'twilight-marsh',
      cadence: 'Sequenza sincronizzata',
      density: 'Alta',
      entryPoints: ['Hub Nebula', 'Corridori acustici'],
      squads: [
        {
          role: 'Psicotattica',
          units: ['Araldo del Velo'],
        },
        {
          role: 'Assalto',
          units: ['Lupo Nebulare Alfa', 'Balzo di Rift'],
        },
      ],
      readiness: 'In approvazione',
      approvals: ['Creative Lead', 'QA Core'],
    },
  ],
});

export const atlasDataset = baseDataset;

export const atlasTotals = computed(() => ({
  species: baseDataset.metrics?.species || baseDataset.species.length,
  biomes: baseDataset.metrics?.biomes || baseDataset.biomes.length,
  encounters: baseDataset.metrics?.encounters || baseDataset.encounters.length,
}));

export const atlasActiveSpecies = computed(() =>
  baseDataset.species.filter((entry) => entry.readiness && !entry.readiness.toLowerCase().includes('richiede'))
);

export const atlasPendingApprovals = computed(() =>
  baseDataset.encounters.filter((encounter) => encounter.readiness && encounter.readiness.toLowerCase().includes('approvazione'))
);
