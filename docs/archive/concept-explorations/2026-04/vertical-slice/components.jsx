// ============================================================
// Evo Tactics — Vertical Slice: Risveglio del Leviatano
// Shared components + data
// ============================================================

// ---------- DATA ----------
const MISSION = {
  id: 'risveglio_leviatano',
  title: 'Risveglio del Leviatano',
  subtitle: 'Frattura Abissale Sinaptica · Strato Crepuscolare → Frattura Nera',
  biome_it: 'Frattura Abissale Sinaptica',
  biome_en: 'Synaptic Abyssal Rift',
  difficulty: 5,
  mod_biome: 3,
  stresswave_baseline: 0.35,
  escalation_rate: 0.06,
  thresholds: { sync_window: 0.52, overload: 0.74, fracture: 0.9 },
  hazards: [
    { id: 'memory_fog', label: 'Nebbia Mnesica', mod: 0.06 },
    { id: 'gravitic_shear', label: 'Shear Gravitazionale', mod: 0.08 },
    { id: 'black_current', label: 'Corrente Nera', mod: 0.09 },
  ],
  hooks: [
    'Stabilizzare i corridoi luminosi della Cresta Fotofase prima delle maree di spore',
    'Recuperare dati memetici nella Soglia Crepuscolare senza innescare eclissi sinaptiche',
    'Disinnescare il Canto dello Strappo nella Frattura Nera — o accordarsi con il Leviatano Risonante',
  ],
};

const PARTY = [
  {
    id: 'P1',
    player: 'P1 · Mara',
    species_it: 'Polpo Araldo Sinaptico',
    binomial: 'Synaptopus praeco',
    clade: 'Keystone',
    role: 'Supporto / Eco-sync',
    hp: 22,
    hp_max: 22,
    traits_core: [
      'Impulsi Bioluminescenti',
      'Nodi Sinaptici Superficiali',
      'Membrane Fotoconvoglianti',
    ],
    trait_optional_locked: 'Scintilla Sinaptica',
    unlock_condition: 'Mantieni sync > 0.60 per 2 turni consecutivi',
    color: '#4aa3c4',
  },
  {
    id: 'P2',
    player: 'P2 · Dario',
    species_it: 'Simbionte Corallino Riflesso',
    binomial: 'Corallosymbion speculans',
    clade: 'Support',
    role: 'Guardia / Diffusione nebbia',
    hp: 28,
    hp_max: 28,
    traits_core: ['Coralli Sinaptici Fotofase', 'Placca Diffusione Foschia', 'Organi Metacronici'],
    trait_optional_locked: 'Canto Risonante',
    unlock_condition: 'Assorbi ≥ 3 danni da shear proteggendo un alleato',
    color: '#c48a4a',
  },
  {
    id: 'P3',
    player: 'P3 · Lia',
    species_it: 'Anguilla Magnetica',
    binomial: 'Anguimagnus litoralis',
    clade: 'Bridge',
    role: 'Movimento / Interruzione',
    hp: 19,
    hp_max: 19,
    traits_core: ['Integumento Bipolare', 'Elettromagnete Biologico', 'Scivolamento Magnetico'],
    trait_optional_locked: 'Bozzolo Magnetico',
    unlock_condition: 'Attraversa 2 campi ferromagnetici senza subire danni',
    color: '#9a7fc4',
  },
  {
    id: 'P4',
    player: 'P4 · Enzo',
    species_it: "Ala d'Ombra",
    binomial: 'Umbralaris silens',
    clade: 'Playable / Scout',
    role: 'Ricognizione / Silenzio',
    hp: 18,
    hp_max: 18,
    traits_core: [
      'Vello di Assorbimento Totale',
      'Visione Multi-spettrale',
      'Motore Biologico Silenzioso',
    ],
    trait_optional_locked: 'Comunicazione Fotonica Coda-Coda',
    unlock_condition: 'Completa 1 ricognizione senza essere rilevato',
    color: '#6a8a6a',
  },
];

const ENEMIES_T1 = [
  {
    id: 'E1',
    species: 'Sciame di Larve Neurali',
    binomial: 'Neurolarva gregaria',
    clade: 'Threat',
    tier: 1,
    hp: 8,
    role: 'Swarm / Stress+',
  },
  {
    id: 'E2',
    species: 'Sciame di Larve Neurali',
    binomial: 'Neurolarva gregaria',
    clade: 'Threat',
    tier: 1,
    hp: 8,
    role: 'Swarm / Stress+',
  },
  {
    id: 'E3',
    species: 'Sferzatore Magnetico',
    binomial: 'Magnetoflagellum sp.',
    clade: 'Threat',
    tier: 4,
    hp: 24,
    role: 'Controllo spazio / Drain',
  },
];

