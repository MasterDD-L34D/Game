#!/usr/bin/env python3
"""Estrae subset filtrato Legacy Collection (Ansimuz CC0) → apps/play/public/assets/legacy/.

Sprint G v3 (2026-04-29) — Asset swap tactical pre playtest userland.

Input: zip Legacy Collection user-provided.
Output: ~18-20MB subset organizzato in tree pulito (creatures/tiles/parallax/vfx).
Idempotente: skip extraction se dir output esiste e --force non passato.

Uso:
    python tools/py/extract_legacy_subset.py "~/Desktop/Legacy Collection.zip"
    python tools/py/extract_legacy_subset.py --dry-run "~/Desktop/Legacy Collection.zip"
"""
from __future__ import annotations

import argparse
import os
import sys
import zipfile
from pathlib import Path

# Mapping: zip-internal-path → dest-relative-path under apps/play/public/assets/legacy/.
# Whitelist esplicito: solo file qui copiati. Tutto altro skipped.
ASSET_MAP: list[tuple[str, str]] = [
    # ── Battle Sprites archetype 8 (vanguard/skirmisher/warden/artificer/invoker/ranger/harvester + boss)
    ("Legacy Collection/Assets/TinyRPG/Characters/Battle Sprites/Living Pack 1/Ogre/Ogre-sheet.png",
     "creatures/vanguard/sheet.png"),
    ("Legacy Collection/Assets/TinyRPG/Characters/Battle Sprites/Living Pack 1/Frog/Frog-sheet.png",
     "creatures/skirmisher/sheet.png"),
    ("Legacy Collection/Assets/TinyRPG/Characters/Battle Sprites/Living Pack 1/Slime/slime-sheet.png",
     "creatures/warden/sheet.png"),
    ("Legacy Collection/Assets/TinyRPG/Characters/Battle Sprites/Mechanic/Sentinel.png",
     "creatures/artificer/sheet.png"),
    ("Legacy Collection/Assets/TinyRPG/Characters/Battle Sprites/Living Pack 1/Wizard/wizard-sheet.png",
     "creatures/invoker/sheet.png"),
    ("Legacy Collection/Assets/TinyRPG/Characters/Battle Sprites/Monster Pack Files/spritesheets/centaur.png",
     "creatures/ranger/sheet.png"),
    ("Legacy Collection/Assets/TinyRPG/Characters/Battle Sprites/Living Pack 1/Mummy/Mummy-sheet.png",
     "creatures/harvester/sheet.png"),
    # Boss tier (3 boss)
    ("Legacy Collection/Assets/Gothicvania/Characters/Hell-Beast-Files/Idle/Spritesheet.png",
     "creatures/boss/hell_beast_idle.png"),
    ("Legacy Collection/Assets/Gothicvania/Characters/Hell-Beast-Files/Breath/Spritesheet.png",
     "creatures/boss/hell_beast_breath.png"),
    ("Legacy Collection/Assets/Gothicvania/Characters/Grotto-escape-2-boss-dragon/spritesheets/idle.png",
     "creatures/boss/dragon_idle.png"),
    ("Legacy Collection/Assets/Gothicvania/Characters/Grotto-escape-2-boss-dragon/spritesheets/breath.png",
     "creatures/boss/dragon_breath.png"),
    ("Legacy Collection/Assets/Gothicvania/Characters/Ogre/Spritesheets/ogre-attack.png",
     "creatures/boss/ogre_attack.png"),
    ("Legacy Collection/Assets/Gothicvania/Characters/Ogre/Spritesheets/ogre-walk.png",
     "creatures/boss/ogre_walk.png"),

    # ── Tile bioma savana (top-down forest 16-bit feel verde)
    ("Legacy Collection/Assets/TinyRPG/Environments/Top-Down-Forest/PNG/top-down-forest-tileset.png",
     "tiles/savana/tileset.png"),
    ("Legacy Collection/Assets/TinyRPG/Environments/Top-Down-Forest/top-down-forest-preview.png",
     "tiles/savana/preview.png"),

    # ── Tile bioma foresta_acida (HauntedForest dark)
    ("Legacy Collection/Assets/Gothicvania/Environments/HauntedForest/Layers/tileset.png",
     "tiles/foresta_acida/tileset.png"),
    ("Legacy Collection/Assets/Gothicvania/Environments/HauntedForest/Layers/back-tileset.png",
     "tiles/foresta_acida/back-tileset.png"),
    ("Legacy Collection/Assets/Gothicvania/Environments/HauntedForest/Layers/water-tileset.png",
     "tiles/foresta_acida/water-tileset.png"),

    # ── Tile bioma caverna
    ("Legacy Collection/Assets/Gothicvania/Environments/caverns-files-web/layers/tiles.png",
     "tiles/caverna/tileset.png"),
    ("Legacy Collection/Assets/Gothicvania/Environments/caverns-files-web/layers/back-walls.png",
     "tiles/caverna/back-walls.png"),
    ("Legacy Collection/Assets/Gothicvania/Environments/caverns-files-web/layers/background.png",
     "tiles/caverna/background.png"),

    # ── Tile bioma tundra (mountain feel)
    ("Legacy Collection/Assets/TinyRPG/Environments/Tiny RPG Mountain Files/png/tileset.png",
     "tiles/tundra/tileset.png"),
    ("Legacy Collection/Assets/TinyRPG/Environments/Tiny RPG Mountain Files/png/bridge.png",
     "tiles/tundra/bridge.png"),

    # ── Tile bioma town
    ("Legacy Collection/Assets/TinyRPG/Environments/Top-Down-Town/PNG/top-down-town-tileset.png",
     "tiles/town/tileset.png"),

    # ── Parallax bg 4-layer (parallax_forest_pack v2 — sky/back/middle/front)
    ("Legacy Collection/Assets/TinyRPG/Environments/parallax_forest_pack web/v2/layers/back.png",
     "parallax/back.png"),
    ("Legacy Collection/Assets/TinyRPG/Environments/parallax_forest_pack web/v2/layers/middle.png",
     "parallax/middle.png"),
    ("Legacy Collection/Assets/TinyRPG/Environments/parallax_forest_pack web/v2/layers/front.png",
     "parallax/front.png"),
    # sky layer da night-town (cielo notturno = drama tactical)
    ("Legacy Collection/Assets/Gothicvania/Environments/night-town-background-files/layers/night-town-background-sky.png",
     "parallax/sky.png"),
    ("Legacy Collection/Assets/Gothicvania/Environments/night-town-background-files/layers/night-town-background-clouds.png",
     "parallax/clouds.png"),
    ("Legacy Collection/Assets/Gothicvania/Environments/night-town-background-files/layers/night-town-background-mountains.png",
     "parallax/mountains.png"),

    # ── VFX hit (3 frame)
    ("Legacy Collection/Assets/Explosions and Magic/Hit/Sprites/hit1.png", "vfx/hit/hit1.png"),
    ("Legacy Collection/Assets/Explosions and Magic/Hit/Sprites/hit2.png", "vfx/hit/hit2.png"),
    ("Legacy Collection/Assets/Explosions and Magic/Hit/Sprites/hit3.png", "vfx/hit/hit3.png"),

    # ── VFX death (8 frame)
    ("Legacy Collection/Assets/Explosions and Magic/EnemyDeath/Sprites/enemy-death1.png", "vfx/death/death1.png"),
    ("Legacy Collection/Assets/Explosions and Magic/EnemyDeath/Sprites/enemy-death2.png", "vfx/death/death2.png"),
    ("Legacy Collection/Assets/Explosions and Magic/EnemyDeath/Sprites/enemy-death3.png", "vfx/death/death3.png"),
    ("Legacy Collection/Assets/Explosions and Magic/EnemyDeath/Sprites/enemy-death4.png", "vfx/death/death4.png"),
    ("Legacy Collection/Assets/Explosions and Magic/EnemyDeath/Sprites/enemy-death5.png", "vfx/death/death5.png"),
    ("Legacy Collection/Assets/Explosions and Magic/EnemyDeath/Sprites/enemy-death6.png", "vfx/death/death6.png"),
    ("Legacy Collection/Assets/Explosions and Magic/EnemyDeath/Sprites/enemy-death7.png", "vfx/death/death7.png"),
    ("Legacy Collection/Assets/Explosions and Magic/EnemyDeath/Sprites/enemy-death8.png", "vfx/death/death8.png"),

    # ── VFX explosion (spritesheet ready)
    ("Legacy Collection/Assets/Explosions and Magic/Explosions pack/explosion-1-a/spritesheet.png",
     "vfx/explosion/explosion.png"),

    # ── VFX slash horizontal + upward (spritesheet)
    ("Legacy Collection/Assets/Explosions and Magic/Grotto-escape-2-FX/spritesheets/slash-horizontal.png",
     "vfx/slash/horizontal.png"),
    ("Legacy Collection/Assets/Explosions and Magic/Grotto-escape-2-FX/spritesheets/slash-upward.png",
     "vfx/slash/upward.png"),

    # ── VFX fireball + electro
    ("Legacy Collection/Assets/Explosions and Magic/Grotto-escape-2-FX/spritesheets/fire-ball.png",
     "vfx/fireball/fireball.png"),
    ("Legacy Collection/Assets/Explosions and Magic/Grotto-escape-2-FX/spritesheets/electro-shock.png",
     "vfx/electro/electro.png"),

    # ── VFX bolt (Warped)
    ("Legacy Collection/Assets/Explosions and Magic/Warped shooting fx/Bolt/spritesheet.png",
     "vfx/bolt/bolt.png"),
]

