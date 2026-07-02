"""Banca idee caveman — seed tipizzati ancorati a game design literature 2026.

Ogni seed è:
- Ancorato ai 6 pilastri di Evo-Tactics (GDD v0.1)
- Contestualizzabile con dati veri dal RepoSnapshot
- Ispirato a: MoSCoW, RICE, MVP-first, "cut your darlings", SPACE framework,
  scope/future creep prevention

Riferimenti deep search (aprile 2026):
- Wayline.io: scope creep = silent killer indie dev
- University XP: minimalist framework → MVP
- Codecks / Saint-Exupéry: "finished = nothing left to take away"
- GameDeveloper.com: "scope = choose a target, focus, shoot"
- GitHub topic `git-analytics` / GitMood: sentiment + achievements sui commit
"""

from __future__ import annotations

import random
from collections.abc import Callable
from dataclasses import dataclass
from enum import IntEnum, StrEnum
from typing import Final

from .repo import RepoSnapshot

# ---------- Tipi ----------


class Category(StrEnum):
    MICRO_SPRINT = "micro_sprint"
    DESIGN_HINT = "design_hint"
    MINI_GAME = "mini_game"
    EVO_TWIST = "evo_twist"
    SCOPE_CHECK = "scope_check"  # NEW v0.2


class Pillar(IntEnum):
    """6 pilastri Evo-Tactics (GDD v0.1)."""

    TACTICS_READABLE = 1
    EVOLUTION_EMERGENT = 2
    IDENTITY_DOUBLE = 3
    TEMPERAMENTS = 4
    COOP_VS_SYSTEM = 5
    FAIRNESS = 6

    @property
    def short(self) -> str:
        names = {
            1: "tattica-leggibile",
            2: "evoluzione-emergente",
            3: "specie×job",
            4: "temperamenti",
            5: "co-op-vs-sistema",
            6: "fairness",
        }
        return names[int(self)]


@dataclass(frozen=True, slots=True)
class Seed:
    category: Category
    pillar: Pillar | None
    minutes: int
    render: Callable[[RepoSnapshot], str]


# ---------- Helper per render contestuale ----------


def _largest_pillar_dir(snap: RepoSnapshot) -> str | None:
    if not snap.pillar_dirs:
        return None
    counts = {d: sum(1 for _ in (snap.root / d).rglob("*") if _.is_file()) for d in snap.pillar_dirs}
    if not counts:
        return None
    return max(counts, key=counts.__getitem__)


def _last_infra_commit(snap: RepoSnapshot) -> str | None:
    for c in snap.recent_commits:
        if c.kind == "INFRA":
            return c.message
    return None


# ---------- MICRO-SPRINT ----------

MICRO_SPRINT_SEEDS: Final[tuple[Seed, ...]] = (
    Seed(Category.MICRO_SPRINT, Pillar.TACTICS_READABLE, 10,
         lambda s: f"cancella UN trait in `{_largest_pillar_dir(s) or 'traits'}/` che non toccare da 30+ giorni. meno roba = più gioco."),
    Seed(Category.MICRO_SPRINT, Pillar.TACTICS_READABLE, 5,
         lambda s: "apri un file di regole a caso. leggi ad alta voce in 30 secondi. se tu non capire te stesso, nuovo giocatore morire."),
    Seed(Category.MICRO_SPRINT, Pillar.IDENTITY_DOUBLE, 15,
         lambda s: "prendi UNA specie + UN job a caso. scrivi cosa fanno di unico INSIEME. se risposta uguale ad altri combo, combo morire."),
    Seed(Category.MICRO_SPRINT, Pillar.FAIRNESS, 10,
         lambda s: "trova UNA regola senza counter disclosure. aggiungi 1 riga che dice come batterla PRIMA che accada. unga."),
    Seed(Category.MICRO_SPRINT, None, 5,
         lambda s: f"hai {len(s.dirty_files)} file non committati. committa UNO solo adesso, 5 parole max. gli altri aspettare."
         if s.dirty_files else "fai UN commit che cancella qualcosa. solo cancellare, niente aggiungere. 5 minuti."),
    Seed(Category.MICRO_SPRINT, Pillar.EVOLUTION_EMERGENT, 12,
         lambda s: "scrivi su post-it fisico UN comportamento che SE ripetuto 3 volte, evoluzione parte. attacca su monitor. domani vedere."),
    Seed(Category.MICRO_SPRINT, Pillar.COOP_VS_SYSTEM, 10,
         lambda s: "pensa: come il Sistema PERDE? scrivi 3 modi in 10 minuti. se tutti 3 uguali, Sistema troppo debole."),
    # NEW v0.2 — cut your darlings + future creep
    Seed(Category.MICRO_SPRINT, None, 10,
         lambda s: "scegli la feature di cui sei più orgoglioso. immagina di TAGLIARLA. il gioco cadrebbe? se no, apri issue 'maybe kill'. 10 min."),
    Seed(Category.MICRO_SPRINT, None, 8,
         lambda s: "apri l'ultima issue che hai aperto tu stesso. se titolo usa 'magari', 'potrebbe', 'un giorno' → chiudila wontfix. future creep muore."),
    Seed(Category.MICRO_SPRINT, Pillar.TACTICS_READABLE, 15,
         lambda s: "prendi file di regole più lungo. DIMEZZALO. non riscrivere, tagliaci dentro. se ti manca, tornerà da solo. 15 min hard timer."),
)


