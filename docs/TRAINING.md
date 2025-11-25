Training and regenerating model artifacts

This repository includes a full-featured training pipeline that ingests `advertising.csv`, performs data cleaning and outlier handling, trains multiple regressors (Linear, Ridge, Lasso, RandomForest, and XGBoost when available) with cross-validation, evaluates on held-out validation/test splits, generates diagnostic plots, and writes refreshed artifacts under `public/`.

Requirements
- Python 3.8+ (3.11/3.12 recommended)
- pip

Quick steps (PowerShell)

1. Create and activate a virtual environment (PowerShell):

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

If PowerShell blocks execution of Activate.ps1, run in cmd.exe or temporarily change policy (only if you understand the security implications):

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

2. Install packages

```powershell
python -m pip install --upgrade pip
pip install pandas numpy scikit-learn joblib matplotlib seaborn xgboost
```

3. Run the training script from repository root

```powershell
python .\campaign-sales-bot\scripts\train_and_save.py --csv .\campaign-sales-bot\public\advertising.csv --out-dir .\campaign-sales-bot\public
```

What you get:

- Cleaned dataset + winsorized outliers before training.
- Train/validation/test split with 5-fold cross validation (GridSearchCV) for model tuning.
- Models trained & serialized with both "latest" names (e.g., `random_forest.joblib`) and timestamped versions (`random_forest_vYYYYMMDD-HHMMSS.joblib`).
- ROI-specific models (`linear_roi.joblib`, `random_forest_roi.joblib`) for profitability projections.
- `public/model-coefs.json` enriched with per-model metrics, residual stats, artifact version info, and relative RMSE % for frontend dashboards.
- `public/model-report.md` summarizing the experiment plus correlation/prediction/residual plots saved under `public/plots/`.

Notes
- The frontend (`src/lib/model.ts`) still loads `/model-coefs.json`; the richer metadata produced here unlocks better dashboard copy and accuracy badges without recomputing metrics in the browser.
- The FastAPI server under `campaign-sales-bot/server` automatically loads the latest "best" model noted in `model-coefs.json` (falling back to `random_forest.joblib`). Deploy or run that server when you want API-based predictions.
- Timestamped artifacts let you compare experiments or roll back easily; keep only the versions you care about in Git to manage repo size.
