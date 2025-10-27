import {
  loadPackCatalog,
  manualLoadCatalog,
  getPackRootCandidates,
  PACK_PATH,
} from "./pack-data.js";

const elements = {
  form: document.getElementById("generator-form"),
  flags: document.getElementById("flags"),
  roles: document.getElementById("roles"),
  tags: document.getElementById("tags"),
  nBiomi: document.getElementById("nBiomi"),
  biomeGrid: document.getElementById("biome-grid"),
  traitGrid: document.getElementById("trait-grid"),
  seedGrid: document.getElementById("seed-grid"),
  status: document.getElementById("generator-status"),
  summaryContainer: document.getElementById("generator-summary"),
  summaryCounts: {
    biomes: document.querySelector("[data-summary=\"biomes\"]"),
    species: document.querySelector("[data-summary=\"species\"]"),
    seeds: document.querySelector("[data-summary=\"seeds\"]"),
  },
  narrativePanel: document.getElementById("generator-narrative"),
  narrativeBriefing: document.querySelector("[data-narrative=\"briefing\"]"),
  narrativeHook: document.querySelector("[data-narrative=\"hook\"]"),
  narrativeInsightPanel: document.getElementById("generator-insight-panel"),
  narrativeInsightEmpty: document.getElementById("generator-insight-empty"),
  narrativeInsightList: document.getElementById("generator-insight-list"),
  briefingPanel: document.getElementById("generator-briefing-panel"),
  hookPanel: document.getElementById("generator-hook-panel"),
  audioControls: document.getElementById("generator-audio-controls"),
  audioMute: document.getElementById("generator-audio-mute"),
  audioVolume: document.getElementById("generator-audio-volume"),
  profilePanel: document.getElementById("generator-profiles"),
  profileSlots: document.getElementById("generator-profile-slots"),
  profileEmpty: document.getElementById("generator-profile-empty"),
  composerPanel: document.getElementById("generator-composer"),
  composerPresetList: document.getElementById("generator-composer-presets"),
  composerPresetEmpty: document.getElementById("generator-composer-presets-empty"),
  composerSuggestions: document.getElementById("generator-composer-suggestions"),
  composerSuggestionsEmpty: document.getElementById("generator-composer-suggestions-empty"),
  composerRoleToggles: document.getElementById("generator-composer-role-toggles"),
  composerSynergySlider: document.getElementById("generator-composer-synergy"),
  composerSynergyValue: document.getElementById("generator-composer-synergy-value"),
  composerRadarCanvas: document.getElementById("generator-synergy-radar"),
  composerHeatmap: document.getElementById("generator-role-heatmap"),
  comparePanel: document.getElementById("generator-compare-panel"),
  compareList: document.getElementById("generator-compare-list"),
  compareEmpty: document.getElementById("generator-compare-empty"),
  compareChartContainer: document.getElementById("generator-compare-chart"),
  compareCanvas: document.getElementById("generator-compare-canvas"),
  compareFallback: document.getElementById("generator-compare-fallback"),
  pinnedList: document.getElementById("generator-pinned-list"),
  pinnedEmpty: document.getElementById("generator-pinned-empty"),
  flowMapList: document.getElementById("generator-flow-map-list"),
  flowNodes: Array.from(document.querySelectorAll("[data-flow-node]")),
  historyPanel: document.getElementById("generator-history"),
  historyList: document.getElementById("generator-history-list"),
  historyEmpty: document.getElementById("generator-history-empty"),
  lastAction: document.getElementById("generator-last-action"),
  logList: document.getElementById("generator-log"),
  logEmpty: document.getElementById("generator-log-empty"),
  activitySearch: document.getElementById("activity-search"),
  activityTagFilter: document.getElementById("activity-tags"),
  activityPinnedOnly: document.getElementById("activity-pinned-only"),
  activityToneToggles: Array.from(document.querySelectorAll("[data-activity-tone]")),
  activityReset: document.querySelector("[data-action=\"reset-activity-filters\"]"),
  exportMeta: document.getElementById("generator-export-meta"),
  exportList: document.getElementById("generator-export-list"),
  exportEmpty: document.getElementById("generator-export-empty"),
  exportActions: document.getElementById("generator-export-actions"),
  exportPreset: document.getElementById("generator-export-preset"),
  exportPresetStatus: document.getElementById("generator-export-preset-status"),
  exportPreview: document.getElementById("generator-export-preview"),
  exportPreviewEmpty: document.getElementById("generator-preview-empty"),
  exportPreviewJson: document.getElementById("generator-preview-json"),
  exportPreviewYaml: document.getElementById("generator-preview-yaml"),
  exportPreviewJsonDetails: document.getElementById("generator-preview-json-details"),
  exportPreviewYamlDetails: document.getElementById("generator-preview-yaml-details"),
  dossierPreview: document.getElementById("generator-dossier-preview"),
  dossierEmpty: document.getElementById("generator-dossier-empty"),
  insightsPanel: document.getElementById("generator-insights-panel"),
  insightsEmpty: document.getElementById("generator-insights-empty"),
  insightsList: document.getElementById("generator-insights-list"),
  kpi: {
    averageRoll: document.querySelector("[data-kpi=\"avg-roll\"]"),
    rerollCount: document.querySelector("[data-kpi=\"reroll-count\"]"),
    uniqueSpecies: document.querySelector("[data-kpi=\"unique-species\"]"),
    profileReuses: document.querySelector("[data-kpi=\"profile-reuse\"]"),
  },
};

const anchorUi = {
  root: document.querySelector("[data-anchor-root]"),
  anchors: Array.from(document.querySelectorAll("[data-anchor-target]")),
  panels: Array.from(document.querySelectorAll("[data-panel]")),
  breadcrumbTargets: Array.from(document.querySelectorAll("[data-anchor-breadcrumb]")),
  minimapContainers: Array.from(document.querySelectorAll("[data-anchor-minimap]")),
  overlay: document.querySelector("[data-codex-overlay]"),
  codexToggles: Array.from(document.querySelectorAll("[data-codex-toggle]")),
  codexClosers: Array.from(document.querySelectorAll("[data-codex-close]")),
};

const anchorState = {
  descriptors: [],
  descriptorsById: new Map(),
  sectionsById: new Map(),
  minimaps: new Map(),
  observer: null,
  scrollHandler: null,
  activeId: null,
  lastToggle: null,
};

const PACK_ROOT_CANDIDATES = getPackRootCandidates();
const EXPORT_BASE_FOLDER = `${PACK_PATH}out/generator/`;
const STORAGE_KEYS = {
  activityLog: "evo-generator-activity-log",
  filterProfiles: "evo-generator-filter-profiles",
  history: "evo-generator-history",
  pinned: "evo-generator-pinned",
  locks: "evo-generator-locks",
  preferences: "evo-generator-preferences",
};

const DEFAULT_ACTIVITY_TONES = ["info", "success", "warn", "error"];
const MAX_ACTIVITY_EVENTS = 150;
const DOSSIER_TEMPLATE_PATH = "../templates/dossier.html";
const initialPdfSupport = typeof window !== "undefined" && typeof window.html2pdf !== "undefined";
const TONE_LABELS = {
  info: "Info",
  success: "Successo",
  warn: "Avviso",
  error: "Errore",
};
const REROLL_ACTIONS = new Set(["reroll-biomi", "reroll-species", "reroll-seeds"]);
const ROLL_ACTIONS = new Set(["roll-ecos", "reroll-biomi", "reroll-species", "reroll-seeds"]);

const SPECIES_ROLE_LABELS = {
  apex: "Apex",
  keystone: "Specie chiave",
  bridge: "Specie ponte",
  threat: "Minaccia",
  event: "Evento dinamico",
};

const CONNECTION_TYPE_LABELS = {
  corridor: "Corridoio stagionale",
  trophic_spillover: "Spillover trofico",
  seasonal_bridge: "Ponte stagionale",
};

const PANEL_LABELS = {
  parameters: "Parametri",
  traits: "Pacchetti ambientali",
  biomes: "Biomi selezionati",
  seeds: "Encounter seed",
  composer: "Composizione avanzata",
  insights: "Insight contestuali",
};

const FLOW_STATUS_LABELS = {
  pending: "In attesa",
  active: "In corso",
  complete: "Completato",
};

const FLOW_STATUS_ICONS = {
  pending: "○",
  active: "◔",
  complete: "●",
};

const USER_FLOWS = [
  {
    id: "onboarding",
    label: "Onboarding form",
    target: "#generator-parameters",
    description:
      "Configura vincoli, filtri e profili per ottenere un roll coerente prima della generazione.",
  },
  {
    id: "summary",
    label: "Riepilogo e narrativa",
    target: "#generator-summary",
    description:
      "Monitora metriche, narrativa dinamica e pinnature per ottimizzare la sessione in corso.",
  },
  {
    id: "history",
    label: "Cronologia snapshot",
    target: "#generator-history",
    description:
      "Raccogli snapshot e timeline per confrontare le estrazioni e condividere i risultati.",
  },
];

const PROFILE_SLOT_COUNT = 5;
const MAX_SPECIES_PER_BIOME = 3;
const MAX_HISTORY_ENTRIES = 12;
const HISTORY_ACTION_LABELS = {
  "roll-ecos": "Nuovo ecosistema",
  "reroll-biomi": "Biomi aggiornati",
  "reroll-species": "Specie aggiornate",
  "reroll-seeds": "Seed rigenerati",
};
const MANIFEST_PRESETS = [
  {
    id: "playtest-bundle",
    label: "Bundle playtest",
    description:
      "Pacchetto completo per sessioni di prova con dati serializzati e registro attività.",
    zipSuffix: "playtest",
    files: [
      {
        id: "ecosystem-json",
        format: "JSON",
        filename: (slug) => `${slug}.json`,
        description: (context) =>
          `Dump completo dell'ecosistema "${context.ecosystemLabel}" con ${context.metrics.biomeCount} biomi, ${context.metrics.speciesCount} specie e ${context.metrics.seedCount} seed generati.`,
        builder: "ecosystem-json",
      },
      {
        id: "ecosystem-yaml",
        format: "YAML",
        filename: (slug) => `${slug}.yaml`,
        description: () =>
          "Manifesto YAML utilizzabile per commit rapidi o pipeline di integrazione continua.",
        builder: "ecosystem-yaml",
      },
      {
        id: "activity-json",
        format: "JSON",
        filename: (slug) => `${slug}-log.json`,
        description: () =>
          "Registro attività in formato JSON con tutti gli eventi ordinati cronologicamente.",
        builder: "activity-json",
        optional: true,
      },
      {
        id: "activity-csv",
        format: "CSV",
        filename: (slug) => `${slug}-log.csv`,
        description: () =>
          "Registro attività pronto per spreadsheet, pivot e annotazioni durante il playtest.",
        builder: "activity-csv",
        optional: true,
      },
    ],
  },
  {
    id: "report-design",
    label: "Report design",
    description:
      "Materiale di documentazione per pitch, hand-off designer e revisioni art direction.",
    zipSuffix: "report",
    files: [
      {
        id: "ecosystem-yaml",
        format: "YAML",
        filename: (slug) => `${slug}.yaml`,
        description: () =>
          "Manifesto YAML curato per alimentare design docs, report e versioning narrativo.",
        builder: "ecosystem-yaml",
      },
      {
        id: "dossier-html",
        format: "HTML",
        filename: (slug) => `${slug}-dossier.html`,
        description: () =>
          "Dossier HTML con panoramica visiva dei biomi, specie chiave e seed generati.",
        builder: "dossier-html",
      },
      {
        id: "dossier-pdf",
        format: "PDF",
        filename: (slug) => `${slug}-dossier.pdf`,
        description: () =>
          "Versione PDF del dossier, pronta per la condivisione con stakeholder esterni.",
        builder: "dossier-pdf",
      },
    ],
  },
  {
    id: "demo-bundle",
    label: "Bundle demo pubblico",
    description:
      "Kit leggero per distribuzioni pubbliche con manifesto, dossier e press kit narrativo.",
    zipSuffix: "demo",
    files: [
      {
        id: "ecosystem-yaml",
        format: "YAML",
        filename: (slug) => `${slug}.yaml`,
        description: () =>
          "Manifesto YAML allineato al bundle demo, pronto per deploy statici o CDN.",
        builder: "ecosystem-yaml",
      },
      {
        id: "dossier-html",
        format: "HTML",
        filename: (slug) => `${slug}-dossier.html`,
        description: () =>
          "Dossier HTML riassuntivo con biomi, specie in evidenza e seed narrativi per la demo.",
        builder: "dossier-html",
      },
      {
        id: "press-kit-md",
        format: "Markdown",
        filename: (slug) => `${slug}-press-kit.md`,
        description: () =>
          "Press kit markdown con punti chiave, highlight e call-to-action per il lancio pubblico.",
        builder: "press-kit-md",
      },
    ],
  },
];

const RARE_CUE_SOURCE = "data:audio/wav;base64,UklGRiYfAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQIfAAAAALwL+hZBISMqQTFONhM5d" +
  "DlsNxEzkSwzJFAaUg+wA+j3dezU4XfYw9AKy4rH" +
  "aMawx1XLMNEC2XbiJ+2j+G0ECBD3GsUkCC1nM543gDn5OA023jChKaYgTBYCC0P/jPNa6CbeXdVeznXJ1cabxsnISM3o02HcWeZk8Q390wg9FMweESioLz81" +
  "mziWOSc4XTRhLnIm5xwmEqEG1/pD72LkqtqD0kXMMsh2xiTHNcqHz+LW999j6rj1egEtDVIYcyIhKwEyxzZBOVU5ADddMp4rCiP9GOQNNwJy9hPrleBo1+/P" +
  "espEx2/GBMjzyxDSG9q9447uG/rlBXIRQxzlJfAtDTT8N5E5vDiGNREwmChrH+0UjgnJ/RzyA+f23GLUo80AyavGv8Y5yf/N39SN3a7n0/KG/kgKnRUJIB4p" +
  "eTDLNdw4ijnON7szfS1WJZ4bvRApBV/52u0Z447Zn9Gjy9nHasZlx8HKWNDv1zThw+st9/MCnA6nGZ8jGCy4Mjc3ZTkrOYs2ojGjKtohphd0DL0A/vS06Vrf" +
  "X9Yiz/PJB8eAxmLImcz40jvbCeX475P7XQfZEood/ibQLqs0UDiYOXY49jQ9L4knLB6LExgIUPyu8LDlzdtv0+/MlMiMxu3Gssm/zt3Vv94G6UT0AAC8C/oW" +
  "QSEjKkExTjYTOXQ5bDcRM5EsMyRQGlIPsAPo93Xs1OF32MPQCsuKx2jGsMdVyzDRAtl24ifto/htBAgQ9xrFJAgtZzOeN4A5+TgNNt4woSmmIEwWAgtD/4zz" +
  "Wugm3l3VXs51ydXGm8bJyEjN6NNh3FnmZPEN/dMIPRTMHhEoqC8/NZs4ljknOF00YS5yJuccJhKhBtf6Q+9i5Krag9JFzDLIdsYkxzXKh8/i1vffY+q49XoB" +
  "LQ1SGHMiISsBMsc2QTlVOQA3XTKeKwoj/RjkDTcCcvYT65XgaNfvz3rKRMdvxgTI88sQ0hvaveOO7hv65QVyEUMc5SXwLQ00/DeRObw4hjURMJgoax/tFI4J" +
  "yf0c8gPn9txi1KPNAMmrxr/GOcn/zd/Ujd2u59Pyhv5ICp0VCSAeKXkwyzXcOIo5zje7M30tViWeG70QKQVf+drtGeOO2Z/Ro8vZx2rGZcfByljQ79c04cPr" +
  "LffzApwOpxmfIxgsuDI3N2U5KzmLNqIxoyraIaYXdAy9AP70tOla31/WIs/zyQfHgMZiyJnM+NI72wnl+O+T+10H2RKKHf4m0C6rNFA4mDl2OPY0PS+JJywe" +
  "ixMYCFD8rvCw5c3bb9PvzJTIjMbtxrLJv87d1b/eBulE9AAAvAv6FkEhIypBMU42Ezl0OWw3ETORLDMkUBpSD7AD6Pd17NThd9jD0ArLisdoxrDHVcsw0QLZ" +
  "duIn7aP4bQQIEPcaxSQILWcznjeAOfk4DTbeMKEppiBMFgILQ/+M81roJt5d1V7OdcnVxpvGychIzejTYdxZ5mTxDf3TCD0UzB4RKKgvPzWbOJY5JzhdNGEu" +
  "cibnHCYSoQbX+kPvYuSq2oPSRcwyyHbGJMc1yofP4tb332PquPV6AS0NUhhzIiErATLHNkE5VTkAN10ynisKI/0Y5A03AnL2E+uV4GjX7896ykTHb8YEyPPL" +
  "ENIb2r3jju4b+uUFchFDHOUl8C0NNPw3kTm8OIY1ETCYKGsf7RSOCcn9HPID5/bcYtSjzQDJq8a/xjnJ/83f1I3drufT8ob+SAqdFQkgHil5MMs13DiKOc43" +
  "uzN9LVYlnhu9ECkFX/na7Rnjjtmf0aPL2cdqxmXHwcpY0O/XNOHD6y338wKcDqcZnyMYLLgyNzdlOSs5izaiMaMq2iGmF3QMvQD+9LTpWt9f1iLP88kHx4DG" +
  "YsiZzPjSO9sJ5fjvk/tdB9kSih3+JtAuqzRQOJg5djj2ND0viScsHosTGAhQ/K7wsOXN22/T78yUyIzG7cayyb/O3dW/3gbpRPQAALwL+hZBISMqQTFONhM5" +
  "dDlsNxEzkSwzJFAaUg+wA+j3dezU4XfYw9AKy4rHaMawx1XLMNEC2XbiJ+2j+G0ECBD3GsUkCC1nM543gDn5OA023jChKaYgTBYCC0P/jPNa6CbeXdVeznXJ" +
  "1cabxsnISM3o02HcWeZk8Q390wg9FMweESioLz81mziWOSc4XTRhLnIm5xwmEqEG1/pD72LkqtqD0kXMMsh2xiTHNcqHz+LW999j6rj1egEtDVIYcyIhKwEy" +
  "xzZBOVU5ADddMp4rCiP9GOQNNwJy9hPrleBo1+/PespEx2/GBMjzyxDSG9q9447uG/rlBXIRQxzlJfAtDTT8N5E5vDiGNREwmChrH+0UjgnJ/RzyA+f23GLU" +
  "o80AyavGv8Y5yf/N39SN3a7n0/KG/kgKnRUJIB4peTDLNdw4ijnON7szfS1WJZ4bvRApBV/52u0Z447Zn9Gjy9nHasZlx8HKWNDv1zThw+st9/MCnA6nGZ8j" +
  "GCy4Mjc3ZTkrOYs2ojGjKtohphd0DL0A/vS06VrfX9Yiz/PJB8eAxmLImcz40jvbCeX475P7XQfZEood/ibQLqs0UDiYOXY49jQ9L4knLB6LExgIUPyu8LDl" +
  "zdtv0+/MlMiMxu3Gssm/zt3Vv94G6UT0AAC8C/oWQSEjKkExTjYTOXQ5bDcRM5EsMyRQGlIPsAPo93Xs1OF32MPQCsuKx2jGsMdVyzDRAtl24ifto/htBAgQ" +
  "9xrFJAgtZzOeN4A5+TgNNt4woSmmIEwWAgtD/4zzWugm3l3VXs51ydXGm8bJyEjN6NNh3FnmZPEN/dMIPRTMHhEoqC8/NZs4ljknOF00YS5yJuccJhKhBtf6" +
  "Q+9i5Krag9JFzDLIdsYkxzXKh8/i1vffY+q49XoBLQ1SGHMiISsBMsc2QTlVOQA3XTKeKwoj/RjkDTcCcvYT65XgaNfvz3rKRMdvxgTI88sQ0hvaveOO7hv6" +
  "5QVyEUMc5SXwLQ00/DeRObw4hjURMJgoax/tFI4Jyf0c8gPn9txi1KPNAMmrxr/GOcn/zd/Ujd2u59Pyhv5ICp0VCSAeKXkwyzXcOIo5zje7M30tViWeG70Q" +
  "KQVf+drtGeOO2Z/Ro8vZx2rGZcfByljQ79c04cPrLffzApwOpxmfIxgsuDI3N2U5KzmLNqIxoyraIaYXdAy9AP70tOla31/WIs/zyQfHgMZiyJnM+NI72wnl" +
  "+O+T+10H2RKKHf4m0C6rNFA4mDl2OPY0PS+JJyweixMYCFD8rvCw5c3bb9PvzJTIjMbtxrLJv87d1b/eBulE9AAAvAv6FkEhIypBMU42Ezl0OWw3ETORLDMk" +
  "UBpSD7AD6Pd17NThd9jD0ArLisdoxrDHVcsw0QLZduIn7aP4bQQIEPcaxSQILWcznjeAOfk4DTbeMKEppiBMFgILQ/+M81roJt5d1V7OdcnVxpvGychIzejT" +
  "YdxZ5mTxDf3TCD0UzB4RKKgvPzWbOJY5JzhdNGEucibnHCYSoQbX+kPvYuSq2oPSRcwyyHbGJMc1yofP4tb332PquPV6AS0NUhhzIiErATLHNkE5VTkAN10y" +
  "nisKI/0Y5A03AnL2E+uV4GjX7896ykTHb8YEyPPLENIb2r3jju4b+uUFchFDHOUl8C0NNPw3kTm8OIY1ETCYKGsf7RSOCcn9HPID5/bcYtSjzQDJq8a/xjnJ" +
  "/83f1I3drufT8ob+SAqdFQkgHil5MMs13DiKOc43uzN9LVYlnhu9ECkFX/na7Rnjjtmf0aPL2cdqxmXHwcpY0O/XNOHD6y338wKcDqcZnyMYLLgyNzdlOSs5" +
  "izaiMaMq2iGmF3QMvQD+9LTpWt9f1iLP88kHx4DGYsiZzPjSO9sJ5fjvk/tdB9kSih3+JtAuqzRQOJg5djj2ND0viScsHosTGAhQ/K7wsOXN22/T78yUyIzG" +
  "7cayyb/O3dW/3gbpRPQAALwL+hZBISMqQTFONhM5dDlsNxEzkSwzJFAaUg+wA+j3dezU4XfYw9AKy4rHaMawx1XLMNEC2XbiJ+2j+G0ECBD3GsUkCC1nM543" +
  "gDn5OA023jChKaYgTBYCC0P/jPNa6CbeXdVeznXJ1cabxsnISM3o02HcWeZk8Q390wg9FMweESioLz81mziWOSc4XTRhLnIm5xwmEqEG1/pD72LkqtqD0kXM" +
  "Msh2xiTHNcqHz+LW999j6rj1egEtDVIYcyIhKwEyxzZBOVU5ADddMp4rCiP9GOQNNwJy9hPrleBo1+/PespEx2/GBMjzyxDSG9q9447uG/rlBXIRQxzlJfAt" +
  "DTT8N5E5vDiGNREwmChrH+0UjgnJ/RzyA+f23GLUo80AyavGv8Y5yf/N39SN3a7n0/KG/kgKnRUJIB4peTDLNdw4ijnON7szfS1WJZ4bvRApBV/52u0Z447Z" +
  "n9Gjy9nHasZlx8HKWNDv1zThw+st9/MCnA6nGZ8jGCy4Mjc3ZTkrOYs2ojGjKtohphd0DL0A/vS06VrfX9Yiz/PJB8eAxmLImcz40jvbCeX475P7XQfZEood" +
  "/ibQLqs0UDiYOXY49jQ9L4knLB6LExgIUPyu8LDlzdtv0+/MlMiMxu3Gssm/zt3Vv94G6UT0AAC8C/oWQSEjKkExTjYTOXQ5bDcRM5EsMyRQGlIPsAPo93Xs" +
  "1OF32MPQCsuKx2jGsMdVyzDRAtl24ifto/htBAgQ9xrFJAgtZzOeN4A5+TgNNt4woSmmIEwWAgtD/4zzWugm3l3VXs51ydXGm8bJyEjN6NNh3FnmZPEN/dMI" +
  "PRTMHhEoqC8/NZs4ljknOF00YS5yJuccJhKhBtf6Q+9i5Krag9JFzDLIdsYkxzXKh8/i1vffY+q49XoBLQ1SGHMiISsBMsc2QTlVOQA3XTKeKwoj/RjkDTcC" +
  "cvYT65XgaNfvz3rKRMdvxgTI88sQ0hvaveOO7hv65QVyEUMc5SXwLQ00/DeRObw4hjURMJgoax/tFI4Jyf0c8gPn9txi1KPNAMmrxr/GOcn/zd/Ujd2u59Py" +
  "hv5ICp0VCSAeKXkwyzXcOIo5zje7M30tViWeG70QKQVf+drtGeOO2Z/Ro8vZx2rGZcfByljQ79c04cPrLffzApwOpxmfIxgsuDI3N2U5KzmLNqIxoyraIaYX" +
  "dAy9AP70tOla31/WIs/zyQfHgMZiyJnM+NI72wnl+O+T+10H2RKKHf4m0C6rNFA4mDl2OPY0PS+JJyweixMYCFD8rvCw5c3bb9PvzJTIjMbtxrLJv87d1b/e" +
  "BulE9AAAvAv6FkEhIypBMU42Ezl0OWw3ETORLDMkUBpSD7AD6Pd17NThd9jD0ArLisdoxrDHVcsw0QLZduIn7aP4bQQIEPcaxSQILWcznjeAOfk4DTbeMKEp" +
  "piBMFgILQ/+M81roJt5d1V7OdcnVxpvGychIzejTYdxZ5mTxDf3TCD0UzB4RKKgvPzWbOJY5JzhdNGEucibnHCYSoQbX+kPvYuSq2oPSRcwyyHbGJMc1yofP" +
  "4tb332PquPV6AS0NUhhzIiErATLHNkE5VTkAN10ynisKI/0Y5A03AnL2E+uV4GjX7896ykTHb8YEyPPLENIb2r3jju4b+uUFchFDHOUl8C0NNPw3kTm8OIY1" +
  "ETCYKGsf7RSOCcn9HPID5/bcYtSjzQDJq8a/xjnJ/83f1I3drufT8ob+SAqdFQkgHil5MMs13DiKOc43uzN9LVYlnhu9ECkFX/na7Rnjjtmf0aPL2cdqxmXH" +
  "wcpY0O/XNOHD6y338wKcDqcZnyMYLLgyNzdlOSs5izaiMaMq2iGmF3QMvQD+9LTpWt9f1iLP88kHx4DGYsiZzPjSO9sJ5fjvk/tdB9kSih3+JtAuqzRQOJg5" +
  "djj2ND0viScsHosTGAhQ/K7wsOXN22/T78yUyIzG7cayyb/O3dW/3gbpRPQAALwL+hZBISMqQTFONhM5dDlsNxEzkSwzJFAaUg+wA+j3dezU4XfYw9AKy4rH" +
  "aMawx1XLMNEC2XbiJ+2j+G0ECBD3GsUkCC1nM543gDn5OA023jChKaYgTBYCC0P/jPNa6CbeXdVeznXJ1cabxsnISM3o02HcWeZk8Q390wg9FMweESioLz81" +
  "mziWOSc4XTRhLnIm5xwmEqEG1/pD72LkqtqD0kXMMsh2xiTHNcqHz+LW999j6rj1egEtDVIYcyIhKwEyxzZBOVU5ADddMp4rCiP9GOQNNwJy9hPrleBo1+/P" +
  "espEx2/GBMjzyxDSG9q9447uG/rlBXIRQxzlJfAtDTT8N5E5vDiGNREwmChrH+0UjgnJ/RzyA+f23GLUo80AyavGv8Y5yf/N39SN3a7n0/KG/kgKnRUJIB4p" +
  "eTDLNdw4ijnON7szfS1WJZ4bvRApBV/52u0Z447Zn9Gjy9nHasZlx8HKWNDv1zThw+st9/MCnA6nGZ8jGCy4Mjc3ZTkrOYs2ojGjKtohphd0DL0A/vS06Vrf" +
  "X9Yiz/PJB8eAxmLImcz40jvbCeX475P7XQfZEood/ibQLqs0UDiYOXY49jQ9L4knLB6LExgIUPyu8LDlzdtv0+/MlMiMxu3Gssm/zt3Vv94G6UT0AAC8C/oW" +
  "QSEjKkExTjYTOXQ5bDcRM5EsMyRQGlIPsAPo93Xs1OF32MPQCsuKx2jGsMdVyzDRAtl24ifto/htBAgQ9xrFJAgtZzOeN4A5+TgNNt4woSmmIEwWAgtD/4zz" +
  "Wug=";

const AUDIO_CUES = {
  rare: createAudioElement(RARE_CUE_SOURCE),
};

const DEFAULT_BRIEFING_TEXT = "Genera un ecosistema per ottenere il briefing operativo.";
const DEFAULT_HOOK_TEXT = "Gli hook narrativi compariranno dopo la prima generazione.";

const state = {
  data: null,
  traitRegistry: null,
  traitReference: null,
  traitGlossary: null,
  traitsIndex: new Map(),
  traitDetailsIndex: new Map(),
  traitGlossaryIndex: new Map(),
  hazardRegistry: null,
  hazardsIndex: new Map(),
  activityLog: [],
  activityFilters: {
    query: "",
    tones: new Set(DEFAULT_ACTIVITY_TONES),
    tags: new Set(),
    pinnedOnly: false,
  },
  activityTagCounts: new Map(),
  metrics: {
    averageRollIntervalMs: null,
    rerollCount: 0,
    uniqueSpecies: 0,
    filterProfileReuses: 0,
    roleUsage: new Map(),
  },
  lastFilters: { flags: [], roles: [], tags: [] },
  pick: {
    ecosystem: {},
    biomes: [],
    species: {},
    seeds: [],
    exportSlug: null,
  },
  cardState: {
    pinned: new Map(),
    squad: new Map(),
    comparison: new Map(),
    locks: {
      biomes: new Set(),
      species: new Set(),
    },
  },
  exportState: {
    presetId: MANIFEST_PRESETS[0]?.id ?? null,
    checklist: new Map(),
    dossierTemplate: null,
    pdfSupported: initialPdfSupport,
    pdfSupportNotified: false,
  },
  filterProfiles: [],
  history: [],
  preferences: {
    audioMuted: false,
    volume: 0.75,
  },
  narrative: {
    missionBriefing: DEFAULT_BRIEFING_TEXT,
    narrativeHook: DEFAULT_HOOK_TEXT,
    rare: false,
    reason: null,
    recommendations: [],
  },
  composer: {
    constraints: {
      minSynergy: 45,
      preferredRoles: new Set(),
    },
    combinedPresets: [],
    suggestions: [],
    metrics: {
      radar: [],
      heatmap: [],
    },
    roleStats: new Map(),
  },
};

let packContext = null;
let resolvedCatalogUrl = null;
let resolvedPackRoot = null;
let packDocsBase = null;
let cachedStorage = null;
let storageChecked = false;
let comparisonChart = null;
let chartUnavailableNotified = false;
let composerRadarChart = null;
let composerChartUnavailable = false;
const fetchFailureNotices = new Set();

const COMPARISON_LABELS = ["Tier medio", "Densità hazard", "Diversità ruoli"];

const ROLE_FLAGS = ["apex", "keystone", "bridge", "threat", "event"];

const ROLE_FLAG_LABELS = {
  apex: "Apex",
  keystone: "Specie chiave",
  bridge: "Specie ponte",
  threat: "Minaccia",
  event: "Evento dinamico",
};

const ROLE_FLAG_TOKENS = {
  apex: "--color-accent-400",
  keystone: "--color-success-400",
  bridge: "--color-info-400",
  threat: "--color-error-400",
  event: "--color-warn-400",
};

const COMPOSER_RADAR_LABELS = ROLE_FLAGS.map(
  (flag) => ROLE_FLAG_LABELS[flag] ?? titleCase(flag)
);

const TRAIT_CATEGORY_LABELS = {
  biomi_estremi: "Biomi estremi",
  rete_connessa: "Rete connessa",
  avanzati_specializzati: "Cluster avanzati",
};


function applyCatalogContext(data, context) {
  packContext = context ?? null;
  resolvedCatalogUrl = context?.catalogUrl ?? null;
  resolvedPackRoot = context?.resolvedBase ?? null;
  packDocsBase = context?.docsBase ?? null;
  state.data = data;
  populateFilters(data);
  renderFlowMap();
}

function calculatePickMetrics() {
  const biomes = state.pick?.biomes ?? [];
  const speciesBuckets = state.pick?.species ?? {};
  const seeds = state.pick?.seeds ?? [];
  const biomeCount = Array.isArray(biomes) ? biomes.length : 0;
  const speciesCount = Object.values(speciesBuckets).reduce(
    (sum, list) => sum + (Array.isArray(list) ? list.length : 0),
    0
  );
  const seedCount = Array.isArray(seeds) ? seeds.length : 0;
  const uniqueSpecies = new Set();
  Object.values(speciesBuckets).forEach((list) => {
    if (!Array.isArray(list)) return;
    list.forEach((sp) => {
      if (sp?.id) {
        uniqueSpecies.add(sp.id);
      }
    });
  });
  const uniqueSpeciesCount = uniqueSpecies.size;
  return { biomeCount, speciesCount, seedCount, uniqueSpeciesCount };
}

function setStatus(message, tone = "info", options = {}) {
  const now = new Date();
  if (elements.status) {
    elements.status.textContent = message;
    elements.status.dataset.tone = tone;
  }
  if (elements.lastAction) {
    const formatted = now.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
    elements.lastAction.textContent = `Ultimo aggiornamento: ${formatted}`;
    elements.lastAction.dataset.tone = tone;
    elements.lastAction.title = now.toLocaleString("it-IT");
  }
  recordActivity(message, tone, now, options);

  if (options.rare) {
    triggerRareEventFeedback({ target: options.rareTarget ?? state.narrative.reason ?? null });
  }
}

function updateSummaryCounts() {
  const { biomeCount, speciesCount, seedCount, uniqueSpeciesCount } = calculatePickMetrics();

  if (elements.summaryCounts) {
    if (elements.summaryCounts.biomes) {
      elements.summaryCounts.biomes.textContent = String(biomeCount);
    }
    if (elements.summaryCounts.species) {
      elements.summaryCounts.species.textContent = String(speciesCount);
    }
    if (elements.summaryCounts.seeds) {
      elements.summaryCounts.seeds.textContent = String(seedCount);
    }
  }

  if (elements.summaryContainer) {
    const hasResults = biomeCount + speciesCount + seedCount > 0;
    elements.summaryContainer.dataset.hasResults = hasResults ? "true" : "false";
  }

  state.metrics.uniqueSpecies = uniqueSpeciesCount;
  renderKpiSidebar();

  renderExportManifest();
  renderPinnedSummary();
}

