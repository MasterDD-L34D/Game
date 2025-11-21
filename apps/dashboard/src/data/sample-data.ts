import type {
  AtlasRegion,
  DashboardMetric,
  EventLog,
  Mission,
  NebulaMilestone,
  SpeciesBiomeLink,
  TaxonomyBiome,
  TaxonomySpecies,
  Trait,
} from '../types';

export const missions: Mission[] = [
  {
    id: 'orion-outpost',
    codename: 'Operation Orion Outpost',
    status: 'in-progress',
    summary:
      'Stabilise the newly captured orbital platform and establish continuous reconnaissance coverage across the southern hemisphere.',
    lead: 'Cmdr. Leena Takahashi',
    operators: ['Spectre-3', 'Nova-Lead', 'Atlas Recon Team'],
    riskLevel: 'Moderate',
    lastUpdated: '2024-10-17T18:45:00Z',
    tags: ['orbital', 'reconnaissance', 'engineering'],
    upcomingActions: [
      'Calibrate long-range sensor array before the next solar window closes',
      'Synchronise nebula anomaly telemetry with ground analytics',
      'Run contingency drill for potential station blackout scenario',
    ],
  },
  {
    id: 'tidal-veil',
    codename: 'Tidal Veil Containment',
    status: 'at-risk',
    summary:
      'Deploy countermeasures around the coastal anomaly cluster before it destabilises local infrastructure.',
    lead: 'Operative Imani Calder',
    operators: ['Helix Wardens', 'Tidewalkers'],
    riskLevel: 'High',
    lastUpdated: '2024-10-16T09:20:00Z',
    tags: ['anomaly', 'containment', 'logistics'],
    upcomingActions: [
      'Secure heavy-lift transports for barrier deployment',
      'Audit supply corridors for disruption risks',
      'Coordinate with Atlas analysts on anomaly propagation model',
    ],
  },
  {
    id: 'lumen-vault',
    codename: 'Lumen Vault Extraction',
    status: 'planned',
    summary:
      'Prepare infiltration teams for the deep vault incursion and confirm exfiltration vectors under blackout conditions.',
    lead: 'Lt. Mateo Rhee',
    operators: ['Umbra Advance', 'Echo Ridge'],
    riskLevel: 'Low',
    lastUpdated: '2024-10-15T12:05:00Z',
    tags: ['stealth', 'intel', 'support'],
    upcomingActions: [
      'Finalise penetration testing with Atlas security overlays',
      'Verify mission-critical loadouts at Depot 7',
      'Run final briefing with Umbra Advance command',
    ],
  },
  {
    id: 'aurora-breach',
    codename: 'Aurora Breach Response',
    status: 'completed',
    summary:
      'Responded to high-altitude breach event and patched aurora stabilisers before cascade failure threshold.',
    lead: 'Capt. Sara Volkov',
    operators: ['Skyline Rapid Response', 'Nebula Diagnostics'],
    riskLevel: 'Moderate',
    lastUpdated: '2024-10-14T06:32:00Z',
    tags: ['response', 'aerial', 'diagnostics'],
    upcomingActions: [
      'Archive incident data for Atlas cross-mission learning',
      'Debrief Skyline unit on rapid ascent anomalies',
      'Validate fallback patches with engineering guild',
    ],
  },
];

export const eventLog: EventLog[] = [
  {
    id: 'evt-4801',
    timestamp: '2024-10-17T19:05:00Z',
    category: 'intel',
    description: 'Intercepted encrypted burst referencing "Project Tidal" near the Pelagic divide. Signal triangulated to 3.2km offshore.',
    impact: 'high',
  },
  {
    id: 'evt-4792',
    timestamp: '2024-10-17T16:40:00Z',
    category: 'operations',
    description: 'Orion Outpost maintenance crew reports gyro stabiliser drift beyond tolerance; emergency recalibration scheduled.',
    impact: 'medium',
  },
  {
    id: 'evt-4789',
    timestamp: '2024-10-17T13:10:00Z',
    category: 'logistics',
    description: 'Supply corridor Echo experienced reroute due to volcanic ash cloud. Delivery delays estimated at six hours.',
    impact: 'medium',
  },
  {
    id: 'evt-4781',
    timestamp: '2024-10-17T08:22:00Z',
    category: 'engineering',
    description: 'Nebula Diagnostics uploaded firmware patch v3.11 for anomaly probes. Field units flagged for staggered rollout.',
    impact: 'low',
  },
  {
    id: 'evt-4775',
    timestamp: '2024-10-16T22:58:00Z',
    category: 'operations',
    description: 'Recon drone swarm Atlas-12 completed mapping sweep with 98% coverage in contested sector.',
    impact: 'low',
  },
];

