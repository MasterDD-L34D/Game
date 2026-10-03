
// Evo Tactics — Idea Intake Widget
// Nota: mantenere sincronizzato con docs/public/embed.js (GitHub Pages).
(function(){
  const CATEGORIES = ["Narrativa","Meccaniche","Tooling","Arte","VTT","Repo","Docs","Personaggi","Divinità","Enneagramma","Sistema","Altro"];
  const PRIORITIES = ["P0","P1","P2","P3"];

  function el(tag, attrs={}, children=[]) {
    const e = document.createElement(tag);
    Object.entries(attrs||{}).forEach(([k,v]) => {
      if (k === "class") e.className = v;
      else if (k === "for") e.setAttribute("for", v);
      else if (k.startsWith("on") && typeof v === "function") e.addEventListener(k.substring(2), v);
      else e.setAttribute(k,v);
    });
    (Array.isArray(children) ? children : [children]).forEach(c => {
      if (typeof c === "string") e.appendChild(document.createTextNode(c));
      else if (c) e.appendChild(c);
    });
    return e;
  }

  function wrap(labelText, control, cls) {
    const c = el("div", { class: cls === "full" ? "full" : "" });
    const lbl = el("label", {}, labelText);
    c.appendChild(lbl);
    c.appendChild(control);
    return c;
  }

  function buildForm(container, opts) {
    const state = { apiBase: (opts.apiBase||"").trim(), apiToken: (opts.apiToken||"").trim() };
    const defaultModule = opts.defaultModule || "";
    const defaultPriority = opts.defaultPriority || "P2";

    const formActions = [];

    const f = el("form", { id: "idea-form" }, [
      el("div", { class: "grid" }, [
        wrap("Titolo breve", el("input", { type:"text", id:"title", placeholder:"titolo secco (max ~140)" }), "full"),
        wrap("Sommario (2-4 righe)", el("textarea", { id:"summary", rows:"3", placeholder:"Descrizione sintetica" }), "full"),
        wrap("Categoria", (function(){
          const sel = el("select", { id:"category" });
          CATEGORIES.forEach(c => sel.appendChild(el("option", { value: c }, c)));
          return sel;
        })()),
        wrap("Tags (spazio separati)", el("input", { type:"text", id:"tags", placeholder:"#ideazione #arco #bioma" })),
        wrap("Module", el("input", { type:"text", id:"module", placeholder:"es. NR04, Fangwood, Torneo Cremesi, Master DD core", value: defaultModule })),
        wrap("Entità (PG/NPC/divinità/luoghi/oggetti separati da virgola)", el("input", { type:"text", id:"entities", placeholder:"Jezelda, Cervo Bianco, Fangwood Keep" })),
        wrap("Priorità", (function(){
          const sel = el("select", { id:"priority" });
          PRIORITIES.forEach(p => sel.appendChild(el("option", { value: p, selected: p===defaultPriority? "selected": undefined }, p)));
          return sel;
        })()),
        wrap("Azioni Next (checklist)", el("textarea", { id:"actions_next", rows:"2", placeholder:"- [ ] azione 1\n- [ ] azione 2" }), "full"),
        wrap("Link Drive (se esiste)", el("input", { type:"text", id:"link_drive", placeholder:"https://docs.google.com/..." }), "full"),
        wrap("Github repo/percorso", el("input", { type:"text", id:"github", placeholder:"repo/percorso o URL se esiste" }), "full"),
        wrap("Note", el("textarea", { id:"note", rows:"2", placeholder:"altro" }), "full")
      ]),
      (function(){
        const sendButton = el("button", { type:"button", id:"send", class:"button" }, "Invia al backend");
        const previewButton = el("button", { type:"button", class:"button button--secondary", id:"preview" }, "Anteprima / Export .md");
        formActions.push(sendButton, previewButton);
        return el("div", { class: "actions" }, [sendButton, previewButton]);
      })(),
      el("div", { id:"result", class:"note", role:"status", "aria-live":"polite" })
    ]);
    container.appendChild(f);

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
      const res = document.getElementById("result");
      res.innerHTML = "";
      const err = validate(payload);
      if (err) { res.innerHTML = "<span class='err'>" + err + "</span>"; return; }
      if (!state.apiBase) { res.innerHTML = "<span class='err'>Configura <code>apiBase</code> per inviare al backend oppure usa Export .md.</span>"; return; }

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
        renderSuccess(res, data);
      } catch (e) {
        res.innerHTML = "<span class='err'>Errore: " + (e && e.message ? e.message : e) + "</span>";
      } finally {
        setBusy(false);
      }
    });

    previewButton?.addEventListener("click", () => {
      const payload = readPayload(f);
      const res = document.getElementById("result");
      const err = validate(payload);
      if (err) { res.innerHTML = "<span class='err'>" + err + "</span>"; return; }
      const md = buildMarkdown(payload);
      const pre = el("pre", { class:"preview" }, md);
      const dl = el("button", { type:"button", class:"button button--ghost", id:"download" }, "Scarica .md");
      dl.addEventListener("click", () => downloadMarkdown(md, payload.title));
      res.innerHTML = "";
      res.appendChild(pre);
      res.appendChild(el("div", { class:"actions" }, [dl]));
      res.appendChild(el("div", { class:"note small" }, "Metti il file in  /ideas  e fai commit. Il workflow aggiornerà docs/ideas/IDEAS_INDEX.md."));
    });
  }

  function renderSuccess(container, data) {
    const fragments = [
      "<div class='ok'>✅ Idea registrata.</div>"
    ];
    if (data.idea && data.idea.id) {
      fragments.push(`<div class='note small'>ID database: ${data.idea.id}</div>`);
    }
    if (data.exportPr && data.exportPr.pr_url) {
      fragments.push(`<div>PR: <a class='linkish' href='${data.exportPr.pr_url}' target='_blank' rel='noreferrer'>apri</a></div>`);
    }
    if (data.ghIssue && data.ghIssue.html_url) {
      fragments.push(`<div>Issue: <a class='linkish' href='${data.ghIssue.html_url}' target='_blank' rel='noreferrer'>apri</a></div>`);
    }
    if (data.driveDoc && data.driveDoc.url) {
      fragments.push(`<div>Doc: <a class='linkish' href='${data.driveDoc.url}' target='_blank' rel='noreferrer'>apri</a></div>`);
    }

    container.innerHTML = fragments.join("");

    if (data.report) {
      const reportWrapper = el("div", { class: "report" }, [
        el("div", { class: "report__header" }, [
          el("h4", {}, "Report Codex GPT"),
          (function createActions() {
            const copyButton = el("button", { type: "button", class: "button button--ghost" }, "Copia");
            copyButton.addEventListener("click", () => {
              if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
                navigator.clipboard.writeText(data.report).then(() => {
                  copyButton.textContent = "Copiato!";
                  setTimeout(() => { copyButton.textContent = "Copia"; }, 2000);
                }).catch(() => {
                  copyButton.textContent = "Errore copia";
                  setTimeout(() => { copyButton.textContent = "Copia"; }, 2000);
                });
              } else {
                const textArea = document.createElement("textarea");
                textArea.value = data.report;
                textArea.setAttribute("readonly", "readonly");
                textArea.style.position = "absolute";
                textArea.style.left = "-9999px";
                document.body.appendChild(textArea);
                textArea.select();
                try {
                  document.execCommand("copy");
                  copyButton.textContent = "Copiato!";
                } catch (err) {
                  copyButton.textContent = "Errore copia";
                }
                document.body.removeChild(textArea);
                setTimeout(() => { copyButton.textContent = "Copia"; }, 2000);
              }
            });
            const downloadButton = el("button", { type: "button", class: "button button--ghost" }, "Scarica report");
            downloadButton.addEventListener("click", () => {
              downloadMarkdown(data.report, `codex-report-${(data.idea && data.idea.id) ? data.idea.id : 'idea'}`);
            });
            return el("div", { class: "report__actions" }, [copyButton, downloadButton]);
          })()
        ]),
        el("pre", { class: "report__body" }, data.report)
      ]);
      container.appendChild(reportWrapper);
    }
  }

  function readPayload(f) {
    const val = id => (f.querySelector("#"+id).value || "").trim();
    const tags = (val("tags") || "").split(/\s+/).filter(Boolean);
    return {
      title: val("title"),
      summary: val("summary"),
      category: f.querySelector("#category").value,
      tags: tags,
      module: val("module"),
      entities: val("entities"),
      priority: f.querySelector("#priority").value,
      actions_next: val("actions_next"),
      link_drive: val("link_drive"),
      github: val("github"),
      note: val("note")
    };
  }

  function validate(p) {
    if (!p.title) return "Titolo richiesto.";
    if (!p.category) return "Categoria richiesta.";
    if (p.title.length > 140) return "Titolo troppo lungo (max 140).";
    return "";
  }

  function reminderBlock(p) {
    const tagInline = (p.tags||[]).map(t => t.startsWith("#")? t : ("#"+t)).join(" ");
    return [
      "IDEA: " + p.title,
      "SOMMARIO: " + (p.summary || ""),
      "CATEGORIA: " + p.category,
      "TAGS: " + tagInline,
      "MODULE: " + (p.module || ""),
      "ENTITÀ: " + (p.entities || ""),
      "PRIORITÀ: " + (p.priority || ""),
      "AZIONI_NEXT: " + (p.actions_next || ""),
      "LINK_DRIVE: " + (p.link_drive || ""),
      "GITHUB: " + (p.github || ""),
      "NOTE: " + (p.note || "")
    ].join("\n");
  }

  function buildMarkdown(p) {
    const reminder = reminderBlock(p);
    const today = new Date().toISOString().slice(0,10);
    return [
      "# " + p.title,
      "",
      "**Created at:** " + today,
      "",
      "## Summary",
      p.summary || "-",
      "",
      "## Cross-References (GitHub ranked)",
      "- (verranno proposti dal backend; offline qui solo placeholder)",
      "",
      "## Google Drive (titoli/documenti)",
      "- (risultati mostrati se backend configurato)",
      "",
      "## Suggested Next Actions",
      "- [ ] Valida TAGS e MODULE contro le convenzioni del repo /config/project_index.json",
      "- [ ] Se mancano file, crea stub/notes e apri un Issue",
      "- [ ] Linka questa idea nel README/INDEX più vicino",
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

  window.IdeaWidget = {
    mount: function(selector, opts) {
      const root = document.querySelector(selector);
      if (!root) return;
      buildForm(root, opts||{});
    }
  };
})();