function formatAverageRollMetric(ms) {
  if (!Number.isFinite(ms) || ms <= 0) {
    return "—";
  }
  if (ms < 1000) {
    return `${Math.round(ms)} ms`;
  }
  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)} s`;
  }
  const minutes = seconds / 60;
  return `${minutes.toFixed(1)} min`;
}

function deriveFlowSnapshot() {
  const metrics = calculatePickMetrics();
  const hasCatalog = Boolean(state.data);
  const hasResults = metrics.biomeCount > 0 || metrics.speciesCount > 0 || metrics.seedCount > 0;
  const hasSeeds = metrics.seedCount > 0;
  const hasHistory = Array.isArray(state.history) && state.history.length > 0;
  const filtersSummary = summariseFilters(state.lastFilters ?? {});
  const rerollCount = Number.isFinite(state.metrics?.rerollCount)
    ? Math.max(0, state.metrics.rerollCount)
    : 0;
  const averageRoll = state.metrics?.averageRollIntervalMs ?? null;

  return {
    onboarding: {
      status: hasResults ? "complete" : hasCatalog ? "active" : "pending",
      details: [
        `Biomi selezionati: ${metrics.biomeCount}`,
        filtersSummary && filtersSummary !== "nessun filtro attivo"
          ? `Filtri attivi: ${filtersSummary}`
          : "Filtri attivi: nessuno",
      ],
    },
    summary: {
      status: hasResults ? (hasSeeds ? "complete" : "active") : hasCatalog ? "pending" : "pending",
      details: [
        `Specie totali: ${metrics.speciesCount}`,
        `Seed generati: ${metrics.seedCount}`,
        `Tempo medio roll: ${formatAverageRollMetric(averageRoll)}`,
        `Riusi profili: ${state.metrics.filterProfileReuses ?? 0}`,
      ],
    },
    history: {
      status: hasHistory ? "complete" : hasResults ? "active" : hasCatalog ? "pending" : "pending",
      details: [
        `Snapshot salvati: ${state.history?.length ?? 0}`,
        `Click per roll: ${Math.max(1, rerollCount + 1)}`,
      ],
    },
  };
}

function renderFlowMap() {
  const list = elements.flowMapList;
  if (!list) return;

  const snapshot = deriveFlowSnapshot();
  list.innerHTML = "";

  USER_FLOWS.forEach((flow) => {
    const entry = snapshot[flow.id] ?? { status: "pending", details: [] };
    const status = entry.status;
    const icon = FLOW_STATUS_ICONS[status] ?? FLOW_STATUS_ICONS.pending;
    const label = FLOW_STATUS_LABELS[status] ?? FLOW_STATUS_LABELS.pending;

    const item = document.createElement("li");
    item.className = "generator-flow-map__item";
    item.dataset.flowId = flow.id;
    item.dataset.flowStatus = status;

    const article = document.createElement("article");
    article.className = "card generator-flow-map__card";

    const header = document.createElement("div");
    header.className = "generator-flow-map__header";

    const statusLabel = document.createElement("p");
    statusLabel.className = "generator-flow-map__status";
    statusLabel.textContent = `${icon} ${label}`;
    header.appendChild(statusLabel);

    const title = document.createElement("h3");
    title.className = "generator-flow-map__title";
    title.textContent = flow.label;
    header.appendChild(title);

    article.appendChild(header);

    const description = document.createElement("p");
    description.className = "generator-flow-map__description";
    description.textContent = flow.description;
    article.appendChild(description);

    if (Array.isArray(entry.details) && entry.details.length) {
      const details = document.createElement("ul");
      details.className = "generator-flow-map__details";
      entry.details.forEach((detail) => {
        const li = document.createElement("li");
        li.textContent = detail;
        details.appendChild(li);
      });
      article.appendChild(details);
    }

    const actions = document.createElement("div");
    actions.className = "generator-flow-map__actions";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "button button--ghost generator-flow-map__action";
    button.dataset.flowTarget = flow.target;
    button.dataset.flowId = flow.id;
    button.textContent = "Apri sezione";
    button.setAttribute("aria-label", `Apri sezione ${flow.label}`);
    actions.appendChild(button);
    article.appendChild(actions);

    item.appendChild(article);
    list.appendChild(item);
  });

  if (Array.isArray(elements.flowNodes)) {
    elements.flowNodes.forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      const flowId = node.dataset.flowNode;
      if (!flowId) return;
      const entry = snapshot[flowId];
      node.dataset.flowStatus = entry?.status ?? "pending";
    });
  }
}

function setupFlowMapControls() {
  const list = elements.flowMapList;
  if (!list) return;
  list.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const button = target.closest("[data-flow-target]");
    if (!(button instanceof HTMLElement)) return;
    const selector = button.dataset.flowTarget;
    if (!selector) return;
    const destination = document.querySelector(selector);
    if (destination instanceof HTMLElement) {
      destination.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
}

const RARE_TARGET_MAP = {
  seed: "hook",
  species: "briefing",
  both: "both",
};

let rareFeedbackTimer = null;

function pulseElement(element, className = "is-animated", duration = 900) {
  if (!element) return;
  const timerKey = `__${className}Timer`;
  if (element[timerKey]) {
    clearTimeout(element[timerKey]);
  }
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
  if (typeof window !== "undefined") {
    element[timerKey] = window.setTimeout(() => {
      element.classList.remove(className);
      element[timerKey] = null;
    }, duration);
  }
}

function triggerRareEventFeedback(context = {}) {
  if (elements.summaryContainer) {
    elements.summaryContainer.classList.remove("is-rare-event");
    void elements.summaryContainer.offsetWidth;
    elements.summaryContainer.classList.add("is-rare-event");
    if (rareFeedbackTimer && typeof window !== "undefined") {
      clearTimeout(rareFeedbackTimer);
    }
    if (typeof window !== "undefined") {
      rareFeedbackTimer = window.setTimeout(() => {
        elements.summaryContainer?.classList.remove("is-rare-event");
      }, 1000);
    }
  }

  const target = context.target ? RARE_TARGET_MAP[context.target] ?? context.target : null;
  if (target === "hook" || target === "both") {
    pulseElement(elements.hookPanel, "narrative-panel--rare", 900);
  }
  if (target === "briefing" || target === "both") {
    pulseElement(elements.briefingPanel, "narrative-panel--rare", 900);
  }

  playAudioCue("rare");
}

function updateNarrativePrompts(filters = state.lastFilters) {
  const context = buildNarrativePrompts(state.pick, filters ?? state.lastFilters ?? { flags: [], roles: [], tags: [] });
  state.narrative.missionBriefing = context.missionBriefing;
  state.narrative.narrativeHook = context.narrativeHook;
  state.narrative.rare = context.isHighThreat;
  state.narrative.reason = context.rareReason;
  state.narrative.recommendations = context.recommendations ?? [];

  if (elements.narrativePanel) {
    elements.narrativePanel.dataset.hasNarrative = context.hasNarrative ? "true" : "false";
  }
  if (elements.narrativeBriefing) {
    elements.narrativeBriefing.textContent = context.missionBriefing;
  }
  if (elements.narrativeHook) {
    elements.narrativeHook.textContent = context.narrativeHook;
  }

  renderContextualInsights(state.narrative.recommendations);

  pulseElement(elements.briefingPanel);
  pulseElement(elements.hookPanel);

  return context;
}

function buildNarrativePrompts(pick, filters = { flags: [], roles: [], tags: [] }) {
  const normalisedFilters = {
    flags: Array.isArray(filters.flags) ? filters.flags : [],
    roles: Array.isArray(filters.roles) ? filters.roles : [],
    tags: Array.isArray(filters.tags) ? filters.tags : [],
  };

  const metrics = calculatePickMetrics();
  const hasBiomes = metrics.biomeCount > 0;
  const filterSummary = summariseFilters(normalisedFilters);
  if (!hasBiomes) {
    return {
      missionBriefing: DEFAULT_BRIEFING_TEXT,
      narrativeHook: DEFAULT_HOOK_TEXT,
      hasNarrative: false,
      isHighThreat: false,
      rareReason: null,
      metrics,
    };
  }

  const biomes = Array.isArray(pick?.biomes) ? pick.biomes : [];
  const speciesBuckets = pick?.species ?? {};
  const seeds = Array.isArray(pick?.seeds) ? pick.seeds : [];

  const highlightBiome = [...biomes].sort((a, b) => {
    const syntheticDelta = (b.synthetic ? 1 : 0) - (a.synthetic ? 1 : 0);
    if (syntheticDelta !== 0) return syntheticDelta;
    const speciesA = Array.isArray(speciesBuckets[a.id]) ? speciesBuckets[a.id].length : 0;
    const speciesB = Array.isArray(speciesBuckets[b.id]) ? speciesBuckets[b.id].length : 0;
    if (speciesA !== speciesB) return speciesB - speciesA;
    const labelA = a.label ?? a.id ?? "";
    const labelB = b.label ?? b.id ?? "";
    return labelA.localeCompare(labelB);
  })[0] ?? null;

  const speciesEntries = [];
  biomes.forEach((biome) => {
    const list = Array.isArray(speciesBuckets[biome.id]) ? speciesBuckets[biome.id] : [];
    list.forEach((sp) => {
      const tier = tierOf(sp);
      speciesEntries.push({
        name: sp.display_name ?? sp.id ?? "Specie",
        tier,
        biomeLabel: biome.label ?? titleCase(biome.id ?? "bioma"),
        synthetic: Boolean(sp.synthetic || biome.synthetic),
      });
    });
  });

  speciesEntries.sort((a, b) => {
    if (b.tier !== a.tier) return b.tier - a.tier;
    return a.name.localeCompare(b.name);
  });

  const topSpecies = speciesEntries.slice(0, 3);
  const apex = topSpecies[0] ?? null;
  const speciesSummary = topSpecies.length
    ? topSpecies
        .map((entry) => {
          const parts = [`${entry.name}`, `T${entry.tier}`];
          parts.push(entry.biomeLabel);
          if (entry.synthetic) {
            parts.push("Synth");
          }
          return parts.join(" · ");
        })
        .join(" | ")
    : "Nessuna specie prioritaria identificata";

  const highlightLabel = highlightBiome
    ? highlightBiome.label ?? titleCase(highlightBiome.id ?? "bioma")
    : "rete";
  const highlightDescriptor = highlightBiome?.synthetic ? `${highlightLabel} · Synth` : highlightLabel;

  const hasFilters = Boolean(
    filterSummary && filterSummary.length && filterSummary !== "nessun filtro attivo"
  );

  const missionBriefingParts = [
    `Deploy su ${metrics.biomeCount} biomi con ${metrics.speciesCount} specie (${metrics.uniqueSpeciesCount} uniche).`,
    highlightBiome ? `Priorità operativa: ${highlightDescriptor}.` : null,
    topSpecies.length ? `Asset chiave: ${speciesSummary}.` : "Asset chiave: in attesa di estrazioni mirate.",
    hasFilters ? `Filtri attivi: ${filterSummary}.` : "Filtri attivi: nessuno.",
  ].filter(Boolean);

  const missionBriefing = missionBriefingParts.join(" ");

  const sortedSeeds = [...seeds].sort((a, b) => (b.threat_budget ?? 0) - (a.threat_budget ?? 0));
  const dangerousSeed = sortedSeeds[0] ?? null;

  const hookParts = [];
  if (dangerousSeed) {
    const seedLabel = dangerousSeed.label ?? "Encounter";
    const origin = dangerousSeed.synthetic ? "sintetico" : "catalogo";
    const biomeForSeed = biomes.find((biome) => biome.id === dangerousSeed.biome_id);
    const location = biomeForSeed
      ? biomeForSeed.label ?? titleCase(biomeForSeed.id ?? "bioma")
      : dangerousSeed.biome_id ?? "bioma bersaglio";
    hookParts.push(`${seedLabel} attivo su ${location} (${origin}).`);
    if (dangerousSeed.threat_budget) {
      hookParts.push(`Budget minaccia T${dangerousSeed.threat_budget}.`);
    }
    if (apex) {
      hookParts.push(`Risposta consigliata: ${apex.name} (T${apex.tier}).`);
    } else {
      hookParts.push("Preparare asset di contenimento dedicati.");
    }
  } else if (apex) {
    hookParts.push(`${apex.name} domina ${apex.biomeLabel}.`);
    hookParts.push(`Minaccia stimata T${apex.tier}.`);
  } else {
    hookParts.push("Genera encounter seed per dettagli narrativi contestuali.");
  }

  const narrativeHook = hookParts.join(" ");

  const highThreatFromSpecies = (apex?.tier ?? 0) >= 4;
  const highThreatFromSeed = (dangerousSeed?.threat_budget ?? 0) >= 12;
  let rareReason = null;
  if (highThreatFromSpecies && highThreatFromSeed) {
    rareReason = "both";
  } else if (highThreatFromSeed) {
    rareReason = "seed";
  } else if (highThreatFromSpecies) {
    rareReason = "species";
  }

  const recommendations = buildNarrativeRecommendations({
    highlightBiome,
    highlightLabel,
    apex,
    dangerousSeed,
    filterSummary,
  });

  return {
    missionBriefing: missionBriefing || DEFAULT_BRIEFING_TEXT,
    narrativeHook: narrativeHook || DEFAULT_HOOK_TEXT,
    hasNarrative: true,
    isHighThreat: Boolean(rareReason),
    rareReason,
    metrics,
    recommendations,
  };
}

function buildNarrativeRecommendations({ highlightBiome, highlightLabel, apex, dangerousSeed, filterSummary }) {
  const recommendations = [];
  const biomeId = highlightBiome?.id ?? null;

  if (biomeId) {
    const catalogBiome = findCatalogBiome(biomeId);
    const manifestCounts = catalogBiome?.manifest?.species_counts ?? null;
    if (manifestCounts && typeof manifestCounts === "object") {
      const entries = Object.entries(manifestCounts)
        .map(([role, value]) => ({ role, value: Number(value) }))
        .filter((entry) => Number.isFinite(entry.value) && entry.value > 0);
      const total = entries.reduce((sum, entry) => sum + entry.value, 0);
      if (entries.length && total > 0) {
        entries.sort((a, b) => b.value - a.value);
        const dominant = entries[0];
        const roleLabel = SPECIES_ROLE_LABELS[dominant.role] ?? titleCase(dominant.role.replace(/_/g, " "));
        const messageParts = [
          `${highlightLabel} mette in risalto ${roleLabel.toLowerCase()}`,
          `(${dominant.value}/${total} specie monitorate).`,
          "Allinea i filtri ruoli per sfruttare il vantaggio.",
        ];
        recommendations.push({
          id: `role-${biomeId}`,
          tone: "info",
          message: messageParts.join(" "),
          targetPanel: "parameters",
          targetLabel: getPanelLabel("parameters"),
          tooltip: `Distribuzione ruoli dal catalogo per ${highlightLabel}.`,
        });
      }
    }

    const strongestConnection = pickStrongestConnection(biomeId);
    if (strongestConnection) {
      const typeLabel = CONNECTION_TYPE_LABELS[strongestConnection.type] ?? titleCase(strongestConnection.type ?? "connessione");
      const connectedLabel =
        findBiomeLabelByCode(strongestConnection.to) ??
        titleCase((strongestConnection.to ?? "bioma").toLowerCase());
      const resistanceLabel =
        typeof strongestConnection.resistance === "number"
          ? strongestConnection.resistance.toFixed(1)
          : "—";
      recommendations.push({
        id: `connection-${biomeId}`,
        tone: "info",
        message: `${typeLabel} verso ${connectedLabel} (resistenza ${resistanceLabel}). Valuta sinergie cross-bioma.`,
        targetPanel: "biomes",
        targetLabel: getPanelLabel("biomes"),
        tooltip: `Connessioni note per ${highlightLabel}.`,
      });
    }
  }

  if (dangerousSeed) {
    const locationLabel = findBiomeLabelById(dangerousSeed.biome_id) ?? highlightLabel ?? "bioma bersaglio";
    const threatLabel =
      typeof dangerousSeed.threat_budget === "number" ? `T${dangerousSeed.threat_budget}` : null;
    const parts = [`Seed ${dangerousSeed.label ?? "Encounter"} attivo su ${locationLabel}.`];
    if (threatLabel) {
      parts.push(`Budget minaccia ${threatLabel}.`);
    }
    if (apex?.name) {
      parts.push(`Sincronizza la risposta con ${apex.name}.`);
    } else {
      parts.push("Prepara squadre di contenimento dedicate.");
    }
    recommendations.push({
      id: `seed-${dangerousSeed.id ?? dangerousSeed.label ?? "primario"}`,
      tone: (dangerousSeed.threat_budget ?? 0) >= 12 ? "warn" : "info",
      message: parts.join(" "),
      targetPanel: "seeds",
      targetLabel: getPanelLabel("seeds"),
      tooltip: "Consulta il pannello encounter seed per pianificare la risposta.",
    });
  }

  const profileRecommendation = deriveProfileRecommendation({ filterSummary });
  if (profileRecommendation) {
    recommendations.push(profileRecommendation);
  }

  return recommendations;
}

function deriveProfileRecommendation({ filterSummary }) {
  const entries = Array.isArray(state.activityLog) ? state.activityLog : [];
  const lastLoad = entries.find((entry) => entry?.action === "profile-load");
  if (lastLoad) {
    const metadata = lastLoad.metadata ?? {};
    const profileIndex = Number.isInteger(metadata.profileIndex) ? metadata.profileIndex : null;
    const profileName = metadata.profileName ?? (profileIndex !== null ? `Slot ${profileIndex + 1}` : "Profilo");
    const summary = metadata.filtersSummary ?? summariseFilters(metadata.filters ?? {});
    const reuseCount = state.metrics.filterProfileReuses ?? 0;
    const reuseLabel = reuseCount === 1 ? "1 riuso registrato" : `${reuseCount} riusi registrati`;
    const detail = summary && summary !== "nessun filtro attivo" ? `Filtri applicati: ${summary}.` : "";
    return {
      id: `profile-reuse-${profileIndex ?? "latest"}`,
      tone: "success",
      message: `Profilo ${profileName} richiamato (${reuseLabel}). ${detail}Verifica i Parametri per salvare nuovi preset.`,
      targetPanel: "parameters",
      targetLabel: getPanelLabel("parameters"),
      tooltip: "Apri Parametri per gestire i profili filtro.",
    };
  }

  const profiles = Array.isArray(state.filterProfiles) ? state.filterProfiles : [];
  const enriched = profiles
    .map((profile, index) => {
      if (!profile) return null;
      return { profile, index };
    })
    .filter(Boolean);
  if (!enriched.length) {
    if (filterSummary && filterSummary !== "nessun filtro attivo") {
      return {
        id: "profile-suggestion",
        tone: "info",
        message: `Salva i filtri correnti (${filterSummary}) in un profilo per riutilizzarli rapidamente.`,
        targetPanel: "parameters",
        targetLabel: getPanelLabel("parameters"),
        tooltip: "Usa il pannello Profili filtro per salvare la configurazione.",
      };
    }
    return null;
  }

  enriched.sort((a, b) => {
    const dateA = new Date(a.profile.updatedAt ?? 0).getTime();
    const dateB = new Date(b.profile.updatedAt ?? 0).getTime();
    return dateB - dateA;
  });
  const latest = enriched[0];
  const updatedAt = formatIsoToLocale(latest.profile.updatedAt);
  const updatedSuffix = updatedAt ? ` il ${updatedAt}` : "";
  return {
    id: `profile-reminder-${latest.index}`,
    tone: "info",
    message: `Profilo ${latest.profile.name ?? `Slot ${latest.index + 1}`} aggiornato${updatedSuffix}. Applicalo dai Parametri per accelerare il setup.`,
    targetPanel: "parameters",
    targetLabel: getPanelLabel("parameters"),
    tooltip: "Apri il pannello Parametri per gestire il profilo salvato.",
  };
}

function renderContextualInsights(recommendations = []) {
  const entries = Array.isArray(recommendations)
    ? recommendations.filter((entry) => entry && entry.message)
    : [];
  renderInsightList(elements.narrativeInsightList, elements.narrativeInsightEmpty, entries, { compact: true });
  renderInsightList(elements.insightsList, elements.insightsEmpty, entries, { compact: false });
}

function renderInsightList(listElement, emptyElement, entries, { compact = false } = {}) {
  if (!listElement || !emptyElement) return;
  listElement.innerHTML = "";
  if (!entries.length) {
    listElement.hidden = true;
    emptyElement.hidden = false;
    return;
  }
  listElement.hidden = false;
  emptyElement.hidden = true;

  entries.forEach((entry) => {
    const item = document.createElement("li");
    item.className = compact ? "generator-insight__item generator-insight__item--compact" : "generator-insight__item";
    if (entry.tone) {
      item.dataset.tone = entry.tone;
    }

    const text = document.createElement("p");
    text.className = "generator-insight__copy";
    text.textContent = entry.message;
    if (entry.tooltip) {
      text.title = entry.tooltip;
    }
    item.appendChild(text);

    if (entry.targetPanel) {
      const action = document.createElement("button");
      action.type = "button";
      action.className = "chip generator-insight__action";
      action.dataset.action = "focus-panel";
      action.dataset.panelId = entry.targetPanel;
      if (entry.id) {
        action.dataset.insightId = entry.id;
      }
      if (entry.targetLabel) {
        action.dataset.panelLabel = entry.targetLabel;
      }
      action.textContent = entry.targetLabel ?? getPanelLabel(entry.targetPanel) ?? "Apri";
      action.title = entry.tooltip || `Vai alla sezione ${entry.targetLabel ?? entry.targetPanel}`;
      item.appendChild(action);
    }

    listElement.appendChild(item);
  });
}

function normaliseBiomeId(value) {
  return String(value ?? "").trim().toLowerCase();
}

function canonicalBiomeCode(value) {
  const normalised = normaliseBiomeId(value).replace(/[^a-z0-9]+/g, "_");
  return normalised ? normalised.toUpperCase() : "";
}

function findCatalogBiome(biomeId) {
  const target = normaliseBiomeId(biomeId);
  if (!target) return null;
  const list = Array.isArray(state.data?.biomi) ? state.data.biomi : [];
  return list.find((entry) => normaliseBiomeId(entry.id) === target) ?? null;
}

function findBiomeLabelById(biomeId) {
  if (!biomeId) return null;
  const fromPick = (state.pick?.biomes ?? []).find(
    (biome) => normaliseBiomeId(biome?.id) === normaliseBiomeId(biomeId)
  );
  if (fromPick) {
    return fromPick.label ?? titleCase(fromPick.id ?? "bioma");
  }
  const catalog = findCatalogBiome(biomeId);
  if (catalog) {
    return catalog.label ?? titleCase(catalog.id ?? "bioma");
  }
  return null;
}

function findBiomeLabelByCode(code) {
  const canonical = canonicalBiomeCode(code);
  if (!canonical) return null;
  const list = Array.isArray(state.data?.biomi) ? state.data.biomi : [];
  const match = list.find((entry) => canonicalBiomeCode(entry.id) === canonical);
  if (match) {
    return match.label ?? titleCase(match.id ?? "bioma");
  }
  return null;
}

function findCatalogConnections(biomeId) {
  const canonical = canonicalBiomeCode(biomeId);
  if (!canonical) return [];
  const connections = Array.isArray(state.data?.ecosistema?.connessioni)
    ? state.data.ecosistema.connessioni
    : [];
  return connections.filter((connection) => canonicalBiomeCode(connection?.from) === canonical);
}

function pickStrongestConnection(biomeId) {
  const connections = findCatalogConnections(biomeId);
  if (!connections.length) return null;
  const sorted = connections.slice().sort((a, b) => {
    const resA = typeof a.resistance === "number" ? a.resistance : Number.POSITIVE_INFINITY;
    const resB = typeof b.resistance === "number" ? b.resistance : Number.POSITIVE_INFINITY;
    return resA - resB;
  });
  return sorted[0] ?? null;
}

function getPanelLabel(panelId) {
  if (!panelId) return null;
  const key = String(panelId);
  return PANEL_LABELS[key] ?? PANEL_LABELS[key.toLowerCase()] ?? null;
}

function formatIsoToLocale(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" });
}

function getActivityStorage() {
  if (storageChecked) {
    return cachedStorage;
  }
  storageChecked = true;
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      cachedStorage = null;
      return cachedStorage;
    }
    const testKey = "__generator_log_test__";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    cachedStorage = window.localStorage;
  } catch (error) {
    console.warn("LocalStorage non disponibile per il monitor del generatore", error);
    cachedStorage = null;
  }
  return cachedStorage;
}

function getPersistentStorage() {
  return getActivityStorage();
}

function clampVolume(value) {
  if (!Number.isFinite(value)) return 0.5;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function createAudioElement(src) {
  if (typeof Audio === "undefined") return null;
  try {
    const audio = new Audio(src);
    audio.preload = "auto";
    audio.volume = clampVolume(state.preferences.volume);
    return audio;
  } catch (error) {
    console.warn("Impossibile inizializzare il cue audio", error);
    return null;
  }
}

function applyAudioPreferences() {
  const muted = Boolean(state.preferences.audioMuted);
  const volume = clampVolume(state.preferences.volume);

  if (elements.audioMute) {
    elements.audioMute.classList.toggle("is-muted", muted);
    elements.audioMute.setAttribute("aria-pressed", muted ? "true" : "false");
    elements.audioMute.textContent = muted ? "🔇 Audio disattivato" : "🔈 Audio attivo";
  }

  if (elements.audioVolume) {
    const targetValue = String(Math.round(volume * 100));
    if (elements.audioVolume.value !== targetValue) {
      elements.audioVolume.value = targetValue;
    }
  }

  Object.values(AUDIO_CUES).forEach((audio) => {
    if (!audio) return;
    audio.volume = muted ? 0 : volume;
  });
}

function playAudioCue(key) {
  const audio = AUDIO_CUES[key];
  if (!audio) return;
  const volume = clampVolume(state.preferences.volume);
  if (state.preferences.audioMuted || volume <= 0) {
    if (typeof audio.pause === "function") {
      try {
        audio.pause();
      } catch (error) {
        console.warn("Impossibile mettere in pausa il cue audio", error);
      }
    }
    return;
  }
  try {
    audio.currentTime = 0;
    audio.volume = volume;
    const playback = audio.play();
    if (playback && typeof playback.catch === "function") {
      playback.catch((error) => {
        if (error && error.name !== "NotAllowedError") {
          console.warn("Riproduzione audio non riuscita", error);
        }
      });
    }
  } catch (error) {
    console.warn("Impossibile riprodurre il cue audio", key, error);
  }
}

function persistPreferences() {
  const storage = getPersistentStorage();
  if (!storage) return;
  try {
    const payload = {
      audioMuted: Boolean(state.preferences.audioMuted),
      volume: clampVolume(Number(state.preferences.volume)),
    };
    storage.setItem(STORAGE_KEYS.preferences, JSON.stringify(payload));
  } catch (error) {
    console.warn("Impossibile salvare le preferenze audio", error);
  }
}

function restorePreferences() {
  const storage = getPersistentStorage();
  if (!storage) {
    applyAudioPreferences();
    return;
  }
  try {
    const raw = storage.getItem(STORAGE_KEYS.preferences);
    if (!raw) {
      applyAudioPreferences();
      return;
    }
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      if (typeof parsed.audioMuted === "boolean") {
        state.preferences.audioMuted = parsed.audioMuted;
      }
      if (parsed.volume !== undefined) {
        state.preferences.volume = clampVolume(Number(parsed.volume));
      }
    }
  } catch (error) {
    console.warn("Impossibile ripristinare le preferenze audio", error);
  }
  applyAudioPreferences();
}

function setupAudioControls() {
  const supported = Boolean(AUDIO_CUES.rare);
  if (!supported && elements.audioControls) {
    elements.audioControls.hidden = true;
    elements.audioControls.setAttribute("aria-hidden", "true");
    return;
  }

  if (elements.audioMute) {
    elements.audioMute.addEventListener("click", (event) => {
      event.preventDefault();
      const nextMuted = !state.preferences.audioMuted;
      state.preferences.audioMuted = nextMuted;
      if (!nextMuted && clampVolume(state.preferences.volume) <= 0) {
        state.preferences.volume = 0.5;
      }
      applyAudioPreferences();
      persistPreferences();
    });
  }

  if (elements.audioVolume) {
    const handleVolume = (value) => {
      const numeric = clampVolume(Number(value) / 100);
      state.preferences.volume = numeric;
      if (numeric > 0 && state.preferences.audioMuted) {
        state.preferences.audioMuted = false;
      }
      if (numeric === 0) {
        state.preferences.audioMuted = true;
      }
      applyAudioPreferences();
    };
    elements.audioVolume.addEventListener("input", (event) => {
      handleVolume(event.target.value);
    });
    elements.audioVolume.addEventListener("change", () => {
      persistPreferences();
    });
  }

  applyAudioPreferences();
}

function persistPinnedState() {
  const storage = getPersistentStorage();
  if (!storage) return;
  try {
    const serialisable = Array.from(state.cardState.pinned.values()).map((entry) => ({
      key: entry.key,
      speciesId: entry.speciesId,
      biomeId: entry.biomeId,
      displayName: entry.displayName,
      biomeLabel: entry.biomeLabel,
      tier: entry.tier,
      rarity: entry.rarity,
      slug: entry.slug,
      synthetic: Boolean(entry.synthetic),
    }));
    storage.setItem(STORAGE_KEYS.pinned, JSON.stringify(serialisable));
  } catch (error) {
    console.warn("Impossibile salvare lo stato dei pin", error);
  }
}

function restorePinnedState() {
  const storage = getPersistentStorage();
  if (!storage) return;
  try {
    const raw = storage.getItem(STORAGE_KEYS.pinned);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;
    const store = state.cardState.pinned;
    store.clear();
    parsed.forEach((entry) => {
      if (!entry) return;
      const key = entry.key || createPinKey({ id: entry.biomeId }, { id: entry.speciesId });
      if (!key) return;
      store.set(key, {
        key,
        speciesId: entry.speciesId,
        biomeId: entry.biomeId,
        displayName: entry.displayName ?? entry.speciesId ?? "Specie",
        biomeLabel: entry.biomeLabel ?? entry.biomeId ?? "Bioma",
        tier: entry.tier ?? 1,
        rarity: entry.rarity ?? "Comune",
        slug: entry.slug ?? "common",
        synthetic: Boolean(entry.synthetic),
      });
    });
  } catch (error) {
    console.warn("Impossibile ripristinare lo stato dei pin", error);
  }
}

function persistLockState() {
  const storage = getPersistentStorage();
  if (!storage) return;
  try {
    const payload = {
      biomes: Array.from(state.cardState.locks.biomes.values()),
      species: Array.from(state.cardState.locks.species.values()),
    };
    storage.setItem(STORAGE_KEYS.locks, JSON.stringify(payload));
  } catch (error) {
    console.warn("Impossibile salvare lo stato dei lock", error);
  }
}

function restoreLockState() {
  const storage = getPersistentStorage();
  if (!storage) return;
  try {
    const raw = storage.getItem(STORAGE_KEYS.locks);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return;
    const biomeLocks = Array.isArray(parsed.biomes) ? parsed.biomes : [];
    const speciesLocks = Array.isArray(parsed.species) ? parsed.species : [];
    state.cardState.locks.biomes = new Set(biomeLocks);
    state.cardState.locks.species = new Set(speciesLocks);
  } catch (error) {
    console.warn("Impossibile ripristinare lo stato dei lock", error);
  }
}

function pruneLockState() {
  const availableBiomes = new Set((state.pick.biomes ?? []).map((biome) => biome?.id).filter(Boolean));
  state.cardState.locks.biomes = new Set(
    Array.from(state.cardState.locks.biomes ?? []).filter((id) => availableBiomes.has(id))
  );
  const availableSpecies = new Set();
  Object.entries(state.pick.species ?? {}).forEach(([biomeId, speciesList]) => {
    if (!biomeId || !Array.isArray(speciesList)) return;
    speciesList.forEach((sp) => {
      const key = createPinKey({ id: biomeId }, sp);
      availableSpecies.add(key);
    });
  });
  state.cardState.locks.species = new Set(
    Array.from(state.cardState.locks.species ?? []).filter((key) => availableSpecies.has(key))
  );
  persistLockState();
}

function ensureProfileState() {
  if (!Array.isArray(state.filterProfiles)) {
    state.filterProfiles = [];
  }
  if (state.filterProfiles.length > PROFILE_SLOT_COUNT) {
    state.filterProfiles = state.filterProfiles.slice(0, PROFILE_SLOT_COUNT);
  }
  while (state.filterProfiles.length < PROFILE_SLOT_COUNT) {
    state.filterProfiles.push(null);
  }
}

function persistFilterProfiles() {
  const storage = getPersistentStorage();
  if (!storage) return;
  ensureProfileState();
  try {
    const payload = state.filterProfiles.map((profile) => {
      if (!profile) return null;
      return {
        name: profile.name ?? null,
        filters: {
          flags: Array.isArray(profile.filters?.flags) ? profile.filters.flags : [],
          roles: Array.isArray(profile.filters?.roles) ? profile.filters.roles : [],
          tags: Array.isArray(profile.filters?.tags) ? profile.filters.tags : [],
        },
        updatedAt: profile.updatedAt ?? null,
      };
    });
    storage.setItem(STORAGE_KEYS.filterProfiles, JSON.stringify(payload));
  } catch (error) {
    console.warn("Impossibile salvare i profili filtro", error);
  }
}

function restoreFilterProfiles() {
  const storage = getPersistentStorage();
  ensureProfileState();
  if (!storage) return;
  try {
    const raw = storage.getItem(STORAGE_KEYS.filterProfiles);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;
    state.filterProfiles = parsed.slice(0, PROFILE_SLOT_COUNT).map((profile, index) => {
      if (!profile) return null;
      const filters = profile.filters ?? {};
      return {
        name: profile.name ?? `Slot ${index + 1}`,
        filters: {
          flags: Array.isArray(filters.flags) ? filters.flags : [],
          roles: Array.isArray(filters.roles) ? filters.roles : [],
          tags: Array.isArray(filters.tags) ? filters.tags : [],
        },
        updatedAt: profile.updatedAt ?? null,
      };
    });
    ensureProfileState();
  } catch (error) {
    console.warn("Impossibile ripristinare i profili filtro", error);
  }
}

function saveProfileSlot(index, filters) {
  ensureProfileState();
  if (index < 0 || index >= PROFILE_SLOT_COUNT) return;
  const existing = state.filterProfiles[index] ?? {};
  state.filterProfiles[index] = {
    name: existing.name ?? `Slot ${index + 1}`,
    filters: {
      flags: Array.isArray(filters.flags) ? [...filters.flags] : [],
      roles: Array.isArray(filters.roles) ? [...filters.roles] : [],
      tags: Array.isArray(filters.tags) ? [...filters.tags] : [],
    },
    updatedAt: new Date().toISOString(),
  };
  persistFilterProfiles();
}

function renameProfileSlot(index, name) {
  ensureProfileState();
  if (index < 0 || index >= PROFILE_SLOT_COUNT) return;
  const profile = state.filterProfiles[index];
  if (!profile) {
    state.filterProfiles[index] = {
      name: name && name.trim() ? name.trim() : `Slot ${index + 1}`,
      filters: { flags: [], roles: [], tags: [] },
      updatedAt: null,
    };
  } else {
    profile.name = name && name.trim() ? name.trim() : `Slot ${index + 1}`;
  }
  persistFilterProfiles();
}

function clearProfileSlot(index) {
  ensureProfileState();
  if (index < 0 || index >= PROFILE_SLOT_COUNT) return;
  state.filterProfiles[index] = null;
  persistFilterProfiles();
}

function persistHistoryEntries() {
  const storage = getPersistentStorage();
  if (!storage) return;
  try {
    const serialisable = state.history.map((entry) => ({
      id: entry.id,
      action: entry.action,
      label: entry.label,
      timestamp: entry.timestamp instanceof Date ? entry.timestamp.toISOString() : entry.timestamp,
      counts: entry.counts,
      filters: entry.filters,
      preview: entry.preview,
    }));
    storage.setItem(STORAGE_KEYS.history, JSON.stringify(serialisable));
  } catch (error) {
    console.warn("Impossibile salvare la cronologia del generatore", error);
  }
}

function restoreHistoryEntries() {
  const storage = getPersistentStorage();
  if (!storage) return;
  try {
    const raw = storage.getItem(STORAGE_KEYS.history);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;
    state.history = parsed.slice(0, MAX_HISTORY_ENTRIES).map((entry) => {
      if (!entry) return null;
      let timestamp = entry.timestamp ? new Date(entry.timestamp) : new Date();
      if (Number.isNaN(timestamp.getTime())) {
        timestamp = new Date();
      }
      return {
        id: entry.id ?? randomId("hist"),
        action: entry.action ?? "roll-ecos",
        label: entry.label ?? HISTORY_ACTION_LABELS[entry.action] ?? "Snapshot",
        timestamp,
        counts: entry.counts ?? { biomes: 0, species: 0, seeds: 0 },
        filters: {
          flags: Array.isArray(entry.filters?.flags) ? entry.filters.flags : [],
          roles: Array.isArray(entry.filters?.roles) ? entry.filters.roles : [],
          tags: Array.isArray(entry.filters?.tags) ? entry.filters.tags : [],
        },
        preview: {
          biomes: Array.isArray(entry.preview?.biomes) ? entry.preview.biomes : [],
          species: Array.isArray(entry.preview?.species) ? entry.preview.species : [],
        },
      };
    }).filter(Boolean);
  } catch (error) {
    console.warn("Impossibile ripristinare la cronologia del generatore", error);
  }
}

function summariseProfile(profile) {
  if (!profile?.filters) {
    return "Nessun filtro salvato";
  }
  return summariseFilters(profile.filters);
}

function renderProfileSlots() {
  const list = elements.profileSlots;
  if (!list) return;
  ensureProfileState();
  list.innerHTML = "";
  const hasProfiles = state.filterProfiles.some((profile) => Boolean(profile));
  if (elements.profileEmpty) {
    elements.profileEmpty.hidden = hasProfiles;
  }
  list.hidden = !state.filterProfiles.length;
  if (elements.profilePanel) {
    elements.profilePanel.dataset.hasProfiles = hasProfiles ? "true" : "false";
  }

  state.filterProfiles.forEach((profile, index) => {
    const item = document.createElement("li");
    item.className = "generator-profiles__slot";
    item.dataset.slotIndex = String(index);

    const header = document.createElement("div");
    header.className = "generator-profiles__slot-header";
    const name = document.createElement("h4");
    name.className = "generator-profiles__slot-name";
    name.textContent = profile?.name ?? `Slot ${index + 1}`;
    header.appendChild(name);

    const actions = document.createElement("div");
    actions.className = "generator-profiles__slot-actions";

    const load = document.createElement("button");
    load.type = "button";
    load.className = "generator-profiles__action";
    load.dataset.action = "profile-load";
    load.dataset.slotIndex = String(index);
    load.textContent = "Applica";
    actions.appendChild(load);

    const save = document.createElement("button");
    save.type = "button";
    save.className = "generator-profiles__action";
    save.dataset.action = "profile-save";
    save.dataset.slotIndex = String(index);
    save.textContent = "Salva";
    actions.appendChild(save);

    const rename = document.createElement("button");
    rename.type = "button";
    rename.className = "generator-profiles__action";
    rename.dataset.action = "profile-rename";
    rename.dataset.slotIndex = String(index);
    rename.textContent = "Rinomina";
    actions.appendChild(rename);

    const clear = document.createElement("button");
    clear.type = "button";
    clear.className = "generator-profiles__action";
    clear.dataset.action = "profile-clear";
    clear.dataset.slotIndex = String(index);
    clear.textContent = "Svuota";
    actions.appendChild(clear);

    header.appendChild(actions);
    item.appendChild(header);

    const summary = document.createElement("p");
    summary.className = "generator-profiles__summary";
    summary.textContent = summariseProfile(profile);
    item.appendChild(summary);

    if (profile?.updatedAt) {
      const time = document.createElement("time");
      time.className = "generator-profiles__timestamp";
      const ts = new Date(profile.updatedAt);
      if (!Number.isNaN(ts.getTime())) {
        time.dateTime = ts.toISOString();
        time.textContent = ts.toLocaleString("it-IT", {
          hour: "2-digit",
          minute: "2-digit",
          day: "2-digit",
          month: "2-digit",
        });
      } else {
        time.textContent = "Ultimo aggiornamento sconosciuto";
      }
      item.appendChild(time);
    }

    list.appendChild(item);
  });
}

function attachProfileHandlers() {
  const panel = elements.profilePanel;
  if (!panel) return;
  panel.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const button = target.closest("[data-action]");
    if (!(button instanceof HTMLElement)) return;
    const { action, slotIndex } = button.dataset;
    if (!action) return;
    if (action === "profile-clear-all") {
      state.filterProfiles = new Array(PROFILE_SLOT_COUNT).fill(null);
      persistFilterProfiles();
      renderProfileSlots();
      setStatus("Profili filtro azzerati.", "info", {
        tags: ["profili", "reset"],
        action: "profiles-reset",
      });
      return;
    }
    const index = Number.parseInt(slotIndex ?? "", 10);
    if (!Number.isInteger(index) || index < 0 || index >= PROFILE_SLOT_COUNT) {
      return;
    }
    switch (action) {
      case "profile-save": {
        const filters = currentFilters();
        saveProfileSlot(index, filters);
        renderProfileSlots();
        const savedProfile = state.filterProfiles[index];
        const summary = summariseFilters(savedProfile?.filters ?? filters ?? {});
        setStatus(`Filtri salvati nel profilo ${index + 1}.`, "success", {
          tags: ["profili", "salvataggio"],
          action: "profile-save",
          metadata: {
            profileIndex: index,
            profileName: savedProfile?.name ?? `Slot ${index + 1}`,
            filtersSummary: summary,
            filters: savedProfile?.filters ?? filters,
          },
        });
        break;
      }
      case "profile-load": {
        const profile = state.filterProfiles[index];
        if (!profile) {
          setStatus("Nessun profilo salvato in questo slot.", "warn", {
            tags: ["profili", "vuoto"],
            action: "profile-empty",
          });
          break;
        }
        applyFiltersToForm(profile.filters);
        const summary = summariseFilters(profile.filters ?? {});
        setStatus(`Filtri applicati dal profilo ${profile.name ?? index + 1}.`, "info", {
          tags: ["profili", "applica"],
          action: "profile-load",
          metadata: {
            profileIndex: index,
            profileName: profile.name ?? `Slot ${index + 1}`,
            filtersSummary: summary,
            filters: profile.filters,
          },
        });
        break;
      }
      case "profile-rename": {
        const currentName = state.filterProfiles[index]?.name ?? `Slot ${index + 1}`;
        const name = typeof window !== "undefined" ? window.prompt("Nuovo nome profilo", currentName) : currentName;
        if (name === null) {
          break;
        }
        renameProfileSlot(index, name);
        renderProfileSlots();
        setStatus("Nome profilo aggiornato.", "success", {
          tags: ["profili", "rinomina"],
          action: "profile-rename",
          metadata: {
            profileIndex: index,
            profileName: name,
          },
        });
        break;
      }
      case "profile-clear": {
        clearProfileSlot(index);
        renderProfileSlots();
        setStatus("Profilo liberato.", "info", {
          tags: ["profili", "clear"],
          action: "profile-clear",
        });
        break;
      }
      default:
        break;
    }
  });
}

function attachInsightHandlers() {
  const panels = [elements.insightsPanel, elements.narrativeInsightPanel];
  panels.forEach((panel) => {
    if (!panel) return;
    panel.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const button = target.closest("[data-action=\"focus-panel\"]");
      if (!(button instanceof HTMLElement)) return;
      event.preventDefault();
      const panelId = button.dataset.panelId;
      if (!panelId) return;
      if (anchorState.descriptorsById.has(panelId)) {
        setActiveSection(panelId, { updateHash: true });
        scrollToPanel(panelId);
      }
      const label = button.dataset.panelLabel ?? getPanelLabel(panelId) ?? panelId;
      setStatus(`Navigazione rapida: ${label}.`, "info", {
        tags: ["insight", "navigazione"],
        action: "insight-navigate",
        metadata: {
          panelId,
          insightId: button.dataset.insightId ?? null,
        },
      });
    });
  });
}

function formatHistoryTimestamp(date) {
  const ts = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(ts.getTime())) {
    return "Data sconosciuta";
  }
  return ts.toLocaleString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
}

function renderHistoryPanel() {
  const list = elements.historyList;
  if (!list) return;
  const entries = state.history ?? [];
  list.innerHTML = "";
  const hasEntries = entries.length > 0;
  list.hidden = !hasEntries;
  if (elements.historyEmpty) {
    elements.historyEmpty.hidden = hasEntries;
  }
  if (elements.historyPanel) {
    elements.historyPanel.dataset.hasEntries = hasEntries ? "true" : "false";
  }
  if (elements.summaryContainer) {
    elements.summaryContainer.dataset.hasHistory = hasEntries ? "true" : "false";
  }
  if (!hasEntries) {
    renderFlowMap();
    return;
  }

  const appendChips = (container, values, limit) => {
    const entries = Array.isArray(values) ? values : [];
    if (!entries.length) {
      const placeholder = document.createElement("span");
      placeholder.className = "chip chip--compact";
      placeholder.textContent = "—";
      container.appendChild(placeholder);
      return;
    }
    entries.slice(0, limit).forEach((label) => {
      const chip = document.createElement("span");
      chip.className = "chip chip--compact";
      chip.textContent = label;
      container.appendChild(chip);
    });
    if (entries.length > limit) {
      const remainder = document.createElement("span");
      remainder.className = "chip chip--compact";
      remainder.textContent = `+${entries.length - limit}`;
      container.appendChild(remainder);
    }
  };

  entries.forEach((entry) => {
    const item = document.createElement("li");
    item.className = "generator-history__entry";
    item.dataset.historyId = entry.id;

    const header = document.createElement("div");
    header.className = "generator-history__entry-header";
    const title = document.createElement("h4");
    title.className = "generator-history__entry-title";
    title.textContent = entry.label ?? HISTORY_ACTION_LABELS[entry.action] ?? "Snapshot";
    header.appendChild(title);

    if (entry.timestamp) {
      const time = document.createElement("time");
      time.className = "generator-history__entry-time";
      const ts = entry.timestamp instanceof Date ? entry.timestamp : new Date(entry.timestamp);
      if (!Number.isNaN(ts.getTime())) {
        time.dateTime = ts.toISOString();
        time.textContent = formatHistoryTimestamp(ts);
      }
      header.appendChild(time);
    }

    item.appendChild(header);

    const metrics = document.createElement("dl");
    metrics.className = "generator-history__metrics";
    const metricEntries = [
      { label: "Biomi", value: entry.counts?.biomes ?? 0 },
      { label: "Specie", value: entry.counts?.species ?? 0 },
      { label: "Seed", value: entry.counts?.seeds ?? 0 },
    ];
    metricEntries.forEach((metric) => {
      const block = document.createElement("div");
      block.className = "generator-history__metric";
      const dt = document.createElement("dt");
      dt.textContent = metric.label;
      const dd = document.createElement("dd");
      dd.textContent = String(metric.value ?? 0);
      block.appendChild(dt);
      block.appendChild(dd);
      metrics.appendChild(block);
    });
    item.appendChild(metrics);

    const preview = document.createElement("div");
    preview.className = "generator-history__preview";
    const biomePreview = document.createElement("div");
    biomePreview.className = "generator-history__preview-group";
    const biomeLabel = document.createElement("p");
    biomeLabel.className = "generator-history__preview-label";
    biomeLabel.textContent = "Biomi";
    biomePreview.appendChild(biomeLabel);
    const biomeChips = document.createElement("div");
    biomeChips.className = "generator-history__chips";
    appendChips(biomeChips, entry.preview?.biomes ?? [], 4);
    biomePreview.appendChild(biomeChips);
    preview.appendChild(biomePreview);

    const speciesPreview = document.createElement("div");
    speciesPreview.className = "generator-history__preview-group";
    const speciesLabel = document.createElement("p");
    speciesLabel.className = "generator-history__preview-label";
    speciesLabel.textContent = "Specie";
    speciesPreview.appendChild(speciesLabel);
    const speciesChips = document.createElement("div");
    speciesChips.className = "generator-history__chips";
    appendChips(speciesChips, entry.preview?.species ?? [], 5);
    speciesPreview.appendChild(speciesChips);
    preview.appendChild(speciesPreview);

    item.appendChild(preview);

    const entryActions = document.createElement("div");
    entryActions.className = "generator-history__entry-actions";
    const applyButton = document.createElement("button");
    applyButton.type = "button";
    applyButton.className = "generator-history__action";
    applyButton.dataset.action = "history-apply";
    applyButton.dataset.historyId = entry.id;
    applyButton.textContent = "Applica filtri";
    entryActions.appendChild(applyButton);

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "generator-history__action";
    removeButton.dataset.action = "history-remove";
    removeButton.dataset.historyId = entry.id;
    removeButton.textContent = "Rimuovi";
    entryActions.appendChild(removeButton);

    item.appendChild(entryActions);
    list.appendChild(item);
  });

  renderFlowMap();
}

function getHistoryEntry(historyId) {
  return (state.history ?? []).find((entry) => entry.id === historyId) ?? null;
}

function applyHistoryEntry(historyId) {
  const entry = getHistoryEntry(historyId);
  if (!entry) {
    setStatus("Nessuna voce di cronologia trovata.", "warn", {
      tags: ["history", "missing"],
      action: "history-missing",
    });
    return;
  }
  applyFiltersToForm(entry.filters);
  setStatus(`Filtri applicati dalla cronologia (${entry.label}).`, "info", {
    tags: ["history", "apply"],
    action: "history-apply",
  });
}

function removeHistoryEntry(historyId) {
  const next = (state.history ?? []).filter((entry) => entry.id !== historyId);
  if (next.length === state.history.length) {
    return;
  }
  state.history = next;
  persistHistoryEntries();
  renderHistoryPanel();
}

function clearHistoryEntries() {
  state.history = [];
  persistHistoryEntries();
  renderHistoryPanel();
}

function attachHistoryHandlers() {
  const panel = elements.historyPanel;
  if (!panel) return;
  panel.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const button = target.closest("[data-action]");
    if (!(button instanceof HTMLElement)) return;
    const { action, historyId } = button.dataset;
    if (!action) return;
    switch (action) {
      case "history-apply":
        if (historyId) {
          applyHistoryEntry(historyId);
        }
        break;
      case "history-remove":
        if (historyId) {
          removeHistoryEntry(historyId);
          setStatus("Voce di cronologia rimossa.", "info", {
            tags: ["history", "remove"],
            action: "history-remove",
          });
        }
        break;
      case "history-clear":
        clearHistoryEntries();
        setStatus("Cronologia del generatore svuotata.", "info", {
          tags: ["history", "clear"],
          action: "history-clear",
        });
        break;
      default:
        break;
    }
  });
}

function recordHistoryEntry(action, filters) {
  if (!ROLL_ACTIONS.has(action)) {
    return;
  }
  const counts = calculatePickMetrics();
  if ((counts.biomeCount ?? 0) === 0 && (counts.speciesCount ?? 0) === 0 && (counts.seedCount ?? 0) === 0) {
    return;
  }
  const timestamp = new Date();
  const biomePreview = state.pick.biomes.slice(0, 4).map((biome) => biome?.label ?? titleCase(biome?.id ?? ""));
  const speciesPreview = [];
  state.pick.biomes.forEach((biome) => {
    const speciesList = state.pick.species?.[biome.id] ?? [];
    speciesList.forEach((sp) => {
      if (speciesPreview.length >= 8) return;
      speciesPreview.push(sp?.display_name ?? sp?.id ?? biome.id ?? "Specie");
    });
  });
  const entry = {
    id: randomId("hist"),
    action,
    label: HISTORY_ACTION_LABELS[action] ?? "Snapshot",
    timestamp,
    counts: {
      biomes: counts.biomeCount ?? 0,
      species: counts.speciesCount ?? 0,
      seeds: counts.seedCount ?? 0,
    },
    filters: {
      flags: Array.isArray(filters?.flags) ? [...filters.flags] : [],
      roles: Array.isArray(filters?.roles) ? [...filters.roles] : [],
      tags: Array.isArray(filters?.tags) ? [...filters.tags] : [],
    },
    preview: {
      biomes: biomePreview,
      species: speciesPreview,
    },
  };
  state.history = [entry, ...state.history.filter((existing) => existing.id !== entry.id)].slice(0, MAX_HISTORY_ENTRIES);
  persistHistoryEntries();
  renderHistoryPanel();
}

function normaliseTagId(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function createTagEntry(tag) {
  if (tag && typeof tag === "object") {
    const labelCandidate =
      tag.label ?? tag.name ?? tag.title ?? tag.text ?? tag.value ?? tag.id ?? "";
    const label = String(labelCandidate || "").trim();
    if (!label) {
      return null;
    }
    const idCandidate = tag.id ?? tag.value ?? normaliseTagId(label);
    const id = normaliseTagId(idCandidate || label) || normaliseTagId(label) || randomId("tag");
    return { id: id || randomId("tag"), label };
  }
  const label = String(tag ?? "").trim();
  if (!label) {
    return null;
  }
  const id = normaliseTagId(label) || randomId("tag");
  return { id, label };
}

function toIsoTimestamp(value) {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (value === null || value === undefined || value === "") {
    return new Date().toISOString();
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }
  return date.toISOString();
}

function serialiseActivityLogEntry(entry) {
  if (!entry) return null;
  const tags = Array.isArray(entry.tags)
    ? entry.tags
        .map((tag) => {
          if (!tag) return null;
          if (typeof tag === "object") {
            const id = tag.id ?? tag.value ?? null;
            const label = tag.label ?? tag.name ?? tag.value ?? tag.id ?? null;
            if (!id && !label) return null;
            return {
              id: id ?? (label ? normaliseTagId(label) || null : null),
              label: label ?? (id ? String(id) : ""),
            };
          }
          const label = String(tag ?? "").trim();
          if (!label) return null;
          return { id: normaliseTagId(label) || null, label };
        })
        .filter(Boolean)
    : [];

  return {
    id: entry.id ?? null,
    message: entry.message ?? "",
    tone: entry.tone ?? "info",
    timestamp: toIsoTimestamp(entry.timestamp),
    tags,
    action: entry.action ?? null,
    pinned: Boolean(entry.pinned),
    metadata: entry.metadata ?? null,
  };
}

function trimActivityLog() {
  if (!Array.isArray(state.activityLog)) {
    state.activityLog = [];
    return;
  }
  state.activityLog.sort((a, b) => {
    const aTime = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
    const bTime = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime();
    return bTime - aTime;
  });
  if (state.activityLog.length <= MAX_ACTIVITY_EVENTS) {
    return;
  }
  for (let i = state.activityLog.length - 1; i >= 0 && state.activityLog.length > MAX_ACTIVITY_EVENTS; i -= 1) {
    const entry = state.activityLog[i];
    if (!entry?.pinned) {
      state.activityLog.splice(i, 1);
    }
  }
  if (state.activityLog.length > MAX_ACTIVITY_EVENTS) {
    state.activityLog = state.activityLog.slice(0, MAX_ACTIVITY_EVENTS);
  }
}

function persistActivityLog() {
  const storage = getActivityStorage();
  if (!storage) return;
  try {
    const serialisable = state.activityLog
      .map(serialiseActivityLogEntry)
      .filter(Boolean)
      .map((entry) => ({
        ...entry,
        timestamp: entry.timestamp,
      }));
    storage.setItem(STORAGE_KEYS.activityLog, JSON.stringify(serialisable));
  } catch (error) {
    console.warn("Impossibile salvare il registro attività", error);
  }
}

function restoreActivityLog() {
  const storage = getActivityStorage();
  if (!storage) return;
  try {
    const raw = storage.getItem(STORAGE_KEYS.activityLog);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;
    const restored = parsed
      .map((entry) => {
        if (!entry?.message) return null;
        const timestamp = entry.timestamp ? new Date(entry.timestamp) : new Date();
        if (Number.isNaN(timestamp.getTime())) {
          return null;
        }
        const tagEntries = Array.isArray(entry.tags)
          ? entry.tags
              .map((tag) => {
                if (!tag) return null;
                if (typeof tag === "object") {
                  const label = tag.label ?? tag.name ?? tag.id ?? tag.value ?? "";
                  return createTagEntry({ id: tag.id ?? tag.value, label });
                }
                return createTagEntry(tag);
              })
              .filter(Boolean)
          : [];
        const dedupedTags = [];
        const seen = new Set();
        tagEntries.forEach((tag) => {
          if (!tag?.id || seen.has(tag.id)) return;
          seen.add(tag.id);
          dedupedTags.push(tag);
        });
        return {
          id: entry.id ?? randomId("event"),
          message: entry.message,
          tone: entry.tone ?? "info",
          timestamp,
          tags: dedupedTags,
          action: entry.action ?? null,
          pinned: Boolean(entry.pinned),
          metadata: entry.metadata ?? null,
        };
      })
      .filter(Boolean);
    state.activityLog = restored.sort((a, b) => b.timestamp - a.timestamp);
    trimActivityLog();
    updateActivityTagRegistry();
    recalculateActivityMetrics();
  } catch (error) {
    console.warn("Impossibile ripristinare il registro attività", error);
  }
}

function activityFiltersActive() {
  const filters = state.activityFilters ?? {};
  if (filters.query?.trim()) return true;
  if (filters.pinnedOnly) return true;
  if (filters.tags instanceof Set && filters.tags.size) return true;
  if (filters.tones instanceof Set && filters.tones.size !== DEFAULT_ACTIVITY_TONES.length) return true;
  return false;
}

function renderActivityTagFilters() {
  const select = elements.activityTagFilter;
  if (!select) return;
  const entries = Array.from(state.activityTagCounts.entries()).sort((a, b) =>
    a[1].label.localeCompare(b[1].label, "it", { sensitivity: "base" })
  );
  const selected = state.activityFilters.tags ?? new Set();
  select.innerHTML = "";
  if (!entries.length) {
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Nessun tag registrato";
    placeholder.disabled = true;
    select.appendChild(placeholder);
    select.disabled = true;
    return;
  }
  select.disabled = false;
  entries.forEach(([id, info]) => {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = info.count > 1 ? `${info.label} (${info.count})` : info.label;
    option.selected = selected instanceof Set ? selected.has(id) : false;
    select.appendChild(option);
  });
}

function buildActivityHaystack(entry) {
  const parts = [entry.message, entry.action];

  (entry.tags ?? []).forEach((tag) => {
    if (tag?.label) {
      parts.push(tag.label);
    }
  });

  const metadata = entry.metadata;
  if (metadata !== null && metadata !== undefined) {
    collectMetadataText(metadata, parts);
  }

  return parts
    .filter((value) => value !== null && value !== undefined && value !== "")
    .join(" ")
    .toLowerCase();
}

function collectMetadataText(source, parts) {
  if (source === null || source === undefined) {
    return;
  }
  if (typeof source === "string" || typeof source === "number" || typeof source === "boolean") {
    parts.push(String(source));
    return;
  }
  if (Array.isArray(source)) {
    source.forEach((item) => collectMetadataText(item, parts));
    return;
  }
  if (typeof source === "object") {
    Object.values(source).forEach((value) => collectMetadataText(value, parts));
  }
}

function updateActivityTagRegistry() {
  const registry = new Map();
  (state.activityLog ?? []).forEach((entry) => {
    (entry.tags ?? []).forEach((tag) => {
      if (!tag?.id) return;
      const existing = registry.get(tag.id) ?? { label: tag.label ?? tag.id, count: 0 };
      existing.label = tag.label ?? existing.label;
      existing.count += 1;
      registry.set(tag.id, existing);
    });
  });
  state.activityTagCounts = registry;
  renderActivityTagFilters();
  syncActivityControls();
}

function recordActivity(message, tone = "info", timestamp = new Date(), options = {}) {
  if (!message) return;
  const ts = timestamp instanceof Date ? timestamp : new Date(timestamp);
  const safeTimestamp = Number.isNaN(ts.getTime()) ? new Date() : ts;
  const providedTags = Array.isArray(options.tags) ? options.tags : [];
  const processedTags = [];
  const seen = new Set();
  providedTags.forEach((tag) => {
    const entry = createTagEntry(tag);
    if (!entry || !entry.id || seen.has(entry.id)) return;
    seen.add(entry.id);
    processedTags.push(entry);
  });
  const activityEntry = {
    id: options.id ?? randomId("event"),
    message,
    tone,
    timestamp: safeTimestamp,
    tags: processedTags,
    action: options.action ?? null,
    pinned: Boolean(options.pinned),
    metadata: options.metadata ?? null,
  };
  state.activityLog.unshift(activityEntry);
  trimActivityLog();
  updateActivityTagRegistry();
  recalculateActivityMetrics();
  persistActivityLog();
  renderActivityLog();
}

function recalculateActivityMetrics() {
  const entries = Array.isArray(state.activityLog) ? state.activityLog : [];
  const rollTimestamps = entries
    .filter((entry) => (entry?.action ? ROLL_ACTIONS.has(entry.action) : false))
    .map((entry) => {
      const stamp = entry.timestamp instanceof Date ? entry.timestamp : new Date(entry.timestamp);
      const value = stamp instanceof Date ? stamp.getTime() : Number.NaN;
      return Number.isNaN(value) ? null : value;
    })
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);
  if (rollTimestamps.length >= 2) {
    let total = 0;
    for (let i = 1; i < rollTimestamps.length; i += 1) {
      total += rollTimestamps[i] - rollTimestamps[i - 1];
    }
    state.metrics.averageRollIntervalMs = total / (rollTimestamps.length - 1);
  } else {
    state.metrics.averageRollIntervalMs = null;
  }

  let rerollCount = 0;
  let profileReuses = 0;
  entries.forEach((entry) => {
    if (entry?.action && REROLL_ACTIONS.has(entry.action)) {
      rerollCount += 1;
    }
    if (entry?.action === "profile-load") {
      profileReuses += 1;
    }
  });
  state.metrics.rerollCount = rerollCount;
  state.metrics.filterProfileReuses = profileReuses;
  renderKpiSidebar();
}

function formatAverageRollInterval(ms) {
  if (!Number.isFinite(ms) || ms <= 0) {
    return "—";
  }
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);
  const parts = [];
  if (hours) {
    parts.push(`${hours}h`);
  }
  if (minutes) {
    parts.push(`${minutes}m`);
  }
  if (!hours && seconds) {
    parts.push(`${seconds}s`);
  }
  if (!parts.length) {
    return `${totalMinutes}m`;
  }
  return parts.join(" ");
}

function renderKpiSidebar() {
  if (elements.kpi?.averageRoll) {
    elements.kpi.averageRoll.textContent = formatAverageRollInterval(
      state.metrics.averageRollIntervalMs
    );
  }
  if (elements.kpi?.rerollCount) {
    elements.kpi.rerollCount.textContent = String(state.metrics.rerollCount ?? 0);
  }
  if (elements.kpi?.uniqueSpecies) {
    elements.kpi.uniqueSpecies.textContent = String(state.metrics.uniqueSpecies ?? 0);
  }
  if (elements.kpi?.profileReuses) {
    elements.kpi.profileReuses.textContent = String(state.metrics.filterProfileReuses ?? 0);
  }
}

function renderActivityLog() {
  const list = elements.logList;
  const empty = elements.logEmpty;
  if (!list) return;

  list.innerHTML = "";
  const entries = Array.isArray(state.activityLog) ? state.activityLog : [];
  const filters = state.activityFilters ?? {};
  const toneFilterActive = filters.tones instanceof Set;
  const toneSet = toneFilterActive ? filters.tones : new Set(DEFAULT_ACTIVITY_TONES);
  const tagSet = filters.tags instanceof Set ? filters.tags : new Set();
  const query = String(filters.query ?? "").trim().toLowerCase();
  const pinnedOnly = Boolean(filters.pinnedOnly);

  const filtered = entries.filter((entry) => {
    const tone = entry.tone ?? "info";
    if (toneFilterActive) {
      if (!toneSet.size) {
        return false;
      }
      if (!toneSet.has(tone)) {
        return false;
      }
    }
    if (pinnedOnly && !entry.pinned) {
      return false;
    }
    if (tagSet.size) {
      const tagIds = (entry.tags ?? []).map((tag) => tag.id);
      const hasTag = tagIds.some((id) => tagSet.has(id));
      if (!hasTag) {
        return false;
      }
    }
    if (query) {
      const haystack = buildActivityHaystack(entry);
      if (!haystack.includes(query)) {
        return false;
      }
    }
    return true;
  });

  const hasEntries = filtered.length > 0;
  list.hidden = !hasEntries;
  if (empty) {
    empty.hidden = hasEntries;
    empty.textContent = hasEntries || !activityFiltersActive()
      ? "Nessuna attività registrata."
      : "Nessun evento corrisponde ai filtri.";
  }

  if (!hasEntries) {
    return;
  }

  filtered.forEach((entry) => {
    const item = document.createElement("li");
    item.className = "generator-timeline__item";
    item.dataset.tone = entry.tone ?? "info";
    item.dataset.pinned = entry.pinned ? "true" : "false";

    const marker = document.createElement("div");
    marker.className = "generator-timeline__marker";
    marker.setAttribute("aria-hidden", "true");
    item.appendChild(marker);

    const content = document.createElement("div");
    content.className = "generator-timeline__content";
    item.appendChild(content);

    const header = document.createElement("header");
    header.className = "generator-timeline__header";
    content.appendChild(header);

    const time = document.createElement("time");
    time.className = "generator-timeline__time";
    const stamp = entry.timestamp instanceof Date ? entry.timestamp : new Date(entry.timestamp);
    const safeStamp = Number.isNaN(stamp.getTime()) ? new Date() : stamp;
    time.dateTime = safeStamp.toISOString();
    time.textContent = safeStamp.toLocaleString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
    });
    time.title = safeStamp.toLocaleString("it-IT");
    header.appendChild(time);

    const controls = document.createElement("div");
    controls.className = "generator-timeline__controls";
    header.appendChild(controls);

    const toneBadge = document.createElement("span");
    toneBadge.className = `generator-timeline__tone generator-timeline__tone--${entry.tone ?? "info"}`;
    toneBadge.textContent = TONE_LABELS[entry.tone ?? "info"] ?? titleCase(entry.tone ?? "info");
    controls.appendChild(toneBadge);

    const pinButton = document.createElement("button");
    pinButton.type = "button";
    pinButton.className = "generator-timeline__pin";
    pinButton.dataset.action = "toggle-activity-pin";
    pinButton.dataset.eventId = entry.id;
    pinButton.setAttribute("aria-pressed", entry.pinned ? "true" : "false");
    pinButton.title = entry.pinned ? "Rimuovi pin evento" : "Pin evento";
    pinButton.textContent = entry.pinned ? "📌" : "📍";
    controls.appendChild(pinButton);

    if (entry.action) {
      const meta = document.createElement("p");
      meta.className = "generator-timeline__meta";
      meta.textContent = titleCase(entry.action.replace(/[-_]/g, " "));
      content.appendChild(meta);
    }

    const messageText = document.createElement("p");
    messageText.className = "generator-timeline__message";
    messageText.textContent = entry.message;
    content.appendChild(messageText);

    if (entry.tags?.length) {
      const tagsContainer = document.createElement("div");
      tagsContainer.className = "chip-list chip-list--compact generator-timeline__tags";
      entry.tags.forEach((tag) => {
        if (!tag?.label) return;
        const chip = document.createElement("span");
        chip.className = "chip";
        chip.dataset.tagId = tag.id;
        chip.textContent = tag.label;
        tagsContainer.appendChild(chip);
      });
      if (tagsContainer.childElementCount) {
        content.appendChild(tagsContainer);
      }
    }

    list.appendChild(item);
  });
}

function toggleActivityPin(eventId) {
  if (!eventId) return;
  const entry = state.activityLog.find((item) => item.id === eventId);
  if (!entry) return;
  entry.pinned = !entry.pinned;
  trimActivityLog();
  persistActivityLog();
  renderActivityLog();
}

function resetActivityFilters() {
  state.activityFilters.query = "";
  state.activityFilters.pinnedOnly = false;
  state.activityFilters.tags = new Set();
  state.activityFilters.tones = new Set(DEFAULT_ACTIVITY_TONES);
  syncActivityControls();
  renderActivityLog();
}

function syncActivityControls() {
  if (elements.activitySearch) {
    elements.activitySearch.value = state.activityFilters.query ?? "";
  }
  if (elements.activityPinnedOnly) {
    elements.activityPinnedOnly.checked = Boolean(state.activityFilters.pinnedOnly);
  }
  if (Array.isArray(elements.activityToneToggles)) {
    elements.activityToneToggles.forEach((toggle) => {
      if (!(toggle instanceof HTMLInputElement)) return;
      const tone = toggle.value || toggle.dataset.activityTone;
      if (!tone) return;
      if (!(state.activityFilters.tones instanceof Set)) {
        state.activityFilters.tones = new Set(DEFAULT_ACTIVITY_TONES);
      }
      toggle.checked = state.activityFilters.tones.has(tone);
    });
  }
  if (elements.activityTagFilter) {
    const selected = state.activityFilters.tags ?? new Set();
    Array.from(elements.activityTagFilter.options).forEach((option) => {
      option.selected = selected instanceof Set ? selected.has(option.value) : false;
    });
  }
}

function setupActivityControls() {
  if (elements.activitySearch) {
    elements.activitySearch.addEventListener("input", (event) => {
      state.activityFilters.query = String(event.target.value ?? "");
      renderActivityLog();
    });
  }

  if (elements.activityTagFilter) {
    elements.activityTagFilter.addEventListener("change", () => {
      const values = new Set(getSelectedValues(elements.activityTagFilter));
      state.activityFilters.tags = values;
      renderActivityLog();
    });
  }

  if (elements.activityPinnedOnly) {
    elements.activityPinnedOnly.addEventListener("change", (event) => {
      state.activityFilters.pinnedOnly = Boolean(event.target.checked);
      renderActivityLog();
    });
  }

  if (Array.isArray(elements.activityToneToggles)) {
    elements.activityToneToggles.forEach((toggle) => {
      if (!(toggle instanceof HTMLInputElement)) return;
      toggle.addEventListener("change", (event) => {
        const tone = event.target.value || event.target.dataset.activityTone;
        if (!tone) return;
        if (!(state.activityFilters.tones instanceof Set)) {
          state.activityFilters.tones = new Set(DEFAULT_ACTIVITY_TONES);
        }
        if (event.target.checked) {
          state.activityFilters.tones.add(tone);
        } else {
          state.activityFilters.tones.delete(tone);
        }
        renderActivityLog();
      });
    });
  }

  if (elements.activityReset) {
    elements.activityReset.addEventListener("click", (event) => {
      event.preventDefault();
      resetActivityFilters();
    });
  }

  if (elements.logList) {
    elements.logList.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const button = target.closest("[data-action=\"toggle-activity-pin\"]");
      if (!button) return;
      event.preventDefault();
      const { eventId } = button.dataset;
      if (!eventId) return;
      toggleActivityPin(eventId);
    });
  }

  syncActivityControls();
}

function refreshExportSupportTelemetry() {
  const hasPdfSupport = typeof window !== "undefined" && typeof window.html2pdf !== "undefined";
  const wasNotified = state.exportState.pdfSupportNotified;
  state.exportState.pdfSupported = hasPdfSupport;

  if (!hasPdfSupport) {
    if (!wasNotified) {
      console.warn("html2pdf non è disponibile: esportazione PDF disabilitata.");
      recordActivity(
        "Libreria html2pdf non caricata: esportazione PDF disabilitata.",
        "warn",
        new Date(),
        {
          tags: ["export", "dossier", "pdf", "missing"],
          action: "export-pdf-missing",
        }
      );
      state.exportState.pdfSupportNotified = true;
    }
  } else if (wasNotified) {
    state.exportState.pdfSupportNotified = false;
  }

  return hasPdfSupport;
}

function ensureExportSlug() {
  if (state.pick.exportSlug) {
    return state.pick.exportSlug;
  }
  const base = state.pick.ecosystem?.id || randomId("ecos");
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const slug = slugify(`${base}-${stamp}`);
  state.pick.exportSlug = slug || randomId("ecos");
  return state.pick.exportSlug;
}

function renderExportPreview(payload) {
  const container = elements.exportPreview;
  const empty = elements.exportPreviewEmpty;
  if (!container || !empty) return;

  const hasPayload = Boolean(payload);
  container.hidden = !hasPayload;
  empty.hidden = hasPayload;

  if (!hasPayload) {
    if (elements.exportPreviewJson) elements.exportPreviewJson.textContent = "";
    if (elements.exportPreviewYaml) elements.exportPreviewYaml.textContent = "";
    if (elements.exportPreviewJsonDetails) elements.exportPreviewJsonDetails.open = false;
    if (elements.exportPreviewYamlDetails) elements.exportPreviewYamlDetails.open = false;
    return;
  }

  const jsonDetails = elements.exportPreviewJsonDetails;
  const yamlDetails = elements.exportPreviewYamlDetails;
  const jsonWasOpen = Boolean(jsonDetails?.open);
  const yamlWasOpen = Boolean(yamlDetails?.open);

  if (elements.exportPreviewJson) {
    elements.exportPreviewJson.textContent = JSON.stringify(payload, null, 2);
  }
  if (elements.exportPreviewYaml) {
    elements.exportPreviewYaml.textContent = toYAML(payload);
  }

  if (jsonDetails) jsonDetails.open = jsonWasOpen;
  if (yamlDetails) yamlDetails.open = yamlWasOpen;
}

function updateExportPresetStatus(message = "", tone = "info") {
  const hint = elements.exportPresetStatus;
  if (!hint) return;
  if (message) {
    hint.textContent = message;
    hint.dataset.tone = tone;
    hint.hidden = false;
  } else {
    hint.textContent = "";
    hint.hidden = true;
    delete hint.dataset.tone;
  }
}

function populateExportPresetOptions() {
  const select = elements.exportPreset;
  if (!select) return;
  const wasFocused = document.activeElement === select;
  select.innerHTML = "";
  MANIFEST_PRESETS.forEach((preset) => {
    const option = document.createElement("option");
    option.value = preset.id;
    option.textContent = preset.label;
    select.appendChild(option);
  });
  if (!MANIFEST_PRESETS.length) {
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Nessun preset disponibile";
    placeholder.disabled = true;
    placeholder.selected = true;
    select.appendChild(placeholder);
    select.disabled = true;
    select.setAttribute("aria-disabled", "true");
    updateExportPresetStatus(
      "Nessun preset manifest configurato. Verifica il pacchetto o carica manualmente i preset.",
      "warn"
    );
    return;
  }
  const current = getCurrentPreset();
  select.disabled = false;
  select.removeAttribute("aria-disabled");
  if (current) {
    select.value = current.id;
  }
  updateExportPresetStatus();
  if (wasFocused) {
    select.focus();
  }
}

function getCurrentPreset() {
  const desiredId = state.exportState.presetId;
  if (desiredId) {
    const match = MANIFEST_PRESETS.find((preset) => preset.id === desiredId);
    if (match) {
      return match;
    }
  }
  const fallback = MANIFEST_PRESETS[0] ?? null;
  if (fallback) {
    state.exportState.presetId = fallback.id;
  }
  return fallback;
}

function getPresetChecklist(presetId) {
  if (!presetId) return new Map();
  if (!state.exportState.checklist.has(presetId)) {
    state.exportState.checklist.set(presetId, new Map());
  }
  return state.exportState.checklist.get(presetId);
}

function markPresetItemsComplete(presetId, itemIds, checked = true) {
  if (!presetId || !Array.isArray(itemIds)) return;
  const checklist = getPresetChecklist(presetId);
  itemIds.forEach((itemId) => {
    if (!itemId) return;
    checklist.set(itemId, checked);
  });
}

function markCurrentPresetByBuilder(builderId) {
  if (!builderId) return;
  const preset = getCurrentPreset();
  if (!preset) return;
  const matches = preset.files
    .filter((file) => file.builder === builderId)
    .map((file) => file.id);
  if (matches.length) {
    markPresetItemsComplete(preset.id, matches, true);
  }
}

function buildComposerExportSnapshot() {
  const constraints = state.composer?.constraints ?? {};
  const preferred = ensurePreferredRoleSet();
  const presets = Array.isArray(state.composer?.combinedPresets)
    ? state.composer.combinedPresets
    : [];
  const metrics = state.composer?.metrics ?? { radar: [], heatmap: [] };
  const radar = ROLE_FLAGS.map((flag, index) => {
    const value = Array.isArray(metrics.radar) ? metrics.radar[index] : 0;
    return {
      flag,
      label: ROLE_FLAG_LABELS[flag] ?? titleCase(flag),
      average_synergy: Number.isFinite(value) ? Number(value) : 0,
    };
  });
  const heatmap = Array.isArray(metrics.heatmap)
    ? metrics.heatmap.map((row) => ({
        biome_id: row.biomeId,
        biome_label: row.label,
        roles: Array.isArray(row.values)
          ? row.values.map((cell) => ({
              flag: cell.role,
              label: ROLE_FLAG_LABELS[cell.role] ?? titleCase(cell.role),
              count: cell.count ?? 0,
              average_synergy: cell.average ?? 0,
            }))
          : [],
      }))
    : [];
  return {
    constraints: {
      min_synergy: Number.isFinite(constraints.minSynergy)
        ? constraints.minSynergy
        : 0,
      preferred_roles: Array.from(preferred),
    },
    presets: presets.map((preset) => ({
      id: preset.id,
      label: preset.label,
      synergy: preset.synergy,
      usage: preset.usage,
      roles: Array.isArray(preset.filters?.roles) ? preset.filters.roles : [],
      flags: Array.isArray(preset.filters?.flags) ? preset.filters.flags : [],
      tags: Array.isArray(preset.highlightTags) ? preset.highlightTags : [],
    })),
    metrics: { radar, heatmap },
  };
}

function buildPresetContext(filters = state.lastFilters) {
  const slug = ensureExportSlug();
  const folder = EXPORT_BASE_FOLDER;
  const metrics = calculatePickMetrics();
  const filterSummary = summariseFilters(filters ?? {});
  const ecosystemLabel = state.pick.ecosystem?.label ?? "Ecosistema sintetico";
  const payload = exportPayload(filters);
  const activityEntries = exportActivityLogEntries();
  const biomes = Array.isArray(state.pick.biomes) ? state.pick.biomes : [];
  const speciesBuckets = state.pick.species ?? {};
  const seeds = Array.isArray(state.pick.seeds) ? state.pick.seeds : [];
  const pinnedEntries =
    state.cardState?.pinned instanceof Map
      ? Array.from(state.cardState.pinned.values())
      : [];
  const narrative = { ...(state.narrative ?? {}) };
  const insights = Array.isArray(narrative.recommendations)
    ? narrative.recommendations
    : [];
  return {
    slug,
    folder,
    filters,
    filterSummary,
    ecosystemLabel,
    metrics,
    payload,
    activityEntries,
    biomes,
    speciesBuckets,
    seeds,
    pinnedEntries,
    narrative,
    insights,
    generatedAt: new Date(),
    composer: buildComposerExportSnapshot(),
  };
}

function describePresetFile(file, context) {
  const name = typeof file.filename === "function" ? file.filename(context.slug) : file.filename;
  const description =
    typeof file.description === "function"
      ? file.description(context)
      : file.description ?? "";
  let available = true;
  let reason = "";
  if (file.builder === "activity-json" || file.builder === "activity-csv") {
    if (!context.activityEntries.length) {
      available = false;
      reason = "Il registro attività è vuoto.";
    }
  }
  if (file.builder === "dossier-html" || file.builder === "dossier-pdf" || file.builder === "press-kit-md") {
    const hasPayload =
      context.metrics.biomeCount + context.metrics.speciesCount + context.metrics.seedCount > 0;
    if (!hasPayload) {
      available = false;
      reason = "Genera prima un ecosistema completo.";
    }
  }
  return {
    id: file.id,
    format: file.format,
    name,
    description,
    path: `${context.folder}${name}`,
    available,
    reason,
    optional: Boolean(file.optional),
    builder: file.builder,
  };
}

function renderExportManifest(filters = state.lastFilters) {
  const list = elements.exportList;
  const empty = elements.exportEmpty;
  const meta = elements.exportMeta;
  const actions = elements.exportActions;
  const presetSelect = elements.exportPreset;
  if (!list || !empty || !meta) return;

  populateExportPresetOptions();

  const pdfSupported = refreshExportSupportTelemetry();

  if (!MANIFEST_PRESETS.length) {
    list.innerHTML = "";
    list.hidden = true;
    empty.hidden = false;
    empty.textContent = "Nessun manifest di esportazione disponibile.";
    meta.textContent = "Carica un preset per abilitare il manifest dei file.";
    if (actions) actions.hidden = true;
    renderExportPreview(null);
    refreshDossierPreview(null);
    return;
  }

  const { biomeCount, speciesCount, seedCount } = calculatePickMetrics();
  const hasContent = biomeCount + speciesCount + seedCount > 0;
  const preset = getCurrentPreset();

  if (presetSelect && preset) {
    presetSelect.value = preset.id;
  }

  if (!hasContent || !preset) {
    list.innerHTML = "";
    list.hidden = true;
    empty.hidden = false;
    empty.textContent = "Nessun contenuto disponibile. Genera un ecosistema per sbloccare i preset.";
    meta.textContent = "Genera un ecosistema per preparare il manifest dei file.";
    if (actions) actions.hidden = true;
    renderExportPreview(null);
    refreshDossierPreview(null);
    return;
  }

  const context = buildPresetContext(filters);
  const descriptors = preset.files.map((file) => describePresetFile(file, context));
  const checklist = getPresetChecklist(preset.id);

  list.innerHTML = "";

  descriptors.forEach((descriptor) => {
    const item = document.createElement("li");
    item.className = "generator-export__item";
    if (!descriptor.available) {
      item.classList.add("generator-export__item--disabled");
    }

    const label = document.createElement("label");
    label.className = "generator-export__item-label";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = descriptor.id;
    checkbox.dataset.manifestItem = descriptor.id;
    checkbox.disabled = !descriptor.available;
    checkbox.checked = descriptor.available && checklist.get(descriptor.id) === true;

    const content = document.createElement("div");
    content.className = "generator-export__item-content";

    const header = document.createElement("div");
    header.className = "generator-export__item-header";

    const title = document.createElement("span");
    title.className = "generator-export__item-title";
    title.textContent = descriptor.name;

    const format = document.createElement("span");
    format.className = "generator-export__item-format";
    format.textContent = descriptor.format;

    header.append(title, format);

    const description = document.createElement("p");
    description.className = "generator-export__item-description";
    description.textContent = descriptor.description;

    const path = document.createElement("p");
    path.className = "generator-export__item-path";
    path.textContent = descriptor.path;

    content.append(header, description, path);

    if (descriptor.optional) {
      const badge = document.createElement("span");
      badge.className = "generator-export__item-badge";
      badge.textContent = "Opzionale";
      header.appendChild(badge);
    }

    if (!descriptor.available && descriptor.reason) {
      const hint = document.createElement("p");
      hint.className = "generator-export__item-hint";
      hint.textContent = descriptor.reason;
      content.appendChild(hint);
    }

    label.append(checkbox, content);
    item.appendChild(label);
    list.appendChild(item);
  });

  list.hidden = !descriptors.length;
  if (!descriptors.length) {
    empty.hidden = false;
    empty.textContent = "Il preset selezionato non ha elementi configurati.";
  } else if (descriptors.some((descriptor) => descriptor.available)) {
    empty.hidden = true;
  } else {
    empty.hidden = false;
    empty.textContent = "Tutti gli elementi del preset sono temporaneamente non disponibili.";
  }

  const pdfNotice = pdfSupported
    ? ""
    : " · <strong>Avviso:</strong> esportazione PDF disabilitata (html2pdf non caricato).";
  meta.dataset.pdfSupported = pdfSupported ? "true" : "false";
  meta.innerHTML = `Preset <strong>${preset.label}</strong>: ${preset.description} · Cartella consigliata: <code>${context.folder}</code> · ${
    context.filterSummary ? `Filtri attivi: ${context.filterSummary}.` : "Nessun filtro attivo."
  }${pdfNotice}`;

  if (actions) {
    actions.hidden = false;
    const zipButton = actions.querySelector('[data-action="download-preset-zip"]');
    if (zipButton) {
      const hasZipSupport = typeof window !== "undefined" && window.JSZip;
      const anyAvailable = descriptors.some((descriptor) => descriptor.available);
      zipButton.disabled = !hasZipSupport || !anyAvailable;
      zipButton.title = !hasZipSupport
        ? "JSZip non disponibile. Verifica il caricamento della libreria."
        : "";
    }
    const htmlButton = actions.querySelector('[data-action="download-dossier-html"]');
    if (htmlButton) {
      const htmlAvailable = descriptors.some(
        (descriptor) => descriptor.builder === "dossier-html" && descriptor.available
      );
      htmlButton.disabled = !htmlAvailable;
    }
    const pdfButton = actions.querySelector('[data-action="download-dossier-pdf"]');
    if (pdfButton) {
      const pdfDescriptor = descriptors.find(
        (descriptor) => descriptor.builder === "dossier-pdf" && descriptor.available
      );
      pdfButton.disabled = !pdfDescriptor || !pdfSupported;
      pdfButton.title = !pdfSupported
        ? "html2pdf non disponibile. Controlla la connessione o ricarica la pagina."
        : "";
    }
  }

  renderExportPreview(context.payload);
  refreshDossierPreview(context).catch((error) => {
    console.warn("Impossibile aggiornare l'anteprima del dossier", error);
  });
}

async function loadDossierTemplate() {
  if (state.exportState.dossierTemplate) {
    return state.exportState.dossierTemplate;
  }
  if (typeof fetch === "undefined") {
    return null;
  }
  try {
    const response = await fetch(DOSSIER_TEMPLATE_PATH, { cache: "no-cache" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const template = await response.text();
    state.exportState.dossierTemplate = template;
    return template;
  } catch (error) {
    console.warn("Impossibile caricare il template del dossier", error);
    state.exportState.dossierTemplate = null;
    return null;
  }
}

function flattenSpeciesBuckets(buckets = {}) {
  if (!buckets || typeof buckets !== "object") return [];
  const seen = new Map();
  Object.values(buckets)
    .filter((list) => Array.isArray(list))
    .forEach((list) => {
      list.forEach((species) => {
        if (!species) return;
        const key =
          species.id ||
          species.display_name ||
          species.displayName ||
          species.speciesId ||
          null;
        if (!key || seen.has(key)) return;
        seen.set(key, species);
      });
    });
  return Array.from(seen.values());
}

function summariseSeedParty(seed) {
  if (!Array.isArray(seed?.party) || !seed.party.length) {
    return "Nessuna specie associata al seed con i filtri correnti.";
  }
  return seed.party
    .map((entry) => {
      const parts = [entry.display_name];
      const meta = [];
      if (entry.role) meta.push(entry.role);
      if (typeof entry.tier === "number") meta.push(`T${entry.tier}`);
      if (entry.count && entry.count > 1) meta.push(`x${entry.count}`);
      if (meta.length) {
        parts.push(`(${meta.join(" · ")})`);
      }
      return parts.join(" ");
    })
    .join("; ");
}

async function generateDossierDocument(context) {
  const template = await loadDossierTemplate();
  if (!template) return null;
  const parser = new DOMParser();
  const doc = parser.parseFromString(template, "text/html");
  const setSlotText = (slot, value) => {
    const target = doc.querySelector(`[data-slot="${slot}"]`);
    if (target) {
      target.textContent = value;
    }
  };

  const preset = getCurrentPreset();
  const generatedAt = context.generatedAt ?? new Date();
  const locale = "it-IT";
  const generatedLabel = generatedAt.toLocaleString(locale, {
    hour12: false,
  });

  setSlotText("title", `${context.ecosystemLabel} · Dossier`);
  setSlotText("heading", context.ecosystemLabel);
  setSlotText("badge", preset ? `Preset · ${preset.label}` : "Ecosystem dossier");
  setSlotText("meta", `Generato il ${generatedLabel}`);

  const summaryParts = [
    `${context.metrics.biomeCount} biomi`,
    `${context.metrics.speciesCount} specie`,
    `${context.metrics.seedCount} seed`,
  ];
  if (context.metrics.uniqueSpeciesCount) {
    summaryParts.push(`${context.metrics.uniqueSpeciesCount} specie uniche`);
  }
  if (context.filterSummary) {
    summaryParts.push(`Filtri: ${context.filterSummary}`);
  }
  setSlotText(
    "summary",
    `Pacchetto esportato con ${summaryParts.join(" · ")}.` ||
      "Pacchetto esportato dal generatore di ecosistemi."
  );

  const metricsContainer = doc.querySelector('[data-slot="metrics"]');
  if (metricsContainer) {
    metricsContainer.innerHTML = "";
    const metricEntries = [
      { label: "Biomi", value: context.metrics.biomeCount },
      { label: "Specie", value: context.metrics.speciesCount },
      { label: "Seed", value: context.metrics.seedCount },
      { label: "Specie uniche", value: context.metrics.uniqueSpeciesCount },
    ];
    metricEntries.forEach((metric) => {
      const span = doc.createElement("span");
      const strong = doc.createElement("strong");
      strong.textContent = `${metric.label}:`;
      span.append(strong, doc.createTextNode(` ${metric.value ?? 0}`));
      metricsContainer.appendChild(span);
    });
  }

  const biomesContainer = doc.querySelector('[data-slot="biomes"]');
  if (biomesContainer) {
    biomesContainer.innerHTML = "";
    context.biomes.slice(0, 8).forEach((biome) => {
      const item = doc.createElement("li");
      item.className = "dossier__list-item";
      const heading = doc.createElement("h3");
      heading.textContent = biome.label ?? titleCase(biome.id ?? "Bioma");
      const summary = doc.createElement("p");
      const biomeSpeciesCount = Array.isArray(biome.species) ? biome.species.length : 0;
      summary.textContent = `Specie disponibili: ${biomeSpeciesCount}.`;
      item.append(heading, summary);

      const groups = new Set(biome.manifest?.functional_groups_present ?? []);
      if (Array.isArray(biome.species)) {
        biome.species.forEach((sp) => {
          (sp.functional_tags ?? []).forEach((tag) => groups.add(tag));
        });
      }
      if (groups.size) {
        const chipList = doc.createElement("div");
        chipList.className = "dossier__chips";
        Array.from(groups)
          .slice(0, 8)
          .forEach((tag) => {
            const chip = doc.createElement("span");
            chip.className = "dossier__chip";
            chip.textContent = tag;
            chipList.appendChild(chip);
          });
        item.appendChild(chipList);
      }
      biomesContainer.appendChild(item);
    });
  }

  const speciesContainer = doc.querySelector('[data-slot="species"]');
  if (speciesContainer) {
    speciesContainer.innerHTML = "";
    const speciesList = flattenSpeciesBuckets(context.speciesBuckets)
      .slice(0, 12)
      .sort((a, b) => a.display_name.localeCompare(b.display_name));
    speciesList.forEach((species) => {
      const item = doc.createElement("li");
      item.className = "dossier__list-item";
      const heading = doc.createElement("h3");
      heading.textContent = species.display_name ?? species.id ?? "Specie";
      const meta = doc.createElement("p");
      const metaParts = [];
      if (species.role_trofico) metaParts.push(species.role_trofico);
      const tier = species.balance?.threat_tier ?? species.syntheticTier;
      if (tier) metaParts.push(typeof tier === "number" ? `T${tier}` : tier);
      if (species.biomes?.length) metaParts.push(`Biomi: ${species.biomes.join(", ")}`);
      meta.textContent = metaParts.length ? metaParts.join(" · ") : "Dati sintetici";
      item.append(heading, meta);

      const tags = species.functional_tags ?? [];
      if (tags.length) {
        const chipList = doc.createElement("div");
        chipList.className = "dossier__chips";
        tags.slice(0, 8).forEach((tag) => {
          const chip = doc.createElement("span");
          chip.className = "dossier__chip";
          chip.textContent = tag;
          chipList.appendChild(chip);
        });
        item.appendChild(chipList);
      }
      speciesContainer.appendChild(item);
    });
  }

  const seedsContainer = doc.querySelector('[data-slot="seeds"]');
  if (seedsContainer) {
    seedsContainer.innerHTML = "";
    context.seeds.slice(0, 10).forEach((seed) => {
      const item = doc.createElement("li");
      item.className = "dossier__list-item";
      const heading = doc.createElement("h3");
      const headingParts = [seed.biome_id];
      if (seed.label) headingParts.push(seed.label);
      heading.textContent = headingParts.join(" · ");
      const meta = doc.createElement("p");
      meta.textContent = `Budget minaccia: T${seed.threat_budget ?? "?"}`;
      const composition = doc.createElement("p");
      composition.textContent = summariseSeedParty(seed);
      item.append(heading, meta, composition);
      seedsContainer.appendChild(item);
    });
  }

  return doc;
}

async function generateDossierHtml(context = buildPresetContext(state.lastFilters)) {
  const doc = await generateDossierDocument(context);
  if (!doc) return null;
  return `<!DOCTYPE html>${doc.documentElement.outerHTML}`;
}

async function generateDossierPdfBlob(context) {
  if (typeof window === "undefined" || typeof window.html2pdf === "undefined") {
    throw new Error("html2pdf non disponibile");
  }
  const html = await generateDossierHtml(context);
  if (!html) {
    throw new Error("Impossibile generare il dossier HTML");
  }
  const worker = window
    .html2pdf()
    .set({
      margin: 10,
      filename: `${context.slug}-dossier.pdf`,
      html2canvas: { scale: 2 },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    })
    .from(html);
  const blob = await worker.outputPdf("blob");
  return blob;
}

async function refreshDossierPreview(context) {
  const preview = elements.dossierPreview;
  const hint = elements.dossierEmpty;
  if (!preview || !hint) return;
  if (!context) {
    preview.innerHTML = "";
    hint.hidden = false;
    return;
  }
  const doc = await generateDossierDocument(context);
  if (!doc) {
    preview.innerHTML = "";
    hint.hidden = false;
    hint.textContent = "Impossibile caricare il template del dossier.";
    return;
  }
  hint.hidden = true;
  const body = doc.body ?? doc.querySelector("body");
  preview.innerHTML = body ? body.innerHTML : "";
}

function formatSpotlightLine(entry) {
  if (!entry) return null;
  const name = entry.displayName || entry.display_name || entry.speciesId || entry.id;
  if (!name) return null;
  const biomeLabel = entry.biomeLabel || entry.biome_id || entry.biome || null;
  const tierLabel = entry.tier ? `T${entry.tier}` : null;
  const synthLabel = entry.synthetic ? "Synth" : null;
  const tags = [biomeLabel, tierLabel, synthLabel].filter(Boolean).join(" · ");
  return tags ? `- ${name} (${tags})` : `- ${name}`;
}

function formatSpeciesFallbackLine(species) {
  if (!species) return null;
  const name = species.display_name || species.id || "Specie";
  const biomeCode = species.biome_id || species.biome || species.habitat_code || null;
  const biomeLabel = biomeCode ? findBiomeLabelById(biomeCode) || biomeCode : null;
  const roleCode = species.role_trofico || species.role || null;
  const roleLabel = roleCode ? SPECIES_ROLE_LABELS[roleCode] || titleCase(roleCode.replace(/_/g, " ")) : null;
  const tags = [biomeLabel, roleLabel].filter(Boolean).join(" · ");
  return tags ? `- ${name} (${tags})` : `- ${name}`;
}

function formatSeedSummary(seed) {
  if (!seed) return null;
  const label = seed.label || seed.id || "Seed";
  const biomeCode = seed.biome_id || seed.biome || null;
  const biomeLabel = biomeCode ? findBiomeLabelById(biomeCode) || biomeCode : null;
  const threat = typeof seed.threat_budget === "number" ? `Budget T${seed.threat_budget}` : null;
  const synth = seed.synthetic ? "Synth" : null;
  const segments = [label, biomeLabel, threat, synth].filter(Boolean).join(" · ");
  return `- ${segments}`;
}

function buildPressKitMarkdown(context) {
  const metrics = context.metrics || {
    biomeCount: 0,
    speciesCount: 0,
    uniqueSpeciesCount: 0,
    seedCount: 0,
  };
  const generatedAt =
    context.generatedAt instanceof Date
      ? context.generatedAt
      : new Date(context.generatedAt || Date.now());

  const lines = [];
  lines.push(`# ${context.ecosystemLabel} — Demo pubblico`);
  lines.push("");
  lines.push(
    `Generato il ${generatedAt.toLocaleString("it-IT", {
      dateStyle: "medium",
      timeStyle: "short",
    })} con ${metrics.biomeCount} biomi, ${metrics.speciesCount} specie (${metrics.uniqueSpeciesCount} uniche) e ${metrics.seedCount} seed narrativi.`
  );
  lines.push(`Filtri attivi: ${context.filterSummary}.`);
  lines.push("");

  lines.push("## Metriche chiave");
  lines.push("");
  lines.push(`- Biomi selezionati: ${metrics.biomeCount}`);
  lines.push(`- Specie totali: ${metrics.speciesCount} (${metrics.uniqueSpeciesCount} uniche)`);
  lines.push(`- Seed narrativi: ${metrics.seedCount}`);
  const highlightBiome = Array.isArray(context.biomes) && context.biomes.length ? context.biomes[0] : null;
  if (highlightBiome) {
    const highlightLabel = highlightBiome.label || highlightBiome.id || "Bioma";
    lines.push(`- Bioma in evidenza: ${highlightLabel}`);
  }
  lines.push("");

  const pinnedLines = Array.isArray(context.pinnedEntries)
    ? context.pinnedEntries.map(formatSpotlightLine).filter(Boolean)
    : [];
  let spotlightLines = pinnedLines.slice(0, 3);
  if (!spotlightLines.length) {
    spotlightLines = flattenSpeciesBuckets(context.speciesBuckets ?? {})
      .map(formatSpeciesFallbackLine)
      .filter(Boolean)
      .slice(0, 3);
  }
  if (spotlightLines.length) {
    lines.push("## Specie spotlight");
    lines.push("");
    spotlightLines.forEach((line) => lines.push(line));
    lines.push("");
  }

  const seedLines = Array.isArray(context.seeds)
    ? context.seeds.map(formatSeedSummary).filter(Boolean).slice(0, 4)
    : [];
  if (seedLines.length) {
    lines.push("## Seed narrativi in evidenza");
    lines.push("");
    seedLines.forEach((line) => lines.push(line));
    lines.push("");
  }

  const recommendations = Array.isArray(context.insights) ? context.insights : [];
  if (recommendations.length) {
    lines.push("## Insight operativi");
    lines.push("");
    recommendations.slice(0, 4).forEach((rec) => {
      if (!rec?.message) return;
      const tone = rec.tone ? rec.tone.toUpperCase() : null;
      const prefix = tone ? `[${tone}] ` : "";
      lines.push(`- ${prefix}${rec.message}`);
    });
    lines.push("");
  }

  if (context.narrative?.narrativeHook) {
    lines.push("## Hook narrativo");
    lines.push("");
    lines.push(context.narrative.narrativeHook);
    lines.push("");
  }

  lines.push("## Call to action");
  lines.push("");
  lines.push("- Condividi il dossier HTML con Marketing/Comms per asset visivi aggiornati.");
  lines.push("- Usa il manifesto YAML per predisporre il deploy statico o la CDN demo.");
  lines.push("- Integra il press kit nelle note di rilascio e nella newsletter della demo.");
  lines.push("");

  return lines.join("\n").replace(/\n{3,}/g, "\n\n");
}

