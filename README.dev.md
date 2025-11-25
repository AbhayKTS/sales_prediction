# Development: start backend + frontend

This repo contains a FastAPI backend (`src/backend`) and a Vite React frontend (`src/frontend`).

Quick start (Windows PowerShell):

1. Ensure you have a Python virtualenv with required packages. If using the included venv path used in this project run:

```powershell
# (optional) create venv if you don't have one
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install minimal runtime deps (if you need training, install scikit-learn + build tools separately)
python -m pip install --upgrade pip
python -m pip install -r src/backend/requirements.txt
```

Note: On Windows, building `scikit-learn` from source requires Visual C++ Build Tools. The backend will fall back to using `src/frontend/public/model-coefs.json` for predictions when `scikit-learn` is not available.

2. Start the backend (from repo root):

```powershell
& ".\campaign-sales-bot\.venv\Scripts\python.exe" -m uvicorn src.backend.app:app --reload --host 127.0.0.1 --port 8000
```

3. Start the frontend (in a separate terminal):

```powershell
cd src/frontend
npm install    # first time only
npm run dev
```

The frontend dev server is configured to call the backend at `http://127.0.0.1:8000` via `src/frontend/.env`.

If you need a single command launcher, run `scripts/start-dev.ps1` (PowerShell) which opens two new terminals and starts backend and frontend.
