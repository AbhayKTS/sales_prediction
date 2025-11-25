"""Training pipeline for the campaign sales prediction models.

The original project bundled notebook logic inside ad-hoc scripts living under
``campaign-sales-bot/scripts``.  This module extracts that logic into
well-typed, testable functions that can be imported by the FastAPI backend or
invoked from a thin CLI wrapper.  The pipeline trains multiple regressors,
selects the best performer, evaluates ROI models, and writes versioned
artifacts/metadata for the frontend to consume.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Dict, List, Tuple

import joblib  # type: ignore
import matplotlib.pyplot as plt  # type: ignore
import numpy as np  # type: ignore
import pandas as pd  # type: ignore
import seaborn as sns  # type: ignore
from sklearn.compose import ColumnTransformer  # type: ignore
from sklearn.ensemble import RandomForestRegressor  # type: ignore
from sklearn.linear_model import Lasso, LinearRegression, Ridge  # type: ignore
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score  # type: ignore
from sklearn.model_selection import GridSearchCV, KFold, train_test_split  # type: ignore
from sklearn.pipeline import Pipeline  # type: ignore
from sklearn.preprocessing import StandardScaler  # type: ignore

try:  # pragma: no cover - optional dependency
	from xgboost import XGBRegressor  # type: ignore
except Exception:  # pragma: no cover
	XGBRegressor = None


LOGGER = logging.getLogger(__name__)
plt.switch_backend("Agg")

FEATURES = ["TV", "Radio", "Newspaper"]
TARGET = "Sales"
RANDOM_STATE = 42


@dataclass(frozen=True)
class TrainingConfig:
	"""User-facing configuration for a training run."""

	csv_path: Path
	public_dir: Path
	artifacts_dir: Path
	docs_dir: Path
	min_r2: float = 0.6
	price_per_unit: float = 10.0

	@property
	def plots_dir(self) -> Path:
		return self.public_dir / "plots"

	@property
	def metadata_path(self) -> Path:
		return self.public_dir / "model-coefs.json"

	@property
	def report_path(self) -> Path:
		return self.docs_dir / "model-report.md"


@dataclass
class TrainingResult:
	"""Artifacts emitted by :func:`run_training`."""

	version: str
	best_model_name: str
	metadata_path: Path
	report_path: Path
	metrics: Dict[str, Dict[str, float]]
	plot_paths: Dict[str, str]


@dataclass
class ModelSpec:
	"""Definition for a single estimator + search space."""

	name: str
	estimator: object
	param_grid: Dict[str, List]
	needs_scaling: bool = True


def ensure_dir(path: Path) -> None:
	"""Create *path* (and parents) if it does not already exist."""

	path.mkdir(parents=True, exist_ok=True)


def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
	"""Apply basic data cleaning suitable for the advertising dataset."""

	cleaned = df.copy()
	cleaned.columns = [col.strip() for col in cleaned.columns]
	cleaned = cleaned.drop_duplicates().reset_index(drop=True)

	numeric_cols = cleaned.select_dtypes(include=[np.number]).columns
	cleaned[numeric_cols] = cleaned[numeric_cols].fillna(cleaned[numeric_cols].median())

	for col in numeric_cols:
		q1 = cleaned[col].quantile(0.25)
		q3 = cleaned[col].quantile(0.75)
		iqr = q3 - q1
		lower = q1 - 1.5 * iqr
		upper = q3 + 1.5 * iqr
		cleaned[col] = cleaned[col].clip(lower=lower, upper=upper)

	return cleaned


def split_data(df: pd.DataFrame, test_size: float = 0.2, val_size: float = 0.2) -> Tuple:
	"""Split dataframe into train/validation/test partitions."""

	X = df[FEATURES].astype(float)
	y = df[TARGET].astype(float)

	X_train_full, X_temp, y_train_full, y_temp = train_test_split(
		X, y, test_size=test_size, random_state=RANDOM_STATE
	)
	val_ratio = val_size / (1 - test_size)
	X_val, X_test, y_val, y_test = train_test_split(
		X_temp, y_temp, test_size=1 - val_ratio, random_state=RANDOM_STATE
	)
	return X_train_full, X_val, X_test, y_train_full, y_val, y_test


def build_model_specs() -> List[ModelSpec]:
	"""Return the list of candidate models + search grids."""

	specs: List[ModelSpec] = [
		ModelSpec(
			name="linear",
			estimator=LinearRegression(),
			param_grid={"model__fit_intercept": [True, False]},
			needs_scaling=True,
		),
		ModelSpec(
			name="ridge",
			estimator=Ridge(random_state=RANDOM_STATE),
			param_grid={"model__alpha": [0.1, 1.0, 10.0]},
			needs_scaling=True,
		),
		ModelSpec(
			name="lasso",
			estimator=Lasso(random_state=RANDOM_STATE, max_iter=10000),
			param_grid={"model__alpha": [0.001, 0.01, 0.1, 1.0]},
			needs_scaling=True,
		),
		ModelSpec(
			name="random_forest",
			estimator=RandomForestRegressor(random_state=RANDOM_STATE, n_jobs=-1),
			param_grid={
				"model__n_estimators": [200, 400],
				"model__max_depth": [None, 8, 16],
			},
			needs_scaling=False,
		),
	]

	if XGBRegressor is not None:
		specs.append(
			ModelSpec(
				name="xgboost",
				estimator=XGBRegressor(
					random_state=RANDOM_STATE,
					n_estimators=400,
					objective="reg:squarederror",
					tree_method="hist",
				),
				param_grid={
					"model__max_depth": [3, 5, 7],
					"model__learning_rate": [0.05, 0.1],
				},
				needs_scaling=False,
			)
		)

	return specs


def build_pipeline(spec: ModelSpec) -> Pipeline:
	"""Compose preprocessing + estimator pipeline based on ``spec``."""

	steps: List[Tuple[str, object]] = []
	if spec.needs_scaling:
		preprocessor = ColumnTransformer(
			[("num", StandardScaler(), FEATURES)], remainder="passthrough"
		)
		steps.append(("preprocess", preprocessor))
	steps.append(("model", spec.estimator))
	return Pipeline(steps)


def evaluate_predictions(y_true, y_pred) -> Dict[str, float]:
	"""Calculate core regression metrics for ``y_true`` vs ``y_pred``."""

	return {
		"r2": float(r2_score(y_true, y_pred)),
		"rmse": float(np.sqrt(mean_squared_error(y_true, y_pred))),
		"mae": float(mean_absolute_error(y_true, y_pred)),
	}


def generate_plots(
	df: pd.DataFrame,
	y_true: pd.Series,
	y_pred: np.ndarray,
	plots_dir: Path,
) -> Dict[str, str]:
	"""Render diagnostic plots and return paths relative to ``public`` dir."""

	ensure_dir(plots_dir)
	plot_paths: Dict[str, str] = {}

	plt.figure(figsize=(6, 5))
	sns.heatmap(df[FEATURES + [TARGET]].corr(), annot=True, cmap="Blues")
	heatmap_path = plots_dir / "correlation_heatmap.png"
	plt.tight_layout()
	plt.savefig(heatmap_path)
	plt.close()
	plot_paths["correlation_heatmap"] = heatmap_path.relative_to(plots_dir.parent).as_posix()

	plt.figure(figsize=(6, 5))
	sns.scatterplot(x=y_true, y=y_pred)
	sns.lineplot(x=y_true, y=y_true, color="red", label="ideal")
	plt.xlabel("Actual Sales")
	plt.ylabel("Predicted Sales")
	plt.title("Predicted vs Actual")
	pred_path = plots_dir / "predicted_vs_actual.png"
	plt.tight_layout()
	plt.savefig(pred_path)
	plt.close()
	plot_paths["predicted_vs_actual"] = pred_path.relative_to(plots_dir.parent).as_posix()

	residuals = y_true - y_pred
	plt.figure(figsize=(6, 5))
	sns.histplot(residuals, kde=True)
	plt.title("Residual Distribution")
	plt.xlabel("Residual (Actual - Predicted)")
	res_path = plots_dir / "residuals_hist.png"
	plt.tight_layout()
	plt.savefig(res_path)
	plt.close()
	plot_paths["residuals_hist"] = res_path.relative_to(plots_dir.parent).as_posix()

	return plot_paths


def train_model(
	spec: ModelSpec,
	X_train: pd.DataFrame,
	y_train: pd.Series,
	X_val: pd.DataFrame,
	y_val: pd.Series,
) -> Tuple[Pipeline, Dict[str, float]]:
	"""Tune, train, and evaluate a single model spec."""

	pipeline = build_pipeline(spec)
	cv = KFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
	grid = GridSearchCV(
		pipeline,
		spec.param_grid,
		scoring="neg_root_mean_squared_error",
		cv=cv,
		n_jobs=-1,
	)
	grid.fit(X_train, y_train)
	best_estimator: Pipeline = grid.best_estimator_
	val_pred = best_estimator.predict(X_val)
	metrics = evaluate_predictions(y_val, val_pred)
	metrics["cv_rmse"] = float(-grid.best_score_)
	metrics["best_params"] = grid.best_params_  # type: ignore[assignment]
	return best_estimator, metrics


def train_roi_models(
	X: pd.DataFrame,
	roi: np.ndarray,
	models_dir: Path,
	version: str,
) -> Dict[str, Dict[str, float]]:
	"""Train simple ROI estimators for server-side inference."""

	metrics: Dict[str, Dict[str, float]] = {}
	X_train, X_test, y_train, y_test = train_test_split(
		X, roi, test_size=0.2, random_state=RANDOM_STATE
	)

	lr = LinearRegression()
	lr.fit(X_train, y_train)
	preds = lr.predict(X_test)
	metrics["linear_roi"] = evaluate_predictions(y_test, preds)
	joblib.dump(lr, models_dir / f"linear_roi_{version}.joblib")
	joblib.dump(lr, models_dir / "linear_roi.joblib")

	rf = RandomForestRegressor(n_estimators=300, random_state=RANDOM_STATE, n_jobs=-1)
	rf.fit(X_train, y_train)
	preds = rf.predict(X_test)
	metrics["random_forest_roi"] = evaluate_predictions(y_test, preds)
	joblib.dump(rf, models_dir / f"random_forest_roi_{version}.joblib")
	joblib.dump(rf, models_dir / "random_forest_roi.joblib")
	return metrics


def assemble_metadata(
	version: str,
	channel_shares: List[float],
	linear_reference: LinearRegression,
	metrics: Dict[str, Dict[str, float]],
	plot_paths: Dict[str, str],
	price_per_unit: float,
) -> Dict[str, Any]:
	"""Build the JSON payload consumed by the frontend."""

	return {
		"version": version,
		"generated_at": datetime.now(UTC).isoformat(),
		"channelShares": channel_shares,
		"intercept": float(linear_reference.intercept_),
		"betas": [float(c) for c in linear_reference.coef_],
		"metrics": metrics,
		"plots": plot_paths,
		"price_per_unit": price_per_unit,
	}


def summarize(best_name: str, metrics: Dict[str, Dict[str, float]]) -> None:
	"""Pretty-print summary lines for logs/CLI."""

	LOGGER.info("Best model: %s", best_name)
	LOGGER.info(json.dumps(metrics, indent=2))


def run_training(config: TrainingConfig) -> TrainingResult:
	"""Execute the full training pipeline and persist artifacts."""

	ensure_dir(config.artifacts_dir)
	ensure_dir(config.public_dir)
	ensure_dir(config.docs_dir)
	ensure_dir(config.plots_dir)

	if not config.csv_path.exists():
		raise FileNotFoundError(f"CSV file not found: {config.csv_path}")

	raw_df = pd.read_csv(config.csv_path)
	df = clean_dataframe(raw_df)
	X_train, X_val, X_test, y_train, y_val, y_test = split_data(df)

	specs = build_model_specs()
	version = datetime.now(UTC).strftime("v%Y%m%d-%H%M%S")
	model_metrics: Dict[str, Dict[str, float]] = {}
	trained_models: Dict[str, Pipeline] = {}

	for spec in specs:
		LOGGER.info("Training %s", spec.name)
		model, metrics = train_model(spec, X_train, y_train, X_val, y_val)
		test_pred = model.predict(X_test)
		metrics.update(
			{
				"test_r2": float(r2_score(y_test, test_pred)),
				"test_rmse": float(np.sqrt(mean_squared_error(y_test, test_pred))),
				"test_mae": float(mean_absolute_error(y_test, test_pred)),
			}
		)
		model_metrics[spec.name] = metrics
		trained_models[spec.name] = model

		joblib.dump(model, config.artifacts_dir / f"{spec.name}_{version}.joblib")
		joblib.dump(model, config.artifacts_dir / f"{spec.name}.joblib")

	best_model_name = min(model_metrics.items(), key=lambda item: item[1]["test_rmse"])[0]
	if model_metrics[best_model_name]["test_r2"] < config.min_r2:
		raise RuntimeError(
			"Model quality below threshold (R2=%.3f < %.3f)." % (
				model_metrics[best_model_name]["test_r2"], config.min_r2
			)
		)

	reference_lr = LinearRegression()
	reference_lr.fit(df[FEATURES], df[TARGET])

	total_spend = df[FEATURES].sum(axis=0)
	channel_shares = [float(total_spend[col] / total_spend.sum()) for col in FEATURES]

	plot_paths = generate_plots(df, y_val, trained_models[best_model_name].predict(X_val), config.plots_dir)

	spend = df[FEATURES].sum(axis=1).values
	revenue = df[TARGET].values * config.price_per_unit
	roi_target = np.divide(
		revenue - spend,
		spend,
		out=np.zeros_like(revenue, dtype=float),
		where=spend != 0,
	)
	roi_metrics = train_roi_models(df[FEATURES], roi_target, config.artifacts_dir, version)
	model_metrics.update(roi_metrics)

	metadata = assemble_metadata(
		version,
		channel_shares,
		reference_lr,
		model_metrics,
		plot_paths,
		config.price_per_unit,
	)
	metadata["best_model"] = best_model_name

	with open(config.metadata_path, "w", encoding="utf-8") as fh:
		json.dump(metadata, fh, indent=2)

	def fmt(value: Any) -> str:
		if isinstance(value, (float, int)):
			return f"{value:.3f}"
		return "-"

	with open(config.report_path, "w", encoding="utf-8") as report:
		report.write(f"# Model Report ({version})\n\n")
		report.write(f"Best Model: **{best_model_name}**\n\n")
		report.write("| Model | Val R² | Test R² | Test RMSE | Test MAE |\n")
		report.write("| --- | --- | --- | --- | --- |\n")
		for name, metrics in model_metrics.items():
			report.write(
				f"| {name} | {fmt(metrics.get('r2'))} | {fmt(metrics.get('test_r2'))} | "
				f"{fmt(metrics.get('test_rmse'))} | {fmt(metrics.get('test_mae'))} |\n"
			)
		report.write("\nPlots saved under `public/plots/`.\n")

	summarize(best_model_name, model_metrics)
	LOGGER.info("Artifacts written to %s", config.artifacts_dir)

	return TrainingResult(
		version=version,
		best_model_name=best_model_name,
		metadata_path=config.metadata_path,
		report_path=config.report_path,
		metrics=model_metrics,
		plot_paths=plot_paths,
	)