async function generatePresetFileContents(preset, filters) {
  const context = buildPresetContext(filters);
  const files = [];
  for (const file of preset.files) {
    const descriptor = describePresetFile(file, context);
    if (!descriptor.available) continue;
    try {
      switch (file.builder) {
        case "ecosystem-json":
          files.push({
            id: file.id,
            name: descriptor.name,
            mime: "application/json",
            data: JSON.stringify(context.payload, null, 2),
          });
          break;
        case "ecosystem-yaml":
          files.push({
            id: file.id,
            name: descriptor.name,
            mime: "text/yaml",
            data: toYAML(context.payload),
          });
          break;
        case "activity-json":
          files.push({
            id: file.id,
            name: descriptor.name,
            mime: "application/json",
            data: JSON.stringify(context.activityEntries, null, 2),
          });
          break;
        case "activity-csv":
          files.push({
            id: file.id,
            name: descriptor.name,
            mime: "text/csv",
            data: activityLogToCsv(context.activityEntries),
          });
          break;
        case "dossier-html":
          {
            const html = await generateDossierHtml(context);
            if (html) {
              files.push({
                id: file.id,
                name: descriptor.name,
                mime: "text/html",
                data: html,
              });
            }
          }
          break;
        case "dossier-pdf":
          {
            const blob = await generateDossierPdfBlob(context);
            if (blob) {
              files.push({
                id: file.id,
                name: descriptor.name,
                mime: "application/pdf",
                data: blob,
                binary: true,
              });
            }
          }
          break;
        case "press-kit-md":
          {
            const markdown = buildPressKitMarkdown(context);
            files.push({
              id: file.id,
              name: descriptor.name,
              mime: "text/markdown",
              data: markdown,
            });
          }
          break;
        default:
          break;
      }
    } catch (error) {
      console.warn(`Impossibile generare il file ${descriptor.name}`, error);
    }
  }
  return { files, context };
}

