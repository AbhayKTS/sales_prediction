// Simple client-side OLS trainer for the advertising dataset.
// Trains an intercept + TV + Radio + Newspaper linear model at runtime by fetching /advertising.csv

type Model = {
  intercept: number;
  betas: [number, number, number];
  channelShares: [number, number, number];
  metrics?: {
    r2: number | null;
    rmse: number | null; // same units as Sales column (thousands)
    mae: number | null;
    meanSales: number | null;
    rel_rmse_pct: number | null; // relative RMSE (% of mean sales)
    // classification-style metrics computed by thresholding sales at the mean (optional)
    precision?: number | null;
    recall?: number | null;
    f1?: number | null;
  };
};

let model: Model | null = null;

function transpose(A: number[][]) {
  return A[0].map((_, i) => A.map(row => row[i]));
}

function matMul(A: number[][], B: number[][]) {
  const m = A.length, p = B[0].length, n = B.length;
  const C: number[][] = Array.from({ length: m }, () => Array(p).fill(0));
  for (let i = 0; i < m; i++) {
    for (let k = 0; k < n; k++) {
      const aik = A[i][k];
      for (let j = 0; j < p; j++) C[i][j] += aik * B[k][j];
    }
  }
  return C;
}

// Invert small square matrix using Gauss-Jordan
function invertMatrix(A: number[][]) {
  const n = A.length;
  const M = A.map((r, i) => [...r, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let i = 0; i < n; i++) {
    // pivot
    let maxRow = i;
    for (let r = i + 1; r < n; r++) if (Math.abs(M[r][i]) > Math.abs(M[maxRow][i])) maxRow = r;
    if (Math.abs(M[maxRow][i]) < 1e-12) throw new Error('Matrix is singular');
    const tmp = M[i]; M[i] = M[maxRow]; M[maxRow] = tmp;
    const div = M[i][i];
    for (let j = 0; j < 2 * n; j++) M[i][j] /= div;
    for (let r = 0; r < n; r++) {
      if (r === i) continue;
      const mult = M[r][i];
      for (let j = 0; j < 2 * n; j++) M[r][j] -= mult * M[i][j];
    }
  }
  return M.map(r => r.slice(n));
}

// Compute metrics (R2, RMSE, MAE) by loading the CSV and scoring the provided model.
async function computeMetricsFromCSV(m: Model) {
  try {
    const resp = await fetch('/advertising.csv');
    if (!resp.ok) return;
    const txt = await resp.text();
    const lines = txt.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length <= 1) return;
    const rows = lines.slice(1).map(l => l.split(',').map(v => parseFloat(v))).filter(r => r.length >= 4 && !r.some(x => Number.isNaN(x)));
    const yTrue = rows.map(r => r[3]);
    const preds = rows.map(r => m.intercept + m.betas[0] * r[0] + m.betas[1] * r[1] + m.betas[2] * r[2]);
    if (yTrue.length === 0) return;
    const meanY = yTrue.reduce((a, b) => a + b, 0) / yTrue.length;
    const ssRes = yTrue.reduce((s, v, i) => s + Math.pow(v - preds[i], 2), 0);
    const ssTot = yTrue.reduce((s, v) => s + Math.pow(v - meanY, 2), 0) || 0.0000001;
    const r2 = 1 - ssRes / ssTot;
    const rmse = Math.sqrt(yTrue.reduce((s, v, i) => s + Math.pow(v - preds[i], 2), 0) / yTrue.length);
    const mae = yTrue.reduce((s, v, i) => s + Math.abs(v - preds[i]), 0) / yTrue.length;
    const rel_rmse_pct = meanY !== 0 ? (rmse / meanY) * 100 : null;
    // Derive a simple binary classification by thresholding at the mean sales value
    const thresh = meanY;
    const yTrueBin = yTrue.map(v => (v > thresh ? 1 : 0));
    const predsBin = preds.map(p => (p > thresh ? 1 : 0));
    let tp = 0, fp = 0, fn = 0;
    for (let i = 0; i < yTrueBin.length; i++) {
      if (predsBin[i] === 1 && yTrueBin[i] === 1) tp++;
      if (predsBin[i] === 1 && yTrueBin[i] === 0) fp++;
      if (predsBin[i] === 0 && yTrueBin[i] === 1) fn++;
    }
    const precision = tp + fp > 0 ? tp / (tp + fp) : null;
    const recall = tp + fn > 0 ? tp / (tp + fn) : null;
    const f1 = precision != null && recall != null && (precision + recall) > 0 ? (2 * precision * recall) / (precision + recall) : null;
    m.metrics = { r2, rmse, mae, meanSales: meanY, rel_rmse_pct, precision, recall, f1 };
  } catch (e) {
    // ignore
  }
}

