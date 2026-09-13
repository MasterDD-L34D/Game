// W8g — Canonical species display names map (bilingue IT/EN per 00E-NAMING_STYLEGUIDE.md).
// MIRROR di data/core/species.yaml + species_expansion.yaml. Source of truth = YAML.
// Backend enrichment endpoint = BACKLOG (publicSessionView dovrebbe includere display_name_it
// per unit in response /api/session/state). Per ora map statica client-side.
//
// Naming styleguide:
//   - Codice (id): inglese ASCII (dune_stalker, predoni_nomadi)
//   - Display primary: italiano (Predatore delle Dune)
//   - Display alt: inglese (Dune Stalker)

const SPECIES_DISPLAY_IT = {
  // Tutorial species
  dune_stalker: 'Predatore delle Dune',
  predoni_nomadi: 'Predoni Nomadi',
  // species.yaml shipping
  polpo_araldo_sinaptico: 'Polpo Araldo Sinaptico',
  sciame_larve_neurali: 'Sciame di Larve Neurali',
  leviatano_risonante: 'Leviatano Risonante',
  simbionte_corallino_riflesso: 'Simbionte Corallino Riflesso',
  anguis_magnetica: 'Anguilla Magnetica',
  chemnotela_toxica: 'Tessitrice Tossica',
  elastovaranus_hydrus: 'Varano Idraulico Elastico',
  gulogluteus_scutiger: 'Scudo Roccioso Prensile',
  perfusuas_pedes: 'Miriapode delle Cripte',
  proteus_plasma: 'Plasma Proteico',
  rupicapra_sensoria: 'Stambecco Sensoriale',
  soniptera_resonans: 'Ala Risonante',
  terracetus_ambulator: 'Cetaceo Terrestre',
  umbra_alaris: "Ala d'Ombra",
  // species_expansion.yaml shipping
  sp_arenavolux_sagittalis: 'Saettatore delle Dune',
  sp_ferriscroba_detrita: 'Spazzino Ferroso',
  sp_sonapteryx_resonans: 'Ala Risonante',
  sp_lithoraptor_acutornis: 'Cacciatore di Schegge',
  sp_salifossa_tenebris: 'Scavatore Salino',
  sp_ventornis_longiala: 'Aliante della Mesa',
  sp_ferrimordax_rutilus: 'Martellatore Ferroso',
  sp_pyrosaltus_celeris: 'Saltatore di Cenere',
  sp_basaltocara_scutata: 'Custode di Basalto',
  sp_arenaceros_placidus: 'Brucatore di Polvere',
  sp_lucinerva_filata: 'Tessitore di Luce',
  sp_radiluma_pendula: 'Lanterna di Radici',
  sp_limnofalcis_serrata: 'Trebbiatore di Palude',
  sp_cavatympa_sonans: 'Ascoltatore Cavo',
  sp_calamipes_gracilis: 'Camminatore di Canne',
  sp_salisucta_alveata: 'Filtratore Salmastro',
  sp_nebulocornis_mollis: 'Cervo di Nebbia',
  sp_cryptolorca_medicata: 'Riparatore Carsico',
  sp_glaciolabis_nitida: 'Pattinatore Specchio',
  sp_tonitrudens_ferox: 'Rosicchiatore di Tuono',
  sp_rubrospina_velox: 'Corriere Spinato',
  sp_paludogromus_magnus: 'Colosso Palustre',
  sp_cinerastra_nodosa: 'Spirale di Cenere',
  sp_zephyrovum_fidelis: 'Nidificatore del Maestrale',
  sp_vitricyba_punctata: 'Beccatore di Vetro',
  sp_fumarisorba_sulfurea: 'Bevitore di Fumarole',
  sp_arboryxis_lenis: 'Vagabondo della Volta',
  sp_noctipedis_umbrata: 'Corridore Notturno',
  sp_magnetocola_pastoris: 'Pastore Ferrico',
  sp_siltovena_bifida: 'Divisore del Delta',
};

// Fallback: capitalize underscores (es. "predoni_nomadi" → "Predoni Nomadi").
function fallbackCapitalize(slug) {
  if (!slug) return '';
  return String(slug)
    .replace(/_/g, ' ')
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function getSpeciesDisplayIt(speciesId) {
  if (!speciesId) return '';
  return SPECIES_DISPLAY_IT[speciesId] || fallbackCapitalize(speciesId);
}