LICENSE_TEXT = """Pixel art assets by Luis Zuno (Ansimuz)
License: Creative Commons Zero (CC0) — public domain
No attribution required, commercial use permitted, modification OK.
Source: https://ansimuz.itch.io/
Original: Legacy Collection (provided 2026-04-28)
Subset extracted via tools/py/extract_legacy_subset.py for Sprint G v3 asset swap.
"""


def main() -> int:
    parser = argparse.ArgumentParser(description="Extract Legacy Collection subset for Evo-Tactics.")
    parser.add_argument("zip_path", help="Path to Legacy Collection.zip")
    parser.add_argument("--out-dir",
                        default="apps/play/public/assets/legacy",
                        help="Destination directory (default: apps/play/public/assets/legacy)")
    parser.add_argument("--dry-run", action="store_true", help="List files only, no extraction.")
    parser.add_argument("--force", action="store_true", help="Overwrite existing output dir.")
    args = parser.parse_args()

    zip_path = Path(args.zip_path).expanduser().resolve()
    if not zip_path.is_file():
        print(f"ERROR: zip not found: {zip_path}", file=sys.stderr)
        return 2

    out_dir = Path(args.out_dir).resolve()
    if out_dir.exists() and not args.force and not args.dry_run:
        existing = list(out_dir.rglob("*.png"))
        if len(existing) >= 30:
            print(f"OK: {out_dir} already populated ({len(existing)} png). Skip (use --force to overwrite).")
            return 0

    out_dir.mkdir(parents=True, exist_ok=True)

    copied = 0
    missing: list[str] = []
    total_bytes = 0

    with zipfile.ZipFile(zip_path) as zf:
        names = set(zf.namelist())
        for src, dest in ASSET_MAP:
            if src not in names:
                missing.append(src)
                continue
            dest_path = out_dir / dest
            if args.dry_run:
                info = zf.getinfo(src)
                total_bytes += info.file_size
                print(f"DRY {info.file_size:>8} B  {dest}")
                copied += 1
                continue
            dest_path.parent.mkdir(parents=True, exist_ok=True)
            with zf.open(src) as src_f, dest_path.open("wb") as dst_f:
                data = src_f.read()
                dst_f.write(data)
                total_bytes += len(data)
            copied += 1

    if not args.dry_run:
        license_path = out_dir / "LICENSE.txt"
        license_path.write_text(LICENSE_TEXT, encoding="utf-8")

    print(f"\n--- Sprint G v3 Legacy subset extraction ---")
    print(f"Source: {zip_path}")
    print(f"Dest:   {out_dir}")
    print(f"Copied: {copied}/{len(ASSET_MAP)} files")
    print(f"Size:   {total_bytes / 1024:.1f} KB ({total_bytes / 1024 / 1024:.2f} MB)")
    if missing:
        print(f"Missing in zip: {len(missing)}", file=sys.stderr)
        for m in missing[:10]:
            print(f"  - {m}", file=sys.stderr)
        if len(missing) > 10:
            print(f"  ... +{len(missing) - 10} more", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