# ---------- DESIGN HINT ----------

DESIGN_HINT_SEEDS: Final[tuple[Seed, ...]] = (
    Seed(Category.DESIGN_HINT, Pillar.TACTICS_READABLE, 2,
         lambda s: "se bambino non capire turno in 30 secondi, turno rotto. non regole complesse, regole sbagliate."),
    Seed(Category.DESIGN_HINT, Pillar.EVOLUTION_EMERGENT, 2,
         lambda s: "evoluzione non essere skill tree. essere SORPRESA da uso ripetuto. se giocatore prevedere upgrade, non evoluzione, è shopping."),
    Seed(Category.DESIGN_HINT, Pillar.IDENTITY_DOUBLE, 2,
         lambda s: "specie dare COSA fare. job dare COME farlo. se uno ripetere l'altro, uno morire. tagliare subito."),
    Seed(Category.DESIGN_HINT, Pillar.TEMPERAMENTS, 2,
         lambda s: "temperamento non essere +2 STAT. essere TENTAZIONE durante turno. se giocatore non sentire pulsione, solo etichetta."),
    Seed(Category.DESIGN_HINT, Pillar.COOP_VS_SYSTEM, 2,
         lambda s: "Sistema deve poter vincere davvero. se impossibile, non cooperazione, puzzle con passi obbligati."),
    Seed(Category.DESIGN_HINT, Pillar.FAIRNESS, 2,
         lambda s: "counter visibile PRIMA della mossa nemica, non dopo. se giocatore sapere solo dopo, non tattica, lotteria."),
    Seed(Category.DESIGN_HINT, None, 2,
         lambda s: f"caveman guardare: ultimo commit INFRA dire «{last_infra}». ma quale pilastro servire? se tu non saper rispondere in 5 sec, infra troppo in anticipo."
         if (last_infra := _last_infra_commit(s))
         else "se stai per aggiungere feature: chiedi QUALE pilastro serve. no risposta = no aggiungere."),
    # NEW v0.2
    Seed(Category.DESIGN_HINT, None, 2,
         lambda s: "Saint-Exupéry dire: perfezione non quando niente da aggiungere, ma quando niente da togliere. tu cosa togliere oggi?"),
    Seed(Category.DESIGN_HINT, None, 2,
         lambda s: "chess essere perfetto con regole poche. tu quante regole avere? se più di chess e non più divertente di chess, caveman preoccupato."),
    Seed(Category.DESIGN_HINT, None, 3,
         lambda s: f"{s.consecutive_infra_commits()} commit INFRA di fila. Docker verde + CI verde + game rosso = progetto morto. prossimo commit GAMEPLAY o caveman mordere."
         if s.consecutive_infra_commits() >= 3
         else "un gioco finito male batte un prototipo perfetto. ship > polish, sempre."),
    Seed(Category.DESIGN_HINT, Pillar.TACTICS_READABLE, 2,
         lambda s: "Undertale: grafica semplice, mondo piccolo, turni base. Toby Fox vincere perché tagliare tutto tranne core. tu che tagliare oggi?"),
)


