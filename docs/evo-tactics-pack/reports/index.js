import { loadPackCatalog } from "../pack-data.js";

const summaryEl = document.getElementById("reports-summary");
const metricsEl = document.getElementById("reports-metrics");
const linksEl = document.getElementById("reports-links");
const errorEl = document.getElementById("reports-error");

function setSummary(message) {
  if (summaryEl) {
    summaryEl.textContent = message;
  }
}

function setError(message) {
  if (!errorEl) return;
  errorEl.textContent = message;
  errorEl.hidden = !message;
}

function createMetric(label, value) {
  const chip = document.createElement("span");
  chip.className = "chip";
  chip.innerHTML = `<strong>${value}</strong> ${label}`;
  return chip;
}

function createCard({ title, description, href, buttonLabel = "Apri", meta = [], external = false }) {
  const card = document.createElement("article");
  card.className = "card card--link";

  const heading = document.createElement("h3");
  heading.textContent = title;

  const body = document.createElement("p");
  body.textContent = description;

  const metaEl = document.createElement("p");
  metaEl.className = "form__hint";
  metaEl.textContent = meta.join(" · ");
  if (!meta.length) {
    metaEl.hidden = true;
  }

  const button = document.createElement("a");
  button.className = "button button--secondary";
  button.href = href;
  button.textContent = buttonLabel;
  if (external) {
    button.target = "_blank";
    button.rel = "noreferrer";
  }

  card.append(heading, body, metaEl, button);
  return card;
}

function formatGeneratedAt(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString("it-IT", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

async function init() {
  setSummary("Caricamento in corso…");
  setError("");
  try {
    const { data, context } = await loadPackCatalog();

    const biomeCount = data.biomi?.length ?? 0;
    const speciesCount = data.species?.length ?? 0;
    const connectionCount = data.ecosistema?.connessioni?.length ?? 0;
    const generatedAt = formatGeneratedAt(data.generated_at);

    setSummary(
      `${data.ecosistema?.label ?? "Meta-ecosistema"} con ${biomeCount} biomi e ${speciesCount} specie catalogate.`
    );

    if (metricsEl) {
      metricsEl.innerHTML = "";
      metricsEl.appendChild(createMetric("Biomi", biomeCount));
      metricsEl.appendChild(createMetric("Specie", speciesCount));
      metricsEl.appendChild(createMetric("Connessioni", connectionCount));
      if (generatedAt) {
        metricsEl.appendChild(createMetric("Ultimo export", generatedAt));
      }
    }

    if (linksEl) {
      linksEl.innerHTML = "";
      const cards = [];

      cards.push(
        createCard({
          title: "Panoramica meta-ecosistema",
          description:
            "Sintesi delle connessioni tra biomi, link ai validator e accesso ai dataset YAML principali.",
          href: "overview.html",
          meta: ["Connessioni e dataset"],
        })
      );

      cards.push(
        createCard({
          title: "Indice specie interattivo",
          description:
            "Filtra l'elenco completo delle specie per bioma, ruolo trofico, tag funzionali o ricerca testuale.",
          href: "species-index.html",
          meta: [`${speciesCount} specie catalogate`],
        })
      );

      (data.biomi || []).forEach((biome) => {
        const manifestCounts = Object.entries(biome.manifest?.species_counts ?? {})
          .map(([key, value]) => `${key}: ${value}`)
          .join(", ");
        cards.push(
          createCard({
            title: `Report bioma — ${biome.id}`,
            description:
              "Manifest, foodweb e specie di riferimento con collegamenti diretti ai dataset.",
            href: `biomes/${biome.id}.html`,
            meta: [
              `${biome.species?.length ?? 0} specie`,
              manifestCounts ? `Manifest ${manifestCounts}` : "",
            ].filter(Boolean),
          })
        );
      });

      cards.push(
        createCard({
          title: "Validator CI",
          description:
            "Consulta l'ultimo report HTML della pipeline di validazione per verificare consistenza e warning.",
          href: context.resolvePackHref("out/validation/last_report.html"),
          buttonLabel: "Apri il report CI",
          external: true,
        })
      );

      cards.forEach((card) => linksEl.appendChild(card));
    }
  } catch (error) {
    console.error("Impossibile caricare il catalogo del pack", error);
    setSummary("Impossibile ottenere i dati del pack.");
    setError("Errore durante il caricamento dei report. Controlla la console del browser per i dettagli.");
  }
}

init();