const SPILLOVER_T2 = {
  from_biome: 'Reef Luminescente',
  species: 'Simbiotico Corallino Errante',
  binomial: 'Corallosymbion erraticus',
  clade: 'Support / Bridge',
  hp: 14,
  reason: 'Ponte seasonal attivo · migrazione luminescente verso la Cresta Fotofase',
  effect: '+1 Cohesion al party quando entra nel raggio sync · rivela 2 caselle di nebbia',
};

const LEVIATHAN_T3 = {
  species: 'Leviatano Risonante',
  binomial: 'Resonoleviathan abyssalis',
  clade: 'Apex',
  hp: 48,
  hp_max: 48,
  traits: [
    'Camere Risonanza Abissale',
    'Emettitori Voidsong',
    'Corazze Ferro-magnetiche',
    'Bioantenne Gravitiche',
  ],
  event: 'Canto dello Strappo · CD 4 turni · può invertire temp_traits',
};

window.MISSION = MISSION;
window.PARTY = PARTY;
window.ENEMIES_T1 = ENEMIES_T1;
window.SPILLOVER_T2 = SPILLOVER_T2;
window.LEVIATHAN_T3 = LEVIATHAN_T3;

// ---------- STYLE TOKENS (field-guide / Dougal Dixon inspired) ----------
const evoTokens = {
  paper: '#f1ead6',
  paper2: '#e8dfc4',
  paperShadow: '#d6c9a3',
  ink: '#1d1a14',
  inkSoft: '#3a332a',
  inkMute: '#6b5f4d',
  rule: '#1d1a14',
  accentRed: 'oklch(0.54 0.18 25)',
  accentBlue: 'oklch(0.54 0.09 235)',
  accentGreen: 'oklch(0.50 0.09 155)',
  accentAmber: 'oklch(0.65 0.13 75)',
  cladeColors: {
    Apex: 'oklch(0.45 0.18 25)',
    Keystone: 'oklch(0.52 0.12 235)',
    Bridge: 'oklch(0.55 0.13 295)',
    Threat: 'oklch(0.48 0.16 35)',
    Support: 'oklch(0.52 0.11 155)',
    Playable: 'oklch(0.48 0.09 90)',
    'Playable / Scout': 'oklch(0.48 0.09 90)',
    'Support / Bridge': 'oklch(0.52 0.11 190)',
  },
};
window.evoTokens = evoTokens;

// ---------- REUSABLE COMPONENTS ----------

const FieldLabel = ({ children, sub }) => (
  <div
    style={{
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 11,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      color: evoTokens.inkMute,
      borderBottom: `1px solid ${evoTokens.inkMute}`,
      paddingBottom: 4,
      marginBottom: 8,
    }}
  >
    {children}
    {sub && (
      <span
        style={{ float: 'right', fontStyle: 'italic', textTransform: 'none', letterSpacing: 0.5 }}
      >
        {sub}
      </span>
    )}
  </div>
);
window.FieldLabel = FieldLabel;

const Binomial = ({ genus, epithet, it, size = 14 }) => (
  <div style={{ lineHeight: 1.2 }}>
    <div
      style={{
        fontFamily: "'Spectral', Georgia, serif",
        fontSize: size + 4,
        fontWeight: 600,
        color: evoTokens.ink,
      }}
    >
      {it}
    </div>
    <div
      style={{
        fontFamily: "'Spectral', Georgia, serif",
        fontStyle: 'italic',
        fontSize: size,
        color: evoTokens.inkSoft,
      }}
    >
      {genus} {epithet}
    </div>
  </div>
);
window.Binomial = Binomial;

const CladeTag = ({ clade }) => (
  <span
    style={{
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 10,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      padding: '2px 8px',
      border: `1px solid ${evoTokens.cladeColors[clade] || evoTokens.ink}`,
      color: evoTokens.cladeColors[clade] || evoTokens.ink,
      background: 'transparent',
    }}
  >
    {clade}
  </span>
);
window.CladeTag = CladeTag;

