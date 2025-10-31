import pathlib
import random
from collections import defaultdict

import numpy as np
import yaml

ROOT = pathlib.Path(__file__).resolve().parents[1]

cfg = yaml.safe_load((ROOT / "engine/tri_sorgente/tri_sorgente_config.yaml").read_text())["config"]
engine = yaml.safe_load((ROOT / "engine/tri_sorgente/card_offer_engine.yaml").read_text())["engine"]
roll_table = yaml.safe_load((ROOT / "examples/biomes/dune_ferrose/roll_table.yaml").read_text())["roll_table"]
cards = {
    card["id"]: card
    for card in yaml.safe_load((ROOT / "examples/biomes/dune_ferrose/cards.yaml").read_text())["cards"]
}

RNG = random.Random(1337)
NP_RNG = np.random.default_rng(1337)


def softmax(z, temperature):
    values = np.array(z, dtype=float)
    centered = values - values.mean()
    scaled = centered / max(values.std(), 1e-6)
    logits = scaled / max(temperature, 1e-6)
    exp_values = np.exp(logits - logits.max())
    return exp_values / exp_values.sum()


def parse_range(range_str):
    lo, hi = [int(bound) for bound in range_str.split("-")]
    return lo, hi


def roll_entry(rt):
    roll = RNG.randint(1, 100)
    for idx, entry in enumerate(rt["entries"]):
        lo, hi = parse_range(entry["range"])
        if lo <= roll <= hi:
            return idx, entry, roll
    return len(rt["entries"]) - 1, rt["entries"][-1], roll


def collect_roll_pool(entries, hit_index, target_size, card_sources):
    ordered_indices = [hit_index]
    left = hit_index - 1
    right = hit_index + 1
    while len(ordered_indices) < target_size and (left >= 0 or right < len(entries)):
        if left >= 0:
            ordered_indices.append(left)
            left -= 1
        if len(ordered_indices) >= target_size:
            break
        if right < len(entries):
            ordered_indices.append(right)
            right += 1

    pool = []
    for idx in ordered_indices:
        entry = entries[idx]
        for grant in entry.get("grants", []):
            if grant.get("type") != "card_ref":
                continue
            card_id = grant.get("card_id")
            if card_id not in cards:
                continue
            pool.append(card_id)
            source_flags = card_sources[card_id]
            if idx == hit_index:
                source_flags["roll_primary"] = True
            else:
                source_flags["roll_adjacent"] = True
    return pool


def personality_component(card, run_state):
    personality = card.get("personality_weights", {})
    enneagram = personality.get("enneagram", {})
    mbti_weights = personality.get("mbti", {})
    enneagram_type = str(run_state["personality"].get("enneagram", {}).get("type"))
    mbti = run_state["personality"].get("mbti")

    score = 0.0
    if enneagram_type:
        score += enneagram.get(enneagram_type, 0.0)
    if mbti:
        score += mbti_weights.get(mbti, 0.0)
    return score


def collect_personality_pool(run_state, target_size, card_sources):
    scored = []
    for card_id, card in cards.items():
        score = personality_component(card, run_state)
        if score > 0:
            scored.append((card_id, score))
    scored.sort(key=lambda item: item[1], reverse=True)
    top = [card_id for card_id, _ in scored[:target_size]]
    for card_id in top:
        card_sources[card_id]["personality"] = True
    return top


def action_component(card, run_state):
    card_recent = card.get("action_affinity", {}).get("recent_actions", {})
    catalog = set(cfg.get("recent_actions", {}).keys()) | set(card_recent.keys())
    total = 0.0
    for action_id in catalog:
        defaults = cfg.get("recent_actions", {}).get(action_id, {})
        params = card_recent.get(action_id, defaults)
        per_event = params.get("per_event", defaults.get("per_event", 0.0))
        cap = params.get("cap", defaults.get("cap", 0.0))
        count = run_state["recent_actions"].get(action_id, 0)
        total += min(count * per_event, cap)
    return total