async function downloadPresetZip(preset, filters) {
  if (typeof window === "undefined" || typeof window.JSZip === "undefined") {
    throw new Error("JSZip non disponibile");
  }
  const { files, context } = await generatePresetFileContents(preset, filters);
  if (!files.length) {
    throw new Error("Nessun file disponibile per il preset selezionato");
  }
  const zip = new window.JSZip();
  files.forEach((file) => {
    if (!file) return;
    if (file.data instanceof Blob) {
      zip.file(file.name, file.data);
    } else {
      zip.file(file.name, file.data, { binary: false });
    }
  });
  const blob = await zip.generateAsync({ type: "blob" });
  const zipName = `${context.slug}-${preset.zipSuffix ?? preset.id}.zip`;
  downloadFile(zipName, blob, "application/zip");
  markPresetItemsComplete(
    preset.id,
    files.map((file) => file.id),
    true
  );
  return { zipName, fileCount: files.length };
}

function setupExportControls() {
  populateExportPresetOptions();
  if (elements.exportPreset) {
    elements.exportPreset.addEventListener("change", (event) => {
      const { value } = event.target;
      const fallbackPresetId = MANIFEST_PRESETS[0]?.id ?? null;
      state.exportState.presetId = value || fallbackPresetId;
      renderExportManifest();
    });
  }
  if (elements.exportList) {
    elements.exportList.addEventListener("change", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (target.type !== "checkbox") return;
      const { manifestItem } = target.dataset;
      const preset = getCurrentPreset();
      if (!preset || !manifestItem) return;
      const checklist = getPresetChecklist(preset.id);
      checklist.set(manifestItem, target.checked);
    });
  }
  renderExportManifest();
}

function getSelectedValues(select) {
  return Array.from(select?.selectedOptions ?? []).map((opt) => opt.value);
}

function setSelectValues(select, values) {
  if (!select) return;
  const target = new Set(Array.isArray(values) ? values.map((value) => String(value)) : []);
  Array.from(select.options ?? []).forEach((option) => {
    option.selected = target.has(option.value);
  });
}

function applyFiltersToForm(filters = {}) {
  setSelectValues(elements.flags, filters.flags ?? []);
  setSelectValues(elements.roles, filters.roles ?? []);
  setSelectValues(elements.tags, filters.tags ?? []);
  state.lastFilters = {
    flags: Array.isArray(filters.flags) ? [...filters.flags] : [],
    roles: Array.isArray(filters.roles) ? [...filters.roles] : [],
    tags: Array.isArray(filters.tags) ? [...filters.tags] : [],
  };
}

function getCssVariableValue(name) {
  if (typeof window === "undefined") return "";
  try {
    const root = document.documentElement;
    const styles = window.getComputedStyle(root);
    return styles.getPropertyValue(name)?.trim() ?? "";
  } catch (error) {
    console.warn("Impossibile leggere la variabile CSS", name, error);
    return "";
  }
}

function hexToRgba(hex, alpha = 1) {
  if (typeof hex !== "string") return "";
  const normalized = hex.replace(/^#/, "").trim();
  if (!normalized) return "";
  const expand = (value) => value.split("").map((char) => `${char}${char}`).join("");
  let r;
  let g;
  let b;
  if (normalized.length === 3) {
    const expanded = expand(normalized);
    r = parseInt(expanded.slice(0, 2), 16);
    g = parseInt(expanded.slice(2, 4), 16);
    b = parseInt(expanded.slice(4, 6), 16);
  } else if (normalized.length === 6) {
    r = parseInt(normalized.slice(0, 2), 16);
    g = parseInt(normalized.slice(2, 4), 16);
    b = parseInt(normalized.slice(4, 6), 16);
  } else {
    return "";
  }
  if ([r, g, b].some((component) => Number.isNaN(component))) {
    return "";
  }
  const clampedAlpha = Math.min(1, Math.max(0, alpha));
  return `rgba(${r}, ${g}, ${b}, ${clampedAlpha.toFixed(3)})`;
}

function parseRgbColor(value) {
  if (typeof value !== "string") return null;
  const match = value.match(/rgba?\(([^)]+)\)/i);
  if (!match) return null;
  const parts = match[1]
    .split(",")
    .map((segment) => Number.parseFloat(segment.trim()))
    .filter((segment) => !Number.isNaN(segment));
  if (parts.length < 3) return null;
  return { r: Math.round(parts[0]), g: Math.round(parts[1]), b: Math.round(parts[2]) };
}

