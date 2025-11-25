"""FastAPI application exposing campaign sales prediction endpoints."""

from pathlib import Path
from typing import Dict, List, Optional

import json

import joblib  # type: ignore
import numpy as np  # type: ignore
import pandas as pd  # type: ignore
from fastapi import FastAPI, HTTPException  # type: ignore
from fastapi.middleware.cors import CORSMiddleware  # type: ignore
from pydantic import BaseModel  # type: ignore


REPO_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_PUBLIC = REPO_ROOT / "src" / "frontend" / "public"
MODELS_DIR = REPO_ROOT / "models" / "artifacts"
METRICS_PATH = FRONTEND_PUBLIC / "model-coefs.json"
FEATURES = ["TV", "Radio", "Newspaper"]


class ChannelsInput(BaseModel):
    tv: float
    radio: float
    newspaper: float
    price_per_unit: Optional[float] = 10.0


class TotalInput(BaseModel):
    total: float
    shares: Optional[List[float]] = None
    price_per_unit: Optional[float] = 10.0


app = FastAPI(title="Campaign Sales Prediction API")

# Allow the default Vite dev origin and localhost
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def load_model(path: Path):
    if not path.exists():
        raise FileNotFoundError(f"Model file not found: {path}")
    return joblib.load(path)


def load_metrics(path: Path):
    if not path.exists():
        return {}
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def resolve_model_path(metrics: dict) -> Path:
    preferred = metrics.get("best_model")
    if preferred:
        candidate = MODELS_DIR / f"{preferred}.joblib"
        if candidate.exists():
            return candidate
    return MODELS_DIR / "random_forest.joblib"


@app.on_event("startup")
def startup_event():
    global MODEL, METRICS
    MODEL = None
    METRICS = load_metrics(METRICS_PATH)
    model_path = resolve_model_path(METRICS)
    try:
        MODEL = load_model(model_path)
    except Exception:
        # keep MODEL as None; endpoints will return a helpful error
        MODEL = None
    # try loading ROI models if present
    global ROI_MODEL
    ROI_MODEL = None
    roi_path = MODELS_DIR / 'random_forest_roi.joblib'
    if roi_path.exists():
        try:
            ROI_MODEL = load_model(roi_path)
        except Exception:
            ROI_MODEL = None

    # If a binary-scikit model couldn't be loaded (scikit-learn not installed),
    # attempt to fall back to a lightweight linear predictor using precomputed
    # coefficients placed in `model-coefs.json` under the frontend public folder.
    try:
        # METRICS may already contain intercept/betas when the JSON is the coefs file
        coefs = None
        if isinstance(METRICS, dict):
            # support nested shapes { intercept, betas, channelShares, metrics }
            if "intercept" in METRICS and "betas" in METRICS:
                coefs = METRICS
            elif "metrics" in METRICS and isinstance(METRICS.get("metrics"), dict):
                inner = METRICS.get("metrics")
                if "intercept" in inner and "betas" in inner:
                    coefs = {**inner, **{k: METRICS.get(k) for k in ("channelShares",)}}

        if MODEL is None and coefs is not None:
            # create a tiny wrapper with predict(df) to mimic sklearn API
            class LinearWrapper:
                def __init__(self, intercept: float, betas):
                    self.intercept = float(intercept)
                    self.betas = [float(b) for b in betas]

                def predict(self, df):
                    # expects pandas DataFrame with columns ['TV','Radio','Newspaper'] in training units (k)
                    try:
                        arr = [self.intercept + self.betas[0] * float(df['TV'].iloc[0])
                               + self.betas[1] * float(df['Radio'].iloc[0])
                               + self.betas[2] * float(df['Newspaper'].iloc[0])]
                        import numpy as _np

                        return _np.array(arr)
                    except Exception:
                        raise

            try:
                MODEL = LinearWrapper(coefs.get("intercept"), coefs.get("betas"))
            except Exception:
                MODEL = None
    except Exception:
        # non-fatal: keep MODEL as-is
        pass


def to_model_input(tv: float, radio: float, newspaper: float) -> pd.DataFrame:
    # The frontend and training scripts use units where spend is in thousands.
    # Convert dollar inputs into training units (divide by 1000).
    data = {
        "TV": [tv / 1000.0],
        "Radio": [radio / 1000.0],
        "Newspaper": [newspaper / 1000.0],
    }
    return pd.DataFrame(data, columns=FEATURES)


