# Campaign Sales Bot — Sales Prediction ML

This project delivers a full-stack workflow for campaign budget planning:

- **ML training pipeline** (`scripts/train_and_save.py`) that cleans `advertising.csv`, tunes several regressors, tracks metrics, emits diagnostic plots, and versions serialized models/metadata under `public/`.
- **FastAPI backend** (`server/app.py`) that loads the best-performing serialized model plus ROI models and exposes `/predict` + `/predict/roi` endpoints.
- **React SPA** (`src/`) built with Vite + Tailwind that visualizes the coefficients/metrics from `model-coefs.json`, lets teams explore ROI scenarios, and talks to the backend/worker for live predictions.

Quick start (local):

```sh
# Clone the repo
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install

# Start dev server
npm run dev
```

Tech stack:
- Vite
- TypeScript
- React
- Tailwind CSS

Notes:
- Run `npm run dev` for the UI, `uvicorn campaign-sales-bot.server.app:app --reload` for the API, and `python campaign-sales-bot/scripts/train_and_save.py` whenever you upload a fresh dataset.
- Netlify/Cloudflare Workers configs live under `campaign-sales-bot` to help you ship the frontend + edge proxy quickly.
- Copy `.env.example` to `.env.local` (or `.env`) and set `VITE_API_BASE_URL` — use `http://127.0.0.1:8000` locally and `/predict` (or your proxy route) in production. Netlify contexts already inject `/predict` for you via `netlify.toml`.