function resolveHeatmapColor(tokenName, intensity) {
  const baseAlpha = 0.12 + Math.max(0, Math.min(1, intensity)) * 0.45;
  const clampedAlpha = Math.max(0.08, Math.min(0.85, baseAlpha));
  const raw = tokenName ? getCssVariableValue(tokenName) : "";
  if (raw.startsWith("#")) {
    const converted = hexToRgba(raw, clampedAlpha);
    if (converted) return converted;
  }
  if (/^rgb/i.test(raw)) {
    const rgb = parseRgbColor(raw);
    if (rgb) {
      return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${clampedAlpha.toFixed(3)})`;
    }
  }
  return `rgba(88, 166, 255, ${clampedAlpha.toFixed(3)})`;
}

function ensurePreferredRoleSet() {
  if (!state.composer) {
    state.composer = {
      constraints: { minSynergy: 45, preferredRoles: new Set() },
      combinedPresets: [],
      suggestions: [],
      metrics: { radar: [], heatmap: [] },
      roleStats: new Map(),
    };
  }
  const constraints = state.composer.constraints ?? {};
  if (!(constraints.preferredRoles instanceof Set)) {
    const values = Array.isArray(constraints.preferredRoles)
      ? constraints.preferredRoles
      : [];
    constraints.preferredRoles = new Set(values);
  }
  return constraints.preferredRoles;
}

function syncPreferredRolesWithAvailability() {
  const preferred = ensurePreferredRoleSet();
  if (!preferred.size) return [];

  const availableRoles = new Set();
  const collectRoles = (list) => {
    if (!Array.isArray(list)) return;
    list.forEach((entry) => {
      const roleKey = entry?.role_trofico;
      if (roleKey) {
        availableRoles.add(roleKey);
      }
    });
  };

  const biomes = Array.isArray(state.pick?.biomes) ? state.pick.biomes : [];
  biomes.forEach((biome) => {
    if (!biome) return;
    collectRoles(biome.species);
    collectRoles(biome.generatedSpecies);
  });

  const selectedSpecies = state.pick?.species ?? {};
  Object.values(selectedSpecies).forEach((list) => collectRoles(list));

  const removed = [];
  preferred.forEach((roleKey) => {
    if (!availableRoles.has(roleKey)) {
      preferred.delete(roleKey);
      removed.push(roleKey);
    }
  });

  return removed;
}

function applyHeatmapColor(element, role, percent) {
  if (!(element instanceof HTMLElement)) return;
  const token = ROLE_FLAG_TOKENS[role] ?? "--color-accent-400";
  const numericPercent = Number.isFinite(percent) ? percent : Number(percent) || 0;
  const intensity = Math.max(0, Math.min(1, numericPercent / 100));
  element.style.setProperty("--heat-intensity", intensity.toFixed(2));
  element.style.setProperty("--heat-color-token", `var(${token})`);
  const background = resolveHeatmapColor(token, intensity);
  if (background) {
    element.style.background = background;
  }
}

function passesComposerConstraints(species, biome) {
  if (!state.composer?.constraints) return true;
  const constraints = state.composer.constraints;
  const preferred = ensurePreferredRoleSet();
  if (preferred.size) {
    const roleKey = species?.role_trofico ?? "";
    if (!preferred.has(roleKey)) {
      return false;
    }
  }
  const minSynergy = Number.isFinite(constraints.minSynergy)
    ? constraints.minSynergy
    : 0;
  if (minSynergy > 0) {
    const synergy = calculateSynergy(species, biome);
    if ((synergy?.percent ?? 0) < minSynergy) {
      return false;
    }
  }
  return true;
}

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function sample(array) {
  if (!array.length) return null;
  const index = Math.floor(Math.random() * array.length);
  return array[index];
}

function pickMany(array, n) {
  if (!array?.length || n <= 0) return [];
  if (n >= array.length) return [...array];
  const pool = shuffle(array);
  return pool.slice(0, n);
}

function titleCase(value) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function getPanelIdFromHash() {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash ?? "";
  if (!hash) return null;
  const id = hash.replace(/^#/, "");
  if (!id) return null;
  const target = document.getElementById(id);
  if (!target) return null;
  return target.dataset?.panel ?? null;
}

function scrollToPanel(panelId, { smooth = true } = {}) {
  if (!panelId) return;
  const entry = anchorState.sectionsById.get(panelId);
  const panel = entry?.element;
  if (!panel) return;
  if (!panel.hasAttribute("tabindex")) {
    panel.setAttribute("tabindex", "-1");
  }
  const behavior = smooth ? "smooth" : "auto";
  panel.scrollIntoView({ behavior, block: "start" });
  window.requestAnimationFrame(() => {
    try {
      panel.focus({ preventScroll: true });
    } catch (error) {
      panel.focus();
    }
  });
}

function updateBreadcrumbs(sectionId) {
  const descriptor = anchorState.descriptorsById.get(sectionId);
  const label = descriptor?.label ?? "";
  anchorUi.breadcrumbTargets.forEach((target) => {
    if (target) {
      target.textContent = label;
      target.dataset.activeAnchor = sectionId ?? "";
    }
  });
}

function updateMinimapState() {
  anchorState.minimaps.forEach((map) => {
    map.forEach(({ item, progress }, id) => {
      const descriptor = anchorState.descriptorsById.get(id);
      if (!descriptor) return;
      const ratio = Math.max(0, Math.min(1, descriptor.progress ?? 0));
      progress.style.setProperty("--progress", `${Math.round(ratio * 100)}%`);
      if (anchorState.activeId === id) {
        item.classList.add("is-active");
      } else {
        item.classList.remove("is-active");
      }
    });
  });
}

function setActiveSection(sectionId, { updateHash = false, silent = false } = {}) {
  if (!sectionId || !anchorState.descriptorsById.has(sectionId)) {
    return;
  }

  const previous = anchorState.activeId;
  anchorState.activeId = sectionId;

  if (previous !== sectionId || !silent) {
    anchorState.descriptors.forEach((descriptor) => {
      if (descriptor.id === sectionId) {
        descriptor.anchor.classList.add("is-active");
        descriptor.anchor.setAttribute("aria-current", "location");
      } else {
        descriptor.anchor.classList.remove("is-active");
        descriptor.anchor.removeAttribute("aria-current");
      }
    });
    updateBreadcrumbs(sectionId);
    updateMinimapState();
  }

  if (updateHash) {
    const panel = anchorState.sectionsById.get(sectionId)?.element;
    if (panel?.id && typeof window !== "undefined" && window.history?.replaceState) {
      window.history.replaceState(null, "", `#${panel.id}`);
    }
  }
}

function computeActiveSection() {
  if (!anchorState.descriptors.length) return null;
  const visible = anchorState.descriptors.filter((descriptor) => descriptor.isIntersecting);
  if (visible.length) {
    visible.sort((a, b) => (a.top ?? 0) - (b.top ?? 0));
    return visible[0].id;
  }

  let candidate = null;
  let minTop = Infinity;
  anchorState.descriptors.forEach((descriptor) => {
    const section = anchorState.sectionsById.get(descriptor.id);
    const element = section?.element;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    if (rect.top >= 0 && rect.top < minTop) {
      minTop = rect.top;
      candidate = descriptor.id;
    }
  });

  if (candidate) return candidate;
  return anchorState.descriptors[anchorState.descriptors.length - 1]?.id ?? null;
}

function handleAnchorObserver(entries) {
  entries.forEach((entry) => {
    const id = entry.target.dataset.panel;
    if (!id) return;
    const descriptor = anchorState.descriptorsById.get(id);
    if (!descriptor) return;
    descriptor.progress = entry.intersectionRatio ?? 0;
    descriptor.isIntersecting = entry.isIntersecting;
    descriptor.top = entry.boundingClientRect?.top ?? 0;
    descriptor.bottom = entry.boundingClientRect?.bottom ?? 0;
  });

  const nextActive = computeActiveSection();
  if (nextActive) {
    setActiveSection(nextActive, { silent: true });
  }
  updateMinimapState();
}

function cleanupScrollFallback() {
  if (!anchorState.scrollHandler || typeof window === "undefined") {
    return;
  }
  window.removeEventListener("scroll", anchorState.scrollHandler);
  window.removeEventListener("resize", anchorState.scrollHandler);
  anchorState.scrollHandler = null;
}

function createAnchorObserver() {
  if (anchorState.observer) {
    anchorState.observer.disconnect();
  }
  cleanupScrollFallback();
  if (!anchorUi.panels.length) return;

  if (typeof IntersectionObserver === "undefined") {
    if (typeof window === "undefined") {
      return;
    }
    anchorState.scrollHandler = () => {
      const viewportHeight =
        window.innerHeight || document.documentElement?.clientHeight || 1;

      anchorState.descriptors.forEach((descriptor) => {
        const section = anchorState.sectionsById.get(descriptor.id);
        const element = section?.element;
        if (!element) return;

        const rect = element.getBoundingClientRect();
        const height = rect.height || element.offsetHeight || 1;
        const visible = Math.max(0, Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0));
        const ratio = Math.max(0, Math.min(1, visible / height));

        descriptor.progress = Number.isFinite(ratio) ? ratio : 0;
        descriptor.isIntersecting = rect.top < viewportHeight && rect.bottom > 0;
        descriptor.top = rect.top;
        descriptor.bottom = rect.bottom;
      });

      const nextActive = computeActiveSection();
      if (nextActive) {
        setActiveSection(nextActive, { silent: true });
      }
      updateMinimapState();
    };

    window.addEventListener("scroll", anchorState.scrollHandler, { passive: true });
    window.addEventListener("resize", anchorState.scrollHandler);
    anchorState.scrollHandler();
    return;
  }

  const thresholds = [];
  for (let value = 0; value <= 1; value += 0.25) {
    thresholds.push(Number(value.toFixed(2)));
  }

  anchorState.observer = new IntersectionObserver(handleAnchorObserver, {
    rootMargin: "-40% 0px -40% 0px",
    threshold: thresholds,
  });

  anchorState.sectionsById.forEach(({ element }) => {
    if (element) {
      anchorState.observer.observe(element);
    }
  });
}

function setupMinimaps() {
  anchorState.minimaps = new Map();

  anchorUi.minimapContainers.forEach((container) => {
    if (!container) return;
    const isOverlay = container.dataset.minimapMode === "overlay";
    const existingTitle = container.querySelector(".codex-minimap__title");
    const label = container.dataset.minimapLabel || existingTitle?.textContent?.trim() || "Minimappa";

    container.innerHTML = "";

    if (!isOverlay) {
      const title = document.createElement("p");
      title.className = "codex-minimap__title";
      title.textContent = label;
      container.appendChild(title);
    }

    const list = document.createElement("ol");
    list.className = isOverlay ? "codex-overlay__list" : "codex-minimap__list";
    const registry = new Map();

    anchorState.descriptors.forEach((descriptor) => {
      const item = document.createElement("li");
      item.className = isOverlay ? "codex-overlay__item" : "codex-minimap__item";
      item.dataset.minimapItem = descriptor.id;

      const trigger = document.createElement("button");
      trigger.type = "button";
      trigger.className = isOverlay ? "codex-overlay__link" : "codex-minimap__link";
      trigger.textContent = descriptor.label;
      trigger.addEventListener("click", () => {
        setActiveSection(descriptor.id, { updateHash: true });
        scrollToPanel(descriptor.id);
        if (isOverlay) {
          closeCodex();
        }
      });

      const progress = document.createElement("span");
      progress.className = isOverlay ? "codex-overlay__progress" : "codex-minimap__progress";
      progress.style.setProperty("--progress", "0%");

      item.append(trigger, progress);
      list.appendChild(item);
      registry.set(descriptor.id, { item, progress });
    });

    container.appendChild(list);
    anchorState.minimaps.set(container, registry);
  });

  updateMinimapState();
}

function closeCodex() {
  if (!anchorUi.overlay || anchorUi.overlay.hidden) {
    return;
  }
  anchorUi.overlay.hidden = true;
  anchorUi.overlay.setAttribute("aria-hidden", "true");
  document.body.classList.remove("codex-open");
  if (anchorState.lastToggle && typeof anchorState.lastToggle.focus === "function") {
    anchorState.lastToggle.focus();
  }
  anchorState.lastToggle = null;
}

function setupAnchorNavigation() {
  if (!anchorUi.anchors.length || !anchorUi.panels.length) {
    return;
  }

  anchorState.sectionsById = new Map();
  anchorUi.panels.forEach((panel) => {
    const panelId = panel.dataset.panel;
    if (!panelId) return;
    anchorState.sectionsById.set(panelId, { element: panel });
    if (!panel.hasAttribute("tabindex")) {
      panel.setAttribute("tabindex", "-1");
    }
  });

  anchorState.descriptors = anchorUi.anchors
    .map((anchor) => {
      const id = anchor.dataset.anchorTarget;
      if (!id || !anchorState.sectionsById.has(id)) return null;
      const label = anchor.textContent?.trim() || id;
      return { id, label, anchor, progress: 0, isIntersecting: false, top: 0, bottom: 0 };
    })
    .filter(Boolean);

  anchorState.descriptorsById = new Map(
    anchorState.descriptors.map((descriptor) => [descriptor.id, descriptor])
  );

  if (!anchorState.descriptors.length) {
    return;
  }

  anchorState.descriptors.forEach((descriptor) => {
    descriptor.anchor.addEventListener("click", (event) => {
      event.preventDefault();
      setActiveSection(descriptor.id, { updateHash: true });
      scrollToPanel(descriptor.id);
      closeCodex();
    });
  });

  setupMinimaps();
  createAnchorObserver();

  const initialId = getPanelIdFromHash();
  if (initialId && anchorState.descriptorsById.has(initialId)) {
    setActiveSection(initialId, { silent: true });
  } else {
    setActiveSection(anchorState.descriptors[0].id, { silent: true });
  }

  window.addEventListener("hashchange", () => {
    const fromHash = getPanelIdFromHash();
    if (fromHash && anchorState.descriptorsById.has(fromHash)) {
      setActiveSection(fromHash, { silent: true });
    }
  });
}

function openCodex() {
  if (!anchorUi.overlay) return;
  if (!anchorState.minimaps.size) {
    setupMinimaps();
  }
  anchorUi.overlay.hidden = false;
  anchorUi.overlay.setAttribute("aria-hidden", "false");
  document.body.classList.add("codex-open");
  updateMinimapState();
  const closeButton = anchorUi.overlay.querySelector("[data-codex-close]");
  if (closeButton) {
    closeButton.focus({ preventScroll: true });
  }
}

function setupCodexControls() {
  if (!anchorUi.overlay) return;

  anchorUi.codexToggles.forEach((button) => {
    if (!button) return;
    button.addEventListener("click", () => {
      anchorState.lastToggle = button;
      openCodex();
    });
  });

  anchorUi.codexClosers.forEach((button) => {
    if (!button) return;
    button.addEventListener("click", () => {
      closeCodex();
    });
  });

  anchorUi.overlay.addEventListener("click", (event) => {
    if (event.target === anchorUi.overlay) {
      closeCodex();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && document.body.classList.contains("codex-open")) {
      closeCodex();
    }
  });
}

function uniqueById(items) {
  const seen = new Map();
  items.forEach((item) => {
    if (!item?.id) return;
    if (!seen.has(item.id)) {
      seen.set(item.id, item);
    }
  });
  return Array.from(seen.values());
}

