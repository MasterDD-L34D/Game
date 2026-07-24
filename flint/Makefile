.PHONY: install dev test lint fmt type check clean speak

install:
	uv tool install . || pip install .

dev:
	uv sync --dev || pip install -e ".[dev]"

test:
	pytest

lint:
	ruff check . --fix

fmt:
	ruff format .

type:
	mypy src

check: lint type test

clean:
	rm -rf build dist *.egg-info .pytest_cache .mypy_cache .ruff_cache
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true

speak:
	caveman speak

status:
	caveman status
