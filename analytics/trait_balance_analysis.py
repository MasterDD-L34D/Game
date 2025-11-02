"""Trait balance analytics script.

Loads trait metadata, computes biome and species distributions, analyses synergy links,
produces visualisations, and writes a short interpretative summary.
"""
from __future__ import annotations

import argparse
import json
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Mapping, MutableMapping, Sequence

import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns


@dataclass
class TraitRecord:
    trait_id: str
    label: str
    tier: str
    family: str
    biomes: Sequence[str]
    synergy_targets: Sequence[str]
    species_affinity: List[Mapping[str, object]]


@dataclass
class SpeciesAggregate:
    species_id: str
    total_weight: float
    trait_count: int


class TraitBalanceAnalyzer:
    """Encapsulates trait analytics and chart generation."""

    def __init__(
        self,
        index_path: Path,
        species_bridge_path: Path,
        output_dir: Path,
        styleguide_report_path: Path | None = None,
    ):
        self.index_path = index_path
        self.species_bridge_path = species_bridge_path
        self.output_dir = output_dir
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.traits: Dict[str, TraitRecord] = {}
        self.species_totals: Dict[str, SpeciesAggregate] = {}
        self.biome_pivot: pd.DataFrame | None = None
        self.synergy_matrix: pd.DataFrame | None = None
        self.styleguide_report_path = styleguide_report_path
        self.styleguide_metrics: Dict[str, Mapping[str, object]] | None = None

    def load(self) -> None:
        index_data = json.loads(self.index_path.read_text())
        bridge_data = json.loads(self.species_bridge_path.read_text())
        traits: Dict[str, TraitRecord] = {}
        for trait_id, payload in index_data.get("traits", {}).items():
            biomes = self._extract_biomes(payload.get("requisiti_ambientali") or [])
            species_affinity = self._merge_species_affinity(
                payload.get("species_affinity") or [],
                bridge_data.get(trait_id) or [],
            )
            record = TraitRecord(
                trait_id=trait_id,
                label=payload.get("label", trait_id),
                tier=str(payload.get("tier", "unspecified")),
                family=payload.get("famiglia_tipologia", "Non classificato"),
                biomes=sorted(biomes) if biomes else ["unspecified"],
                synergy_targets=payload.get("sinergie") or [],
                species_affinity=species_affinity,
            )
            traits[trait_id] = record
        self.traits = traits

    @staticmethod
    def _extract_biomes(requirements: Iterable[Mapping[str, object]]) -> List[str]:
        seen = []
        for req in requirements:
            if not isinstance(req, Mapping):
                continue
            cond = req.get("condizioni")
            if isinstance(cond, Mapping):
                biome = cond.get("biome_class")
                if isinstance(biome, str) and biome:
                    seen.append(biome)
        return seen

    @staticmethod
    def _merge_species_affinity(
        primary_entries: Sequence[Mapping[str, object]],
        bridge_entries: Sequence[Mapping[str, object]],
    ) -> List[Mapping[str, object]]:
        merged: MutableMapping[str, Dict[str, object]] = {}
        for source, entries in ("index", primary_entries), ("bridge", bridge_entries):
            for entry in entries:
                species_id = entry.get("species_id")
                if not isinstance(species_id, str):
                    continue
                weight = entry.get("weight")
                weight_value = float(weight) if isinstance(weight, (int, float)) else 1.0
                roles: List[str] = [r for r in entry.get("roles", []) if isinstance(r, str)]
                key = species_id
                bucket = merged.setdefault(
                    key,
                    {
                        "species_id": species_id,
                        "weight": 0.0,
                        "roles": set(),
                        "sources": set(),
                    },
                )
                bucket["weight"] = max(bucket["weight"], weight_value)
                bucket["roles"].update(roles)
                bucket["sources"].add(source)
        for bucket in merged.values():
            bucket["roles"] = sorted(bucket["roles"])
            bucket["sources"] = sorted(bucket["sources"])
        return [dict(value) for value in merged.values()]

    def analyse_biomes(self) -> pd.DataFrame:
        rows: List[Dict[str, object]] = []
        for record in self.traits.values():
            for biome in record.biomes:
                rows.append(
                    {
                        "biome": biome,
                        "tier": record.tier,
                        "trait_id": record.trait_id,
                    }
                )
        biome_df = pd.DataFrame(rows)
        if biome_df.empty:
            self.biome_pivot = pd.DataFrame()
            return biome_df
        counts = (
            biome_df.groupby(["biome", "tier"])["trait_id"].nunique().reset_index(name="trait_count")
        )
        pivot = counts.pivot(index="biome", columns="tier", values="trait_count").fillna(0)
        pivot = pivot.sort_values(by=pivot.columns.tolist(), ascending=False)
        self.biome_pivot = pivot
        return counts

    def analyse_species(self) -> pd.DataFrame:
        totals: Dict[str, SpeciesAggregate] = {}
        for record in self.traits.values():
            for affinity in record.species_affinity:
                species_id = affinity.get("species_id")
                if not isinstance(species_id, str):
                    continue
                weight = affinity.get("weight")
                weight_value = float(weight) if isinstance(weight, (int, float)) else 1.0
                bucket = totals.get(species_id)
                if bucket is None:
                    bucket = SpeciesAggregate(species_id, 0.0, 0)
                    totals[species_id] = bucket
                bucket.total_weight += weight_value
                bucket.trait_count += 1
        self.species_totals = totals
        species_df = pd.DataFrame(
            {
                "species_id": s,
                "weighted_presence": agg.total_weight,
                "trait_count": agg.trait_count,
            }
            for s, agg in totals.items()
        )
        species_df = species_df.sort_values(by=["weighted_presence", "trait_count"], ascending=False)
        return species_df

    def analyse_synergies(self) -> pd.DataFrame:
        family_lookup = {record.trait_id: record.family for record in self.traits.values()}
        matrix = defaultdict(lambda: defaultdict(int))
        edge_counter = Counter()
        for record in self.traits.values():
            source_family = family_lookup.get(record.trait_id, "Sconosciuta")
            for target in record.synergy_targets:
                target_family = family_lookup.get(target, "Sconosciuta")
                matrix[source_family][target_family] += 1
                edge_counter[(source_family, target_family)] += 1
        families = sorted(set(family_lookup.values()) | {"Sconosciuta"})
        df = pd.DataFrame(0, index=families, columns=families, dtype=int)
        for (source_family, target_family), value in edge_counter.items():
            if source_family not in df.index:
                df.loc[source_family] = 0
            if target_family not in df.columns:
                df[target_family] = 0
            df.loc[source_family, target_family] = value
        df = df.loc[sorted(df.index)].fillna(0)
        df = df[sorted(df.columns)]
        self.synergy_matrix = df
        edges = (
            df.reset_index()
            .melt(id_vars="index", var_name="target_family", value_name="edge_count")
            .rename(columns={"index": "source_family"})
        )
        return edges

    def plot_biome_heatmap(self) -> Path | None:
        if self.biome_pivot is None or self.biome_pivot.empty:
            return None
        plt.figure(figsize=(12, max(4, len(self.biome_pivot) * 0.4)))
        sns.heatmap(
            self.biome_pivot,
            annot=True,
            fmt=".0f",
            cmap="YlGnBu",
            cbar_kws={"label": "Numero tratti"},
        )
        plt.title("Distribuzione dei tratti per bioma e tier")
        plt.xlabel("Tier")
        plt.ylabel("Bioma")
        output_path = self.output_dir / "biome_tier_heatmap.png"
        plt.tight_layout()
        plt.savefig(output_path, dpi=200)
        plt.close()
        return output_path

    def plot_species_barchart(self, top_n: int = 20) -> Path | None:
        if not self.species_totals:
            return None
        species_df = pd.DataFrame(
            [
                {
                    "species_id": agg.species_id,
                    "weighted_presence": agg.total_weight,
                    "trait_count": agg.trait_count,
                }
                for agg in self.species_totals.values()
            ]
        ).sort_values(by=["weighted_presence", "trait_count"], ascending=False)
        subset = species_df.head(top_n)
        plt.figure(figsize=(12, max(4, len(subset) * 0.4)))
        sns.barplot(
            data=subset,
            x="weighted_presence",
            y="species_id",
            palette="crest",
        )
        plt.title(f"Top {len(subset)} specie per affinità cumulata")
        plt.xlabel("Somma pesata delle affinità")
        plt.ylabel("Specie")
        output_path = self.output_dir / "species_affinity_top.png"
        plt.tight_layout()
        plt.savefig(output_path, dpi=200)
        plt.close()
        return output_path

    def plot_synergy_heatmap(self) -> Path | None:
        if self.synergy_matrix is None or self.synergy_matrix.empty:
            return None
        plt.figure(figsize=(12, 10))
        sns.heatmap(
            self.synergy_matrix,
            annot=True,
            fmt=".0f",
            cmap="PuBuGn",
            cbar_kws={"label": "Occorrenze di sinergia"},
        )
        plt.title("Occorrenze di sinergia tra famiglie di tratti")
        plt.xlabel("Famiglia di destinazione")
        plt.ylabel("Famiglia di origine")
        output_path = self.output_dir / "synergy_family_heatmap.png"
        plt.tight_layout()
        plt.savefig(output_path, dpi=200)
        plt.close()
        return output_path

    def write_summary(self, summary_path: Path) -> None:
        summary_lines: List[str] = ["# Sintesi bilanciamento tratti", ""]
        if self.biome_pivot is not None and not self.biome_pivot.empty:
            biome_totals = self.biome_pivot.sum(axis=1).sort_values(ascending=False)
            top_biomes = biome_totals.head(5)
            summary_lines.append("## Biomi prioritari")
            summary_lines.append("- Biomi con più tratti disponibili:")
            for biome, total in top_biomes.items():
                summary_lines.append(f"  - **{biome}**: {int(total)} tratti")
            summary_lines.append("")
        if self.species_totals:
            species_df = pd.DataFrame(
                {
                    "species_id": s,
                    "weighted_presence": agg.total_weight,
                    "trait_count": agg.trait_count,
                }
                for s, agg in self.species_totals.items()
            ).sort_values(by=["weighted_presence", "trait_count"], ascending=False)
            summary_lines.append("## Specie con maggiore accesso ai tratti")
            for _, row in species_df.head(8).iterrows():
                summary_lines.append(
                    f"- **{row['species_id']}**: affinità cumulata {row['weighted_presence']:.1f} su {int(row['trait_count'])} tratti"
                )
            summary_lines.append("")
        if self.synergy_matrix is not None and not self.synergy_matrix.empty:
            summary_lines.append("## Sinergie di famiglie")
            row_totals = self.synergy_matrix.sum(axis=1).sort_values(ascending=False)
            col_totals = self.synergy_matrix.sum(axis=0).sort_values(ascending=False)
            if not row_totals.empty:
                summary_lines.append("- Famiglie che generano più sinergie:")
                for family, count in row_totals.head(5).items():
                    summary_lines.append(f"  - **{family}** → {int(count)} riferimenti")
            if not col_totals.empty:
                summary_lines.append("- Famiglie più frequentemente bersaglio:")
                for family, count in col_totals.head(5).items():
                    summary_lines.append(f"  - **{family}** ← {int(count)} riferimenti")
            summary_lines.append("")
        if self.styleguide_metrics:
            summary_lines.append("## Conformità allo styleguide")
            for key, meta in sorted(self.styleguide_metrics.items()):
                label = meta.get("label", key)
                percent = meta.get("percent")
                sla = meta.get("sla_threshold")
                status = meta.get("status", "unknown")
                if isinstance(percent, (int, float)):
                    coverage = f"{percent:.1f}%"
                else:
                    coverage = "—"
                if isinstance(sla, (int, float)):
                    target = f"SLA {sla * 100:.0f}%"
                else:
                    target = "SLA n/d"
                summary_lines.append(
                    f"- **{label}**: {coverage} ({target}) · stato {status}"
                )
            summary_lines.append(
                "- Approfondisci in `reports/styleguide_compliance.md` per le anomalie puntuali."
            )
            summary_lines.append("")
        summary_lines.append("_Report generato automaticamente da `analytics/trait_balance_analysis.py`._")
        summary_path.write_text("\n".join(summary_lines), encoding="utf-8")

    def run(self) -> None:
        self.load()
        self.analyse_biomes()
        self.analyse_species()
        self.analyse_synergies()
        self.plot_biome_heatmap()
        self.plot_species_barchart()
        self.plot_synergy_heatmap()
        self.load_styleguide_report()
        summary_path = self.output_dir.parent / "trait_balance_summary.md"
        self.write_summary(summary_path)

    def load_styleguide_report(self) -> None:
        if self.styleguide_report_path is None:
            self.styleguide_metrics = None
            return
        if not self.styleguide_report_path.exists():
            self.styleguide_metrics = None
            return
        try:
            payload = json.loads(self.styleguide_report_path.read_text())
        except json.JSONDecodeError:
            self.styleguide_metrics = None
            return
        metrics = payload.get("kpi") if isinstance(payload, dict) else None
        if isinstance(metrics, dict):
            self.styleguide_metrics = metrics
        else:
            self.styleguide_metrics = None


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Analisi del bilanciamento dei tratti.")
    parser.add_argument(
        "--index",
        type=Path,
        default=Path("data/traits/index.json"),
        help="Percorso al file indice dei tratti",
    )
    parser.add_argument(
        "--species-bridge",
        type=Path,
        default=Path("data/traits/species_affinity.json"),
        help="Percorso alla tabella ponte specie-tratti",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("reports/trait_balance"),
        help="Directory di output per i grafici",
    )
    parser.add_argument(
        "--styleguide-report",
        type=Path,
        default=Path("reports/styleguide_compliance.json"),
        help="Report JSON con i KPI di conformità allo styleguide",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    analyzer = TraitBalanceAnalyzer(
        args.index,
        args.species_bridge,
        args.output,
        styleguide_report_path=args.styleguide_report,
    )
    analyzer.run()


if __name__ == "__main__":
    main()