// Stipple / hatched placeholder "specimen" illustration
const SpecimenPlaceholder = ({ w = 180, h = 120, label, seed = 1, variant = 'stipple' }) => {
  // deterministic stipple dots
  const dots = [];
  const rng = mulberry32(seed);
  const count = variant === 'stipple' ? 140 : 90;
  for (let i = 0; i < count; i++) {
    const cx = rng() * w;
    const cy = rng() * h;
    const r = 0.4 + rng() * 1.1;
    const opacity = 0.25 + rng() * 0.45;
    dots.push(<circle key={i} cx={cx} cy={cy} r={r} fill={evoTokens.ink} opacity={opacity} />);
  }
  // hatched lines for shape suggestion
  const hatches = [];
  if (variant === 'hatched') {
    for (let y = 0; y < h; y += 4) {
      hatches.push(
        <line
          key={'h' + y}
          x1={0}
          y1={y}
          x2={w}
          y2={y - 8}
          stroke={evoTokens.ink}
          strokeWidth={0.3}
          opacity={0.15}
        />,
      );
    }
  }
  return (
    <svg
      width={w}
      height={h}
      style={{
        display: 'block',
        background: evoTokens.paper2,
        border: `1px solid ${evoTokens.ink}`,
      }}
    >
      {hatches}
      {dots}
      {/* crosshair */}
      <line
        x1={w / 2 - 6}
        y1={h / 2}
        x2={w / 2 + 6}
        y2={h / 2}
        stroke={evoTokens.ink}
        strokeWidth={0.6}
      />
      <line
        x1={w / 2}
        y1={h / 2 - 6}
        x2={w / 2}
        y2={h / 2 + 6}
        stroke={evoTokens.ink}
        strokeWidth={0.6}
      />
      <text
        x={6}
        y={h - 6}
        fontFamily="'JetBrains Mono', monospace"
        fontSize={9}
        fill={evoTokens.inkMute}
      >
        ESEMPLARE · {label}
      </text>
      <text
        x={w - 6}
        y={h - 6}
        fontFamily="'JetBrains Mono', monospace"
        fontSize={9}
        fill={evoTokens.inkMute}
        textAnchor="end"
      >
        fig. {seed}
      </text>
    </svg>
  );
};
window.SpecimenPlaceholder = SpecimenPlaceholder;

function mulberry32(a) {
  return function () {
    var t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
window.mulberry32 = mulberry32;

// StressWave bar
const StressWave = ({ value, thresholds }) => {
  const pct = Math.min(1, Math.max(0, value));
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div
        style={{
          height: 18,
          background: evoTokens.paper2,
          border: `1px solid ${evoTokens.ink}`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* diagonal hatch fill */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: '100%',
            width: pct * 100 + '%',
            background: `repeating-linear-gradient(45deg, ${evoTokens.ink} 0 2px, transparent 2px 5px), ${evoTokens.accentRed}`,
            transition: 'width 0.4s ease',
          }}
        />
        {/* threshold ticks */}
        {Object.entries(thresholds).map(([name, t]) => (
          <div
            key={name}
            style={{
              position: 'absolute',
              top: -3,
              left: `${t * 100}%`,
              height: 24,
              width: 1,
              background: evoTokens.ink,
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: -14,
                left: -20,
                width: 40,
                textAlign: 'center',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 8,
                color: evoTokens.inkMute,
                textTransform: 'uppercase',
              }}
            >
              {name}
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          color: evoTokens.inkMute,
          marginTop: 4,
        }}
      >
        <span>0.00</span>
        <span style={{ color: evoTokens.ink, fontWeight: 700 }}>StressWave: {pct.toFixed(2)}</span>
        <span>1.00</span>
      </div>
    </div>
  );
};
window.StressWave = StressWave;

// HP bar, blockprint style
const HPBar = ({ hp, hp_max, color = evoTokens.ink }) => {
  const pct = hp / hp_max;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div
        style={{
          flex: 1,
          height: 8,
          background: evoTokens.paper2,
          border: `1px solid ${evoTokens.ink}`,
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: '100%',
            width: `${pct * 100}%`,
            background: color,
          }}
        />
      </div>
      <div
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          color: evoTokens.ink,
          minWidth: 36,
          textAlign: 'right',
        }}
      >
        {hp}/{hp_max}
      </div>
    </div>
  );
};
window.HPBar = HPBar;

