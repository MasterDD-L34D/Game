# Obiettivi sandbox: canyon_fotosferico

## Trait-curator
- Slug/ID da mantenere: `raggi_fotosferici` (TR-9810), `alveoli_luminescenti` (TR-9811), `membrane_barocera` (TR-9812).
- Sinergie chiave: TR-9810 <-> TR-9811 per cicli di ricarica e segnalazione; TR-9810 <-> TR-9812 per schermare i coni fotonici dai vortici; evitare conflitto con TR-0113 su membrane.
- Vincoli ambientali: `biome_class: canyon_fotosferico` con requisiti di tolleranza radiazione, adattamento pressorio e metabolismo fotochimico; stress test in presenza di vortici fotonici e detriti ionici.
- Metriche da verificare: densità luminosa e tempi di ripristino (TR-9810), capacità di accumulo e scarica (TR-9811), assorbimento impatti e rigetto calore (TR-9812).

## Species-curator
- Specie di riferimento: *Noctilumen barocromicus* (`trait_refs`: TR-9810, TR-9811, TR-9812).
- Vincoli dichiarati: ricarica vincolata a colonne aurorali attive; degradazione membrane barocere in biomi non canyonici con vento stabile.
- Ecotipi su cui stressare i test: `Canyon Notturno`, `Gole Ventose`; verificare allineamento con hazard `vortici_fotonici` e `detriti_ionici`.
- Signature funzionale: trasporto fotonico con lampi accecanti e planate stabilizzate; da mantenere coerente con ruolo "keystone/bridge" nel pool.

## Biome-ecosystem-curator
- Slug bioma: `canyon_fotosferico` con alias `gole_aurorali`, `canyon_plasmoide`.
- Hazard prioritari: vortice_fotonico, micelio_riflettente, correnti_basalto_termico; stress_modifiers su orientamento (0.05) e respirazione (0.04).
- Risorse e note ecologiche: plasma_fotosferico, basalto_poroso, reticoli di micelio riflettente che amplificano l'aurora.
- Role template da coprire nei test: Pilastro Fotonico (keystone, tier 3), Cacciatore Barocromico (apex, tier 4), Vettore Aurorale (bridge, tier 2).
- Parametri di stresswave da monitorare: baseline 0.6, escalation_rate 0.18, soglie evento (crepuscolo 0.35, tempesta 0.75).
