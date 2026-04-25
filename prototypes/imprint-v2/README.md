# L'Impronta v2 — Mockup primo minuto

> Falsificatore standalone (CAP-13, audit Impronta CAP-10 AA01).
> Nessun backend richiesto. Apri `index.html` da qualsiasi browser moderno.

## Cosa testa

Modello **"4 creature in 1 bioma + foodweb"** (correzione utente vs proposta originale "1 creatura 4 mani"):

- 4 player sceglono parallelamente 1 binary su body parts
- TV view mostra 4 silhouette distinte che si plasmano in sincrono
- Bioma emerge dalle 4 scelte aggregate (Pattern D hybrid: lookup + team modulation)
- Foodweb sidebar L1 decorativo già al primo minuto

## Come testarlo

### Single-laptop (5 tab)

1. Apri `index.html` in browser
2. Apri 4 tab in più sullo stesso file
3. Nella prima tab clicca **TV**, nelle altre 4 clicca rispettivamente **Phone 1**, **Phone 2**, **Phone 3**, **Phone 4**
4. Effettua le scelte sui phone, osserva la TV in live
5. Quando tutti i 4 player hanno scelto, il bioma viene rivelato + foodweb sidebar appare

### Multi-device (4 amici reali su tavolo)

1. Server locale: `cd prototypes/imprint-v2 && python -m http.server 8080` (o `npx serve`)
2. Trova IP del laptop: `ipconfig` (Win) / `ifconfig` (Mac/Linux)
3. Laptop su TV (browser tab `http://localhost:8080#tv`)
4. 4 phone su stessa rete WiFi: `http://<IP_laptop>:8080#p1` (e p2, p3, p4)
5. **Note**: BroadcastChannel funziona solo same-origin same-tab. Multi-device richiede backend WebSocket reale (CAP-14). Per ora multi-device funziona via polling sessionStorage (~1.5s lag).

## Acceptance criteria del falsificatore (audit CAP-10 §Calibrazione)

Test su 4 amici reali per 12 minuti:

- ✅ **Pass** se 3/4 player descrivono creature distinte (proprie!) e ricordano momenti distinti dei primi 60s
- ❌ **Fail** se 3+/4 player dicono "siamo confusi su chi è chi" → modello "4 creature" è sbagliato, ripensare a 1 unione

## Limitazioni mockup

- **No backend**: scelte non persistono cross-session
- **No WebSocket reale**: sync via BroadcastChannel (same-browser only) o sessionStorage poll (~1.5s)
- **No combat**: solo i primi 60s di plasmatura + bioma reveal
- **Silhouette emoji statiche**: nel mock arrivato qui sono 4 emoji. In V2 reale saranno 4 SVG/sprite animati che evolvono visualmente con le scelte (glifi che si incidono, parti del corpo che si trasformano).

## File

- `index.html` — single-file mockup (HTML + CSS + JS inline)
- `README.md` — questo file

## Reference

- Audit: `archive/2026-04-aa01-001-2026-04-25-cap-10-audit-impronta-archon-` (AA01)
- Bioma resolver: `apps/backend/services/imprint/biomeResolver.js` (CAP-11)
- Pattern D hybrid: lookup 16→7 biomi + 4 modulation rules
