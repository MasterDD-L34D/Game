
import { el } from './ui/dom.js';
import { createMultiSelectField } from './ui/token-selector.js';
import { createStatusBanner } from './ui/status-banner.js';
import { createReportCard } from './ui/report-card.js';

// Evo Tactics — Idea Intake Widget
// Nota: mantenere sincronizzato con docs/public/embed.js (GitHub Pages).
(function(){
  const DEFAULT_CATEGORIES = [
    "Biomi",
    "Ecosistemi",
    "Specie",
    "Tratti & Mutazioni",
    "Missioni & Stage",
    "Telemetria & HUD",
    "Tooling & Pipeline",
    "Documentazione & Lore",
    "Progressione & Economia",
    "Altro"
  ];
  const PRIORITIES = ["P0","P1","P2","P3"];
  const MULTI_FIELD_LABELS = {
    biomes: "Biomi",
    ecosystems: "Ecosistemi",
    species: "Specie",
    traits: "Tratti",
    game_functions: "Funzioni di gioco"
  };
  const MULTI_FIELD_KEYS = Object.keys(MULTI_FIELD_LABELS);
  const STYLE_ATTRIBUTE = 'data-idea-widget-styles';
  const STYLE_FILENAME_PATTERN = /widget\.css(\?|$)/;
  const FEEDBACK_TEMPLATE_FALLBACK = '../ideas/feedback.md';
  let warnedMissingStyles = false;

  function unique(arr) {
    return Array.from(new Set((arr || []).filter(Boolean)));
  }

  function slugify(value) {
    if (!value) return '';
    return String(value)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_+|_+$/g, '')
      .replace(/^-+|-+$/g, '');
  }

  function nodeMatchesWidgetStyles(node) {
    if (!node || node.nodeType !== 1) return false;
    if (typeof node.getAttribute !== 'function') return false;
    if (node.getAttribute(STYLE_ATTRIBUTE) !== null) return true;
    const href = node.getAttribute('href') || node.getAttribute('data-href') || '';
    return href ? STYLE_FILENAME_PATTERN.test(href) : false;
  }

  function widgetStylesAvailable() {
    if (typeof document === 'undefined') return true;
    if (document.querySelector(`[${STYLE_ATTRIBUTE}]`)) return true;
    if (document.querySelector('link[href*="widget.css"]')) return true;
    try {
      const styleSheets = Array.from(document.styleSheets || []);
      for (const sheet of styleSheets) {
        if (nodeMatchesWidgetStyles(sheet.ownerNode)) {
          return true;
        }
        if (sheet.href && STYLE_FILENAME_PATTERN.test(sheet.href)) {
          return true;
        }
      }
    } catch (error) {
      // Access to document.styleSheets may fail for cross-origin styles; rely on DOM queries instead.
    }
    return false;
  }

  function assertWidgetStyles() {
    const loaded = widgetStylesAvailable();
    if (!loaded && !warnedMissingStyles) {
      warnedMissingStyles = true;
      console.warn(
        'IdeaWidget: stili non trovati. Includi docs/assets/styles/widget.css e contrassegna il <link> con data-idea-widget-styles.'
      );
    }
    return loaded;
  }

  async function fetchCategoriesFrom(url) {
    if (!url) return [];
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) throw new Error(response.statusText || 'HTTP ' + response.status);
      const json = await response.json();
      if (json && Array.isArray(json.categories)) {
        return json.categories.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim());
      }
      if (Array.isArray(json)) {
        return json.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim());
      }
    } catch (error) {
      console.warn('Impossibile caricare le categorie da', url, error);
    }
    return [];
  }

  function deriveAssetUrl(assetName) {
    try {
      if (typeof document === 'undefined') return null;
      const currentScript = document.currentScript;
      if (currentScript && currentScript.src) {
        const src = new URL(currentScript.src, window.location.href);
        return new URL(assetName, src).toString();
      }
    } catch (error) {
      console.warn('Errore calcolo asset URL', assetName, error);
    }
    return null;
  }

  async function resolveCategories(opts) {
    const config = (typeof window !== 'undefined' && window.IDEA_WIDGET_CONFIG) ? window.IDEA_WIDGET_CONFIG : {};
    const urls = unique([
      opts && opts.categoriesUrl,
      config.categoriesUrl,
      deriveAssetUrl('idea_engine_taxonomy.json'),
      '../config/idea_engine_taxonomy.json'
    ]);

    for (const url of urls) {
      const categories = await fetchCategoriesFrom(url);
      if (categories.length) {
        return categories;
      }
    }

    return DEFAULT_CATEGORIES.slice();
  }

  async function fetchTaxonomyFrom(url) {
    if (!url) return null;
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) throw new Error(response.statusText || 'HTTP ' + response.status);
      const json = await response.json();
      if (json && typeof json === 'object') {
        return json;
      }
    } catch (error) {
      console.warn('Impossibile caricare la tassonomia slug da', url, error);
    }
    return null;
  }

  async function resolveTaxonomy(opts) {
    const config = (typeof window !== 'undefined' && window.IDEA_WIDGET_CONFIG) ? window.IDEA_WIDGET_CONFIG : {};
    const urls = unique([
      opts && opts.taxonomyUrl,
      config.taxonomyUrl,
      deriveAssetUrl('idea-taxonomy.json'),
      '../public/idea-taxonomy.json',
      'idea-taxonomy.json'
    ]);

    for (const url of urls) {
      const taxonomy = await fetchTaxonomyFrom(url);
      if (taxonomy) return taxonomy;
    }

    return {
      biomes: [],
      biomeAliases: {},
      ecosystems: [],
      species: [],
      speciesAliases: {},
      traits: [],
      gameFunctions: []
    };
  }

  function normaliseAliasMap(map) {
    const result = {};
    Object.entries(map || {}).forEach(([alias, canonical]) => {
      const aliasSlug = slugify(alias);
      const canonicalSlug = slugify(canonical);
      if (aliasSlug && canonicalSlug) {
        result[aliasSlug] = canonicalSlug;
      }
    });
    return result;
  }

  function prepareTaxonomy(raw) {
    const data = raw && typeof raw === 'object' ? raw : {};

    function prepareField(list = [], aliases = {}) {
      const canonical = unique((list || []).map((value) => slugify(value)).filter(Boolean));
      const aliasMap = normaliseAliasMap(aliases);
      const canonicalSet = new Set(canonical);
      Object.values(aliasMap).forEach((value) => canonicalSet.add(value));
      const suggestions = unique([...canonicalSet, ...Object.keys(aliasMap)]);
      return { canonical, canonicalSet, aliasMap, suggestions };
    }

    return {
      biomes: prepareField(data.biomes || [], data.biomeAliases || {}),
      ecosystems: prepareField(data.ecosystems || []),
      species: prepareField(data.species || [], data.speciesAliases || {}),
      traits: prepareField(data.traits || []),
      game_functions: prepareField(data.gameFunctions || [])
    };
  }

  function formatList(items) {
    if (!items || !items.length) return "-";
    return items.join(", ");
  }

  function splitList(value) {
    if (!value) return [];
    return value
      .split(/[\n,;]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function wrap(labelText, control, cls) {
    const c = el("div", { class: cls === "full" ? "full" : "" });
    const lbl = el("label", {}, labelText);
    c.appendChild(lbl);
    c.appendChild(control);
    return c;
  }

  function createValidator(categories) {
    const validCategories = new Set((categories || []).map((c) => c.trim()));
    return function validate(p) {
      if (!p.title) return "Titolo richiesto.";
      if (!p.category) return "Categoria richiesta.";
      if (p.title.length > 140) return "Titolo troppo lungo (max 140).";
      if (validCategories.size && !validCategories.has(p.category)) return "Categoria non valida";
      if (!p.allowSlugOverride) {
        const unknown = p.__unknownSlugs || {};
        const problems = [];
        MULTI_FIELD_KEYS.forEach((key) => {
          const values = Array.isArray(unknown[key]) ? unknown[key] : [];
          if (values.length) {
            problems.push(`${MULTI_FIELD_LABELS[key]}: ${values.join(', ')}`);
          }
        });
        if (problems.length) {
          return 'Slug non riconosciuti — correggi oppure abilita l\'override: ' + problems.join('; ');
        }
      }
      return "";
    };
  }

  function reminderBlock(p) {
    const tagInline = (p.tags||[]).map(t => t.startsWith("#")? t : ("#"+t)).join(" ");
    return [
      "IDEA: " + p.title,
      "SOMMARIO: " + (p.summary || ""),
      "CATEGORIA: " + p.category,
      "TAGS: " + tagInline,
      "BIOMI: " + formatList(p.biomes),
      "ECOSISTEMI: " + formatList(p.ecosystems),
      "SPECIE: " + formatList(p.species),
      "TRATTI: " + formatList(p.traits),
      "FUNZIONI_GIOCO: " + formatList(p.game_functions),
      "PRIORITÀ: " + (p.priority || ""),
      "AZIONI_NEXT: " + (p.actions_next || ""),
      "LINK_DRIVE: " + (p.link_drive || ""),
      "GITHUB: " + (p.github || ""),
      "NOTE: " + (p.note || "")
    ].join("\n");
  }

  function buildMarkdown(p) {
    const reminder = reminderBlock(p);
    const today = new Date().toISOString().slice(0, 10);
    return [
      "# " + p.title,
      "",
      "**Created at:** " + today,
      "",
      "## Summary",
      p.summary || "-",
      "",
      "## Ecosystem Scope",
      "- **Biomi:** " + formatList(p.biomes),
      "- **Ecosistemi:** " + formatList(p.ecosystems),
      "- **Specie:** " + formatList(p.species),
      "- **Tratti:** " + formatList(p.traits),
      "- **Funzioni di gioco:** " + formatList(p.game_functions),
      "",
      "## Cross-References (GitHub ranked)",
      "- (verranno proposti dal backend; offline qui solo placeholder)",
      "",
      "## Google Drive (titoli/documenti)",
      "- (risultati mostrati se backend configurato)",
      "",
      "## Suggested Next Actions",
      "- [ ] Valida TAGS, BIOMI e SPECIE con le convenzioni in /config/project_index.json",
      "- [ ] Aggiorna o crea i dataset YAML in data/core/biomes.yaml, data/core/species.yaml e data/core/traits/ se mancano riferimenti",
      "- [ ] Collega la proposta al catalogo ecosistemi (docs/evo-tactics-pack) o al README pertinente",
      "- [ ] (Opzionale) Copia un Google Doc da template e incolla il Reminder nell’header",
      "- [ ] (Opzionale) Esporta questa idea in `/ideas` del repo tramite PR automatica",
      "",
      "## Reminder Block",
      "```",
      reminder,
      "```",
      ""
    ].join("\n");
  }

  function downloadMarkdown(md, title) {
    const slug = (title || "idea").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
    const today = new Date().toISOString().slice(0,10);
    const name = today + "_" + slug + ".md";
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 300);
  }

  function scheduleFeedbackLoad(statusBanner, options, idea) {
    const loadFeedback = () => {
      import('./ui/feedback-card.js').then(({ createFeedbackCard }) => {
        const card = createFeedbackCard(options, idea);
        if (card) {
          statusBanner.append(card);
        }
      }).catch((error) => {
        console.warn('Impossibile caricare modulo feedback', error);
      });
    };

    if (typeof window !== 'undefined' && typeof IntersectionObserver !== 'undefined' && statusBanner?.element) {
      const observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          loadFeedback();
        }
      }, { rootMargin: '32px' });
      observer.observe(statusBanner.element);
      return;
    }

    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(loadFeedback);
    } else {
      setTimeout(loadFeedback, 200);
    }
  }

  function renderSuccess(statusBanner, data, options) {
    const fragments = [
      el('div', { class: 'ok' }, '✅ Idea registrata.')
    ];
    if (data.idea && data.idea.id) {
      fragments.push(el('div', { class: 'note small' }, `ID database: ${data.idea.id}`));
    }
    if (data.exportPr && data.exportPr.pr_url) {
      fragments.push(el('div', {}, ['PR: ', el('a', { class: 'linkish', href: data.exportPr.pr_url, target: '_blank', rel: 'noreferrer' }, 'apri')]));
    }
    if (data.ghIssue && data.ghIssue.html_url) {
      fragments.push(el('div', {}, ['Issue: ', el('a', { class: 'linkish', href: data.ghIssue.html_url, target: '_blank', rel: 'noreferrer' }, 'apri')]));
    }
    if (data.driveDoc && data.driveDoc.url) {
      fragments.push(el('div', {}, ['Doc: ', el('a', { class: 'linkish', href: data.driveDoc.url, target: '_blank', rel: 'noreferrer' }, 'apri')]));
    }

    statusBanner.setContent(fragments);

    if (data.report) {
      const reportCard = createReportCard(data.report, downloadMarkdown, data.idea && data.idea.id);
      statusBanner.append(reportCard);
    }

    scheduleFeedbackLoad(statusBanner, options, data.idea);
  }

  function buildForm(container, opts, categories, taxonomyRaw) {
    assertWidgetStyles();
    if (container && typeof container.classList?.add === 'function') {
      container.classList.add('idea-widget');
    }
    const taxonomy = prepareTaxonomy(taxonomyRaw);
    const state = {
      apiBase: (opts.apiBase||"").trim(),
      apiToken: (opts.apiToken||"").trim(),
      feedbackChannel: (opts.feedbackChannel || '#feedback-enhancements').trim()
    };
    const templateUrl = (opts.feedbackTemplateUrl || deriveAssetUrl(FEEDBACK_TEMPLATE_FALLBACK) || '').trim();
    if (templateUrl) {
      state.feedbackTemplateUrl = templateUrl;
    }
    state.categories = Array.isArray(categories) && categories.length ? categories : DEFAULT_CATEGORIES.slice();
    const defaultBiomes = splitList(opts.defaultBiomes || opts.defaultModule || "");
    const defaultEcosystems = splitList(opts.defaultEcosystems || "");
    const defaultSpecies = splitList(opts.defaultSpecies || "");
    const defaultTraits = splitList(opts.defaultTraits || "");
    const defaultFunctions = splitList(opts.defaultFunctions || "");
    const defaultPriority = opts.defaultPriority || "P2";

    const formActions = [];
    const validate = createValidator(state.categories);

    const f = el("form", { id: "idea-form" }, [
      el("div", { class: "grid" }, [
        wrap("Titolo breve", el("input", { type:"text", id:"title", placeholder:"titolo secco (max ~140)" }), "full"),
        wrap("Sommario (2-4 righe)", el("textarea", { id:"summary", rows:"3", placeholder:"Descrizione sintetica" }), "full"),
        wrap("Categoria", (function(){
          const sel = el("select", { id:"category" });
          state.categories.forEach(c => sel.appendChild(el("option", { value: c }, c)));
          return sel;
        })()),
        wrap("Tags (spazio separati)", el("input", { type:"text", id:"tags", placeholder:"#ideazione #bioma #specie" })),
        wrap("Biomi coinvolti", createMultiSelectField({ slugify }, { id: 'biomes', placeholder: 'foresta_miceliale, dorsale_termale_tropicale…', taxonomy: taxonomy.biomes, defaults: defaultBiomes }), "full"),
        wrap("Ecosistemi / Meta-nodi", createMultiSelectField({ slugify }, { id: 'ecosystems', placeholder: 'meta_ecosistema_alpha, deserto_caldo…', taxonomy: taxonomy.ecosystems, defaults: defaultEcosystems }), "full"),
        wrap("Specie coinvolte", createMultiSelectField({ slugify }, { id: 'species', placeholder: 'dune-stalker, sentinella-radice…', taxonomy: taxonomy.species, defaults: defaultSpecies }), "full"),
        wrap("Tratti o mutazioni", createMultiSelectField({ slugify }, { id: 'traits', placeholder: 'focus_frazionato, zampe_a_molla…', taxonomy: taxonomy.traits, defaults: defaultTraits }), "full"),
        wrap("Funzioni di gioco / sistemi", createMultiSelectField({ slugify }, { id: 'game_functions', placeholder: 'telemetria_vc, progressione_pe…', taxonomy: taxonomy.game_functions, defaults: defaultFunctions }), "full"),
        wrap("Priorità", (function(){
          const sel = el("select", { id:"priority" });
          PRIORITIES.forEach(p => sel.appendChild(el("option", { value: p, selected: p===defaultPriority? "selected": undefined}, p)));
          return sel;
        })()),
        wrap("Azioni Next (checklist)", el("textarea", { id:"actions_next", rows:"2", placeholder:"- [ ] azione 1\n- [ ] azione 2" }), "full"),
        wrap("Link Drive (se esiste)", el("input", { type:"text", id:"link_drive", placeholder:"https://docs.google.com/..." }), "full"),
        wrap("Github repo/percorso", el("input", { type:"text", id:"github", placeholder:"repo/percorso o URL se esiste" }), "full"),
        wrap("Note", el("textarea", { id:"note", rows:"2", placeholder:"altro" }), "full"),
        (function createOverrideField(){
          const box = el('div', { class: 'full' });
          const label = el('label', { class: 'checkbox' });
          const input = el('input', { type: 'checkbox', id: 'allow_slug_override' });
          label.appendChild(input);
          label.appendChild(document.createTextNode(' Consenti slug fuori catalogo (usa solo per esperimenti)'));
          box.appendChild(label);
          return box;
        })()
      ]),
      (function(){
        const sendButton = el("button", { type:"button", id:"send", class:"button" }, "Invia al backend");
        const previewButton = el("button", { type:"button", class:"button button--secondary", id:"preview" }, "Anteprima / Export .md");
        formActions.push(sendButton, previewButton);
        return el("div", { class: "actions" }, [sendButton, previewButton]);
      })()
    ]);
    container.appendChild(f);
    const statusBanner = createStatusBanner();
    f.appendChild(statusBanner.element);

    const sendButton = formActions[0];
    const previewButton = formActions[1];

    function setBusy(isBusy) {
      if (!sendButton) return;
      sendButton.disabled = isBusy;
      sendButton.classList.toggle("button--busy", isBusy);
      sendButton.textContent = isBusy ? "Invio in corso…" : "Invia al backend";
    }

    sendButton?.addEventListener("click", async () => {
      const payload = readPayload(f);
      statusBanner.clear();
      const err = validate(payload);
      if (err) { statusBanner.showError(err); return; }
      delete payload.__unknownSlugs;
      if (!state.apiBase) {
        statusBanner.setContent(el('span', { class: 'err' }, [
          'Configura ',
          el('code', {}, 'apiBase'),
          ' per inviare al backend oppure usa Export .md.'
        ]));
        return;
      }

      try {
        setBusy(true);
        const r = await fetch(state.apiBase.replace(/\/$/,'') + "/api/ideas", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(state.apiToken ? { "Authorization": "Bearer " + state.apiToken } : {})
          },
          body: JSON.stringify(payload)
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data && data.error ? data.error : r.status + " " + r.statusText);
        renderSuccess(statusBanner, data, state);
      } catch (e) {
        statusBanner.showError('Errore: ' + (e && e.message ? e.message : e));
      } finally {
        setBusy(false);
      }
    });

    previewButton?.addEventListener("click", () => {
      const payload = readPayload(f);
      statusBanner.clear();
      const err = validate(payload);
      if (err) { statusBanner.showError(err); return; }
      delete payload.__unknownSlugs;
      const md = buildMarkdown(payload);
      const pre = el("pre", { class:"preview" }, md);
      const dl = el("button", { type:"button", class:"button button--ghost", id:"download" }, "Scarica .md");
      dl.addEventListener("click", () => downloadMarkdown(md, payload.title));
      statusBanner.setContent([
        pre,
        el("div", { class:"actions" }, [dl]),
        el("div", { class:"note small" }, "Metti il file in  /ideas  e fai commit. Il workflow aggiornerà IDEAS_INDEX.md.")
      ]);
    });
  }

  function readPayload(f) {
    const val = (id) => {
      const node = f.querySelector('#' + id);
      if (!node) return '';
      if (node.type === 'checkbox') {
        return node.checked;
      }
      return (node.value || '').trim();
    };
    const list = (id) => {
      const field = f.querySelector('#' + id);
      if (!field) return [];
      if (field.dataset.multi === 'json') {
        try {
          const parsed = JSON.parse(field.value || '[]');
          if (Array.isArray(parsed)) {
            return parsed;
          }
        } catch (error) {
          return [];
        }
        return [];
      }
      return splitList(field.value);
    };

    const payload = {
      title: val("title"),
      summary: val("summary"),
      category: f.querySelector("#category").value,
      tags: (val("tags") || "").split(/\s+/).filter(Boolean),
      biomes: list("biomes"),
      ecosystems: list("ecosystems"),
      species: list("species"),
      traits: list("traits"),
      game_functions: list("game_functions"),
      priority: f.querySelector("#priority").value,
      actions_next: val("actions_next"),
      link_drive: val("link_drive"),
      github: val("github"),
      note: val("note"),
      allowSlugOverride: Boolean(f.querySelector('#allow_slug_override')?.checked)
    };

    const unknown = {};
    MULTI_FIELD_KEYS.forEach((key) => {
      const field = f.querySelector('#' + key);
      if (!field) return;
      const stored = field.dataset.unknownValues;
      if (!stored) return;
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length) {
          unknown[key] = parsed;
        }
      } catch (error) {
        // ignore malformed dataset
      }
    });
    if (Object.keys(unknown).length) {
      payload.__unknownSlugs = unknown;
    }

    return payload;
  }

  window.IdeaWidget = {
    mount: function(selector, opts) {
      const root = document.querySelector(selector);
      const options = opts || {};
      if (!root) return Promise.resolve(DEFAULT_CATEGORIES.slice());
      return Promise.all([resolveCategories(options), resolveTaxonomy(options)]).then(([categories, taxonomy]) => {
        buildForm(root, options, categories, taxonomy);
        return categories;
      }).catch((error) => {
        console.warn('Errore mount widget, uso categorie di default', error);
        return resolveTaxonomy(options).then((taxonomy) => {
          buildForm(root, options, DEFAULT_CATEGORIES.slice(), taxonomy);
          return DEFAULT_CATEGORIES.slice();
        });
      });
    },
    loadCategories: function(opts) {
      return resolveCategories(opts || {});
    },
    DEFAULT_CATEGORIES: DEFAULT_CATEGORIES.slice()
  };
})();