def collect_actions_pool(run_state, target_size, card_sources):
    scored = []
    for card_id, card in cards.items():
        score = action_component(card, run_state)
        if score > 0:
            scored.append((card_id, score))
    scored.sort(key=lambda item: item[1], reverse=True)
    top = [card_id for card_id, _ in scored[:target_size]]
    for card_id in top:
        card_sources[card_id]["actions"] = True
    return top


def synergy_component(card, run_state):
    dominant = set(run_state["build_profile"].get("dominant_tags", []))
    syn_tags = set(card.get("synergy_tags", []))
    overlap = syn_tags & dominant
    if not overlap:
        return 0.0
    extra_matches = max(len(overlap) - 1, 0)
    extra = min(extra_matches * cfg["synergy"]["extra_per_match"], cfg["synergy"]["cap"])
    return cfg["synergy"]["base"] + extra


def has_synergy(card_id, run_state):
    card = cards[card_id]
    return bool(set(card.get("synergy_tags", [])) & set(run_state["build_profile"].get("dominant_tags", [])))


def score_card(card_id, run_state, card_sources):
    card = cards[card_id]
    base = cfg["base_by_rarity"].get(card["rarity"], 0.1)
    flags = card_sources[card_id]
    roll_comp = 0.0
    if flags.get("roll_primary"):
        roll_comp = 0.2
    elif flags.get("roll_adjacent"):
        roll_comp = 0.1

    pers = personality_component(card, run_state)
    act = action_component(card, run_state)
    syn = synergy_component(card, run_state)

    weights = cfg["weights"]
    total = (
        base
        + weights["w_roll"] * roll_comp
        + weights["w_pers"] * pers
        + weights["w_actions"] * act
        + weights["w_syn"] * syn
    )
    # Duplicate/exclusion penalties richiedono stato run; nel mock li omettiamo.
    return total


def ensure_synergy_offer(selection, sorted_pool, run_state):
    if any(has_synergy(card_id, run_state) for card_id in selection):
        return selection
    for card_id, _ in sorted_pool:
        if card_id in selection:
            continue
        if has_synergy(card_id, run_state):
            selection[-1] = card_id
            break
    return selection


def offer(run_state):
    card_sources = defaultdict(lambda: defaultdict(bool))
    hit_index, entry, roll_value = roll_entry(roll_table)
    entries = roll_table["entries"]

    roll_pool = collect_roll_pool(entries, hit_index, cfg["pools"]["R"], card_sources)
    actions_pool = collect_actions_pool(run_state, cfg["pools"]["A"], card_sources)
    personality_pool = collect_personality_pool(run_state, cfg["pools"]["P"], card_sources)

    offer_candidates = list(dict.fromkeys(roll_pool + actions_pool + personality_pool))
    if not offer_candidates:
        offer_candidates = list(cards.keys())

    scores = [score_card(card_id, run_state, card_sources) for card_id in offer_candidates]
    probabilities = softmax(scores, cfg["softmax_temperature"])
    sample_size = min(3, len(offer_candidates))
    selection = NP_RNG.choice(offer_candidates, size=sample_size, replace=False, p=probabilities)
    selection = selection.tolist()

    scored = sorted(zip(offer_candidates, scores), key=lambda item: item[1], reverse=True)
    selection = ensure_synergy_offer(selection, scored, run_state)

    debug = {
        "roll_value": roll_value,
        "roll_entry": entry["name"],
        "pools": {
            "roll": roll_pool,
            "actions": actions_pool,
            "personality": personality_pool,
        },
    }
    return selection, scored, debug


if __name__ == "__main__":
    MOCK_RUN_STATE = {
        "recent_actions": {
            "cariche_effettuate": 3,
            "salti_lunghi": 1,
            "colpi_critici": 1,
            "danni_subiti": 2,
            "assist": 1,
            "colpi_mancati": 2,
        },
        "build_profile": {"dominant_tags": ["mobilità", "carica"]},
        "personality": {"enneagram": {"type": 3}, "mbti": "ENTP"},
    }

    picks, scored_cards, debug_info = offer(MOCK_RUN_STATE)
    print("Roll d100:", debug_info["roll_value"], "->", debug_info["roll_entry"])
    print("Pool R/A/P:", debug_info["pools"])
    print("Offerta (3):", picks)
    print("Top5 punteggi:", scored_cards[:5])