export const atlasRegions: AtlasRegion[] = [
  {
    id: 'frontier-operations',
    name: 'Frontier Operations',
    description:
      'Briefings, doctrine notes, and live updates that shape the forward presence of the Evo-Tactics program.',
    nodes: [
      {
        id: 'region-staging',
        title: 'Regional Staging Playbook',
        excerpt:
          'Guidelines for rapid deployment hubs, redundancy corridors, and partner liaisons across contested zones.',
        focus: 'strategy',
        lastUpdated: '2024-10-12T10:15:00Z',
      },
      {
        id: 'forward-listening-posts',
        title: 'Forward Listening Posts',
        excerpt:
          'Comparative telemetry from long-range arrays. Highlights signature profiles tied to Tidal Veil fluctuations.',
        focus: 'analysis',
        lastUpdated: '2024-10-15T07:44:00Z',
      },
      {
        id: 'orbital-integration',
        title: 'Orbital Integration Checklist',
        excerpt:
          'Integrates Orion platform maintenance cadence with planetary recon tasks. Includes fallback energy budgets.',
        focus: 'technology',
        lastUpdated: '2024-10-16T21:08:00Z',
      },
    ],
  },
  {
    id: 'anomaly-research',
    name: 'Anomaly Research',
    description:
      'Lab memos, sensor insights, and hypotheses surrounding the evolving anomaly clusters in the field.',
    nodes: [
      {
        id: 'tidal-vein-lab',
        title: 'Tidal Veil Lab Digest',
        excerpt:
          'Condensed findings from the Pelagic anomaly labs with recommended counter-wave patterns to maintain stability.',
        focus: 'analysis',
        lastUpdated: '2024-10-14T19:02:00Z',
      },
      {
        id: 'nebula-resonance',
        title: 'Nebula Resonance Mapping',
        excerpt:
          'Cross-referenced readings from orbital and subterranean probes for resonance harmonics affecting mission tempo.',
        focus: 'technology',
        lastUpdated: '2024-10-13T11:26:00Z',
      },
      {
        id: 'containment-lessons',
        title: 'Containment Lessons Learned',
        excerpt:
          'Post-mission analysis of containment successes. Includes annotated failsafes and response thresholds.',
        focus: 'strategy',
        lastUpdated: '2024-10-11T05:50:00Z',
      },
    ],
  },
  {
    id: 'persona-insights',
    name: 'Persona Insights',
    description:
      'Traits, narratives, and experiential notes that help console operators understand the heroes they deploy.',
    nodes: [
      {
        id: 'spectre-profile',
        title: 'Spectre-3 Behavioral Profile',
        excerpt:
          'Highlights of Spectre-3 field improvisations and suggested mission pairings for emergent crisis response.',
        focus: 'field-report',
        lastUpdated: '2024-10-16T18:20:00Z',
      },
      {
        id: 'nova-lead-journal',
        title: 'Nova-Lead After Action Journal',
        excerpt:
          'Abridged after action reports emphasising leadership pivots under heavy anomaly pressure.',
        focus: 'analysis',
        lastUpdated: '2024-10-13T22:10:00Z',
      },
      {
        id: 'echo-ridge-notes',
        title: 'Echo Ridge Recon Notes',
        excerpt:
          'Detailed situational awareness logs from the Echo Ridge detachment operating behind enemy lines.',
        focus: 'field-report',
        lastUpdated: '2024-10-12T15:33:00Z',
      },
    ],
  },
];

export const traits: Trait[] = [
  {
    id: 'spectre-3',
    name: 'Spectre-3',
    description:
      'Adaptive infiltrator specialising in precision sabotage and split-second decision cycles.',
    archetype: 'Infiltrator Savant',
    playstyle: 'High tempo, precision takedowns, opportunistic reroutes.',
    signatureMoves: ['Phase-Locked Entry', 'Ghostline Relay', 'Vector Cancel'],
  },
  {
    id: 'nova-lead',
    name: 'Nova-Lead',
    description:
      'Command tactician orchestrating multi-squad pushes and dynamic risk balancing in contested zones.',
    archetype: 'Command Vanguard',
    playstyle: 'Coordinated aggression, distributed command, fallback elasticity.',
    signatureMoves: ['Solaris Surge', 'Command Relay Burst', 'Zero Hour Anchor'],
  },
  {
    id: 'helix-warden',
    name: 'Helix Warden',
    description:
      'Containment specialist who anchors anomaly perimeters while orchestrating stabiliser arrays.',
    archetype: 'Anomaly Custodian',
    playstyle: 'Territory denial, layered defences, sustained countermeasures.',
    signatureMoves: ['Tidewall Invocation', 'Gravitic Shear', 'Containment Pulse'],
  },
  {
    id: 'echo-ridge',
    name: 'Echo Ridge',
    description:
      'Recon collective that threads deep behind enemy lines to surface actionable telemetry.',
    archetype: 'Recon Collective',
    playstyle: 'Stealth scouting, asynchronous reporting, tactical adaptation.',
    signatureMoves: ['Silent Parallax', 'Data Loom', 'Ridgeback Cascade'],
  },
];

