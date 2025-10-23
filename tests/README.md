# 🧠 Integrazione Test MBTI e Profili nel Codex

## 🎯 Obiettivo

Questo modulo raccoglie test MBTI in italiano (gratuiti o accessibili) e le relative **descrizioni di personalità** per ciascuno dei 16 tipi. Il materiale è pensato per:

- uso personale o educativo  
- documentazione del progetto (es. giochi narrativi, profili NPC, storytelling adattivo)  
- creazione di un archivio scaricabile locale (offline/print-friendly)

---

## 📦 Contenuti del Repo

```

/tests
├─ assets/                                 # dump HTML originali scaricati dallo script
├─ mbti_16personalities_it_web.md          # trascrizione test online + scoring
├─ mbti_freemBTItest_it.md                 # test da 93 domande + scoring
├─ mbti_domande_AB_stampabile.pdf          # questionario A/B in PDF (stile old-school)
├─ mbti_indice_profili.yaml                # elenco dei 16 tipi (codice, nome, link/descrizione breve)
├─ profili/mbti_profilo_[TIPO].md          # es. mbti_profilo_INFJ.md — profilo completo in italiano
└─ mbti_fonti_link.txt                     # mappa tipo → fonte ufficiale

```

```

/scripts
└─ fetch_profili.sh                        # scarica i profili ufficiali 16Personalities in HTML

```

---

## 🔍 Fonti Test Affidabili (Italiano)

| Nome Test                          | Tipo                                  | Link                                                                           | Note                                                     |
|-----------------------------------|---------------------------------------|--------------------------------------------------------------------------------|----------------------------------------------------------|
| **16Personalities (IT)**          | Web interattivo                       | [16personalities.com/it](https://www.16personalities.com/it)                  | Include spiegazione dettagliata dei 16 tipi (stampabile) |
| **FreeMBTItest.org (IT)**         | Web quiz + risultati PDF              | [freembtitest.org/it](https://freembtitest.org/it)                             | 93 domande a scelta multipla                             |
| **16Superpoteri**                 | Web quiz + descrizione PDF stampabile | [16superpoteri.com/test](https://16superpoteri.com/test/)                      | Nessun PDF ufficiale ma risultati stampabili             |
| **IDR Labs – Jung Type Test (IT)**| Web quiz rapido                       | [idrlabs.com/it/jung-test](https://www.idrlabs.com/it/jung-test/)             | Basato su Jung, simile a MBTI                            |
| **Domande A/B (stampabile)**      | Domande offline                       | incluso nel repo (`mbti_domande_AB_stampabile.pdf`)                            | Derivato da risorse pubbliche per educazione             |

---

## 🧩 Struttura dei Profili (es. `mbti_profilo_INFJ.md`)

Ogni profilo include:

- codice (es. INFJ), nome ("Il Consigliere")
- tratti chiave: empatia, visione, sensibilità
- funzioni cognitive (es. Ni-Fe-Ti-Se)
- punti di forza, debolezze, carriera ideale
- linguaggi d'amore, compatibilità, stile decisionale
- fonti utilizzate per costruzione del profilo

---

## 📥 Come Scaricare Tutti i Profili

Puoi usare lo script `fetch_profili.sh` o manualmente salvare ogni pagina profilo dai link sopra citati (es. PDF da browser → stampa/salva PDF).
In alternativa, trovi profili già pronti nei file Markdown `.md`, convertibili facilmente in PDF o HTML.

---

## ✅ Fonti associate ai profili MBTI

La documentazione si basa sulle versioni italiane dei profili pubblicati da **16Personalities**.

| Tipo | URL sorgente |
| ---- | ------------ |
| Tutti | [https://www.16personalities.com/it/tipi-di-personalita](https://www.16personalities.com/it/tipi-di-personalita) |
| Esempio (INFJ) | [https://www.16personalities.com/it/personalita-infj](https://www.16personalities.com/it/personalita-infj) |
| Esempio (INTP) | [https://www.16personalities.com/it/personalita-intp](https://www.16personalities.com/it/personalita-intp) |

Nel file [`tests/mbti_fonti_link.txt`](mbti_fonti_link.txt) trovi l'elenco completo delle URL per tutti i 16 tipi.

---

## 📥 Script `scripts/fetch_profili.sh`

Per scaricare automaticamente i profili ufficiali in formato HTML:

```bash
chmod +x scripts/fetch_profili.sh
./scripts/fetch_profili.sh
```

Lo script genera la cartella `tests/assets/` e salva un file HTML per ogni tipo MBTI (es. `INFJ_16personalities.html`).

> ℹ️ Assicurati di avere `curl` installato e una connessione a Internet.

---

## 🧾 Mappa tipo → fonte

Il file [`tests/mbti_fonti_link.txt`](mbti_fonti_link.txt) elenca le URL ufficiali dei profili 16Personalities per uso interno e citazioni nella documentazione.

---

## 🔄 (Opzionale) Convertire HTML → Markdown

Per ottenere copie offline modificabili dei profili, puoi convertire gli HTML salvati in Markdown con `pandoc`:

```bash
pandoc tests/assets/INFJ_16personalities.html -f html -t markdown -o tests/profili/mbti_profilo_INFJ.md
```

Oppure automatizzare tutti i tipi:

```bash
for tipo in INFJ INFP INTJ INTP ISFJ ISFP ISTJ ISTP ENFJ ENFP ENTJ ENTP ESFJ ESFP ESTJ ESTP; do
  pandoc "tests/assets/${tipo}_16personalities.html" -f html -t markdown -o "tests/profili/mbti_profilo_${tipo}.md"
done
```

> 💡 Suggerimento: conserva sia gli HTML originali sia le versioni `.md` per tracciare eventuali aggiornamenti dalle fonti ufficiali.

---

## 🧩 Estensioni Future Possibili

- collegamento con **tipi Enneagramma** o **Zodiaco**
- generatore automatico di NPC/personaggi narrativi in base al tipo MBTI
- creazione di mappe relazionali tra tipi
- quiz offline interattivo (Python/CLI o web con scoring MBTI dinamico)

---

## ✅ Licenza e Uso

I materiali testuali sono derivati da risorse pubbliche, libere per uso non commerciale.  
I test non sono affiliati con la Myers-Briggs Company.  
Verificare sempre le licenze delle fonti se si intende distribuire commercialmente.