function randomId(prefix = "synt") {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${suffix}`;
}

function combineNames(primaryName, secondaryName) {
  const firstTokens = String(primaryName || "Alpha")
    .split(/\s+/)
    .filter(Boolean);
  const secondTokens = String(secondaryName || "Beta")
    .split(/\s+/)
    .filter(Boolean);
  const first = firstTokens[0] || "Neo";
  const last = secondTokens.length ? secondTokens[secondTokens.length - 1] : "Synth";
  return `${first} ${last}`;
}

function mixFlags(primary = {}, secondary = {}) {
  const result = { ...primary };
  Object.entries(secondary).forEach(([key, value]) => {
    if (typeof value === "boolean") {
      result[key] = Boolean(value || result[key]);
    } else if (value && !result[key]) {
      result[key] = value;
    }
  });
  return result;
}

function combineTags(primary = [], secondary = []) {
  const merged = new Set();
  primary.forEach((tag) => merged.add(tag));
  secondary.forEach((tag) => merged.add(tag));
  if (!merged.size) {
    merged.add("ibrido");
  }
  return Array.from(merged);
}

function getTraitDetails(traitId) {
  if (!(state.traitDetailsIndex instanceof Map)) {
    return null;
  }
  return state.traitDetailsIndex.get(traitId) ?? null;
}

function traitLabel(traitId) {
  const info = getTraitDetails(traitId);
  if (info?.label) {
    return info.label;
  }
  if (state.traitGlossaryIndex instanceof Map) {
    const glossaryEntry = state.traitGlossaryIndex.get(traitId);
    if (glossaryEntry) {
      if (glossaryEntry.label_it) {
        return glossaryEntry.label_it;
      }
      if (glossaryEntry.label_en) {
        return glossaryEntry.label_en;
      }
    }
  }
  if (typeof traitId === "string") {
    return titleCase(traitId);
  }
  return traitId;
}

function createChipElement(value) {
  const chip = document.createElement("span");
  chip.className = "chip";
  const info = getTraitDetails(value);
  chip.textContent = info?.label ?? value;
  chip.dataset.traitId = value;
  const tooltip = [];
  if (info?.usage) tooltip.push(`Uso: ${info.usage}`);
  if (info?.family) tooltip.push(`Famiglia: ${info.family}`);
  if (info?.mutation) tooltip.push(`Mutazione: ${info.mutation}`);
  if (info?.selectiveDrive) tooltip.push(`Spinta: ${info.selectiveDrive}`);
  if (info?.fme) tooltip.push(`FME: ${info.fme}`);
  if (info?.weakness) tooltip.push(`Debolezza: ${info.weakness}`);
  if (info?.synergy?.length) {
    tooltip.push(`Sinergie: ${info.synergy.map((id) => traitLabel(id)).join(", ")}`);
  }
  if (info?.conflict?.length) {
    tooltip.push(`Conflitti: ${info.conflict.map((id) => traitLabel(id)).join(", ")}`);
  }
  if (info?.tier) {
    tooltip.push(`Tier: ${info.tier}`);
  }
  if (info?.slots?.length) {
    tooltip.push(`Slot PI: ${info.slots.join(", ")}`);
  }
  if (info?.piSynergy?.combo_totale) {
    const formList = Array.isArray(info.piSynergy.forme) ? info.piSynergy.forme : [];
    const formsNote = formList.length ? ` · Forme: ${formList.join(", ")}` : "";
    tooltip.push(`Combo PI: ${info.piSynergy.combo_totale}${formsNote}`);
  }
  if (info?.environmentRequirements?.length) {
    tooltip.push(`Requisiti ambientali: ${info.environmentRequirements.length}`);
  }
  if (tooltip.length) {
    chip.title = tooltip.join("\n");
  }
  return chip;
}

function inferThreatTierFromRole(role = "", flags = {}) {
  if (flags.apex) return 4;
  if (flags.threat) return 3;
  if (flags.keystone) return 3;
  if (/predatore_terziario/.test(role)) return 4;
  if (/predatore/.test(role)) return 3;
  if (/evento/.test(role)) return 2;
  if (/minaccia/.test(role)) return 3;
  if (/detritivoro|erbivoro|prede/.test(role)) return 1;
  return 2;
}

function tierOf(species) {
  if (species?.syntheticTier) {
    return Math.max(1, Math.min(species.syntheticTier, 5));
  }
  const raw = species?.balance?.threat_tier ?? "T1";
  const parsed = parseInt(String(raw).replace(/\D/g, ""), 10);
  if (Number.isNaN(parsed)) return 1;
  return Math.max(1, Math.min(parsed, 5));
}

function ensureOption(select, value, label = value) {
  if (!select) return;
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  select.appendChild(option);
}

function collectFlags(data) {
  const flagSet = new Set();
  data.species.forEach((sp) => {
    Object.entries(sp.flags ?? {}).forEach(([flag]) => {
      flagSet.add(flag);
    });
  });
  return Array.from(flagSet).sort((a, b) => a.localeCompare(b));
}

function collectRoles(data) {
  const roleSet = new Set();
  data.species.forEach((sp) => {
    if (sp.role_trofico) {
      roleSet.add(sp.role_trofico);
    }
  });
  return Array.from(roleSet).sort((a, b) => a.localeCompare(b));
}

function collectTags(data) {
  const tagSet = new Set();
  data.species.forEach((sp) => {
    (sp.functional_tags ?? []).forEach((tag) => tagSet.add(tag));
  });
  return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
}

function populateFilters(data) {
  elements.flags.innerHTML = "";
  elements.roles.innerHTML = "";
  elements.tags.innerHTML = "";

  collectFlags(data).forEach((flag) => ensureOption(elements.flags, flag));
  collectRoles(data).forEach((role) => ensureOption(elements.roles, role));
  collectTags(data).forEach((tag) => ensureOption(elements.tags, tag));
}

function indexTraitRegistry(registry) {
  const map = new Map();
  if (!registry?.rules?.length) {
    return map;
  }

  registry.rules.forEach((rule) => {
    const classId = rule.when?.biome_class;
    if (!classId) return;
    const entry = map.get(classId) || {
      traits: new Set(),
      effects: {},
      jobs: new Set(),
      meta: null,
      rules: [],
    };
    (rule.suggest?.traits ?? []).forEach((trait) => entry.traits.add(trait));
    Object.entries(rule.suggest?.effects ?? {}).forEach(([key, value]) => {
      entry.effects[key] = value;
    });
    (rule.suggest?.jobs_bias ?? []).forEach((job) => entry.jobs.add(job));
    entry.rules.push(rule);
    if (rule.meta) {
      entry.meta = { ...(entry.meta ?? {}), ...rule.meta };
    }
    map.set(classId, entry);
  });

  return map;
}

function indexTraitGlossary(glossary) {
  const map = new Map();
  const entries = glossary?.traits;
  if (!entries || typeof entries !== "object") {
    return map;
  }

  Object.entries(entries).forEach(([traitId, info]) => {
    if (!traitId) return;
    if (!info || typeof info !== "object") {
      map.set(traitId, {});
      return;
    }
    map.set(traitId, { ...info });
  });

  return map;
}

function normalizeTraitList(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === "string" && item.length);
  }
  return [];
}

function indexTraitDetails(catalog) {
  const map = new Map();
  if (!catalog?.traits) {
    return map;
  }

  Object.entries(catalog.traits).forEach(([traitId, raw]) => {
    if (!traitId) return;
    const usage = raw?.uso_funzione ?? raw?.usage ?? null;
    const family = raw?.famiglia_tipologia ?? raw?.family ?? null;
    const mutation = raw?.mutazione_indotta ?? raw?.mutation ?? null;
    const selectiveDrive = raw?.spinta_selettiva ?? raw?.selective_drive ?? null;
    const fme = raw?.fattore_mantenimento_energetico ?? raw?.fme ?? null;
    const weakness = raw?.debolezza ?? raw?.weakness ?? null;
    const synergy = normalizeTraitList(raw?.sinergie ?? raw?.synergy);
    const conflict = normalizeTraitList(raw?.conflitti ?? raw?.conflict);
    const tier = raw?.tier ?? null;
    const slotList = Array.isArray(raw?.slot ?? raw?.slots)
      ? (raw?.slot ?? raw?.slots).filter((item) => typeof item === "string" && item.length)
      : [];
    const piSynergy = raw?.sinergie_pi ?? raw?.pi_synergy ?? null;
    const environmentRequirements = Array.isArray(raw?.requisiti_ambientali)
      ? raw.requisiti_ambientali
      : Array.isArray(raw?.environment_requirements)
      ? raw.environment_requirements
      : [];
    const entry = {
      id: traitId,
      label: raw?.label ?? titleCase(traitId),
      usage,
      family,
      mutation,
      selectiveDrive,
      fme,
      weakness,
      synergy,
      conflict,
      tier,
      slots: slotList,
      piSynergy,
      environmentRequirements,
    };
    map.set(traitId, entry);
  });

  return map;
}

function formatEffects(effects = {}) {
  const entries = Object.entries(effects);
  if (!entries.length) return null;
  return entries
    .map(([key, value]) => `${key}: ${value}`)
    .join(", ");
}

function setTraitRegistry(registry) {
  state.traitRegistry = registry ?? null;
  state.traitsIndex = indexTraitRegistry(registry);
  renderTraitExpansions();
}

function setTraitReference(catalog) {
  state.traitReference = catalog ?? null;
  state.traitDetailsIndex = indexTraitDetails(catalog);
  renderTraitExpansions();
}

function setTraitGlossary(glossary) {
  state.traitGlossary = glossary ?? null;
  state.traitGlossaryIndex = indexTraitGlossary(glossary);
  renderTraitExpansions();
}

function indexHazardRegistry(registry) {
  const map = new Map();
  if (!registry?.hazards) return map;

  Object.entries(registry.hazards).forEach(([hazardId, info]) => {
    map.set(hazardId, {
      id: hazardId,
      requires_any_of: Array.from(info?.requires_any_of ?? []),
      effect: info?.effect ?? null,
      label: info?.label ?? null,
    });
  });

  return map;
}

function setHazardRegistry(registry) {
  state.hazardRegistry = registry ?? null;
  state.hazardsIndex = indexHazardRegistry(registry);
  renderTraitExpansions();
}

function describeHazards(hazardIds = []) {
  if (!hazardIds?.length) return null;

  const summaryParts = [];
  const detailParts = [];

  hazardIds.forEach((hazardId) => {
    const name = titleCase(hazardId);
    const entry = state.hazardsIndex.get(hazardId);
    if (!entry) {
      summaryParts.push(`${name} (?)`);
      detailParts.push(`${name}: definizione mancante nel registro hazard.`);
      return;
    }

    summaryParts.push(name);
    const notes = [];
    if (entry.requires_any_of?.length) {
      notes.push(`cap: ${entry.requires_any_of.join(" / ")}`);
    }
    if (entry.effect) {
      notes.push(entry.effect);
    }
    if (notes.length) {
      detailParts.push(`${name}: ${notes.join(" — ")}`);
    }
  });

  return {
    summary: summaryParts.join(", "),
    details: detailParts.join(" · "),
  };
}

function gatherTraitInfoForBiome(biome) {
  if (!biome || !(state.traitsIndex instanceof Map)) {
    return null;
  }

  const aggregate = (entry) => ({
    traits: Array.from(entry?.traits ?? []).sort((a, b) => a.localeCompare(b)),
    jobs: Array.from(entry?.jobs ?? []).sort((a, b) => a.localeCompare(b)),
    effects: { ...(entry?.effects ?? {}) },
    description: entry?.meta?.description ?? null,
    meta: entry?.meta ?? null,
  });

  if (!biome.synthetic) {
    const entry = state.traitsIndex.get(biome.id);
    if (!entry) return null;
    return aggregate(entry);
  }

  const traitSet = new Set();
  const jobSet = new Set();
  const effects = {};
  const descriptions = [];

  (biome.parents ?? []).forEach((parent) => {
    const entry = state.traitsIndex.get(parent.id);
    if (!entry) return;
    entry.traits.forEach((trait) => traitSet.add(trait));
    entry.jobs.forEach((job) => jobSet.add(job));
    Object.assign(effects, entry.effects);
    if (entry.meta?.description) {
      descriptions.push(`${titleCase(parent.id)}: ${entry.meta.description}`);
    }
  });

  if (!traitSet.size) return null;

  return {
    traits: Array.from(traitSet).sort((a, b) => a.localeCompare(b)),
    jobs: Array.from(jobSet).sort((a, b) => a.localeCompare(b)),
    effects,
    description: descriptions.join(" · ") || null,
    meta: null,
  };
}

function buildTraitBlock(info, { synthetic = false } = {}) {
  if (!info?.traits?.length) return null;
  const details = document.createElement("details");
  details.className = "trait-block";
  details.open = false;

  const summary = document.createElement("summary");
  summary.textContent = synthetic
    ? `Tratti ambientali ereditati (${info.traits.length})`
    : `Tratti ambientali suggeriti (${info.traits.length})`;
  details.appendChild(summary);

  const chipList = document.createElement("div");
  chipList.className = "chip-list chip-list--compact";
  const sortedTraitsForChips = [...info.traits].sort((a, b) => traitLabel(a).localeCompare(traitLabel(b)));
  sortedTraitsForChips.forEach((trait) => {
    chipList.appendChild(createChipElement(trait));
  });
  details.appendChild(chipList);

  if (info.meta?.expansion) {
    const expansion = document.createElement("p");
    expansion.className = "form__hint";
    expansion.textContent = `Espansione: ${titleCase(info.meta.expansion)}`;
    details.appendChild(expansion);
  }

  if (info.meta?.notes) {
    const notes = document.createElement("p");
    notes.className = "form__hint";
    notes.textContent = info.meta.notes;
    details.appendChild(notes);
  }

  if (info.description) {
    const desc = document.createElement("p");
    desc.className = "form__hint";
    desc.textContent = info.description;
    details.appendChild(desc);
  }

  const detailList = document.createElement("dl");
  detailList.className = "trait-details";
  const orderedTraits = [...info.traits].sort((a, b) => traitLabel(a).localeCompare(traitLabel(b)));
  orderedTraits.forEach((trait) => {
    const traitInfo = getTraitDetails(trait);
    if (!traitInfo) return;
    const pieces = [];
    if (traitInfo.usage) pieces.push(`Uso: ${traitInfo.usage}`);
    if (traitInfo.fme) pieces.push(`FME: ${traitInfo.fme}`);
    if (traitInfo.family) pieces.push(`Famiglia: ${traitInfo.family}`);
    if (traitInfo.selectiveDrive) pieces.push(`Spinta: ${traitInfo.selectiveDrive}`);
    if (traitInfo.mutation) pieces.push(`Mutazione: ${traitInfo.mutation}`);
    if (traitInfo.synergy?.length) {
      pieces.push(`Sinergie: ${traitInfo.synergy.map((id) => traitLabel(id)).join(", ")}`);
    }
    if (traitInfo.conflict?.length) {
      pieces.push(`Conflitti: ${traitInfo.conflict.map((id) => traitLabel(id)).join(", ")}`);
    }
    if (traitInfo.weakness) pieces.push(`Debolezza: ${traitInfo.weakness}`);
    if (!pieces.length) return;
    const term = document.createElement("dt");
    term.className = "trait-details__term";
    term.textContent = traitInfo.label ?? traitLabel(trait);
    detailList.appendChild(term);
    const desc = document.createElement("dd");
    desc.className = "trait-details__desc";
    desc.textContent = pieces.join(" · ");
    detailList.appendChild(desc);
  });
  if (detailList.children.length) {
    details.appendChild(detailList);
  }

  if (info.jobs?.length) {
    const jobs = document.createElement("p");
    jobs.className = "form__hint";
    jobs.textContent = `Bias ruoli: ${info.jobs.join(", ")}`;
    details.appendChild(jobs);
  }

  const effectsSummary = formatEffects(info.effects);
  if (effectsSummary) {
    const eff = document.createElement("p");
    eff.className = "form__hint";
    eff.textContent = `Effetti suggeriti: ${effectsSummary}`;
    details.appendChild(eff);
  }

  return details;
}

function renderTraitExpansions() {
  const container = elements.traitGrid;
  if (!container) return;
  container.innerHTML = "";

  if (!(state.traitsIndex instanceof Map) || !state.traitsIndex.size) {
    const placeholder = document.createElement("p");
    placeholder.className = "placeholder";
    placeholder.textContent = "Carica il catalogo per vedere i set di tratti ambientali.";
    container.appendChild(placeholder);
    return;
  }

  const orderedEntries = [];
  const seen = new Set();
  (state.traitRegistry?.rules ?? []).forEach((rule) => {
    if (!rule.meta?.category) return;
    const classId = rule.when?.biome_class;
    if (!classId || seen.has(classId)) return;
    const entry = state.traitsIndex.get(classId);
    if (!entry) return;
    orderedEntries.push({ classId, entry });
    seen.add(classId);
  });

  if (!orderedEntries.length) {
    const placeholder = document.createElement("p");
    placeholder.className = "placeholder";
    placeholder.textContent = "Nessun set di tratti ambientali avanzati registrato.";
    container.appendChild(placeholder);
    return;
  }

  orderedEntries.forEach(({ classId, entry }) => {
    const card = document.createElement("article");
    card.className = "card";

    const title = document.createElement("h3");
    title.textContent = titleCase(classId ?? "Bioma sconosciuto");
    card.appendChild(title);

    const metaParts = [];
    const category = TRAIT_CATEGORY_LABELS[entry.meta?.category] ?? entry.meta?.category;
    if (category) metaParts.push(category);
    if (entry.meta?.network) metaParts.push(`Ecosistema: ${entry.meta.network}`);
    if (entry.meta?.cohort) metaParts.push(`Cluster: ${entry.meta.cohort}`);
    if (entry.meta?.expansion) metaParts.push(`Espansione: ${titleCase(entry.meta.expansion)}`);
    let hazardDetails = null;
    const hazardInfo = describeHazards(entry.meta?.hazard_profile ?? []);
    if (hazardInfo) {
      metaParts.push(`Hazard: ${hazardInfo.summary}`);
      hazardDetails = hazardInfo.details;
    }
    const meta = document.createElement("p");
    meta.className = "form__hint";
    meta.textContent = metaParts.join(" · ") || "Set di tratti ambientali";
    card.appendChild(meta);

    if (hazardDetails) {
      const hazardNote = document.createElement("p");
      hazardNote.className = "form__hint";
      hazardNote.textContent = hazardDetails;
      card.appendChild(hazardNote);
    }

    if (entry.meta?.notes) {
      const note = document.createElement("p");
      note.className = "form__hint";
      note.textContent = entry.meta.notes;
      card.appendChild(note);
    }

    if (entry.meta?.description) {
      const desc = document.createElement("p");
      desc.textContent = entry.meta.description;
      card.appendChild(desc);
    }

    const traitList = document.createElement("div");
    traitList.className = "chip-list chip-list--compact";
    Array.from(entry.traits)
      .sort((a, b) => traitLabel(a).localeCompare(traitLabel(b)))
      .forEach((trait) => {
        traitList.appendChild(createChipElement(trait));
      });
    card.appendChild(traitList);

    const effectsSummary = formatEffects(entry.effects ?? {});
    if (effectsSummary) {
      const eff = document.createElement("p");
      eff.className = "form__hint";
      eff.textContent = `Effetti: ${effectsSummary}`;
      card.appendChild(eff);
    }

    const jobBias = Array.from(entry.jobs ?? [])
      .filter((job) => typeof job === "string")
      .sort((a, b) => a.localeCompare(b));
    if (jobBias.length) {
      const jobsEl = document.createElement("p");
      jobsEl.className = "form__hint";
      jobsEl.textContent = `Bias ruoli: ${jobBias.join(", ")}`;
      card.appendChild(jobsEl);
    }

    container.appendChild(card);
  });
}

const CONNECTION_TYPES = ["corridor", "trophic_spillover", "seasonal_bridge"];
const SEASONALITY = [
  "primavera",
  "estate",
  "autunno",
  "inverno",
  "episodico",
  "multistagionale",
];

const ENCOUNTER_BLUEPRINTS = [
  {
    id: "scout",
    label: "Pattuglia rapida",
    summary: "Piccolo gruppo mobile per ingaggi d'avanscoperta.",
    minSize: 2,
    targetSize: 3,
    priorities: ["threat", "bridge"],
  },
  {
    id: "strike",
    label: "Assalto mirato",
    summary: "Forza d'attacco centrata su predatori e specie chiave.",
    minSize: 3,
    targetSize: 4,
    priorities: ["apex", "keystone", "threat"],
  },
  {
    id: "gauntlet",
    label: "Crisi apex",
    summary: "Scenario culminante con il massimo della pressione ecologica.",
    minSize: 4,
    targetSize: 5,
    priorities: ["apex", "keystone", "threat", "bridge"],
  },
];

function synthesiseBiome(parents) {
  const parentIds = parents.map((parent) => parent.id);
  const displayName = parents.map((parent) => titleCase(parent.id)).join(" / ");
  const idBase = slugify(`${parentIds.join("-")}-${randomId("bio")}`);
  const sourceSpecies = uniqueById(
    parents.flatMap((parent) =>
      (parent.species ?? []).map((sp) => ({ ...sp, source_biome: parent.id }))
    )
  );

  const counts = sourceSpecies.reduce(
    (acc, sp) => {
      if (sp.flags?.apex) acc.apex += 1;
      if (sp.flags?.keystone) acc.keystone += 1;
      if (sp.flags?.bridge) acc.bridge += 1;
      if (sp.flags?.threat) acc.threat += 1;
      if (sp.flags?.event) acc.event += 1;
      return acc;
    },
    { apex: 0, keystone: 0, bridge: 0, threat: 0, event: 0 }
  );

  const functionalGroups = new Set();
  sourceSpecies.forEach((sp) => {
    (sp.functional_tags ?? []).forEach((tag) => functionalGroups.add(tag));
  });

  return {
    id: idBase || randomId("biome"),
    label: `Bioma sintetico ${displayName}`,
    synthetic: true,
    parents: parents.map((parent) => ({
      id: parent.id,
      label: titleCase(parent.id),
      path: parent.path ?? null,
    })),
    species: sourceSpecies,
    manifest: {
      species_counts: counts,
      functional_groups_present: Array.from(functionalGroups),
      sources: parentIds,
    },
  };
}

function generateSyntheticBiomes(baseBiomes, count) {
  if (!baseBiomes?.length) return [];
  const result = [];
  for (let i = 0; i < count; i += 1) {
    const parentCount = Math.min(3, Math.max(2, Math.floor(Math.random() * 3) + 2));
    const parents = pickMany(baseBiomes, Math.min(parentCount, baseBiomes.length));
    result.push(synthesiseBiome(parents));
  }
  return result;
}

function synthesiseConnections(biomes) {
  if (!biomes.length) return [];
  if (biomes.length === 1) {
    return [
      {
        from: biomes[0].id.toUpperCase(),
        to: biomes[0].id.toUpperCase(),
        type: "nested_loop",
        resistance: 0.5,
        seasonality: "continuo",
        notes: "Bioma autosufficiente generato proceduralmente.",
      },
    ];
  }
  const connections = [];
  const shuffled = shuffle(biomes);
  for (let i = 0; i < shuffled.length; i += 1) {
    const current = shuffled[i];
    const next = shuffled[(i + 1) % shuffled.length];
    if (!next) continue;
    const type = sample(CONNECTION_TYPES) ?? "corridor";
    const seasonality = sample(SEASONALITY) ?? "episodico";
    connections.push({
      from: current.id.toUpperCase(),
      to: next.id.toUpperCase(),
      type,
      resistance: Math.round((0.3 + Math.random() * 0.5) * 100) / 100,
      seasonality,
      notes: `Connessione sintetica derivata da ${
        current.parents?.map((p) => p.id).join("+") ?? "sorgenti ignote"
      } verso ${next.parents?.map((p) => p.id).join("+") ?? "target ignoto"}.`,
    });
  }
  return connections;
}

function resolvePackHref(relativePath) {
  if (!relativePath) return relativePath;
  if (packContext?.resolveDocHref) {
    try {
      return packContext.resolveDocHref(relativePath);
    } catch (error) {
      console.warn("Impossibile risolvere il percorso tramite resolveDocHref", relativePath, error);
    }
  }
  if (packDocsBase) {
    try {
      return new URL(relativePath, packDocsBase).toString();
    } catch (error) {
      console.warn("Impossibile risolvere il percorso tramite packDocsBase", relativePath, error);
    }
  }
  if (packContext?.resolvePackHref) {
    try {
      return packContext.resolvePackHref(relativePath);
    } catch (error) {
      console.warn("Impossibile risolvere il percorso tramite resolvePackHref", relativePath, error);
    }
  }
  if (resolvedPackRoot) {
    try {
      return new URL(relativePath, resolvedPackRoot).toString();
    } catch (error) {
      console.warn("Impossibile risolvere il percorso tramite resolvedPackRoot", relativePath, error);
    }
  }
  return relativePath;
}

function currentFilters() {
  const filters = {
    flags: getSelectedValues(elements.flags),
    roles: getSelectedValues(elements.roles),
    tags: getSelectedValues(elements.tags),
  };
  state.lastFilters = filters;
  return filters;
}

function summariseFilters(filters) {
  const segments = [];
  if (filters.flags?.length) {
    segments.push(`flag ${filters.flags.join(", ")}`);
  }
  if (filters.roles?.length) {
    segments.push(`ruoli ${filters.roles.join(", ")}`);
  }
  if (filters.tags?.length) {
    segments.push(`tag ${filters.tags.join(", ")}`);
  }
  return segments.length ? segments.join(" · ") : "nessun filtro attivo";
}

function matchesFlags(species, requiredFlags) {
  if (!requiredFlags.length) return true;
  const flags = species.flags ?? {};
  return requiredFlags.every((flag) => Boolean(flags[flag]));
}

function matchesRoles(species, requiredRoles) {
  if (!requiredRoles.length) return true;
  return requiredRoles.includes(species.role_trofico ?? "");
}

function matchesTags(species, requiredTags) {
  if (!requiredTags.length) return true;
  const tags = species.functional_tags ?? [];
  return requiredTags.every((tag) => tags.includes(tag));
}

function filteredPool(biome, filters) {
  const { flags, roles, tags } = filters;
  return biome.species.filter(
    (sp) =>
      matchesFlags(sp, flags) &&
      matchesRoles(sp, roles) &&
      matchesTags(sp, tags) &&
      passesComposerConstraints(sp, biome)
  );
}

function generateHybridSpecies(biome, filters, desiredCount = 3) {
  const pool = filteredPool(biome, filters);
  const basePool = pool.length ? pool : biome.species ?? [];
  if (!basePool.length) return [];

  const hybrids = [];
  const maxAttempts = Math.max(desiredCount * 6, 12);
  let attempts = 0;

  while (hybrids.length < desiredCount && attempts < maxAttempts) {
    attempts += 1;
    const primary = sample(basePool);
    if (!primary) break;
    const secondaryCandidates = basePool.filter((sp) => sp.id !== primary.id);
    const secondary = secondaryCandidates.length ? sample(secondaryCandidates) : null;

    const combinedFlags = mixFlags(primary.flags, secondary?.flags);
    const combinedTags = combineTags(primary.functional_tags, secondary?.functional_tags);
    const roleOptions = [primary.role_trofico, secondary?.role_trofico].filter(Boolean);
    const role = roleOptions.length ? sample(roleOptions) : primary.role_trofico ?? null;
    const displayName = combineNames(primary.display_name, secondary?.display_name);
    const baseId = slugify(displayName) || slugify(`${primary.id}-${secondary?.id ?? "solo"}`);
    const tier = inferThreatTierFromRole(role ?? "", combinedFlags);

    const hybrid = {
      id: `${baseId}-${Math.random().toString(36).slice(2, 6)}`,
      display_name: displayName,
      role_trofico: role,
      functional_tags: combinedTags,
      flags: combinedFlags,
      biomes: [biome.id],
      synthetic: true,
      syntheticTier: tier,
      balance: { threat_tier: `T${tier}` },
      sources: {
        primary: {
          id: primary.id,
          biome: primary.source_biome ?? primary.biomes?.[0] ?? null,
        },
        secondary: secondary
          ? {
              id: secondary.id,
              biome: secondary.source_biome ?? secondary.biomes?.[0] ?? null,
            }
          : null,
      },
    };

    if (
      matchesFlags(hybrid, filters.flags) &&
      matchesRoles(hybrid, filters.roles) &&
      matchesTags(hybrid, filters.tags) &&
      passesComposerConstraints(hybrid, biome)
    ) {
      hybrids.push(hybrid);
    }
  }

  if (!hybrids.length) {
    const fallbackPool = basePool.filter((sp) => passesComposerConstraints(sp, biome));
    return fallbackPool.slice(0, Math.min(desiredCount, fallbackPool.length)).map((sp) => ({
      ...sp,
      id: `${slugify(sp.id || sp.display_name)}-${Math.random().toString(36).slice(2, 5)}`,
      display_name: `${sp.display_name ?? sp.id} Neo-Variant`,
      biomes: [biome.id],
      synthetic: true,
      syntheticTier: inferThreatTierFromRole(sp.role_trofico ?? "", sp.flags ?? {}),
      balance: { threat_tier: `T${inferThreatTierFromRole(sp.role_trofico ?? "", sp.flags ?? {})}` },
      sources: {
        primary: {
          id: sp.id,
          biome: sp.source_biome ?? sp.biomes?.[0] ?? null,
        },
        secondary: null,
      },
    }));
  }

  return hybrids;
}

const ROLE_MATCHERS = {
  apex: (sp) => sp.flags?.apex || tierOf(sp) >= 4,
  keystone: (sp) => sp.flags?.keystone,
  threat: (sp) =>
    sp.flags?.threat ||
    /predatore|incursore|menace|minaccia/i.test(sp.role_trofico ?? "") ||
    tierOf(sp) >= 3,
  bridge: (sp) =>
    sp.flags?.bridge || sp.flags?.event || /supporto|ponte|trasferimento/i.test(sp.role_trofico ?? ""),
};

function buildCandidatePools(biome, filters) {
  const generated = state.pick.species[biome.id] ?? [];
  const filtered = filteredPool(biome, filters);
  const nativePool = biome.species ?? [];
  const preferGenerated = biome.synthetic && generated.length > 0;

  const prioritized = preferGenerated
    ? uniqueById([...generated, ...filtered])
    : uniqueById([...filtered]);
  const fallback = uniqueById([...filtered, ...nativePool]);
  const full = preferGenerated
    ? uniqueById([...generated, ...filtered, ...nativePool])
    : uniqueById([...filtered, ...nativePool]);

  const sorted = [...full].sort((a, b) => tierOf(b) - tierOf(a));

  return {
    preferGenerated,
    prioritized,
    fallback,
    full,
    sorted,
  };
}

function selectFromPools(pools, used, predicate) {
  if (!predicate) return null;
  const sequences = [];
  if (pools.prioritized.length) {
    sequences.push(pools.prioritized);
  }
  if (pools.fallback.length) {
    sequences.push(pools.fallback);
  }
  sequences.push(pools.full);

  for (const seq of sequences) {
    const candidate = seq.find((sp) => !used.has(sp.id) && predicate(sp));
    if (candidate) {
      return candidate;
    }
  }
  return null;
}

function normalisePartyEntry(sp) {
  return {
    id: sp.id,
    display_name: sp.display_name ?? sp.id,
    role: sp.role_trofico ?? null,
    tier: tierOf(sp),
    count: 1,
    sources: sp.sources ?? null,
    synthetic: Boolean(sp.synthetic),
  };
}

function ensureMinimumIndividuals(party, blueprint, fallback) {
  if (!party.length && fallback) {
    party.push(normalisePartyEntry(fallback));
  }

  if (!party.length) {
    return;
  }

  const target = Math.max(blueprint.minSize ?? 1, 1);
  let individuals = party.reduce((sum, entry) => sum + (entry.count ?? 1), 0);
  while (individuals < target) {
    const last = party[party.length - 1];
    last.count = (last.count ?? 1) + 1;
    individuals = party.reduce((sum, entry) => sum + (entry.count ?? 1), 0);
  }
}

function describeSeedNotes(biome, blueprint, filters, preferGenerated) {
  const filterSummary = summariseFilters(filters);
  if (biome.synthetic) {
    const sources = (biome.parents ?? [])
      .map((parent) => parent.label ?? titleCase(parent.id ?? ""))
      .filter(Boolean)
      .join(" + ") || "fonti miste";
    const origin = preferGenerated ? "specie ibride" : "catalogo originale";
    return `${blueprint.label} sintetico (${filterSummary}). Origine: ${sources}. Sorgente: ${origin}.`;
  }
  return `${blueprint.label} dal catalogo (${filterSummary}).`;
}

function createSeedFromBlueprint(biome, filters, blueprint) {
  const pools = buildCandidatePools(biome, filters);
  const used = new Set();
  const party = [];

  const addToParty = (sp) => {
    if (!sp || used.has(sp.id)) return;
    used.add(sp.id);
    party.push(normalisePartyEntry(sp));
  };

  blueprint.priorities.forEach((key) => {
    const matcher = ROLE_MATCHERS[key];
    const candidate = matcher ? selectFromPools(pools, used, matcher) : null;
    if (candidate) {
      addToParty(candidate);
    }
  });

  for (const sp of pools.sorted) {
    if (party.length >= (blueprint.targetSize ?? party.length + 1)) {
      break;
    }
    if (used.has(sp.id)) continue;
    addToParty(sp);
  }

  ensureMinimumIndividuals(party, blueprint, pools.sorted[0] ?? null);

  if (!party.length) {
    return null;
  }

  const budget = party.reduce((sum, entry) => sum + entry.tier * (entry.count ?? 1), 0);

  return {
    encounter_id: `auto_${blueprint.id}_${biome.id}_${Math.random().toString(36).slice(2, 8)}`,
    biome_id: biome.id,
    template: blueprint.id,
    label: blueprint.label,
    description: blueprint.summary,
    party,
    threat_budget: budget,
    synthetic: biome.synthetic || undefined,
    notes: describeSeedNotes(biome, blueprint, filters, pools.preferGenerated),
  };
}

function rerollSpecies(filters) {
  const removedPreferredRoles = syncPreferredRolesWithAvailability();
  const hasActiveBiomes = Array.isArray(state.pick?.biomes) && state.pick.biomes.length > 0;
  if (removedPreferredRoles.length && hasActiveBiomes) {
    const labels = removedPreferredRoles
      .map((role) => titleCase(String(role).replace(/[_-]+/g, " ")))
      .join(", ");
    const plural = removedPreferredRoles.length > 1;
    setStatus(
      plural
        ? `Ruoli preferiti rimossi perché non più disponibili: ${labels}.`
        : `Ruolo preferito rimosso perché non più disponibile: ${labels}.`,
      "info",
      {
        tags: ["composer", "ruoli"],
        action: "composer-preferred-pruned",
        metadata: { roles: removedPreferredRoles },
      }
    );
  }

  const previous = state.pick.species ?? {};
  const lockedBiomes = state.cardState.locks.biomes;
  const lockedSpecies = state.cardState.locks.species;
  const next = {};

  state.pick.biomes.forEach((biome) => {
    const biomeId = biome.id;
    const wasLocked = lockedBiomes.has(biomeId);
    const priorList = Array.isArray(previous[biomeId]) ? previous[biomeId] : [];
    if (wasLocked) {
      next[biomeId] = [...priorList];
      if (biome.synthetic) {
        biome.generatedSpecies = next[biomeId];
      } else if (biome.generatedSpecies) {
        delete biome.generatedSpecies;
      }
      return;
    }

    const preserved = priorList.filter((sp) => lockedSpecies.has(createPinKey(biome, sp)));
    const preservedIds = new Set(preserved.map((sp) => sp?.id).filter(Boolean));
    const picks = [...preserved];
    const limit = Math.max(MAX_SPECIES_PER_BIOME, preserved.length);

    if (biome.synthetic) {
      const hybrids = generateHybridSpecies(biome, filters, limit);
      hybrids.forEach((sp) => {
        const key = createPinKey(biome, sp);
        if (lockedSpecies.has(key)) {
          if (!preservedIds.has(sp?.id)) {
            picks.push(sp);
            preservedIds.add(sp?.id);
          }
          return;
        }
        if (picks.length >= limit) return;
        if (preservedIds.has(sp?.id)) return;
        picks.push(sp);
        preservedIds.add(sp?.id);
      });
      const uniquePicks = uniqueById(picks);
      next[biomeId] = uniquePicks.slice(0, limit);
      biome.generatedSpecies = next[biomeId];
      return;
    }

    const pool = filteredPool(biome, filters);
    const nativePool = biome.species ?? [];
    const working = pool.length ? pool : nativePool;
    const shuffled = shuffle(working).filter((sp) => {
      const key = createPinKey(biome, sp);
      return !lockedSpecies.has(key) && !preservedIds.has(sp?.id);
    });
    for (const sp of shuffled) {
      if (picks.length >= limit) break;
      picks.push(sp);
    }
    const uniquePicks = uniqueById(picks);
    next[biomeId] = uniquePicks.slice(0, limit);
    if (biome.generatedSpecies) {
      delete biome.generatedSpecies;
    }
  });

  state.pick.species = next;
  pruneLockState();
}

function rerollSeeds(filters) {
  const previous = state.pick.seeds ?? [];
  const lockedBiomes = state.cardState.locks.biomes;
  const next = [];
  state.pick.biomes.forEach((biome) => {
    if (lockedBiomes.has(biome.id)) {
      previous
        .filter((seed) => seed?.biome_id === biome.id)
        .forEach((seed) => next.push(seed));
      return;
    }
    ENCOUNTER_BLUEPRINTS.forEach((blueprint) => {
      const seed = createSeedFromBlueprint(biome, filters, blueprint);
      if (seed) {
        next.push(seed);
      }
    });
  });
  state.pick.seeds = next;
}


function createPinKey(biome, species) {
  const biomeId = biome?.id ?? "biome";
  const speciesId = species?.id ?? "species";
  return `${biomeId}::${speciesId}`;
}

function queryPinButton(key) {
  if (typeof document === "undefined") return null;
  const safeKey =
    typeof CSS !== "undefined" && typeof CSS.escape === "function"
      ? CSS.escape(key)
      : key.replace(/"/g, '\"');
  return document.querySelector(`button[data-pin-key="${safeKey}"]`);
}

function queryCompareButton(key) {
  if (typeof document === "undefined") return null;
  const safeKey =
    typeof CSS !== "undefined" && typeof CSS.escape === "function"
      ? CSS.escape(key)
      : key.replace(/"/g, '\"');
  return document.querySelector(`button[data-compare-key="${safeKey}"]`);
}

function applyQuickButtonState(button, isActive) {
  if (!button) return;
  button.classList.toggle("is-active", Boolean(isActive));
  button.setAttribute("aria-pressed", isActive ? "true" : "false");
}

function updatePinButtonState(key, active) {
  const button = queryPinButton(key);
  if (!button) return;
  applyQuickButtonState(button, active);
  const card = button.closest(".species-card");
  if (card) {
    card.dataset.pinned = active ? "true" : "false";
  }
}

function updateCompareButtonState(key, active) {
  const button = queryCompareButton(key);
  if (!button) return;
  applyQuickButtonState(button, active);
  const card = button.closest(".species-card");
  if (card) {
    card.dataset.compare = active ? "true" : "false";
  }
}

function stringHash(value = "") {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash);
    hash &= hash;
  }
  return Math.abs(hash);
}

function gradientFromString(value = "") {
  const hash = stringHash(value);
  const hue = hash % 360;
  const hueOffset = (hue + 36) % 360;
  return `linear-gradient(135deg, hsl(${hue}, 68%, 26%), hsl(${hueOffset}, 70%, 38%))`;
}

function colorPairFromString(value = "") {
  const hash = stringHash(value);
  const hue = hash % 360;
  const saturation = 70;
  const lightness = 58;
  return {
    border: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
    fill: `hsla(${hue}, ${saturation}%, ${lightness}%, 0.2)`,
  };
}

function initialsFromLabel(label) {
  if (!label) return "??";
  return label
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((segment) => segment[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function createPlaceholderImage(label, { variant = "card", seed } = {}) {
  const baseSeed = `${variant}:${seed ?? label ?? ""}`;
  const width = variant === "species" ? 200 : 320;
  const height = variant === "species" ? 200 : 180;
  const hash = stringHash(baseSeed);
  const hue = hash % 360;
  const accent = (hue + 34) % 360;
  const secondary = (hue + 210) % 360;
  const initials = initialsFromLabel(label);
  const gradientId = `grad-${hash.toString(16)}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Placeholder">
    <defs>
      <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="hsl(${hue}, 65%, 48%)" stop-opacity="0.88" />
        <stop offset="100%" stop-color="hsl(${accent}, 70%, 38%)" stop-opacity="0.85" />
      </linearGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="hsl(${secondary}, 68%, 14%)" />
    <rect width="${width}" height="${height}" fill="url(#${gradientId})" opacity="0.82" />
    <g fill="rgba(17,24,39,0.45)" transform="translate(${width / 2}, ${height / 2})">
      <circle r="${Math.min(width, height) / 2.1}" />
    </g>
    <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-family="'Segoe UI', 'Inter', sans-serif" font-weight="700" font-size="${Math.min(width, height) / 3}" fill="rgba(241,245,255,0.9)">${initials}</text>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function createCardMedia({ label, variant = "card", icon, backgroundKey, alt }) {
  const className = variant === "species" ? "species-card__media" : "generator-card__media";
  const wrapper = document.createElement("div");
  wrapper.className = className;
  const seed = backgroundKey ?? label ?? "";
  if (seed) {
    wrapper.style.background = gradientFromString(seed);
  }
  const image = document.createElement("img");
  image.loading = "lazy";
  image.decoding = "async";
  image.alt = alt ?? `Illustrazione segnaposto per ${label ?? "la carta"}`;
  image.src = createPlaceholderImage(label, { variant, seed });
  wrapper.appendChild(image);
  if (icon) {
    const glyphClass = variant === "species" ? "species-card__glyph" : "generator-card__media-glyph";
    const glyph = document.createElement("span");
    glyph.className = glyphClass;
    glyph.textContent = icon;
    wrapper.appendChild(glyph);
  }
  return wrapper;
}

function clampScale(value, max = 5) {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  return Math.min(value, max);
}

function biomePlaceholderLabel(biome) {
  if (biome?.emoji) return biome.emoji;
  if (biome?.icon) return biome.icon;
  const id = (biome?.id ?? "").toLowerCase();
  if (/ghiaccio|cryosteppe|neve|tundra/.test(id)) return "❄️";
  if (/foresta|bosco|giungla/.test(id)) return "🌲";
  if (/deserto|sabbia|duna/.test(id)) return "🏜️";
  if (/palude|swamp|marsh|laguna/.test(id)) return "🦎";
  if (/mont|rupe|alp/.test(id)) return "⛰️";
  if (/costa|reef|mare|oceano|litor/.test(id)) return "🌊";
  if (/vulc|lava|fuoco/.test(id)) return "🌋";
  const initials = (biome?.label ?? biome?.id ?? "??")
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((segment) => segment[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return initials || "🜨";
}

function speciesPlaceholderIcon(species) {
  if (species?.emoji) return species.emoji;
  if (species?.icon) return species.icon;
  const role = (species?.role_trofico ?? "").toLowerCase();
  if (/predatore_terziario|apex/.test(role)) return "🦈";
  if (/predatore/.test(role)) return "🦖";
  if (/erbivoro|prede|pastoral/.test(role)) return "🦌";
  if (/impollin/.test(role)) return "🪲";
  if (/detrit|saprof/.test(role)) return "🪱";
  if (/evento|anomalia|hazard/.test(role)) return "⚡";
  return "🧬";
}

function createBadgeElement(label, modifier) {
  const badge = document.createElement("span");
  badge.className = "badge";
  if (modifier) {
    badge.classList.add(`badge--${modifier}`);
  }
  badge.textContent = label;
  return badge;
}

function rarityFromTier(tier) {
  if (tier <= 1) return { label: "Comune", slug: "common" };
  if (tier === 2) return { label: "Non comune", slug: "uncommon" };
  if (tier === 3) return { label: "Raro", slug: "rare" };
  if (tier === 4) return { label: "Epico", slug: "epic" };
  return { label: "Leggendario", slug: "legendary" };
}

function extractFunctionalGroups(biome) {
  const groups = new Set();
  const manifestGroups = biome?.manifest?.functional_groups_present ?? [];
  manifestGroups.forEach((group) => {
    if (group) groups.add(group);
  });
  const functional = biome?.functional_groups ?? biome?.functionalGroups ?? [];
  functional.forEach((group) => {
    if (group) groups.add(group);
  });
  const tags = biome?.functional_tags ?? [];
  tags.forEach((tag) => {
    if (tag) groups.add(tag);
  });
  return groups;
}

function calculateSynergy(species, biome) {
  const groups = extractFunctionalGroups(biome);
  const tags = Array.isArray(species?.functional_tags) ? species.functional_tags : [];
  const matches = tags.filter((tag) => groups.has(tag));
  let percent;
  if (groups.size && tags.length) {
    percent = Math.round((matches.length / groups.size) * 100);
  } else if (tags.length) {
    percent = 55;
  } else {
    percent = 30;
  }
  const flags = species?.flags ?? {};
  if (flags.keystone) percent += 12;
  if (flags.apex) percent += 14;
  if (flags.threat) percent += 8;
  if (flags.bridge) percent += 6;
  if (flags.event) percent -= 4;
  if (species?.synthetic) percent += 4;
  percent += Math.max(0, tierOf(species) - 2) * 4;
  percent = Math.max(10, Math.min(100, percent));
  const summary = matches.length
    ? `Sinergie attive: ${matches.join(", ")}`
    : tags.length
    ? `Tag funzionali da connettere: ${tags.join(", ")}`
    : "Nessun tag funzionale dichiarato.";
  return {
    percent,
    matches,
    tags,
    groups: Array.from(groups),
    summary,
  };
}

function createSynergyMeter(info) {
  const meter = document.createElement("div");
  meter.className = "synergy-meter";
  const labelRow = document.createElement("div");
  labelRow.className = "synergy-meter__label";
  const label = document.createElement("span");
  label.textContent = "Sinergia ecosistema";
  const value = document.createElement("span");
  value.className = "synergy-meter__value";
  value.textContent = `${info.percent}%`;
  labelRow.append(label, value);
  meter.appendChild(labelRow);
  const track = document.createElement("div");
  track.className = "synergy-meter__track";
  const progress = document.createElement("div");
  progress.className = "synergy-meter__progress";
  progress.style.setProperty("--progress", `${info.percent}%`);
  track.appendChild(progress);
  meter.appendChild(track);
  return meter;
}

function findBiomeById(biomeId) {
  if (!biomeId) return null;
  const fromPick = state.pick?.biomes?.find((biome) => biome.id === biomeId);
  if (fromPick) return fromPick;
  const fromCatalog = state.data?.biomi?.find((biome) => biome.id === biomeId);
  if (fromCatalog) return fromCatalog;
  return null;
}

function findSpeciesInPick(biomeId, speciesId) {
  if (!biomeId || !speciesId) return null;
  const bucket = state.pick?.species?.[biomeId];
  if (!Array.isArray(bucket)) return null;
  return bucket.find((sp) => sp.id === speciesId) ?? null;
}

function splitRoleTokens(value) {
  if (typeof value !== "string") return [];
  return value
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim())
    .filter(Boolean);
}

function collectRoleTokenDetails(species) {
  const tokens = [];
  const seen = new Set();
  const consider = (value) => {
    splitRoleTokens(value).forEach((token) => {
      if (!token) return;
      const normalized = token.toLowerCase();
      if (seen.has(normalized)) return;
      seen.add(normalized);
      tokens.push(token);
    });
  };
  if (Array.isArray(species?.roles)) {
    species.roles.forEach((role) => consider(role));
  }
  consider(species?.role_trofico ?? "");
  return tokens;
}

function roleTokenCount(species) {
  return collectRoleTokenDetails(species).length;
}

function formatRoleTokenLabel(token) {
  if (!token) return "";
  return titleCase(token.replace(/[_-]+/g, " "));
}

function collectHazardIds(species) {
  const hazardIds = new Set();
  const add = (value) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach((item) => add(item));
      return;
    }
    if (typeof value === "string") {
      value
        .split(/[\s,;]+/)
        .map((item) => item.trim())
        .filter(Boolean)
        .forEach((item) => hazardIds.add(item));
      return;
    }
    if (typeof value === "object") {
      Object.keys(value).forEach((key) => hazardIds.add(key));
    }
  };

  add(species?.meta?.hazard_profile);
  add(species?.hazard_profile);
  add(species?.hazards_expected);
  add(species?.hazardsExpected);

  return Array.from(hazardIds);
}

function formatHazardLabel(hazardId) {
  if (!hazardId) return "";
  const entry = state.hazardsIndex.get(hazardId);
  if (entry?.label) return entry.label;
  return titleCase(String(hazardId));
}

function hazardSignalInfo(species) {
  const hazardIds = collectHazardIds(species);
  let hazardSignals = hazardIds.length;
  const roleHint = species?.role_trofico ?? "";
  if (species?.flags?.threat || /minaccia|hazard|evento/i.test(roleHint)) {
    hazardSignals = Math.max(hazardSignals + 1, 2);
  }
  return { hazardSignals, hazardIds };
}

function hazardSignalCount(species) {
  return hazardSignalInfo(species).hazardSignals;
}

function calculateSpeciesMetrics(species) {
  const tier = Number.parseFloat(tierOf(species) ?? 0);
  const { hazardSignals, hazardIds } = hazardSignalInfo(species);
  const hazardNames = hazardIds.map((hazardId) => formatHazardLabel(hazardId));
  const rawRoleTokens = collectRoleTokenDetails(species);
  const roleTokenLabels = rawRoleTokens.map((token) => formatRoleTokenLabel(token));
  const roleTokens = rawRoleTokens.length;
  return {
    tierAverage: clampScale(Number.isFinite(tier) ? tier : 0),
    hazardDensity: clampScale(hazardSignals),
    roleDiversity: clampScale(roleTokens),
    detail: {
      tier: Number.isFinite(tier) ? tier : 0,
      hazardSignals,
      hazardIds,
      hazardNames,
      roleTokens,
      roleTokenList: roleTokenLabels,
    },
  };
}

function roleDisplayName(species) {
  if (!species?.role_trofico) {
    return "Ruolo sconosciuto";
  }
  return titleCase(species.role_trofico.replace(/_/g, " "));
}

function formatTierValue(value) {
  const parsed = Number.parseFloat(value ?? 0);
  const safe = Number.isFinite(parsed) ? parsed : 0;
  return `T${safe.toFixed(1)}`;
}

function createComparisonEntry(biome, species) {
  const key = createPinKey(biome, species);
  return {
    key,
    biomeId: biome?.id ?? "biome",
    biomeLabel: biome?.label ?? titleCase(biome?.id ?? ""),
    speciesId: species?.id ?? key,
    displayName: species?.display_name ?? species?.id ?? "Specie",
    roleName: roleDisplayName(species),
    metrics: calculateSpeciesMetrics(species),
    synthetic: Boolean(species?.synthetic || biome?.synthetic),
  };
}

function createQuickButton({ icon, label, className }) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = ["quick-button", className].filter(Boolean).join(" ");
  button.innerHTML = `<span aria-hidden="true">${icon}</span><span class="visually-hidden">${label}</span>`;
  button.setAttribute("aria-pressed", "false");
  return button;
}

function isBiomeLocked(biomeId) {
  if (!biomeId) return false;
  return state.cardState.locks.biomes.has(biomeId);
}

function toggleBiomeLock(biome, { announce = true } = {}) {
  const id = biome?.id;
  if (!id) return false;
  const locks = state.cardState.locks.biomes;
  const label = biome?.label ?? titleCase(id ?? "");
  let locked;
  if (locks.has(id)) {
    locks.delete(id);
    locked = false;
    if (announce) {
      setStatus(`${label} sbloccato.`, "info", {
        tags: ["lock", "bioma"],
        action: "biome-unlock",
      });
    }
  } else {
    locks.add(id);
    locked = true;
    if (announce) {
      setStatus(`${label} bloccato per i prossimi re-roll.`, "success", {
        tags: ["lock", "bioma"],
        action: "biome-lock",
      });
    }
  }
  persistLockState();
  return locked;
}

function isSpeciesLocked(biome, species) {
  const key = createPinKey(biome, species);
  return state.cardState.locks.species.has(key);
}

function toggleSpeciesLock(biome, species, { announce = true } = {}) {
  const key = createPinKey(biome, species);
  const locks = state.cardState.locks.species;
  const displayName = species?.display_name ?? species?.id ?? "Specie";
  let locked;
  if (locks.has(key)) {
    locks.delete(key);
    locked = false;
    if (announce) {
      setStatus(`${displayName} sbloccata.`, "info", {
        tags: ["lock", "specie"],
        action: "species-unlock",
      });
    }
  } else {
    locks.add(key);
    locked = true;
    if (announce) {
      setStatus(`${displayName} bloccata nei prossimi re-roll.`, "success", {
        tags: ["lock", "specie"],
        action: "species-lock",
      });
    }
  }
  persistLockState();
  return locked;
}

function togglePinned(biome, species, { announce = true } = {}) {
  const key = createPinKey(biome, species);
  const store = state.cardState.pinned;
  const displayName = species?.display_name ?? species?.id ?? "Specie";
  if (store.has(key)) {
    store.delete(key);
    if (announce) {
      setStatus(`${displayName} rimosso dalle specie pinnate.`, "info", {
        tags: ["specie", "pin"],
        action: "species-unpin",
      });
    }
    updatePinButtonState(key, false);
    renderPinnedSummary();
    persistPinnedState();
    return false;
  }
  const tier = tierOf(species);
  const rarity = rarityFromTier(tier);
  store.set(key, {
    key,
    speciesId: species?.id ?? key,
    biomeId: biome?.id ?? "biome",
    displayName,
    biomeLabel: biome?.label ?? titleCase(biome?.id ?? ""),
    tier,
    rarity: rarity.label,
    slug: rarity.slug,
    synthetic: Boolean(species?.synthetic || biome?.synthetic),
  });
  if (announce) {
    setStatus(`${displayName} aggiunto alle specie pinnate.`, "success", {
      tags: ["specie", "pin"],
      action: "species-pin",
    });
  }
  updatePinButtonState(key, true);
  renderPinnedSummary();
  persistPinnedState();
  return true;
}

function removeComparisonEntry(key, { announce = false, reRender = true } = {}) {
  const store = state.cardState.comparison;
  if (!store?.has(key)) return;
  const entry = store.get(key);
  store.delete(key);
  updateCompareButtonState(key, false);
  if (announce) {
    const label = entry?.displayName ?? "Specie";
    setStatus(`${label} rimossa dal confronto.`, "info", {
      tags: ["confronto"],
      action: "compare-remove",
    });
  }
  if (reRender) {
    renderComparisonPanel();
  }
}

function toggleComparison(biome, species, { announce = true } = {}) {
  const key = createPinKey(biome, species);
  const store = state.cardState.comparison;
  if (store.has(key)) {
    removeComparisonEntry(key, { announce, reRender: true });
    return false;
  }
  if (store.size >= 3) {
    if (announce) {
      setStatus("Puoi confrontare al massimo tre specie alla volta.", "warn", {
        tags: ["confronto", "limite"],
        action: "compare-limit",
      });
    }
    return false;
  }
  const entry = createComparisonEntry(biome, species);
  store.set(key, entry);
  updateCompareButtonState(key, true);
  renderComparisonPanel();
  if (announce) {
    setStatus(`${entry.displayName} aggiunta al confronto.`, "success", {
      tags: ["confronto"],
      action: "compare-add",
    });
  }
  return true;
}

