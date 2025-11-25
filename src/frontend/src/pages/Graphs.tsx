import React, { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const chartData = [
  { expense: 10000, actual: 45000, predicted: 47000 },
  { expense: 25000, actual: 105000, predicted: 102000 },
  { expense: 50000, actual: 185000, predicted: 188000 },
  { expense: 75000, actual: 265000, predicted: 262000 },
  { expense: 100000, actual: 345000, predicted: 348000 },
  { expense: 150000, actual: 515000, predicted: 512000 },
  { expense: 200000, actual: 695000, predicted: 698000 },
];

export default function Graphs() {
  const available = useMemo(() => ({
    // expected plot filenames under public/plots
    heatmap: "/plots/heatmap.png",
    pairplot: "/plots/residuals_hist.png",
    rf_actual: "/plots/actual_vs_predicted.png",
    feature_importances: "/plots/feature_importances.png",
  }), []);

  const [missing, setMissing] = useState<Record<string, boolean>>({});
  function onImgError(key: string) {
    setMissing(prev => ({ ...prev, [key]: true }));
  }

  // Pre-check that expected plot files exist (so we can render notebook-generated images when present)
  React.useEffect(() => {
    const keys = Object.keys(available) as Array<keyof typeof available>;
    keys.forEach((k) => {
      const url = available[k];
      // try HEAD first
      fetch(url, { method: 'HEAD' })
        .then((res) => {
          if (!res.ok) setMissing(prev => ({ ...prev, [k]: true }));
        })
        .catch(() => {
          // fallback: try GET (some static servers don't allow HEAD)
          fetch(url)
            .then(r => { if (!r.ok) setMissing(prev => ({ ...prev, [k]: true })); })
            .catch(() => setMissing(prev => ({ ...prev, [k]: true })));
        });
    });
  }, [available]);

  return (
    <main className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-mono text-primary mb-6">Graphs & Diagnostics</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="p-4">
          <h2 className="font-mono text-lg text-primary mb-2">Correlation Heatmap</h2>
          <p className="text-xs text-muted-foreground font-mono mb-3">// Correlation between spend and sales</p>
          {!missing.heatmap ? (
            <img src={available.heatmap} alt="Correlation heatmap" className="w-full h-auto border" onError={() => onImgError('heatmap')} />
          ) : (
            <div className="text-sm text-muted-foreground font-mono">Heatmap image not found at <code>{available.heatmap}</code></div>
          )}
        </Card>

        <Card className="p-4">
          <h2 className="font-mono text-lg text-primary mb-2">Residuals / Pairplots</h2>
          <p className="text-xs text-muted-foreground font-mono mb-3">// Residual distribution and pairwise diagnostics</p>
          {!missing.pairplot ? (
            <img src={available.pairplot} alt="Pairplot / residuals" className="w-full h-auto border" onError={() => onImgError('pairplot')} />
          ) : (
            <div className="text-sm text-muted-foreground font-mono">Plot not found at <code>{available.pairplot}</code></div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="p-4">
          <h2 className="font-mono text-lg text-primary mb-2">Random Forest: Actual vs Predicted</h2>
          <p className="text-xs text-muted-foreground font-mono mb-3">// Test set predictions</p>
          {!missing.rf_actual ? (
            <img src={available.rf_actual} alt="RF actual vs predicted" className="w-full h-auto border" onError={() => onImgError('rf_actual')} />
          ) : (
            <div className="text-sm text-muted-foreground font-mono">Plot not found at <code>{available.rf_actual}</code></div>
          )}
        </Card>

        <Card className="p-4">
          <h2 className="font-mono text-lg text-primary mb-2">Feature Importances</h2>
          <p className="text-xs text-muted-foreground font-mono mb-3">// Which channel drives the most sales</p>
          <img src={available.feature_importances} alt="Feature importances" className="w-full h-auto border" />
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="font-mono text-lg text-primary mb-2">Interactive: Predicted vs Actual (by campaign expense)</h2>
        <div style={{ width: "100%", height: 360 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
              <XAxis dataKey="expense" tickFormatter={(v) => `$${v / 1000}k`} />
              <YAxis tickFormatter={(v) => `$${v / 1000}k`} />
              <Tooltip formatter={(value: any) => `${Number(value).toLocaleString()}`} />
              <Legend />
              <Line type="monotone" dataKey="actual" stroke="hsl(var(--primary))" name="Actual Sales" />
              <Line type="monotone" dataKey="predicted" stroke="#10b981" name="Predicted Sales" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </main>
  );
}
