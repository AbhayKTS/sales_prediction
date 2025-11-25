"""CLI entry-point for running the training pipeline."""

from __future__ import annotations

import argparse
import logging
from pathlib import Path

from .pipeline import TrainingConfig, run_training


LOGGER = logging.getLogger("pipeline.cli")


def default_paths() -> dict:
	repo_root = Path(__file__).resolve().parents[3]
	return {
		"csv_path": repo_root / "src" / "frontend" / "public" / "advertising.csv",
		"public_dir": repo_root / "src" / "frontend" / "public",
		"artifacts_dir": repo_root / "models" / "artifacts",
		"docs_dir": repo_root / "docs",
	}


def parse_args() -> argparse.Namespace:
	defaults = default_paths()
	parser = argparse.ArgumentParser(description="Train and evaluate ad sales models")
	parser.add_argument("--csv", type=Path, default=defaults["csv_path"], help="Path to advertising CSV")
	parser.add_argument(
		"--public-dir",
		type=Path,
		default=defaults["public_dir"],
		help="Directory containing static assets consumed by the frontend",
	)
	parser.add_argument(
		"--artifacts-dir",
		type=Path,
		default=defaults["artifacts_dir"],
		help="Where to store serialized model artifacts",
	)
	parser.add_argument(
		"--docs-dir",
		type=Path,
		default=defaults["docs_dir"],
		help="Directory to write markdown reports",
	)
	parser.add_argument("--min-r2", type=float, default=0.6, help="Minimum acceptable validation R²")
	parser.add_argument("--price-per-unit", type=float, default=10.0, help="Unit price for ROI calculations")
	return parser.parse_args()


def main() -> None:
	logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
	args = parse_args()
	config = TrainingConfig(
		csv_path=args.csv,
		public_dir=args.public_dir,
		artifacts_dir=args.artifacts_dir,
		docs_dir=args.docs_dir,
		min_r2=args.min_r2,
		price_per_unit=args.price_per_unit,
	)
	result = run_training(config)
	LOGGER.info("Training finished (version=%s, best=%s)", result.version, result.best_model_name)


if __name__ == "__main__":  # pragma: no cover
	main()