function syncComparisonStore() {
  const store = state.cardState.comparison;
  if (!store?.size) return 0;
  const stale = [];
  store.forEach((entry, key) => {
    const species = findSpeciesInPick(entry.biomeId, entry.speciesId);
    if (!species) {
      stale.push(key);
      return;
    }
    entry.displayName = species.display_name ?? species.id ?? entry.displayName;
    entry.roleName = roleDisplayName(species);
    entry.metrics = calculateSpeciesMetrics(species);
    const biome = findBiomeById(entry.biomeId);
    entry.biomeLabel = biome?.label ?? titleCase(biome?.id ?? entry.biomeId ?? "");
    entry.synthetic = Boolean(species.synthetic || biome?.synthetic);
  });
  stale.forEach((key) => {
    store.delete(key);
    updateCompareButtonState(key, false);
  });
  return stale.length;
}

function ensureComparisonChart() {
  if (!elements.compareCanvas) return null;
  if (comparisonChart) return comparisonChart;
  if (typeof Chart === "undefined") {
    if (!chartUnavailableNotified) {
      console.warn(
        "Chart.js non disponibile: il confronto radar verrà mostrato solo come elenco."
      );
      chartUnavailableNotified = true;
    }
    if (elements.compareFallback) {
      elements.compareFallback.hidden = false;
    }
    elements.compareCanvas.hidden = true;
    return null;
  }

  elements.compareCanvas.hidden = false;
  if (elements.compareFallback) {
    elements.compareFallback.hidden = true;
  }

  const context = elements.compareCanvas.getContext("2d");
  if (!context) return null;

  comparisonChart = new Chart(context, {
    type: "radar",
    data: {
      labels: COMPARISON_LABELS,
      datasets: [],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          beginAtZero: true,
          suggestedMax: 5,
          angleLines: { color: "rgba(148, 196, 255, 0.18)" },
          grid: { color: "rgba(148, 196, 255, 0.12)" },
          ticks: {
            stepSize: 1,
            showLabelBackdrop: false,
            color: "rgba(148, 196, 255, 0.65)",
          },
          pointLabels: {
            color: "rgba(226, 240, 255, 0.82)",
            font: { size: 12 },
          },
        },
      },
      plugins: {
        legend: {
          labels: {
            color: "#e2f0ff",
            font: { size: 12 },
          },
        },
        tooltip: {
          backgroundColor: "rgba(15, 23, 42, 0.92)",
          titleColor: "#f8fafc",
          bodyColor: "#f8fafc",
          borderColor: "rgba(148, 196, 255, 0.35)",
          borderWidth: 1,
          callbacks: {
            label(context) {
              const detail = context.dataset?.metaDetails ?? {};
              switch (context.dataIndex) {
                case 0: {
                  const tier = Number.isFinite(detail.tier) ? detail.tier : context.parsed.r;
                  return `Tier medio: ${formatTierValue(tier)}`;
                }
                case 1: {
                  const hazard = Number.isFinite(detail.hazardSignals)
                    ? detail.hazardSignals
                    : context.parsed.r;
                  const label = hazard === 1 ? "segnale" : "segnali";
                  const hazardNames = Array.isArray(detail.hazardNames)
                    ? detail.hazardNames.filter(Boolean)
                    : [];
                  const maxDisplay = 3;
                  const display = hazardNames.slice(0, maxDisplay);
                  const more = hazardNames.length > display.length ? "…" : "";
                  const hint = display.length ? ` (${display.join(", ")}${more})` : "";
                  return `Densità hazard: ${hazard} ${label}${hint}`;
                }
                case 2: {
                  const roles = Number.isFinite(detail.roleTokens)
                    ? detail.roleTokens
                    : context.parsed.r;
                  const label = roles === 1 ? "archetipo" : "archetipi";
                  const roleTokens = Array.isArray(detail.roleTokenList)
                    ? detail.roleTokenList.filter(Boolean)
                    : [];
                  const maxDisplay = 4;
                  const display = roleTokens.slice(0, maxDisplay);
                  const more = roleTokens.length > display.length ? "…" : "";
                  const hint = display.length ? ` (${display.join(", ")}${more})` : "";
                  return `Diversità ruoli: ${roles} ${label}${hint}`;
                }
                default:
                  return `${context.label}: ${context.formattedValue}`;
              }
            },
          },
        },
      },
    },
  });

  return comparisonChart;
}

function updateComparisonChart(entries) {
  if (!entries?.length) {
    if (comparisonChart) {
      comparisonChart.data.datasets = [];
      comparisonChart.update();
    }
    return;
  }

  const chart = ensureComparisonChart();
  if (!chart) {
    if (elements.compareFallback) {
      elements.compareFallback.hidden = false;
    }
    return;
  }

  chart.data.labels = COMPARISON_LABELS;
  chart.data.datasets = entries.map((entry) => {
    const colors = colorPairFromString(entry.key);
    return {
      label: entry.displayName,
      data: [
        entry.metrics.tierAverage,
        entry.metrics.hazardDensity,
        entry.metrics.roleDiversity,
      ],
      fill: true,
      backgroundColor: colors.fill,
      borderColor: colors.border,
      pointBackgroundColor: colors.border,
      pointBorderColor: "#0f172a",
      pointHoverBackgroundColor: "#f8fafc",
      pointHoverBorderColor: colors.border,
      metaDetails: entry.metrics.detail,
    };
  });
  const maxValue = entries.reduce((acc, entry) => {
    return Math.max(
      acc,
      entry.metrics.tierAverage,
      entry.metrics.hazardDensity,
      entry.metrics.roleDiversity
    );
  }, 0);
  if (chart.options?.scales?.r) {
    const buffer = maxValue >= 4 ? 1 : 0.5;
    chart.options.scales.r.suggestedMax = Math.max(5, Math.ceil(maxValue + buffer));
  }
  chart.update();
}

function renderComparisonPanel() {
  const list = elements.compareList;
  if (!list) return;
  const entries = Array.from(state.cardState.comparison.values());
  list.innerHTML = "";
  const hasEntries = entries.length > 0;
  list.hidden = !hasEntries;
  if (elements.compareEmpty) {
    elements.compareEmpty.hidden = hasEntries;
  }
  if (elements.comparePanel) {
    elements.comparePanel.dataset.state = hasEntries ? "filled" : "empty";
  }
  if (elements.summaryContainer) {
    elements.summaryContainer.dataset.hasComparison = hasEntries ? "true" : "false";
  }
  if (elements.compareChartContainer) {
    elements.compareChartContainer.hidden = !hasEntries;
  }

  entries.forEach((entry) => {
    const item = document.createElement("li");
    item.className = "generator-compare__item";
    item.dataset.compareKey = entry.key;

    const info = document.createElement("div");
    info.className = "generator-compare__info";
    item.appendChild(info);

    const name = document.createElement("p");
    name.className = "generator-compare__name";
    name.textContent = entry.displayName;
    info.appendChild(name);

    const meta = document.createElement("p");
    meta.className = "generator-compare__meta";
    const metaParts = [entry.biomeLabel];
    if (entry.roleName) {
      metaParts.push(entry.roleName);
    }
    if (entry.synthetic) {
      metaParts.push("Synth");
    }
    meta.textContent = metaParts.filter(Boolean).join(" · ");
    info.appendChild(meta);

    const metrics = document.createElement("div");
    metrics.className = "generator-compare__metrics";

    const tierMetric = document.createElement("span");
    tierMetric.className = "generator-compare__metric";
    tierMetric.innerHTML = `<span class="generator-compare__metric-label">Tier medio</span> ${formatTierValue(
      entry.metrics.detail.tier
    )}`;
    tierMetric.title = `Tier stimato: ${formatTierValue(entry.metrics.detail.tier)}`;
    metrics.appendChild(tierMetric);

    const hazardMetric = document.createElement("span");
    hazardMetric.className = "generator-compare__metric";
    const hazardSignals = Number.isFinite(entry.metrics.detail.hazardSignals)
      ? entry.metrics.detail.hazardSignals
      : 0;
    const hazardLabel = hazardSignals === 1 ? "segnale" : "segnali";
    hazardMetric.innerHTML = `<span class="generator-compare__metric-label">Densità hazard</span> ${hazardSignals} ${hazardLabel}`;
    if (Array.isArray(entry.metrics.detail.hazardNames) && entry.metrics.detail.hazardNames.length) {
      hazardMetric.title = entry.metrics.detail.hazardNames.join(", ");
    }
    metrics.appendChild(hazardMetric);

    const roleMetric = document.createElement("span");
    roleMetric.className = "generator-compare__metric";
    const roleTokens = Number.isFinite(entry.metrics.detail.roleTokens)
      ? entry.metrics.detail.roleTokens
      : 0;
    const roleLabel = roleTokens === 1 ? "archetipo" : "archetipi";
    roleMetric.innerHTML = `<span class="generator-compare__metric-label">Diversità ruoli</span> ${roleTokens} ${roleLabel}`;
    if (Array.isArray(entry.metrics.detail.roleTokenList) && entry.metrics.detail.roleTokenList.length) {
      roleMetric.title = entry.metrics.detail.roleTokenList.join(", ");
    }
    metrics.appendChild(roleMetric);

    info.appendChild(metrics);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "generator-compare__remove";
    remove.dataset.action = "remove-compare";
    remove.dataset.compareKey = entry.key;
    remove.innerHTML = "&times;";
    item.appendChild(remove);

    list.appendChild(item);
  });

  if (hasEntries) {
    updateComparisonChart(entries);
  } else if (elements.compareFallback) {
    elements.compareFallback.hidden = true;
    if (elements.compareCanvas) {
      elements.compareCanvas.hidden = false;
    }
    updateComparisonChart([]);
  }
}

function attachComparisonHandlers() {
  const list = elements.compareList;
  if (!list) return;
  list.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const button = target.closest("[data-action=\"remove-compare\"]");
    if (!button) return;
    event.preventDefault();
    const { compareKey } = button.dataset;
    if (!compareKey) return;
    removeComparisonEntry(compareKey, { announce: true });
  });
}

function toggleSquad(biome, species) {
  const key = createPinKey(biome, species);
  const store = state.cardState.squad;
  const displayName = species?.display_name ?? species?.id ?? "Specie";
  if (store.has(key)) {
    store.delete(key);
    setStatus(`${displayName} rimosso dalla squadra rapida.`, "info", {
      tags: ["squadra"],
      action: "squad-remove",
    });
    return false;
  }
  store.set(key, {
    key,
    speciesId: species?.id ?? key,
    biomeId: biome?.id ?? "biome",
    displayName,
    tier: tierOf(species),
  });
  setStatus(`${displayName} aggiunto alla squadra rapida.`, "success", {
    tags: ["squadra"],
    action: "squad-add",
  });
  return true;
}

function createSpeciesCard(biome, species) {
  const displayName = species?.display_name ?? species?.id ?? "Specie sconosciuta";
  const card = document.createElement("article");
  card.className = "species-card";
  card.dataset.cardType = "species";
  const pinKey = createPinKey(biome, species);
  if (state.cardState.pinned.has(pinKey)) {
    card.dataset.pinned = "true";
  }
  if (state.cardState.comparison.has(pinKey)) {
    card.dataset.compare = "true";
  }
  if (isSpeciesLocked(biome, species)) {
    card.dataset.locked = "true";
  }

  const tier = tierOf(species);
  const rarity = rarityFromTier(tier);
  card.dataset.rarity = rarity.slug;
  card.dataset.tier = `T${tier}`;
  if (species?.synthetic || biome?.synthetic) {
    card.dataset.synthetic = "true";
  }

  const media = createCardMedia({
    label: displayName,
    variant: "species",
    icon: speciesPlaceholderIcon(species),
    backgroundKey: species?.id ?? displayName,
    alt: `Segnaposto per ${displayName}`,
  });
  card.appendChild(media);

  const info = document.createElement("div");
  info.className = "species-card__info";
  card.appendChild(info);

  const header = document.createElement("div");
  header.className = "species-card__header";
  info.appendChild(header);

  const title = document.createElement("div");
  title.className = "species-card__title";
  header.appendChild(title);

  const name = document.createElement("h4");
  name.className = "species-card__name";
  name.textContent = displayName;
  title.appendChild(name);

  const id = document.createElement("p");
  id.className = "species-card__id";
  id.textContent = species?.id ?? "—";
  title.appendChild(id);

  const controls = document.createElement("div");
  controls.className = "species-card__controls";
  header.appendChild(controls);

  const badges = document.createElement("div");
  badges.className = "species-card__badges";
  badges.appendChild(createBadgeElement(rarity.label, `rarity-${rarity.slug}`));
  if (species?.synthetic || biome?.synthetic) {
    badges.appendChild(createBadgeElement("Synth", "synth"));
  }
  controls.appendChild(badges);

  const actions = document.createElement("div");
  actions.className = "species-card__actions";
  controls.appendChild(actions);

  const squadButton = createQuickButton({
    icon: "⚔️",
    label: `Aggiungi ${displayName} alla squadra rapida`,
    className: "quick-button--squad",
  });
  applyQuickButtonState(squadButton, state.cardState.squad.has(pinKey));
  squadButton.addEventListener("click", (event) => {
    event.preventDefault();
    const active = toggleSquad(biome, species);
    applyQuickButtonState(squadButton, active);
  });
  actions.appendChild(squadButton);

  const lockActive = isSpeciesLocked(biome, species);
  const lockButton = createQuickButton({
    icon: lockActive ? "🔒" : "🔓",
    label: `Blocca ${displayName} nei re-roll`,
    className: "quick-button--lock",
  });
  applyQuickButtonState(lockButton, lockActive);
  lockButton.dataset.lockKey = pinKey;
  lockButton.addEventListener("click", (event) => {
    event.preventDefault();
    const locked = toggleSpeciesLock(biome, species);
    applyQuickButtonState(lockButton, locked);
    const icon = lockButton.querySelector("span");
    if (icon) {
      icon.textContent = locked ? "🔒" : "🔓";
    }
    card.dataset.locked = locked ? "true" : "false";
  });
  actions.appendChild(lockButton);

  const pinButton = createQuickButton({
    icon: "📌",
    label: `Pin ${displayName} nel riepilogo`,
    className: "quick-button--pin",
  });
  pinButton.dataset.pinKey = pinKey;
  applyQuickButtonState(pinButton, state.cardState.pinned.has(pinKey));
  pinButton.addEventListener("click", (event) => {
    event.preventDefault();
    const active = togglePinned(biome, species);
    applyQuickButtonState(pinButton, active);
    card.dataset.pinned = active ? "true" : "false";
  });
  actions.appendChild(pinButton);

  const compareButton = createQuickButton({
    icon: "📊",
    label: `Confronta ${displayName} nel radar`,
    className: "quick-button--compare",
  });
  compareButton.dataset.compareKey = pinKey;
  applyQuickButtonState(compareButton, state.cardState.comparison.has(pinKey));
  compareButton.addEventListener("click", (event) => {
    event.preventDefault();
    const active = toggleComparison(biome, species);
    applyQuickButtonState(compareButton, active);
    card.dataset.compare = active ? "true" : "false";
  });
  actions.appendChild(compareButton);

  const meta = document.createElement("div");
  meta.className = "species-card__meta";
  const role = species?.role_trofico ? titleCase(species.role_trofico) : "Ruolo sconosciuto";
  const roleSpan = document.createElement("span");
  roleSpan.textContent = role;
  meta.appendChild(roleSpan);
  const tierSpan = document.createElement("span");
  tierSpan.textContent = `Tier T${tier}`;
  meta.appendChild(tierSpan);
  const notableFlags = ["keystone", "apex", "bridge", "threat", "event"].filter((flag) => species.flags?.[flag]);
  if (notableFlags.length) {
    const flagSpan = document.createElement("span");
    flagSpan.textContent = `Flag: ${notableFlags.map((flag) => titleCase(flag.replace(/_/g, " "))).join(", ")}`;
    meta.appendChild(flagSpan);
  }
  info.appendChild(meta);

  const tags = Array.isArray(species.functional_tags) ? species.functional_tags : [];
  if (tags.length) {
    const tagContainer = document.createElement("div");
    tagContainer.className = "species-card__tags";
    const maxVisible = 5;
    tags.slice(0, maxVisible).forEach((tag) => {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.textContent = tag;
      tagContainer.appendChild(chip);
    });
    if (tags.length > maxVisible) {
      const remainder = document.createElement("span");
      remainder.className = "chip";
      remainder.textContent = `+${tags.length - maxVisible}`;
      tagContainer.appendChild(remainder);
    }
    info.appendChild(tagContainer);
  }

  const synergy = calculateSynergy(species, biome);
  const meter = createSynergyMeter(synergy);
  info.appendChild(meter);

  if (synergy.summary) {
    const summary = document.createElement("p");
    summary.className = "species-card__summary";
    summary.textContent = synergy.summary;
    info.appendChild(summary);
  }

  return card;
}

function buildBiomeCard(biome, filters) {
  const card = document.createElement("article");
  card.className = "generator-card";
  card.dataset.biomeId = biome.id;
  card.dataset.cardType = "biome";
  if (biome?.synthetic) {
    card.dataset.synthetic = "true";
  }
  if (isBiomeLocked(biome.id)) {
    card.dataset.locked = "true";
  }
  card.setAttribute("role", "listitem");

  const titleText = biome.synthetic
    ? biome.label ?? titleCase(biome.id ?? "")
    : titleCase(biome.id ?? "");
  const media = createCardMedia({
    label: titleText,
    variant: "biome",
    icon: biomePlaceholderLabel(biome),
    backgroundKey: biome.id ?? biome.label ?? titleText,
    alt: `Segnaposto per il bioma ${titleText}`,
  });
  card.appendChild(media);

  const body = document.createElement("div");
  body.className = "generator-card__body";
  card.appendChild(body);

  const header = document.createElement("div");
  header.className = "generator-card__header";
  body.appendChild(header);

  const titleGroup = document.createElement("div");
  titleGroup.className = "generator-card__title-group";
  header.appendChild(titleGroup);

  const title = document.createElement("h3");
  title.className = "generator-card__title";
  title.textContent = titleText;
  titleGroup.appendChild(title);

  const subtitle = document.createElement("p");
  subtitle.className = "generator-card__subtitle";
  subtitle.textContent = `ID: ${biome.id}`;
  titleGroup.appendChild(subtitle);

  const badges = document.createElement("div");
  badges.className = "generator-card__badges";
  const speciesCount = (state.pick.species?.[biome.id] ?? []).length;
  badges.appendChild(createBadgeElement(`${speciesCount} specie`, ""));
  if (biome.synthetic) {
    badges.appendChild(createBadgeElement("Synth", "synth"));
  }
  const headerTools = document.createElement("div");
  headerTools.className = "generator-card__header-tools";
  headerTools.appendChild(badges);

  const biomeLocked = isBiomeLocked(biome.id);
  const lockButton = document.createElement("button");
  lockButton.type = "button";
  lockButton.className = "generator-card__lock";
  lockButton.dataset.biomeId = biome.id;
  const lockIcon = document.createElement("span");
  lockIcon.className = "generator-card__lock-icon";
  lockIcon.textContent = biomeLocked ? "🔒" : "🔓";
  lockButton.appendChild(lockIcon);
  const lockLabel = document.createElement("span");
  lockLabel.className = "visually-hidden";
  lockLabel.textContent = biomeLocked
    ? `Sblocca ${titleText}`
    : `Blocca ${titleText}`;
  lockButton.appendChild(lockLabel);
  lockButton.addEventListener("click", (event) => {
    event.preventDefault();
    const locked = toggleBiomeLock(biome);
    lockIcon.textContent = locked ? "🔒" : "🔓";
    lockLabel.textContent = locked ? `Sblocca ${titleText}` : `Blocca ${titleText}`;
    card.dataset.locked = locked ? "true" : "false";
  });
  headerTools.appendChild(lockButton);

  header.appendChild(headerTools);

  const meta = document.createElement("p");
  meta.className = "generator-card__meta";
  if (biome.synthetic) {
    const parents = (biome.parents ?? [])
      .map((parent) => parent.label ?? titleCase(parent.id ?? ""))
      .filter(Boolean);
    meta.textContent = parents.length
      ? `Origine sintetica da ${parents.join(" + ")}`
      : "Origine sintetica procedurale.";
  } else {
    meta.textContent = biome.description ?? "Bioma del catalogo originale.";
  }
  body.appendChild(meta);

  if (!biome.synthetic) {
    const links = document.createElement("div");
    links.className = "generator-card__links";
    const biomeHref = resolvePackHref(biome.path);
    if (biomeHref) {
      const link = document.createElement("a");
      link.href = biomeHref;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = "Bioma YAML";
      links.appendChild(link);
    }
    const foodwebHref = biome.foodweb?.path ? resolvePackHref(biome.foodweb.path) : null;
    if (foodwebHref) {
      const link = document.createElement("a");
      link.href = foodwebHref;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = "Foodweb";
      links.appendChild(link);
    }
    try {
      const reportHref = new URL(`catalog.html#bioma-${biome.id}`, window.location.href).toString();
      const link = document.createElement("a");
      link.href = reportHref;
      link.textContent = "Report";
      links.appendChild(link);
    } catch (error) {
      console.warn("Impossibile calcolare il link al report del bioma", biome.id, error);
    }
    if (links.childElementCount) {
      body.appendChild(links);
    }
  }

  const speciesContainer = document.createElement("ul");
  speciesContainer.className = "generator-card__species";
  speciesContainer.setAttribute("role", "list");
  const picked = state.pick.species?.[biome.id] ?? [];
  if (!picked.length) {
    const empty = document.createElement("li");
    empty.className = "generator-card__empty";
    const filtersText = [];
    if (filters.flags.length) filtersText.push(`flag: ${filters.flags.join(", ")}`);
    if (filters.roles.length) filtersText.push(`ruoli: ${filters.roles.join(", ")}`);
    if (filters.tags.length) filtersText.push(`tag: ${filters.tags.join(", ")}`);
    empty.textContent = filtersText.length
      ? `Nessuna specie soddisfa i filtri correnti (${filtersText.join(" · ")}).`
      : "Nessuna specie estratta, effettua un nuovo re-roll.";
    speciesContainer.appendChild(empty);
  } else {
    picked.forEach((sp) => {
      const item = document.createElement("li");
      item.className = "generator-card__species-item";
      item.appendChild(createSpeciesCard(biome, sp));
      speciesContainer.appendChild(item);
    });
  }
  body.appendChild(speciesContainer);

  const traitInfo = gatherTraitInfoForBiome(biome);
  const traitBlock = traitInfo ? buildTraitBlock(traitInfo, { synthetic: Boolean(biome.synthetic) }) : null;
  if (traitBlock) {
    body.appendChild(traitBlock);
  }

  return card;
}

function buildCombinedRolePresets(roleStats) {
  if (!(roleStats instanceof Map) || !roleStats.size) {
    return [];
  }

  const entries = Array.from(roleStats.entries())
    .map(([roleKey, info]) => {
      const count = info?.count ?? 0;
      if (!count) {
        return null;
      }
      const totalSynergy = info?.synergy ?? 0;
      const average = count ? Math.round(totalSynergy / count) : 0;
      const label = roleKey
        ? titleCase(String(roleKey).replace(/[_-]+/g, " "))
        : "Ruolo indefinito";
      const flags = info?.flags instanceof Set ? Array.from(info.flags) : [];
      const tags = info?.tags instanceof Set ? Array.from(info.tags) : [];
      return { role: roleKey, label, count, average, flags, tags };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (b.average === a.average) {
        return b.count - a.count;
      }
      return b.average - a.average;
    });

  if (!entries.length) {
    return [];
  }

  const presets = [];
  const seen = new Set();

  const registerPreset = (roleEntries) => {
    if (!Array.isArray(roleEntries) || !roleEntries.length) return;
    const key = roleEntries
      .map((entry) => entry.role)
      .filter(Boolean)
      .sort()
      .join("+");
    if (!key || seen.has(key)) return;
    const combinedFlags = new Set();
    const combinedTags = new Set();
    let weightedSum = 0;
    let totalCount = 0;
    roleEntries.forEach((entry) => {
      entry.flags.forEach((flag) => combinedFlags.add(flag));
      entry.tags.forEach((tag) => combinedTags.add(tag));
      weightedSum += entry.average * entry.count;
      totalCount += entry.count;
    });
    const average = totalCount
      ? Math.round(weightedSum / totalCount)
      : Math.round(
          roleEntries.reduce((sum, entry) => sum + entry.average, 0) /
            roleEntries.length
        );
    const usage = roleEntries.reduce((sum, entry) => sum + entry.count, 0);
    const filters = {
      flags: Array.from(combinedFlags),
      roles: roleEntries.map((entry) => entry.role),
      tags: Array.from(combinedTags).slice(0, 4),
    };
    const label = roleEntries.map((entry) => entry.label).join(" + ");
    presets.push({
      id: `composer-${slugify(key) || slugify(label) || randomId("preset")}`,
      label,
      filters,
      synergy: average,
      usage,
      highlightTags: filters.tags.slice(0, 3),
    });
    seen.add(key);
  };

  registerPreset([entries[0]]);

  for (let i = 0; i < entries.length && presets.length < 4; i += 1) {
    for (let j = i + 1; j < entries.length && presets.length < 4; j += 1) {
      registerPreset([entries[i], entries[j]]);
    }
  }

  if (presets.length < 4 && entries.length > 1) {
    registerPreset(entries.slice(0, Math.min(entries.length, 3)));
  }

  return presets;
}

function buildComposerSuggestions({ heatmap, combinedPresets, constraints, flagStats }) {
  const suggestions = [];
  const minSynergy = Number.isFinite(constraints?.minSynergy)
    ? constraints.minSynergy
    : 0;
  const populatedRows = Array.isArray(heatmap)
    ? heatmap.filter((row) =>
        Array.isArray(row?.values) && row.values.some((cell) => cell.count > 0)
      )
    : [];

  if (populatedRows.length) {
    const lowCells = [];
    populatedRows.forEach((row) => {
      row.values
        .filter((cell) => cell.count > 0)
        .forEach((cell) => {
          if (cell.average < minSynergy) {
            lowCells.push({ row, cell });
          }
        });
    });
    if (lowCells.length) {
      lowCells.sort((a, b) => a.cell.average - b.cell.average);
      const critical = lowCells[0];
      suggestions.push({
        tone: "warn",
        message: `${critical.row.label}: sinergia ${critical.cell.average}% su ${
          ROLE_FLAG_LABELS[critical.cell.role] ?? critical.cell.role
        }. Valuta un preset mirato o abbassa la soglia.`,
      });
    } else if (minSynergy > 0) {
      suggestions.push({
        tone: "success",
        message: `Tutte le combinazioni rispettano la soglia minima di ${minSynergy}%.`,
      });
    }
  }

  if (Array.isArray(combinedPresets) && combinedPresets.length) {
    const topPreset = combinedPresets[0];
    suggestions.push({
      tone: "info",
      message: `Preset ${topPreset.label}: ${topPreset.synergy}% di sinergia media su ${topPreset.usage} occorrenze recenti.`,
    });
  }

  if (flagStats instanceof Map) {
    const missingRoles = ROLE_FLAGS.filter((flag) => {
      const stat = flagStats.get(flag);
      return !stat || !stat.count;
    });
    if (missingRoles.length) {
      suggestions.push({
        tone: "info",
        message: `Nessuna specie con flag ${missingRoles
          .map((flag) => ROLE_FLAG_LABELS[flag] ?? flag)
          .join(", ")} nei roll correnti.`,
      });
    }
  }

  if (!suggestions.length) {
    suggestions.push({
      tone: "info",
      message: "Genera un ecosistema per sbloccare raccomandazioni dinamiche.",
    });
  }

  return suggestions;
}

function renderComposerHeatmap(rows) {
  const container = elements.composerHeatmap;
  if (!container) return;
  container.innerHTML = "";
  if (!Array.isArray(rows) || !rows.length) {
    const placeholder = document.createElement("p");
    placeholder.className = "generator-composer__empty";
    placeholder.textContent = "Genera un ecosistema per popolare la heatmap.";
    container.appendChild(placeholder);
    return;
  }

  const headerRow = document.createElement("div");
  headerRow.className = "generator-composer__heatmap-row generator-composer__heatmap-row--header";
  const labelHeading = document.createElement("span");
  labelHeading.className = "generator-composer__heatmap-heading";
  labelHeading.textContent = "Bioma";
  headerRow.appendChild(labelHeading);
  ROLE_FLAGS.forEach((flag) => {
    const heading = document.createElement("span");
    heading.className = "generator-composer__heatmap-heading";
    heading.textContent = ROLE_FLAG_LABELS[flag] ?? titleCase(flag);
    headerRow.appendChild(heading);
  });
  container.appendChild(headerRow);

  rows.forEach((row) => {
    const rowElement = document.createElement("div");
    rowElement.className = "generator-composer__heatmap-row";
    const label = document.createElement("span");
    label.className = "generator-composer__heatmap-label";
    label.textContent = row.label ?? titleCase(row.biomeId ?? "Bioma");
    rowElement.appendChild(label);
    ROLE_FLAGS.forEach((flag) => {
      const cell = Array.isArray(row.values)
        ? row.values.find((entry) => entry.role === flag)
        : null;
      const cellElement = document.createElement("span");
      cellElement.className = "generator-composer__heatmap-cell";
      const count = cell?.count ?? 0;
      const average = cell?.average ?? 0;
      cellElement.dataset.role = flag;
      cellElement.dataset.count = String(count);
      cellElement.dataset.synergy = String(average);
      cellElement.textContent = count ? `${average}%` : "—";
      cellElement.title = count
        ? `${count} specie · ${ROLE_FLAG_LABELS[flag] ?? flag} · sinergia ${average}%`
        : `Nessuna specie con flag ${ROLE_FLAG_LABELS[flag] ?? flag}`;
      applyHeatmapColor(cellElement, flag, average);
      rowElement.appendChild(cellElement);
    });
    container.appendChild(rowElement);
  });
}

function ensureComposerRadarChart() {
  if (!elements.composerRadarCanvas) return null;
  if (composerRadarChart) return composerRadarChart;
  if (typeof Chart === "undefined") {
    if (!composerChartUnavailable) {
      console.warn(
        "Chart.js non disponibile: il radar sinergie della composizione avanzata rimarrà nascosto."
      );
      composerChartUnavailable = true;
    }
    return null;
  }
  const context = elements.composerRadarCanvas.getContext("2d");
  if (!context) return null;
  composerRadarChart = new Chart(context, {
    type: "radar",
    data: {
      labels: COMPOSER_RADAR_LABELS,
      datasets: [],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          beginAtZero: true,
          suggestedMax: 100,
          ticks: {
            stepSize: 20,
            showLabelBackdrop: false,
            color: "rgba(148, 196, 255, 0.65)",
          },
          angleLines: { color: "rgba(148, 196, 255, 0.2)" },
          grid: { color: "rgba(148, 196, 255, 0.12)" },
          pointLabels: {
            color: "rgba(226, 240, 255, 0.82)",
            font: { size: 11 },
          },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(15, 23, 42, 0.92)",
          borderColor: "rgba(148, 196, 255, 0.35)",
          borderWidth: 1,
        },
      },
    },
  });
  return composerRadarChart;
}

function updateComposerRadarChart(values) {
  if (!elements.composerRadarCanvas) return;
  const chart = ensureComposerRadarChart();
  if (!chart) return;
  const data = Array.isArray(values) && values.length ? values : ROLE_FLAGS.map(() => 0);
  const hasData = data.some((value) => Number.isFinite(value) && value > 0);
  chart.data.labels = COMPOSER_RADAR_LABELS;
  if (hasData) {
    chart.data.datasets = [
      {
        label: "Sinergia media",
        data,
        backgroundColor: "rgba(88, 166, 255, 0.25)",
        borderColor: "rgba(88, 166, 255, 0.85)",
        borderWidth: 2,
        pointBackgroundColor: "rgba(88, 166, 255, 0.95)",
        pointBorderColor: "rgba(4, 7, 14, 0.9)",
        pointRadius: 3,
        pointHoverRadius: 4,
      },
    ];
  } else {
    chart.data.datasets = [];
  }
  chart.update();
}

