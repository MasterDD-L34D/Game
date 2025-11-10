# Automazioni CI — Mappa sito, Link checker, Lighthouse, E2E, Search

Questa cartella contiene workflow e script per mantenere il sito **fruibile**, **indicizzabile** e **affidabile**.

## Variabile fondamentale
Imposta `SITE_BASE_URL` (Actions → Variables o Secrets) per abilitare:
- Link-checker
- Lighthouse CI
- E2E Playwright (BASE_URL)

## Ordine tipico
1. Site Audit (sitemap + link check + report + PR)
2. Build Search Index (commit `search_index.json`)
3. Lighthouse CI (report prestazioni e accessibilità) — `npm run lint:lighthouse`
4. E2E Tests (navigazione e generatore)