# ---------- MINI-GAME ----------

MINI_GAME_SEEDS: Final[tuple[Seed, ...]] = (
    Seed(Category.MINI_GAME, None, 3, lambda s: "prendi 3 oggetti dalla scrivania. inventare 1 specie Evo-Tactics con ciascuno. 3 minuti. poi buttare le cattive."),
    Seed(Category.MINI_GAME, None, 2, lambda s: "apri Spotify shuffle. prossimo titolo canzone = nome di nuovo trait. scrivi cosa fa in 2 righe."),
    Seed(Category.MINI_GAME, None, 1, lambda s: "timer 60 secondi. elenca tutti i job che ti vengono. vince quantità, poi scegli 1 solo e tenere."),
    Seed(Category.MINI_GAME, None, 2, lambda s: "guarda fuori dalla finestra. primo essere vivente che vedi = nuova specie. 3 trait in 2 minuti."),
    Seed(Category.MINI_GAME, None, 3, lambda s: "apri un libro di casa a pagina a caso. prima parola = nome di bioma. descrivilo in 3 righe."),
    Seed(Category.MINI_GAME, None, 3, lambda s: "tira 1d20 (o random.org). 1-5 movimento, 6-10 attacco, 11-15 difesa, 16-20 sociale. inventare quello uscito."),
    Seed(Category.MINI_GAME, None, 2, lambda s: "spiega il gioco a qualcuno in casa in 60 secondi. se non riesci, problema è LÌ, non nel codice."),
    Seed(Category.MINI_GAME, None, 5, lambda s: "cammina 5 minuti senza telefono. torna. scrivi 1 riga di cosa hai pensato. quella riga = design doc segreto."),
    Seed(Category.MINI_GAME, None, 3, lambda s: "scegli la specie più debole. in 3 minuti, scrivi 1 scenario dove vince. se non esiste, specie da buttare."),
    Seed(Category.MINI_GAME, None, 2, lambda s: "chiudi gli occhi. descrivi il gioco a voce come se fosse un film. 90 sec. se è noioso, lo è anche il gioco."),
    # NEW v0.2
    Seed(Category.MINI_GAME, None, 4, lambda s: "disegna su carta UNA unit di Evo-Tactics. solo linee. se amico capisce cos'è in 10 sec, icon game pronto."),
    Seed(Category.MINI_GAME, None, 3, lambda s: "tira dado 3 volte: i 3 numeri = stat di una nuova specie. 3 minuti per trovarla interessante o buttarla."),
    Seed(Category.MINI_GAME, None, 5, lambda s: "timer 5 minuti. scrivi senza fermarti: 'il mio gioco parla di...'. quello che esce = tua vera visione. non modificare."),
    Seed(Category.MINI_GAME, None, 2, lambda s: "guarda ultima riga che hai scritto oggi nel repo. se la leggessi tra 6 mesi, capiresti? se no, annota in TODO. 2 min."),
)


# ---------- EVO-TACTICS TWIST ----------