function renderComposerPanel() {
  const panel = elements.composerPanel;
  if (!panel) return;
  const composerState = state.composer ?? {};
  const constraints = composerState.constraints ?? {};
  const preferred = ensurePreferredRoleSet();
  const minValue = Number.isFinite(constraints.minSynergy)
    ? constraints.minSynergy
    : 0;

  if (elements.composerSynergySlider) {
    elements.composerSynergySlider.value = String(minValue);
  }
  if (elements.composerSynergyValue) {
    elements.composerSynergyValue.textContent = `${minValue}%`;
  }

  const presets = Array.isArray(composerState.combinedPresets)
    ? composerState.combinedPresets
    : [];
  const presetList = elements.composerPresetList;
  if (presetList) {
    presetList.innerHTML = "";
    const hasPresets = presets.length > 0;
    presetList.hidden = !hasPresets;
    if (elements.composerPresetEmpty) {
      elements.composerPresetEmpty.hidden = hasPresets;
    }
    if (hasPresets) {
      presets.forEach((preset) => {
        const item = document.createElement("li");
        item.className = "generator-composer__list-item";
        item.dataset.presetId = preset.id;

        const heading = document.createElement("div");
        heading.className = "generator-composer__list-heading";
        const title = document.createElement("p");
        title.className = "generator-composer__preset-title";
        title.textContent = preset.label;
        heading.appendChild(title);
        const badge = document.createElement("span");
        badge.className = "generator-composer__badge";
        badge.textContent = `${preset.synergy}%`;
        badge.title = "Sinergia media stimata";
        heading.appendChild(badge);
        item.appendChild(heading);

        const metrics = document.createElement("div");
        metrics.className = "generator-composer__metrics";
        const roleMetric = document.createElement("span");
        roleMetric.textContent = `Ruoli: ${preset.filters.roles
          .map((role) => titleCase(String(role).replace(/[_-]+/g, " ")))
          .join(", ")}`;
        metrics.appendChild(roleMetric);
        const usageMetric = document.createElement("span");
        usageMetric.textContent = `Utilizzo: ${preset.usage}`;
        metrics.appendChild(usageMetric);
        if (preset.highlightTags?.length) {
          const tagMetric = document.createElement("span");
          tagMetric.textContent = `Tag: ${preset.highlightTags.join(", ")}`;
          metrics.appendChild(tagMetric);
        }
        item.appendChild(metrics);

        const applyButton = document.createElement("button");
        applyButton.type = "button";
        applyButton.className = "button button--ghost generator-composer__apply";
        applyButton.dataset.action = "composer-apply-preset";
        applyButton.dataset.presetId = preset.id;
        applyButton.textContent = "Applica preset";
        item.appendChild(applyButton);

        presetList.appendChild(item);
      });
    }
  }

  const toggles = elements.composerRoleToggles;
  if (toggles) {
    toggles.innerHTML = "";
    const roleStats = composerState.roleStats instanceof Map ? composerState.roleStats : new Map();
    const roleEntries = Array.from(roleStats.entries())
      .map(([roleKey, info]) => {
        const count = info?.count ?? 0;
        if (!count) return null;
        const totalSynergy = info?.synergy ?? 0;
        const average = count ? Math.round(totalSynergy / count) : 0;
        return {
          role: roleKey,
          label: titleCase(String(roleKey).replace(/[_-]+/g, " ")),
          count,
          average,
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (b.count === a.count) {
          return b.average - a.average;
        }
        return b.count - a.count;
      });

    if (!roleEntries.length) {
      const empty = document.createElement("p");
      empty.className = "generator-composer__empty";
      empty.textContent = "Nessun ruolo analizzato nei roll correnti.";
      toggles.appendChild(empty);
    } else {
      roleEntries.forEach((entry) => {
        const label = document.createElement("label");
        label.className = "generator-composer__role-toggle";
        const input = document.createElement("input");
        input.type = "checkbox";
        input.dataset.roleKey = entry.role;
        input.checked = preferred.has(entry.role);
        label.appendChild(input);
        const text = document.createElement("span");
        text.textContent = `${entry.label} (${entry.count})`;
        label.appendChild(text);
        toggles.appendChild(label);
      });
    }
  }

  const suggestionList = elements.composerSuggestions;
  if (suggestionList) {
    suggestionList.innerHTML = "";
    const suggestions = Array.isArray(composerState.suggestions)
      ? composerState.suggestions
      : [];
    const hasSuggestions = suggestions.length > 0;
    suggestionList.hidden = !hasSuggestions;
    if (elements.composerSuggestionsEmpty) {
      elements.composerSuggestionsEmpty.hidden = hasSuggestions;
    }
    suggestions.forEach((entry) => {
      const item = document.createElement("li");
      const tone = entry?.tone ? String(entry.tone).toUpperCase() : null;
      const message = entry?.message ?? "";
      item.textContent = tone ? `[${tone}] ${message}` : message;
      suggestionList.appendChild(item);
    });
  }

  const radarValues = composerState.metrics?.radar ?? [];
  updateComposerRadarChart(radarValues);
  renderComposerHeatmap(composerState.metrics?.heatmap ?? []);
}

function updateComposerState(filters) {
  if (!elements.composerPanel) return;
  const roleStats = new Map();
  const flagStats = new Map(
    ROLE_FLAGS.map((flag) => [flag, { count: 0, synergy: 0 }])
  );
  const heatmapRows = [];

  const biomes = Array.isArray(state.pick?.biomes) ? state.pick.biomes : [];
  const speciesBuckets = state.pick?.species ?? {};

  biomes.forEach((biome) => {
    const bucket = Array.isArray(speciesBuckets[biome.id])
      ? speciesBuckets[biome.id]
      : [];
    const row = {
      biomeId: biome.id,
      label: biome.label ?? titleCase(biome.id ?? "Bioma"),
      values: ROLE_FLAGS.map((flag) => ({
        role: flag,
        count: 0,
        synergy: 0,
        average: 0,
      })),
    };
    const valueMap = new Map(row.values.map((entry) => [entry.role, entry]));

    bucket.forEach((species) => {
      if (!species) return;
      const synergy = calculateSynergy(species, biome);
      const roleKey = species.role_trofico ?? "ruolo_indefinito";
      let stats = roleStats.get(roleKey);
      if (!stats) {
        stats = {
          role: roleKey,
          count: 0,
          synergy: 0,
          flags: new Set(),
          tags: new Set(),
        };
        roleStats.set(roleKey, stats);
      }
      stats.count += 1;
      stats.synergy += synergy.percent;
      (species.functional_tags ?? []).forEach((tag) => {
        if (tag) stats.tags.add(tag);
      });
      ROLE_FLAGS.forEach((flag) => {
        if (species.flags?.[flag]) {
          stats.flags.add(flag);
          const cell = valueMap.get(flag);
          if (cell) {
            cell.count += 1;
            cell.synergy += synergy.percent;
          }
          const global = flagStats.get(flag);
          if (global) {
            global.count += 1;
            global.synergy += synergy.percent;
          }
        }
      });
    });

    row.values.forEach((cell) => {
      cell.average = cell.count ? Math.round(cell.synergy / cell.count) : 0;
    });
    heatmapRows.push(row);
  });

  const radarValues = ROLE_FLAGS.map((flag) => {
    const stat = flagStats.get(flag);
    if (!stat || !stat.count) return 0;
    return Math.round(stat.synergy / stat.count);
  });

  const combinedPresets = buildCombinedRolePresets(roleStats);
  const suggestions = buildComposerSuggestions({
    heatmap: heatmapRows,
    combinedPresets,
    constraints: state.composer?.constraints ?? {},
    flagStats,
  });

  state.composer.metrics = { radar: radarValues, heatmap: heatmapRows };
  state.composer.roleStats = roleStats;
  state.composer.combinedPresets = combinedPresets;
  state.composer.suggestions = suggestions;
  state.metrics.roleUsage = roleStats;

  renderComposerPanel();
}

function applyComposerPreset(preset) {
  if (!preset) return;
  const filters = {
    flags: Array.isArray(preset.filters?.flags) ? preset.filters.flags : [],
    roles: Array.isArray(preset.filters?.roles) ? preset.filters.roles : [],
    tags: Array.isArray(preset.filters?.tags) ? preset.filters.tags : [],
  };
  applyFiltersToForm(filters);
  const preferred = ensurePreferredRoleSet();
  preferred.clear();
  filters.roles.forEach((role) => {
    if (role) preferred.add(role);
  });
  renderComposerPanel();
  if (state.pick.biomes.length) {
    const current = currentFilters();
    rerollSpecies(current);
    renderBiomes(current);
    rerollSeeds(current);
    renderSeeds();
  }
  setStatus(`Preset ${preset.label} applicato.`, "success", {
    tags: ["composer", "preset"],
    action: "composer-apply-preset",
    metadata: {
      presetId: preset.id,
      synergy: preset.synergy,
      usage: preset.usage,
    },
  });
}

function applyComposerConstraintUpdate({ announce = false } = {}) {
  renderComposerPanel();
  if (!state.pick.biomes.length) return;
  const filters = currentFilters();
  rerollSpecies(filters);
  renderBiomes(filters);
  rerollSeeds(filters);
  renderSeeds();
  if (announce) {
    const value = Number.isFinite(state.composer?.constraints?.minSynergy)
      ? state.composer.constraints.minSynergy
      : 0;
    setStatus(`Vincoli di sinergia aggiornati (≥ ${value}%).`, "info", {
      tags: ["composer", "sinergia"],
      action: "composer-constraints-update",
    });
  }
}

function attachComposerHandlers() {
  const panel = elements.composerPanel;
  if (!panel) return;
  ensurePreferredRoleSet();
  const slider = elements.composerSynergySlider;
  if (slider) {
    slider.addEventListener("input", (event) => {
      const value = Number.parseInt(event.target.value, 10) || 0;
      if (elements.composerSynergyValue) {
        elements.composerSynergyValue.textContent = `${value}%`;
      }
    });
    slider.addEventListener("change", (event) => {
      const value = Number.parseInt(event.target.value, 10) || 0;
      state.composer.constraints.minSynergy = Math.max(0, Math.min(100, value));
      applyComposerConstraintUpdate({ announce: true });
    });
  }
  const toggles = elements.composerRoleToggles;
  if (toggles) {
    toggles.addEventListener("change", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (target.type !== "checkbox") return;
      const { roleKey } = target.dataset;
      if (!roleKey) return;
      const preferred = ensurePreferredRoleSet();
      if (target.checked) {
        preferred.add(roleKey);
      } else {
        preferred.delete(roleKey);
      }
      applyComposerConstraintUpdate({ announce: Boolean(state.pick.biomes.length) });
    });
  }

  panel.addEventListener("click", (event) => {
    const button = event.target instanceof HTMLElement ? event.target.closest("[data-action]") : null;
    if (!(button instanceof HTMLElement)) return;
    const { action } = button.dataset;
    if (action === "composer-apply-preset") {
      const { presetId } = button.dataset;
      if (!presetId) return;
      const preset = (state.composer?.combinedPresets ?? []).find(
        (entry) => entry.id === presetId
      );
      if (!preset) return;
      applyComposerPreset(preset);
    }
  });
}

function renderBiomes(filters) {
  updateSummaryCounts();
  const grid = elements.biomeGrid;
  if (!grid) return;
  grid.innerHTML = "";

  const removed = syncComparisonStore();
  if (removed) {
    const label = removed === 1 ? "Una specie" : `${removed} specie`;
    setStatus(`${label} rimosse dal confronto perché non più disponibili.`, "warn", {
      tags: ["confronto", "sync"],
      action: "compare-sync-remove",
    });
  }

  if (!state.pick.biomes.length) {
    const placeholder = document.createElement("p");
    placeholder.className = "placeholder";
    placeholder.textContent = "Genera un ecosistema per iniziare.";
    grid.appendChild(placeholder);
    renderComparisonPanel();
    updateComposerState(filters);
    return;
  }

  state.pick.biomes.forEach((biome) => {
    grid.appendChild(buildBiomeCard(biome, filters));
  });
  updateComposerState(filters);
  renderComparisonPanel();
}

function renderPinnedSummary() {
  const list = elements.pinnedList;
  const empty = elements.pinnedEmpty;
  if (!list) return;

  const entries = Array.from(state.cardState.pinned.values());
  list.innerHTML = "";
  const hasEntries = entries.length > 0;
  list.hidden = !hasEntries;
  if (empty) {
    empty.hidden = hasEntries;
  }
  if (elements.summaryContainer) {
    elements.summaryContainer.dataset.hasPins = hasEntries ? "true" : "false";
  }
  if (!hasEntries) {
    renderFlowMap();
    return;
  }

  entries.forEach((entry) => {
    const item = document.createElement("li");
    item.className = "generator-pins__item";
    item.dataset.pinKey = entry.key;

    const stillPresent = Boolean(findSpeciesInPick(entry.biomeId, entry.speciesId));
    if (!stillPresent) {
      item.dataset.state = "stale";
    }

    const header = document.createElement("div");
    header.className = "generator-pins__header";

    const name = document.createElement("span");
    name.className = "generator-pins__name";
    name.textContent = entry.displayName;
    header.appendChild(name);

    const controls = document.createElement("div");
    controls.className = "generator-pins__controls";

    const rarityBadge = createBadgeElement(entry.rarity, `rarity-${entry.slug}`);
    rarityBadge.classList.add("generator-pins__badge");
    controls.appendChild(rarityBadge);

    const unpin = document.createElement("button");
    unpin.type = "button";
    unpin.className = "generator-pins__unpin";
    unpin.textContent = "Rimuovi";
    unpin.addEventListener("click", (event) => {
      event.preventDefault();
      const biome =
        findBiomeById(entry.biomeId) ?? { id: entry.biomeId, label: entry.biomeLabel, synthetic: entry.synthetic };
      const species =
        findSpeciesInPick(entry.biomeId, entry.speciesId) ??
        {
          id: entry.speciesId,
          display_name: entry.displayName,
          balance: { threat_tier: `T${entry.tier}` },
          synthetic: entry.synthetic,
        };
      togglePinned(biome, species);
    });
    controls.appendChild(unpin);

    header.appendChild(controls);
    item.appendChild(header);

    const meta = document.createElement("span");
    meta.className = "generator-pins__meta";
    const metaParts = [entry.biomeLabel, `T${entry.tier}`];
    if (entry.synthetic) {
      metaParts.push("Synth");
    }
    if (!stillPresent) {
      metaParts.push("fuori rotazione");
    }
    meta.textContent = metaParts.join(" · ");
    item.appendChild(meta);

    list.appendChild(item);
  });

  renderFlowMap();
}
function renderSeeds() {
  updateSummaryCounts();
  const container = elements.seedGrid;
  if (!container) return;
  container.innerHTML = "";

  if (!state.pick.seeds.length) {
    const placeholder = document.createElement("p");
    placeholder.className = "placeholder";
    placeholder.textContent = "Genera un ecosistema per ottenere encounter seed.";
    container.appendChild(placeholder);
    return;
  }

  state.pick.seeds.forEach((seed) => {
    const card = document.createElement("article");
    card.className = "card";
    card.setAttribute("role", "listitem");

    const header = document.createElement("h3");
    const headingParts = [seed.biome_id];
    if (seed.label) {
      headingParts.push(seed.label);
    }
    if (seed.synthetic) {
      headingParts.push("Synth");
    }
    header.innerHTML = `${headingParts.join(" · ")} · <span class="form__hint">Budget T${seed.threat_budget}</span>`;

    if (seed.description || seed.notes) {
      const meta = document.createElement("p");
      meta.className = "form__hint";
      const metaParts = [];
      if (seed.description) metaParts.push(seed.description);
      if (seed.notes) metaParts.push(seed.notes);
      meta.textContent = metaParts.join(" · ");
      card.append(header, meta);
    } else {
      card.append(header);
    }

    const list = document.createElement("ul");
    if (!seed.party.length) {
      const empty = document.createElement("li");
      empty.className = "placeholder";
      empty.textContent = "Nessuna specie disponibile per questo seed con i filtri selezionati.";
      list.appendChild(empty);
    } else {
      seed.party.forEach((entry) => {
        const item = document.createElement("li");
        const parts = [entry.id, entry.role ?? "—", `T${entry.tier}`];
        if (entry.count && entry.count > 1) {
          parts.push(`x${entry.count}`);
        }
        if (entry.sources || entry.synthetic) {
          parts.push("Synth");
        }
        item.innerHTML = `${entry.display_name} <span class="form__hint">(${parts.join(" · ")})</span>`;
        list.appendChild(item);
      });
    }

    card.append(list);
    container.appendChild(card);
  });

}

function exportPayload(filters) {
  const catalogSource =
    resolvedCatalogUrl || packContext?.catalogUrl || resolvedPackRoot || packContext?.resolvedBase || null;
  return {
    pick: state.pick,
    filters,
    source: {
      catalog: catalogSource,
      generated_at: new Date().toISOString(),
    },
    composer: buildComposerExportSnapshot(),
  };
}

function exportActivityLogEntries() {
  if (!Array.isArray(state.activityLog) || !state.activityLog.length) {
    return [];
  }
  return state.activityLog
    .map(serialiseActivityLogEntry)
    .filter(Boolean)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

function activityLogToCsv(entries) {
  const columns = ["id", "timestamp", "tone", "message", "tags", "action", "pinned", "metadata"];
  const escape = (value) => {
    if (value === null || value === undefined) return "";
    const stringValue = String(value);
    if (/[",\n]/.test(stringValue)) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  const header = columns.join(",");
  if (!entries.length) {
    return `${header}\n`;
  }

  const rows = entries.map((entry) => {
    const tags = Array.isArray(entry.tags)
      ? entry.tags
          .map((tag) => {
            if (!tag) return null;
            const label = tag.label ?? tag.id ?? "";
            return label ? String(label) : null;
          })
          .filter(Boolean)
          .join("|")
      : "";
    const metadata =
      entry.metadata === null || entry.metadata === undefined
        ? ""
        : typeof entry.metadata === "string"
        ? entry.metadata
        : JSON.stringify(entry.metadata);
    const record = {
      id: entry.id ?? "",
      timestamp: entry.timestamp ?? "",
      tone: entry.tone ?? "",
      message: entry.message ?? "",
      tags,
      action: entry.action ?? "",
      pinned: entry.pinned ? "true" : "false",
      metadata,
    };
    return columns.map((column) => escape(record[column])).join(",");
  });

  return [header, ...rows].join("\n");
}

function downloadFile(name, content, type) {
  const blob =
    content instanceof Blob
      ? content
      : new Blob([content], { type: type ?? "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function toYAML(value, indent = 0) {
  const space = "  ".repeat(indent);
  if (value === null || value === undefined) return "null";
  if (Array.isArray(value)) {
    if (!value.length) return "[]";
    return value
      .map((item) => `${space}- ${toYAML(item, indent + 1).replace(/^\s*/, "")}`)
      .join("\n");
  }
  if (typeof value === "object") {
    const entries = Object.entries(value);
    if (!entries.length) return "{}";
    return entries
      .map(([key, val]) => {
        const formatted = toYAML(val, indent + 1);
        const needsBlock = typeof val === "object" && val !== null;
        return `${space}${key}: ${needsBlock ? `\n${formatted}` : formatted}`;
      })
      .join("\n");
  }
  if (typeof value === "string") {
    if (/[:#\-\[\]\{\}\n]/.test(value)) {
      return JSON.stringify(value);
    }
    return value;
  }
  return String(value);
}

async function tryFetchJson(url) {
  if (!url) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.warn("Caricamento JSON fallito", url, error);
    if (!fetchFailureNotices.has(url)) {
      fetchFailureNotices.add(url);
      const reason = error instanceof Error ? error.message : String(error);
      const resourceName = (() => {
        try {
          const base = typeof window !== "undefined" ? window.location.href : "http://localhost";
          const parsed = new URL(url, base);
          return parsed.pathname.split("/").filter(Boolean).slice(-1)[0] ?? parsed.pathname;
        } catch (parseError) {
          console.warn("Impossibile derivare il nome risorsa da", url, parseError);
          return url;
        }
      })();
      const tags = ["fetch", "catalog"];
      if (/trait/i.test(url)) tags.push("traits");
      if (/hazard/i.test(url)) tags.push("hazard");
      if (/glossary/i.test(url)) tags.push("glossary");
      setStatus(`Impossibile caricare ${resourceName}: ${reason}.`, "error", {
        tags,
        metadata: { url, reason },
      });
    }
    throw error;
  }
}

function localTraitFallbackUrl() {
  try {
    return new URL("./env-traits.json", import.meta.url).toString();
  } catch (error) {
    console.warn("Impossibile calcolare il percorso locale dei tratti", error);
    return null;
  }
}

async function loadTraitRegistry(context) {
  const tried = new Set();
  const candidates = [];
  if (context?.resolveDocHref) {
    try {
      candidates.push(context.resolveDocHref("env_traits.json"));
    } catch (error) {
      console.warn("Impossibile risolvere env_traits.json tramite docsBase", error);
    }
  }
  if (context?.resolvePackHref) {
    try {
      candidates.push(context.resolvePackHref("docs/catalog/env_traits.json"));
    } catch (error) {
      console.warn("Impossibile risolvere env_traits.json tramite packBase", error);
    }
  }
  candidates.push(localTraitFallbackUrl());

  for (const candidate of candidates) {
    if (!candidate || tried.has(candidate)) continue;
    tried.add(candidate);
    try {
      const registry = await tryFetchJson(candidate);
      if (registry) {
        setTraitRegistry(registry);
        return;
      }
    } catch (error) {
      console.warn("Caricamento registry tratti fallito", candidate, error);
    }
  }

  console.warn("Nessuna sorgente valida per il registry tratti trovata.");
  setTraitRegistry({ schema_version: "0", rules: [] });
}

function localTraitReferenceFallbackUrl() {
  try {
    return new URL("./trait-reference.json", import.meta.url).toString();
  } catch (error) {
    console.warn("Impossibile calcolare il percorso locale del reference tratti", error);
    return null;
  }
}

function localTraitGlossaryFallbackUrl() {
  try {
    return new URL("./trait-glossary.json", import.meta.url).toString();
  } catch (error) {
    console.warn("Impossibile calcolare il percorso locale del glossario tratti", error);
    return null;
  }
}

async function loadTraitGlossary(context, hint) {
  const tried = new Set();
  const candidates = [];
  const normalizedHint = typeof hint === "string" ? hint.trim() : "";

  const potential = [
    normalizedHint,
    "trait_glossary.json",
    "trait-glossary.json",
    "data/traits/glossary.json",
  ].filter(Boolean);

  for (const name of potential) {
    if (context?.resolveDocHref) {
      try {
        candidates.push(context.resolveDocHref(name));
      } catch (error) {
        console.warn("Impossibile risolvere", name, "tramite docsBase", error);
      }
    }
    if (context?.resolvePackHref) {
      try {
        candidates.push(context.resolvePackHref(name.startsWith("docs/") ? name : `docs/catalog/${name}`));
      } catch (error) {
        console.warn("Impossibile risolvere", name, "tramite packBase", error);
      }
    }
  }

  candidates.push(localTraitGlossaryFallbackUrl());

  for (const candidate of candidates) {
    if (!candidate || tried.has(candidate)) continue;
    tried.add(candidate);
    try {
      const glossary = await tryFetchJson(candidate);
      if (glossary) {
        setTraitGlossary(glossary);
        return;
      }
    } catch (error) {
      console.warn("Caricamento glossario tratti fallito", candidate, error);
    }
  }

  console.warn("Nessuna sorgente valida per il glossario tratti trovata.");
  setTraitGlossary(null);
}

async function loadTraitReference(context) {
  const tried = new Set();
  const candidates = [];
  if (context?.resolveDocHref) {
    try {
      candidates.push(context.resolveDocHref("trait_reference.json"));
    } catch (error) {
      console.warn("Impossibile risolvere trait_reference.json tramite docsBase", error);
    }
    try {
      candidates.push(context.resolveDocHref("trait-reference.json"));
    } catch (error) {
      console.warn("Impossibile risolvere trait-reference.json tramite docsBase", error);
    }
  }
  if (context?.resolvePackHref) {
    try {
      candidates.push(context.resolvePackHref("docs/catalog/trait_reference.json"));
    } catch (error) {
      console.warn("Impossibile risolvere trait_reference.json tramite packBase", error);
    }
    try {
      candidates.push(context.resolvePackHref("docs/catalog/trait-reference.json"));
    } catch (error) {
      console.warn("Impossibile risolvere trait-reference.json tramite packBase", error);
    }
  }
  candidates.push(localTraitReferenceFallbackUrl());

  for (const candidate of candidates) {
    if (!candidate || tried.has(candidate)) continue;
    tried.add(candidate);
    try {
      const catalog = await tryFetchJson(candidate);
      if (catalog) {
        setTraitReference(catalog);
        await loadTraitGlossary(context, catalog?.trait_glossary);
        return;
      }
    } catch (error) {
      console.warn("Caricamento reference tratti fallito", candidate, error);
    }
  }

  console.warn("Nessuna sorgente valida per il reference tratti trovata.");
  setTraitReference({ schema_version: "0", traits: {} });
}

function localHazardFallbackUrl() {
  try {
    return new URL("./hazards.json", import.meta.url).toString();
  } catch (error) {
    console.warn("Impossibile calcolare il percorso locale degli hazard", error);
    return null;
  }
}

async function loadHazardRegistry(context) {
  const tried = new Set();
  const candidates = [];
  if (context?.resolveDocHref) {
    try {
      candidates.push(context.resolveDocHref("hazards.json"));
    } catch (error) {
      console.warn("Impossibile risolvere hazards.json tramite docsBase", error);
    }
  }
  if (context?.resolvePackHref) {
    try {
      candidates.push(context.resolvePackHref("docs/catalog/hazards.json"));
    } catch (error) {
      console.warn("Impossibile risolvere hazards.json tramite packBase", error);
    }
  }
  candidates.push(localHazardFallbackUrl());

  for (const candidate of candidates) {
    if (!candidate || tried.has(candidate)) continue;
    tried.add(candidate);
    try {
      const registry = await tryFetchJson(candidate);
      if (registry) {
        setHazardRegistry(registry);
        return;
      }
    } catch (error) {
      console.warn("Caricamento registry hazard fallito", candidate, error);
    }
  }

  console.warn("Nessuna sorgente valida per il registry hazard trovata.");
  setHazardRegistry({ schema_version: "0", hazards: {} });
}

function attachActions() {
  if (!elements.form) return;
  elements.form.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const action = target.dataset.action;
    if (!action) return;
    event.preventDefault();
    if (!state.data) {
      setStatus("Caricare i dati prima di utilizzare il generatore.", "error", {
        tags: ["guardia", "catalogo"],
        action: "guard-catalog",
      });
      return;
    }
    const filters = currentFilters();
    switch (action) {
      case "roll-ecos": {
        const requested = Math.max(1, Math.min(parseInt(elements.nBiomi.value, 10) || 2, 6));
        const lockedBiomes = state.pick.biomes.filter((biome) => isBiomeLocked(biome.id));
        const targetCount = Math.max(requested, lockedBiomes.length || 0);
        if (elements.nBiomi && targetCount !== requested) {
          elements.nBiomi.value = String(targetCount);
        }
        const toGenerate = Math.max(0, targetCount - lockedBiomes.length);
        const generated = generateSyntheticBiomes(state.data.biomi, toGenerate);
        const combined = [...lockedBiomes.slice(0, targetCount), ...generated].slice(0, targetCount);
        state.pick.ecosystem = {
          id: randomId("ecos"),
          label: `Rete sintetica (${combined.length} biomi)`,
          synthetic: true,
          sources: state.data.ecosistema?.biomi?.map((b) => b.id) ?? [],
          connessioni: synthesiseConnections(combined),
        };
        state.pick.biomes = combined;
        state.pick.exportSlug = null;
        rerollSpecies(filters);
        rerollSeeds(filters);
        renderBiomes(filters);
        renderSeeds();
        const narrativeContext = updateNarrativePrompts(filters);
        setStatus(
          `Generati ${state.pick.biomes.length} biomi sintetici e ${state.pick.seeds.length} seed.`,
          "success",
          {
            tags: ["roll", "ecosistema"],
            action: "roll-ecos",
            rare: Boolean(narrativeContext?.isHighThreat),
            rareTarget: narrativeContext?.rareReason ?? undefined,
          }
        );
        recordHistoryEntry("roll-ecos", filters);
        break;
      }
      case "reroll-biomi": {
        if (!state.pick.biomes.length) {
          setStatus("Genera prima un ecosistema completo.", "warn", {
            tags: ["guardia", "reroll", "biomi"],
            action: "guard-reroll-biomi",
          });
          return;
        }
        const requested = Math.max(
          1,
          Math.min(parseInt(elements.nBiomi.value, 10) || state.pick.biomes.length, 6)
        );
        const lockedBiomes = state.pick.biomes.filter((biome) => isBiomeLocked(biome.id));
        const targetCount = Math.max(requested, lockedBiomes.length || 0);
        if (elements.nBiomi && targetCount !== requested) {
          elements.nBiomi.value = String(targetCount);
        }
        const toGenerate = Math.max(0, targetCount - lockedBiomes.length);
        const regenerated = generateSyntheticBiomes(state.data.biomi, toGenerate);
        const combined = [...lockedBiomes.slice(0, targetCount), ...regenerated].slice(0, targetCount);
        state.pick.biomes = combined;
        state.pick.ecosystem = {
          id: state.pick.ecosystem?.id || randomId("ecos"),
          label: `Rete sintetica (${combined.length} biomi)`,
          synthetic: true,
          sources: state.data.ecosistema?.biomi?.map((b) => b.id) ?? [],
          connessioni: synthesiseConnections(combined),
        };
        state.pick.exportSlug = null;
        rerollSpecies(filters);
        rerollSeeds(filters);
        renderBiomes(filters);
        renderSeeds();
        const narrativeContext = updateNarrativePrompts(filters);
        setStatus("Biomi sintetici ricalcolati con i filtri correnti.", "success", {
          tags: ["reroll", "biomi"],
          action: "reroll-biomi",
          rare: Boolean(narrativeContext?.isHighThreat),
          rareTarget: narrativeContext?.rareReason ?? undefined,
        });
        recordHistoryEntry("reroll-biomi", filters);
        break;
      }
      case "reroll-species": {
        if (!state.pick.biomes.length) {
          setStatus("Genera prima un ecosistema per estrarre le specie.", "warn", {
            tags: ["guardia", "reroll", "specie"],
            action: "guard-reroll-species",
          });
          return;
        }
        rerollSpecies(filters);
        renderBiomes(filters);
        const narrativeContext = updateNarrativePrompts(filters);
        setStatus("Specie ricalcolate.", "success", {
          tags: ["reroll", "specie"],
          action: "reroll-species",
          rare: Boolean(narrativeContext?.isHighThreat),
          rareTarget: narrativeContext?.rareReason ?? undefined,
        });
        recordHistoryEntry("reroll-species", filters);
        break;
      }
      case "reroll-seeds": {
        if (!state.pick.biomes.length) {
          setStatus("Genera prima un ecosistema per creare gli encounter seed.", "warn", {
            tags: ["guardia", "reroll", "seed"],
            action: "guard-reroll-seeds",
          });
          return;
        }
        rerollSeeds(filters);
        renderSeeds();
        const narrativeContext = updateNarrativePrompts(filters);
        setStatus("Seed rigenerati.", "success", {
          tags: ["reroll", "seed"],
          action: "reroll-seeds",
          rare: Boolean(narrativeContext?.isHighThreat),
          rareTarget: narrativeContext?.rareReason ?? undefined,
        });
        recordHistoryEntry("reroll-seeds", filters);
        break;
      }
      case "export-json": {
        const payload = exportPayload(filters);
        const slug = ensureExportSlug();
        downloadFile(`${slug}.json`, JSON.stringify(payload, null, 2), "application/json");
        markCurrentPresetByBuilder("ecosystem-json");
        renderExportManifest(filters);
        setStatus("Esportazione JSON completata.", "success", {
          tags: ["export", "json"],
          action: "export-json",
        });
        break;
      }
      case "export-yaml": {
        const payload = exportPayload(filters);
        const yaml = toYAML(payload);
        const slug = ensureExportSlug();
        downloadFile(`${slug}.yaml`, yaml, "text/yaml");
        markCurrentPresetByBuilder("ecosystem-yaml");
        renderExportManifest(filters);
        setStatus("Esportazione YAML completata.", "success", {
          tags: ["export", "yaml"],
          action: "export-yaml",
        });
        break;
      }
      case "export-log-json": {
        if (!state.activityLog.length) {
          setStatus("Il registro attività è vuoto, nulla da esportare.", "warn", {
            tags: ["export", "log", "vuoto"],
            action: "export-log-empty",
          });
          break;
        }
        const entries = exportActivityLogEntries();
        const slug = ensureExportSlug();
        downloadFile(`${slug}-log.json`, JSON.stringify(entries, null, 2), "application/json");
        markCurrentPresetByBuilder("activity-json");
        renderExportManifest(filters);
        setStatus("Registro attività esportato in JSON.", "success", {
          tags: ["export", "log", "json"],
          action: "export-log-json",
        });
        break;
      }
      case "export-log-csv": {
        if (!state.activityLog.length) {
          setStatus("Il registro attività è vuoto, nulla da esportare.", "warn", {
            tags: ["export", "log", "vuoto"],
            action: "export-log-empty",
          });
          break;
        }
        const entries = exportActivityLogEntries();
        const slug = ensureExportSlug();
        downloadFile(`${slug}-log.csv`, activityLogToCsv(entries), "text/csv");
        markCurrentPresetByBuilder("activity-csv");
        renderExportManifest(filters);
        setStatus("Registro attività esportato in CSV.", "success", {
          tags: ["export", "log", "csv"],
          action: "export-log-csv",
        });
        break;
      }
      case "download-preset-zip": {
        const preset = getCurrentPreset();
        if (!preset) {
          setStatus("Nessun preset selezionato.", "warn", {
            tags: ["export", "zip"],
            action: "export-zip-missing-preset",
          });
          break;
        }
        try {
          const { zipName, fileCount } = await downloadPresetZip(preset, filters);
          renderExportManifest(filters);
          setStatus(`Bundle ZIP "${zipName}" generato (${fileCount} file).`, "success", {
            tags: ["export", "zip"],
            action: "export-zip",
          });
        } catch (error) {
          console.error("Errore durante la generazione del bundle ZIP", error);
          setStatus("Impossibile generare il bundle ZIP.", "error", {
            tags: ["export", "zip", "errore"],
            action: "export-zip-error",
          });
        }
        break;
      }
      case "download-dossier-html": {
        try {
          const context = buildPresetContext(filters);
          const html = await generateDossierHtml(context);
          if (!html) {
            throw new Error("HTML non disponibile");
          }
          const slug = ensureExportSlug();
          const fileName = `${slug}-dossier.html`;
          downloadFile(fileName, html, "text/html");
          markCurrentPresetByBuilder("dossier-html");
          renderExportManifest(filters);
          setStatus("Dossier HTML esportato.", "success", {
            tags: ["export", "dossier", "html"],
            action: "export-dossier-html",
          });
        } catch (error) {
          console.error("Errore durante l'esportazione del dossier HTML", error);
          setStatus("Impossibile esportare il dossier HTML.", "error", {
            tags: ["export", "dossier", "errore"],
            action: "export-dossier-html-error",
          });
        }
        break;
      }
      case "download-dossier-pdf": {
        try {
          const context = buildPresetContext(filters);
          const blob = await generateDossierPdfBlob(context);
          const slug = ensureExportSlug();
          downloadFile(`${slug}-dossier.pdf`, blob, "application/pdf");
          markCurrentPresetByBuilder("dossier-pdf");
          renderExportManifest(filters);
          setStatus("Dossier PDF esportato.", "success", {
            tags: ["export", "dossier", "pdf"],
            action: "export-dossier-pdf",
          });
        } catch (error) {
          console.error("Errore durante l'esportazione del dossier PDF", error);
          setStatus("Impossibile esportare il dossier PDF.", "error", {
            tags: ["export", "dossier", "errore"],
            action: "export-dossier-pdf-error",
          });
        }
        break;
      }
      default:
        break;
    }
  });
}

async function loadData() {
  setStatus("Caricamento catalogo in corso…", "info", {
    tags: ["catalogo", "caricamento"],
    action: "catalog-load-start",
  });
  try {
    const { data, context } = await loadPackCatalog();
    applyCatalogContext(data, context);
    await loadTraitRegistry(context);
    await loadTraitReference(context);
    await loadHazardRegistry(context);
    setStatus("Catalogo pronto all'uso. Genera un ecosistema!", "success", {
      tags: ["catalogo", "ready"],
      action: "catalog-load-ready",
    });
    return;
  } catch (error) {
    console.warn("Caricamento catalogo tramite loader condiviso fallito", error);
  }

  try {
    const { data, context } = await manualLoadCatalog();
    applyCatalogContext(data, context);
    await loadTraitRegistry(context);
    await loadTraitReference(context);
    await loadHazardRegistry(context);
    setStatus("Catalogo pronto all'uso dal fallback manuale. Genera un ecosistema!", "success", {
      tags: ["catalogo", "ready", "fallback"],
      action: "catalog-load-ready-fallback",
    });
  } catch (error) {
    console.error("Impossibile caricare il catalogo da alcuna sorgente", error);
    await loadTraitRegistry(packContext);
    await loadTraitReference(packContext);
    await loadHazardRegistry(packContext);
    setStatus("Errore durante il caricamento del catalogo. Controlla la console.", "error", {
      tags: ["catalogo", "errore"],
      action: "catalog-load-error",
    });
  }
}

restoreActivityLog();
restorePinnedState();
restoreLockState();
restorePreferences();
restoreFilterProfiles();
restoreHistoryEntries();
updateActivityTagRegistry();
recalculateActivityMetrics();
renderActivityLog();
setupActivityControls();
setupAudioControls();
renderKpiSidebar();
setupAnchorNavigation();
setupCodexControls();
renderTraitExpansions();
setupExportControls();
renderProfileSlots();
renderHistoryPanel();
renderPinnedSummary();
renderComparisonPanel();
updateNarrativePrompts();
attachProfileHandlers();
attachInsightHandlers();
attachHistoryHandlers();
attachComparisonHandlers();
attachComposerHandlers();
renderComposerPanel();
attachActions();
setupFlowMapControls();
loadData();

if (typeof window !== "undefined") {
  window.EvoPack = window.EvoPack || {};
  window.EvoPack.packRootCandidates = PACK_ROOT_CANDIDATES;
  window.EvoPack.generator = {
    get state() {
      return state;
    },
    get traitReference() {
      return state.traitReference;
    },
    getTraitDetails,
    getResolvedCatalogUrl() {
      return resolvedCatalogUrl;
    },
    getResolvedPackRoot() {
      return resolvedPackRoot;
    },
    getPackDocsBase() {
      return packDocsBase;
    },
    getContext() {
      return packContext;
    },
    manualLoadCatalog,
    loadPackCatalog,
  };
}