export const nebulaMilestones: NebulaMilestone[] = [
  {
    id: 'nebula-sync',
    title: 'Orbital-Nebula Sync v2',
    owner: 'Dr. Maren Solace',
    status: 'on-track',
    eta: '2024-10-24',
    progress: 72,
    summary:
      'Align orbital telemetry streams with ground anomaly detectors to reduce false positives during surge windows.',
    dependencies: ['Firmware patch rollout', 'Atlas analytics baseline'],
  },
  {
    id: 'containment-upgrade',
    title: 'Containment Mesh Upgrade',
    owner: 'Chief Rylan Doss',
    status: 'monitor',
    eta: '2024-10-28',
    progress: 48,
    summary:
      'Install layered shielding around Tidal Veil anchor points and validate endurance under storm load.',
    dependencies: ['Heavy-lift transports', 'Weather corridor clearance'],
  },
  {
    id: 'command-briefing',
    title: 'Cross-Theatre Command Briefing',
    owner: 'Cmdr. Leena Takahashi',
    status: 'blocked',
    eta: '2024-10-21',
    progress: 35,
    summary:
      'Finalise integrated mission script covering Orion, Tidal Veil, and Lumen Vault contingencies.',
    dependencies: ['Recon analytics digest', 'Logistics corridor reroute'],
  },
];

export const dashboardMetrics: DashboardMetric[] = [
  {
    id: 'mission-readiness',
    label: 'Mission Readiness',
    value: '87%',
    trend: 'up',
    change: '+4.6% vs last cycle',
  },
  {
    id: 'field-uptime',
    label: 'Field Uptime',
    value: '92%',
    trend: 'steady',
    change: 'Holding with contingency rotation',
  },
  {
    id: 'intel-fidelity',
    label: 'Intel Fidelity',
    value: '79%',
    trend: 'down',
    change: '-1.8% until Tidal Veil resolves',
  },
  {
    id: 'response-latency',
    label: 'Response Latency',
    value: '14m',
    trend: 'up',
    change: 'Improved by 2m with new orbital relays',
  },
];

export const taxonomyBiomes: TaxonomyBiome[] = [
  { id: 'badlands', name: 'Badlands Expanse', climate: 'arid', region: 'Frontier' },
  { id: 'tidal-reef', name: 'Tidal Reef', climate: 'humid', region: 'Pelagic Corridor' },
  { id: 'volcanic-rim', name: 'Volcanic Rim', climate: 'hot', region: 'Anomaly Belt' },
];

export const taxonomySpecies: TaxonomySpecies[] = [
  {
    id: 'gryphon-strider',
    name: 'Gryphon Strider',
    classification: 'Aerial Vanguard',
    tags: ['skirmisher', 'recon'],
  },
  {
    id: 'tidal-warden',
    name: 'Tidal Warden',
    classification: 'Littoral Guardian',
    tags: ['support', 'amphibious'],
  },
  {
    id: 'emberclaw',
    name: 'Emberclaw',
    classification: 'Volcanic Stalker',
    tags: ['assault'],
  },
];

export const speciesBiomeLinks: SpeciesBiomeLink[] = [
  {
    id: 1,
    speciesId: 'gryphon-strider',
    biomeId: 'badlands',
    strength: 'primary',
    species: taxonomySpecies[0],
    biome: taxonomyBiomes[0],
  },
  {
    id: 2,
    speciesId: 'tidal-warden',
    biomeId: 'tidal-reef',
    strength: 'primary',
    species: taxonomySpecies[1],
    biome: taxonomyBiomes[1],
  },
  {
    id: 3,
    speciesId: 'emberclaw',
    biomeId: 'volcanic-rim',
    strength: 'primary',
    species: taxonomySpecies[2],
    biome: taxonomyBiomes[2],
  },
  {
    id: 4,
    speciesId: 'tidal-warden',
    biomeId: 'badlands',
    strength: 'secondary',
    species: taxonomySpecies[1],
    biome: taxonomyBiomes[0],
  },
];