EVO_TWIST_SEEDS: Final[tuple[Seed, ...]] = (
    Seed(Category.EVO_TWIST, Pillar.TACTICS_READABLE, 15, lambda s: "'Regola del 2': gioca con solo 2 specie e 2 job per 1 turno. se noioso, core debole. se divertente, tutto il resto sovrastruttura."),
    Seed(Category.EVO_TWIST, Pillar.TACTICS_READABLE, 15, lambda s: "'Muto': gioca senza testo, solo icone. se non si capisce, leggibilità rotta."),
    Seed(Category.EVO_TWIST, Pillar.FAIRNESS, 20, lambda s: "'Peggior combo': scegli specie+job più deboli. vedi se sistema li rende interessanti. se no, anti-snowball rotto."),
    Seed(Category.EVO_TWIST, Pillar.TEMPERAMENTS, 15, lambda s: "'Solo temperamenti': ignora specie/job, gioca SOLO con MBTI. se non emerge gameplay, pilastro 4 solo decorativo."),
    Seed(Category.EVO_TWIST, Pillar.COOP_VS_SYSTEM, 25, lambda s: "'Reverse': il Sistema vince se i giocatori arrivano alla fine. che succede? rivela priorità vere."),
    Seed(Category.EVO_TWIST, Pillar.TACTICS_READABLE, 30, lambda s: "'Playtester fantasma': gioca fingendoti amico che non ha mai visto il gioco. annota ogni 'non capisco'. lista = roadmap vera."),
    Seed(Category.EVO_TWIST, None, 20, lambda s: "'Carta e penna': stampa le regole, gioca a mano 10 minuti. se funziona, infra giustificata. se no, infra è fuga dal design."),
    Seed(Category.EVO_TWIST, Pillar.EVOLUTION_EMERGENT, 20, lambda s: "'Speedrun evoluzione': sblocca un'evoluzione nel minor tempo. se troppo facile, non emergenza, checklist."),
    # NEW v0.2
    Seed(Category.EVO_TWIST, Pillar.TACTICS_READABLE, 10, lambda s: "'Turno blindato': timer 30 sec per turno. se stressa, UI troppo lenta. se facile, dimezza."),
    Seed(Category.EVO_TWIST, None, 15, lambda s: "'Rimuovi UI': nascondi con post-it metà schermo. cosa non è essenziale? quello è il prossimo commit di pulizia."),
    Seed(Category.EVO_TWIST, Pillar.EVOLUTION_EMERGENT, 30, lambda s: "'3 partite stessa build': 3a partita ancora interessante? se no, evoluzione non emerge, solo prima volta illusione."),
)


# ---------- SCOPE-CHECK (NEW v0.2) ----------

SCOPE_CHECK_SEEDS: Final[tuple[Seed, ...]] = (
    Seed(Category.SCOPE_CHECK, None, 5,
         lambda s: "MoSCoW rapido: prendi ultima feature pensata. è MUST, SHOULD, COULD, WON'T? se non MUST, rimandala. 5 min."),
    Seed(Category.SCOPE_CHECK, None, 5,
         lambda s: "scope creep check: quante feature aggiunte al GDD ultimo mese? se più di 2, stop nuove feature per 7 giorni. caveman comandare."),
    Seed(Category.SCOPE_CHECK, None, 3,
         lambda s: "future creep check: stai codando qualcosa per 'quando ci saranno utenti'? non ci sono utenti ancora. tagliare, fare dopo."),
    Seed(Category.SCOPE_CHECK, None, 10,
         lambda s: "RICE scoring prossima feature: Reach, Impact, Confidence(%), Effort(giorni). (R×I×C)/E. se <2, saltare. 10 min."),
    Seed(Category.SCOPE_CHECK, None, 7,
         lambda s: "SPACE check (solo dev): Soddisfatto? Performi? Attivo? Collabori? Efficiente? se 2+ 'no', non è tecnica, è scope. fermati."),
)


# ---------- Pool ----------

ALL_SEEDS: Final[dict[Category, tuple[Seed, ...]]] = {
    Category.MICRO_SPRINT: MICRO_SPRINT_SEEDS,
    Category.DESIGN_HINT: DESIGN_HINT_SEEDS,
    Category.MINI_GAME: MINI_GAME_SEEDS,
    Category.EVO_TWIST: EVO_TWIST_SEEDS,
    Category.SCOPE_CHECK: SCOPE_CHECK_SEEDS,
}


def pick_seed(
    category: Category,
    snap: RepoSnapshot,
    *,
    exclude_ids: frozenset[int] = frozenset(),
    rng: random.Random | None = None,
) -> tuple[Seed, int]:
    """Sceglie un seed dalla categoria evitando ripetizioni recenti."""
    rng = rng or random.Random()
    pool = ALL_SEEDS[category]
    available = [i for i in range(len(pool)) if i not in exclude_ids]
    if not available:
        available = list(range(len(pool)))
    idx = rng.choice(available)
    return pool[idx], idx
