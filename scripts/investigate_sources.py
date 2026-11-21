#!/usr/bin/env python3
"""Wrapper CLI per l'analisi dei contenuti di supporto."""
from __future__ import annotations

import sys
from pathlib import Path
from typing import Any, Callable, Protocol, overload

TOOLS_DIR = Path(__file__).resolve().parents[1] / "tools" / "py"
__all__ = [
    "collect_investigation",
    "investigate_main",
    "main",
    "render_report",
]

class _ToolModule(Protocol):
    def main(self) -> int: ...

    def collect_investigation(self, paths: Any, *, recursive: bool, max_preview: int) -> Any: ...

    def render_report(self, results: Any, *, json_output: bool, stream: Any) -> None: ...


_MODULE_NAME = "tools.py.investigate_sources"
_TOOL_MODULE: _ToolModule | None = None


def _load_tool_module() -> _ToolModule:
    """Restituisce il modulo reale del tool, caricandolo solo al primo accesso."""

    global _TOOL_MODULE
    if _TOOL_MODULE is not None:
        return _TOOL_MODULE

    from importlib.util import module_from_spec, spec_from_file_location

    spec = spec_from_file_location(_MODULE_NAME, TOOLS_DIR / "investigate_sources.py")
    if spec is None or spec.loader is None:  # pragma: no cover - fallisce solo se il file sparisce
        raise ImportError("Impossibile caricare il modulo tools.py.investigate_sources")

    module = module_from_spec(spec)
    sys.modules.setdefault(_MODULE_NAME, module)
    spec.loader.exec_module(module)
    _TOOL_MODULE = module  # type: ignore[assignment]
    return module


def _load_tool_callable(name: str) -> Callable[..., Any]:
    module = _load_tool_module()
    try:
        return getattr(module, name)
    except AttributeError as error:  # pragma: no cover - protegge da modifiche inattese
        raise ImportError(f"Il modulo tools.py.investigate_sources non espone '{name}'") from error


@overload
def _call_tool(name: str) -> Callable[..., Any]:
    ...


@overload
def _call_tool(name: str, *args: Any, **kwargs: Any) -> Any:
    ...


def _call_tool(name: str, *args: Any, **kwargs: Any) -> Any:
    callable_obj = _load_tool_callable(name)
    if args or kwargs:
        return callable_obj(*args, **kwargs)
    return callable_obj


def investigate_main() -> int:
    return _call_tool("main")()


def collect_investigation(*args: Any, **kwargs: Any) -> Any:
    return _call_tool("collect_investigation", *args, **kwargs)


def render_report(*args: Any, **kwargs: Any) -> Any:
    return _call_tool("render_report", *args, **kwargs)


def main() -> int:
    """Esegue l'indagine dei file tramite il tool condiviso."""
    return investigate_main()


def __getattr__(name: str) -> Any:
    """Propaga qualsiasi attributo non esplicitamente ridefinito al modulo condiviso."""

    try:
        return getattr(_load_tool_module(), name)
    except AttributeError as error:  # pragma: no cover - compatibilità con PEP 562
        raise AttributeError(name) from error


def __dir__() -> list[str]:
    base = set(globals())
    base.update(dir(_load_tool_module()))
    return sorted(base)


if __name__ == "__main__":
    sys.exit(main())