export async function initModel(): Promise<Model> {
  if (model) return model;

  // Try to load precomputed coefficients first (written by the notebook to public/model-coefs.json)
  try {
    const coefResp = await fetch('/model-coefs.json');
    if (coefResp.ok) {
      const json = await coefResp.json();
      // if artifact marked removed, skip using it
      if (json && json.removed) {
        throw new Error('Model artifacts removed; upload new dataset and retrain');
      }
      // normalize metrics shape: support both flat {r2,rmse,..} and nested { linear: {r2,..} }
      const metricsRaw = json.metrics ?? null;
      let normalizedMetrics: any = undefined;
      if (metricsRaw) {
        if (metricsRaw.linear) {
          normalizedMetrics = {
            r2: metricsRaw.linear.r2 ?? null,
            rmse: metricsRaw.linear.rmse ?? null,
            mae: metricsRaw.linear.mae ?? null,
            meanSales: metricsRaw.mean_sales ?? metricsRaw.mean_sales_test ?? metricsRaw.meanSales ?? null,
            rel_rmse_pct: metricsRaw.linear.rel_rmse_pct ?? metricsRaw.linear.rel_rmse_pct ?? metricsRaw.rel_rmse_pct ?? null,
            precision: metricsRaw.linear?.precision ?? metricsRaw.precision ?? null,
            recall: metricsRaw.linear?.recall ?? metricsRaw.recall ?? null,
            f1: metricsRaw.linear?.f1 ?? metricsRaw.f1 ?? null,
          };
        } else {
          normalizedMetrics = {
            r2: metricsRaw.r2 ?? null,
            rmse: metricsRaw.rmse ?? null,
            mae: metricsRaw.mae ?? null,
            meanSales: metricsRaw.mean_sales ?? metricsRaw.mean_sales_test ?? metricsRaw.meanSales ?? null,
            rel_rmse_pct: metricsRaw.rel_rmse_pct ?? metricsRaw.rel_rmse_pct ?? null,
            precision: metricsRaw.precision ?? null,
            recall: metricsRaw.recall ?? null,
            f1: metricsRaw.f1 ?? null,
          };
        }
      }

      model = {
        intercept: Number(json.intercept),
        betas: [Number(json.betas[0]), Number(json.betas[1]), Number(json.betas[2])],
        channelShares: [Number(json.channelShares[0]), Number(json.channelShares[1]), Number(json.channelShares[2])],
        metrics: normalizedMetrics,
      };
      // compute metrics client-side if missing (best-effort)
      if (!model.metrics || model.metrics.r2 === null) {
        try {
          await computeMetricsFromCSV(model);
        } catch (e) {
          // ignore metric compute failures
        }
      }
      return model;
    }
  } catch (e) {
    // ignore and fallback to CSV-based training
    // console.warn('Could not load model-coefs.json, falling back to CSV training', e);
  }

  const resp = await fetch('/advertising.csv');
  if (!resp.ok) throw new Error('Failed to fetch advertising.csv');
  const txt = await resp.text();
  const lines = txt.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length <= 1) throw new Error('CSV appears empty');
  const header = lines[0].split(',').map(h => h.trim());
  const rows = lines.slice(1).map(l => l.split(',').map(v => parseFloat(v)));

  const TVs: number[] = [];
  const Radios: number[] = [];
  const Newspapers: number[] = [];
  const Sales: number[] = [];

  for (const r of rows) {
    if (r.length < 4 || r.some(x => Number.isNaN(x))) continue;
    TVs.push(r[0]); Radios.push(r[1]); Newspapers.push(r[2]); Sales.push(r[3]);
  }

  const n = Sales.length;
  if (n < 10) throw new Error('Not enough data rows');

  // compute channel shares for mapping a total expense into (TV,Radio,Newspaper)
  const sumTV = TVs.reduce((a, b) => a + b, 0);
  const sumRadio = Radios.reduce((a, b) => a + b, 0);
  const sumNews = Newspapers.reduce((a, b) => a + b, 0);
  const totalChannels = sumTV + sumRadio + sumNews;
  const channelShares: [number, number, number] = [sumTV / totalChannels, sumRadio / totalChannels, sumNews / totalChannels];

  // Build X matrix with intercept
  const X: number[][] = Array.from({ length: n }, (_, i) => [1, TVs[i], Radios[i], Newspapers[i]]);
  const y: number[][] = Sales.map(s => [s]);

  const Xt = transpose(X);
  const XtX = matMul(Xt, X); // 4x4
  const XtY = matMul(Xt, y); // 4x1
  const XtXinv = invertMatrix(XtX);
  const betaMat = matMul(XtXinv, XtY); // 4x1
  const betasArray = betaMat.map(r => r[0]);

  model = {
    intercept: betasArray[0],
    betas: [betasArray[1], betasArray[2], betasArray[3]],
    channelShares,
  };

  // compute in-situ metrics (train predictions)
  try {
    const preds = X.map((row) => model!.intercept + model!.betas[0] * row[1] + model!.betas[1] * row[2] + model!.betas[2] * row[3]);
    const yTrue = Sales.slice();
    const meanY = yTrue.reduce((a, b) => a + b, 0) / yTrue.length;
    const ssRes = yTrue.reduce((s, v, i) => s + Math.pow(v - preds[i], 2), 0);
    const ssTot = yTrue.reduce((s, v) => s + Math.pow(v - meanY, 2), 0);
    const r2 = 1 - ssRes / ssTot;
    const rmse = Math.sqrt(yTrue.reduce((s, v, i) => s + Math.pow(v - preds[i], 2), 0) / yTrue.length);
    const mae = yTrue.reduce((s, v, i) => s + Math.abs(v - preds[i]), 0) / yTrue.length;
    const rel_rmse_pct = meanY !== 0 ? (rmse / meanY) * 100 : null;
    model.metrics = { r2, rmse, mae, meanSales: meanY, rel_rmse_pct };
  } catch (e) {
    // ignore
  }

  return model;
}

