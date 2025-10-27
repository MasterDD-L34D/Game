#!/usr/bin/env python3
"""Wrapper CLI per l'analisi dei contenuti di supporto."""
from __future__ import annotations

import sys
from pathlib import Path
from typing import Callable

TOOLS_DIR = Path(__file__).resolve().parents[1] / "tools" / "py"


def _load_tool_main() -> Callable[[], int]:
    """Carica la funzione ``main`` dal tool vero e proprio.

    Il modulo del tool risiede in ``tools/py`` con lo stesso nome di questo
    wrapper. Importarlo direttamente causerebbe quindi un conflitto: Python
    troverebbe prima questo file (``scripts/investigate_sources.py``) e
    ripeterebbe l'import, generando un modulo parzialmente inizializzato.

    Utilizziamo ``importlib`` per caricare il file target assegnandogli un nome
    univoco nello ``sys.modules`` in modo da evitare l'import circolare.
    """

    from importlib.util import module_from_spec, spec_from_file_location

    spec = spec_from_file_location("tools.py.investigate_sources", TOOLS_DIR / "investigate_sources.py")
    if spec is None or spec.loader is None:  # pragma: no cover - fallisce solo se il file sparisce
        raise ImportError("Impossibile caricare il modulo tools.py.investigate_sources")

    module = module_from_spec(spec)
    sys.modules.setdefault("tools.py.investigate_sources", module)
    spec.loader.exec_module(module)

    try:
        main_callable = getattr(module, "main")
    except AttributeError as error:  # pragma: no cover - protegge da modifiche inattese
        raise ImportError("Il modulo tools.py.investigate_sources non espone 'main'") from error

    return main_callable


investigate_main = _load_tool_main()


def main() -> int:
    """Esegue l'indagine dei file tramite il tool condiviso."""
    return investigate_main()


if __name__ == "__main__":
    sys.exit(main())