// Corner marks (field guide plate corners)
const CornerMarks = ({ size = 12, color }) => {
  const c = color || evoTokens.ink;
  const s = size;
  return (
    <React.Fragment>
      <svg
        style={{ position: 'absolute', top: -1, left: -1, pointerEvents: 'none' }}
        width={s}
        height={s}
      >
        <path d={`M0,0 L${s},0 M0,0 L0,${s}`} stroke={c} strokeWidth={1.5} />
      </svg>
      <svg
        style={{ position: 'absolute', top: -1, right: -1, pointerEvents: 'none' }}
        width={s}
        height={s}
      >
        <path d={`M${s},0 L0,0 M${s},0 L${s},${s}`} stroke={c} strokeWidth={1.5} />
      </svg>
      <svg
        style={{ position: 'absolute', bottom: -1, left: -1, pointerEvents: 'none' }}
        width={s}
        height={s}
      >
        <path d={`M0,${s} L${s},${s} M0,${s} L0,0`} stroke={c} strokeWidth={1.5} />
      </svg>
      <svg
        style={{ position: 'absolute', bottom: -1, right: -1, pointerEvents: 'none' }}
        width={s}
        height={s}
      >
        <path d={`M${s},${s} L0,${s} M${s},${s} L${s},0`} stroke={c} strokeWidth={1.5} />
      </svg>
    </React.Fragment>
  );
};
window.CornerMarks = CornerMarks;

// TV frame chrome (simple thin bezel + safe area note)
const TVFrame = ({ children, screenLabel }) => (
  <div
    data-screen-label={screenLabel}
    style={{
      position: 'relative',
      width: 1600,
      height: 900,
      background: evoTokens.paper,
      border: `14px solid #0f0d0a`,
      borderRadius: 10,
      boxShadow: '0 20px 60px rgba(0,0,0,0.4), inset 0 0 40px rgba(0,0,0,0.1)',
      overflow: 'hidden',
    }}
  >
    <div
      style={{
        position: 'absolute',
        top: -28,
        left: 20,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
        color: '#555',
        letterSpacing: 2,
        textTransform: 'uppercase',
      }}
    >
      {screenLabel}
    </div>
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>{children}</div>
  </div>
);
window.TVFrame = TVFrame;

// Decorative paper texture noise (subtle)
const PaperTexture = () => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.11 0 0 0 0 0.1 0 0 0 0 0.08 0 0 0 0.18 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`,
      mixBlendMode: 'multiply',
      opacity: 0.35,
    }}
  />
);
window.PaperTexture = PaperTexture;

// Divider with label
const LabeledDivider = ({ label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '10px 0' }}>
    <div style={{ flex: 1, height: 1, background: evoTokens.ink }} />
    <div
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
        letterSpacing: 2,
        textTransform: 'uppercase',
        color: evoTokens.ink,
      }}
    >
      {label}
    </div>
    <div style={{ flex: 1, height: 1, background: evoTokens.ink }} />
  </div>
);
window.LabeledDivider = LabeledDivider;

// TopBar with breadcrumb, StressWave, turn counter
const MatchTopBar = ({ turn, stress, thresholds, subtitle }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 20,
      padding: '10px 24px',
      borderBottom: `2px solid ${evoTokens.ink}`,
      background: evoTokens.paper,
    }}
  >
    <div
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
        letterSpacing: 2,
        textTransform: 'uppercase',
        color: evoTokens.ink,
      }}
    >
      Risveglio del Leviatano
    </div>
    <div
      style={{
        fontFamily: "'Spectral', serif",
        fontStyle: 'italic',
        fontSize: 13,
        color: evoTokens.inkSoft,
      }}
    >
      {subtitle}
    </div>
    <div style={{ flex: 1 }} />
    <div style={{ minWidth: 360 }}>
      <StressWave value={stress} thresholds={thresholds} />
    </div>
    <div style={{ width: 20 }} />
    <div
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 12,
        color: evoTokens.ink,
        border: `1px solid ${evoTokens.ink}`,
        padding: '4px 10px',
      }}
    >
      TURN {turn.toString().padStart(2, '0')} / 06
    </div>
  </div>
);
window.MatchTopBar = MatchTopBar;

Object.assign(window, {
  FieldLabel,
  Binomial,
  CladeTag,
  SpecimenPlaceholder,
  StressWave,
  HPBar,
  CornerMarks,
  TVFrame,
  PaperTexture,
  LabeledDivider,
  MatchTopBar,
});