export function predictFromTotal(totalExpense: number, inputsAreDollars = true): number {
  if (!model) throw new Error('Model not initialized');
  // Convert total expense from dollars to dataset units if needed (dataset appears to use thousands)
  const scaledTotal = inputsAreDollars && totalExpense > 1000 ? totalExpense / 1000 : totalExpense;
  const features = model.channelShares.map(s => scaledTotal * s);
  return predictFromChannels(features[0], features[1], features[2], false);
}

export function predictFromChannels(tv: number, radio: number, newspaper: number, inputsAreDollars = true): number {
  if (!model) throw new Error('Model not initialized');
  // If inputs are dollar amounts (e.g. 50000), convert to dataset units (thousands)
  const scale = inputsAreDollars ? 1 / 1000 : 1;
  const tvScaled = tv * scale;
  const radioScaled = radio * scale;
  const newsScaled = newspaper * scale;
  const pred = model.intercept + model.betas[0] * tvScaled + model.betas[1] * radioScaled + model.betas[2] * newsScaled;
  return pred;
}

export function predictSingleChannel(channel: 'tv' | 'radio' | 'newspaper', amount: number, inputsAreDollars = true): number {
  if (!model) throw new Error('Model not initialized');
  if (channel === 'tv') return predictFromChannels(amount, 0, 0, inputsAreDollars);
  if (channel === 'radio') return predictFromChannels(0, amount, 0, inputsAreDollars);
  return predictFromChannels(0, 0, amount, inputsAreDollars);
}

export function getModelCoefficients() {
  if (!model) throw new Error('Model not initialized');
  return {
    intercept: model.intercept,
    betas: model.betas,
    channelShares: model.channelShares,
  };
}

export function getModelMetrics() {
  if (!model) throw new Error('Model not initialized');
  return model.metrics ?? { r2: null, rmse: null, mae: null, meanSales: null, rel_rmse_pct: null };
}