def compute_roi(pred_k: float, price_per_unit: float, expense: float):
    # pred_k is in "k units" (same as training Sales units). Convert to units.
    units = float(pred_k) * 1000.0
    revenue = units * float(price_per_unit)
    expense = float(expense)
    if expense == 0:
        roi = None
    else:
        roi = (revenue - expense) / expense
    return {"units": units, "revenue": revenue, "expense": expense, "roi": roi}


@app.post("/predict/roi/channels")
def predict_roi_channels(inp: ChannelsInput):
    """Predict ROI directly using a server-side ROI model if available.
    Returns roi as a fraction (e.g. 2.61 = 261%)."""
    if ROI_MODEL is None:
        return {"error": "ROI model not available on server. Train and save random_forest_roi.joblib."}

    tv = inp.tv
    radio = inp.radio
    newspaper = inp.newspaper
    X = to_model_input(tv, radio, newspaper)
    pred_roi = ROI_MODEL.predict(X)
    pred_val = float(pred_roi[0])
    metrics = METRICS.get("metrics", METRICS)
    return {"predicted_roi": pred_val, "predicted_roi_pct": pred_val * 100.0, "metrics": metrics}


@app.post("/predict/roi/total")
def predict_roi_total(inp: TotalInput):
    if ROI_MODEL is None:
        return {"error": "ROI model not available on server. Train and save random_forest_roi.joblib."}

    total = inp.total
    shares = inp.shares
    if shares and len(shares) == 3:
        s = np.array(shares, dtype=float)
        if s.sum() > 0:
            s = s / s.sum()
        tv = float(total) * float(s[0])
        radio = float(total) * float(s[1])
        newspaper = float(total) * float(s[2])
    else:
        channel_shares = METRICS.get("channelShares") or METRICS.get("metrics", {}).get("channelShares")
        if channel_shares and len(channel_shares) == 3:
            s = np.array(channel_shares, dtype=float)
            s = s / s.sum()
            tv = float(total) * float(s[0])
            radio = float(total) * float(s[1])
            newspaper = float(total) * float(s[2])
        else:
            tv = radio = newspaper = float(total) / 3.0

    X = to_model_input(tv, radio, newspaper)
    pred_roi = ROI_MODEL.predict(X)
    pred_val = float(pred_roi[0])
    metrics = METRICS.get("metrics", METRICS)
    return {"predicted_roi": pred_val, "predicted_roi_pct": pred_val * 100.0, "channels": {"tv": tv, "radio": radio, "newspaper": newspaper}, "metrics": metrics}


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": MODEL is not None}


@app.post("/predict/channels")
def predict_channels(inp: ChannelsInput):
    if MODEL is None:
        return {"error": "Model is not available on server. Check server logs."}

    tv = inp.tv
    radio = inp.radio
    newspaper = inp.newspaper
    X = to_model_input(tv, radio, newspaper)
    pred = MODEL.predict(X)
    pred_k = float(pred[0])
    metrics = METRICS.get("metrics", METRICS)
    roi = compute_roi(pred_k, inp.price_per_unit or 10.0, tv + radio + newspaper)
    return {"predicted_k": pred_k, "predicted_units": int(round(roi["units"])) if False else roi["units"], "roi": roi, "metrics": metrics}


@app.post("/predict/total")
def predict_total(inp: TotalInput):
    if MODEL is None:
        return {"error": "Model is not available on server. Check server logs."}

    total = inp.total
    shares = inp.shares
    if shares and len(shares) == 3:
        # interpret shares as proportions or percentages
        s = np.array(shares, dtype=float)
        # normalize
        if s.sum() > 0:
            s = s / s.sum()
        tv = float(total) * float(s[0])
        radio = float(total) * float(s[1])
        newspaper = float(total) * float(s[2])
    else:
        # if no shares provided, fallback to channelShares in metrics or equal split
        channel_shares = METRICS.get("channelShares") or METRICS.get("metrics", {}).get("channelShares")
        if channel_shares and len(channel_shares) == 3:
            s = np.array(channel_shares, dtype=float)
            s = s / s.sum()
            tv = float(total) * float(s[0])
            radio = float(total) * float(s[1])
            newspaper = float(total) * float(s[2])
        else:
            # equal split
            tv = radio = newspaper = float(total) / 3.0

    X = to_model_input(tv, radio, newspaper)
    pred = MODEL.predict(X)
    pred_k = float(pred[0])
    roi = compute_roi(pred_k, inp.price_per_unit or 10.0, tv + radio + newspaper)
    metrics = METRICS.get("metrics", METRICS)
    return {"predicted_k": pred_k, "predicted_units": roi["units"], "roi": roi, "channels": {"tv": tv, "radio": radio, "newspaper": newspaper}, "metrics": metrics}
