---
doc_status: active
doc_owner: master-dd
workstream: ops-qa
last_verified: '2026-07-12'
source_of_truth: false
language: it
review_cycle_days: 180
---

# Asset staging provenance -- download manifest Fase 2 (2026-07-12)

Esecuzione autorizzata owner (in-session) del manifest `docs/core/43-ASSET-SOURCING.md`.
Copia repo-visibile dell'evidenza di provenance: la licenza di ogni file e' stata
RI-VERIFICATA sulla pagina sorgente al momento del fetch (campo License presente
nell'HTML scaricato nella stessa richiesta). Staging locale: `C:\dev\_evo-assets-staging\`
(Ryzen; NON in repo -- import in Game-Godot-v2 = slice F-A con vaglio palette/tono).

## Scaricati (22 file, ~117MB)

| File (staging) | Classe | Fonte / autore | Licenza al fetch | SHA256 (16 hex) |
| --- | --- | --- | --- | --- |
| sfx-combat/80-CC0-creature-SFX.zip | SFX combat | OGA rubberduck | CC0 | 5d4002eea42f278e |
| sfx-combat/qubodupImpact.7z | SFX combat | OGA qubodup | CC0 | 98d72b55d6f78a32 |
| sfx-combat/squish/squish_01_0.mp3 | SFX combat | OGA EZduzziteh | CC0 | ed0faca6a71070ab |
| sfx-combat/squish/squish_02.mp3 | SFX combat | OGA EZduzziteh | CC0 | 1ea4ec07d2af69d2 |
| sfx-combat/squish/squish_03.mp3 | SFX combat | OGA EZduzziteh | CC0 | 701d979524931d77 |
| sfx-combat/squish/squish_04.mp3 | SFX combat | OGA EZduzziteh | CC0 | 5577601ad97a5ddc |
| sfx-combat/squish/squish_05.mp3 | SFX combat | OGA EZduzziteh | CC0 | 2a34bd168473634e |
| sfx-combat/squish/squish_06.mp3 | SFX combat | OGA EZduzziteh | CC0 | 271d21b257e4d31d |
| sfx-combat/squish/squishpop.mp3 | SFX combat | OGA EZduzziteh | CC0 | 608865f49f3631c8 |
| sfx-combat/squish/squishsplat_impact.mp3 | SFX combat | OGA EZduzziteh | CC0 | 4b347996a324cb23 |
| sfx-ui/UI_SFX_Set.zip (51 WAV organici) | SFX UI | OGA Kenney | CC0 | 66026b9e39859b85 |
| sfx-ui/kenney_interface-sounds.zip | SFX UI | kenney.nl | CC0 | f2193d072726d675 |
| sfx-ui/kenney_ui-audio.zip | SFX UI | kenney.nl | CC0 | 946fc23a63d535d6 |
| ambience/dungeon_ambient_1.ogg | ambience caverna | OGA JaggedStone | CC0 | df491823e4877371 |
| ambience/Forest_Ambience.mp3 | ambience foresta | OGA TinyWorlds | CC0 | 9850aa1d0d5d66bd |
| ambience/birds-isaiah658.ogg | ambience layer uccelli | OGA isaiah658 | CC0 | 359e4e3f9da9d75a |
| ambience/jc-nature-ambient-vol1-mp3.7z | ambience nature/savana | OGA JC Sounds | CC-BY 4.0 | 6ca6a89759251206 |
| music/dark-sci-fi-ogg.zip | musica (5 tracce + title) | OGA SRG774 | CC0 | c17c40f2b5ff32a5 |
| music/SCP-x6x.mp3 (sconfitta) | musica | incompetech K. MacLeod | CC-BY 4.0 | 97b5969e9379853e |
| music/The Escalation.mp3 (evoluzione) | musica | incompetech K. MacLeod | CC-BY 4.0 | 7ac5c8397d395421 |
| music/Dream Culture.mp3 (vittoria) | musica | incompetech K. MacLeod | CC-BY 4.0 | f12cbb52bd4b92bd |
| vfx/pixel_art_sword_slash_sprites.png | VFX slash | OGA tbbk | CC0 | 7642aa4698828f6c |

## Attribution obbligatoria (CC-BY 4.0) -- da fondere nel CREDITS al primo import

- "SCP-x6x (Hopes)", "The Escalation", "Dream Culture" -- Kevin MacLeod
  (incompetech.com). Licensed under Creative Commons: By Attribution 4.0.
  https://creativecommons.org/licenses/by/4.0/ (stringa prescritta dal sito,
  una per traccia usata).
- "Nature Ambient Pack Vol 1" -- JC Sounds
  (https://opengameart.org/content/jc-sounds-nature-ambient-pack-vol-1),
  CC-BY 4.0.
- PENDENTE (download manuale): "Free VFX Asset Pack" -- CodeManu
  (https://codemanu.itch.io/vfx-free-pack), CC-BY 4.0 da metadata itch
  (descrizione dice public-domain: attribuire comunque, governa il metadata).

## Item manuali residui (5 -- browser/login)

1. Interface SFX Pack 1 (ObsydianX, CC0): itch name-your-price, no upload_id headless.
2. Free VFX Asset Pack (CodeManu, CC-BY 4.0, 90MB): stesso flusso itch.
3. Pimen subset $0 (eccezione condizionale + price-gate): verifica termini+prezzo per-pack.
4. Cave Ambience Loop (hushless, CC0 WAV): freesound richiede login.
5. Sonniss GDC cherry-pick creatures/impacts (eccezione owner, licenza custom).

## Selezione musicale (curata contro anti-fit epic/orchestrale)

- SCP-x6x (Hopes) = sconfitta: somber con spiraglio, coerente con le sconfitte
  by-design del flip simmetria.
- The Escalation = evoluzione: un unico lungo build senza brass ("Bolero for suspense").
- Dream Culture = vittoria: piano acquatico onirico, organico non-fanfara.
- Slot menu/planning/risoluzione/critico: Dark Sci-Fi Pack (Sector, Airy, Pulse,
  Urgent, Transmission, Title).
