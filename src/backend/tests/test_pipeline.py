"""Unit tests for the training pipeline."""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

from src.backend.model import pipeline


def make_dataframe(rows: int = 30) -> pd.DataFrame:
	rng = np.random.default_rng(42)
	tv = rng.uniform(50, 300, size=rows)
	radio = rng.uniform(10, 120, size=rows)
	newspaper = rng.uniform(5, 90, size=rows)
	sales = 2.5 + 0.04 * tv + 0.3 * radio + 0.02 * newspaper + rng.normal(0, 1, size=rows)
	return pd.DataFrame({"TV": tv, "Radio": radio, "Newspaper": newspaper, "Sales": sales})


def test_clean_dataframe_removes_nans_and_clips_outliers():
	df = make_dataframe(10)
	df.loc[0, "TV"] = np.nan
	df.loc[1, "Radio"] = 9_999  # extreme outlier

	cleaned = pipeline.clean_dataframe(df)

	assert cleaned["TV"].isna().sum() == 0
	assert cleaned["Radio"].max() < 9_999


def test_run_training_smoke(tmp_path, monkeypatch):
	csv_path = tmp_path / "advertising.csv"
	make_dataframe(40).to_csv(csv_path, index=False)

	artifacts_dir = tmp_path / "models"
	public_dir = tmp_path / "public"
	docs_dir = tmp_path / "docs"

	def fake_specs():
		return [
			pipeline.ModelSpec(
				name="linear",
				estimator=pipeline.LinearRegression(),
				param_grid={"model__fit_intercept": [True]},
				needs_scaling=True,
			)
		]

	monkeypatch.setattr(pipeline, "build_model_specs", fake_specs)

	config = pipeline.TrainingConfig(
		csv_path=csv_path,
		public_dir=public_dir,
		artifacts_dir=artifacts_dir,
		docs_dir=docs_dir,
		min_r2=0.0,
		price_per_unit=10.0,
	)

	result = pipeline.run_training(config)

	assert result.metadata_path.exists()
	assert result.report_path.exists()
	assert (artifacts_dir / "linear.joblib").exists()
	assert Path(result.metadata_path).read_text(encoding="utf-8")
