import { Card } from "./ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Activity, Target, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { initModel, getModelMetrics } from "../lib/model";

const data = [
  { expense: 10000, actual: 45000, predicted: 47000 },
  { expense: 25000, actual: 105000, predicted: 102000 },
  { expense: 50000, actual: 185000, predicted: 188000 },
  { expense: 75000, actual: 265000, predicted: 262000 },
  { expense: 100000, actual: 345000, predicted: 348000 },
  { expense: 150000, actual: 515000, predicted: 512000 },
  { expense: 200000, actual: 695000, predicted: 698000 },
];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border-2 border-primary p-3 backdrop-blur-sm font-mono text-xs">
        <p className="text-secondary mb-1">Campaign: ${payload[0].payload.expense.toLocaleString()}</p>
        <p className="text-primary">Actual: ${payload[0].value.toLocaleString()}</p>
        <p className="text-accent">Predicted: ${payload[1].value.toLocaleString()}</p>
      </div>
    );
  }
  return null;
};

const DataVisualization = () => {
  const [metrics, setMetrics] = useState<any | null>(null);

  useEffect(() => {
    let mounted = true;
    initModel()
      .then(() => {
        try {
          if (mounted) setMetrics(getModelMetrics());
        } catch (e) {
          // ignore
        }
      })
      .catch(() => {
        // ignore
      });
    return () => { mounted = false; };
  }, []);

  function fmtPct(n: number | null | undefined) {
    if (n == null || !isFinite(n)) return 'N/A';
    return `${Number(n).toFixed(1)}%`;
  }

  // Compute relative MAE% if possible
  const relRmse = metrics?.rel_rmse_pct ?? null;
  const relMae = (() => {
    const mae = metrics?.mae ?? null;
    const mean = metrics?.meanSales ?? metrics?.mean_sales ?? metrics?.mean_sales_test ?? null;
    if (mae != null && mean != null && mean !== 0) return (mae / mean) * 100;
    return null;
  })();
  return (
    <section className="relative py-24 px-4 bg-gradient-to-b from-background to-card/20">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart Section */}
          <Card className="lg:col-span-2 bg-card/50 border-2 border-primary/30 backdrop-blur-sm p-6">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-primary text-xl">&gt;&gt;</span>
                <h3 className="text-2xl font-bold text-primary font-mono">Predicted vs Actual</h3>
              </div>
              <p className="text-xs text-muted-foreground font-mono">
                // Historical model performance data
              </p>
            </div>

            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
                  <XAxis 
                    dataKey="expense" 
                    stroke="hsl(var(--muted-foreground))"
                    tickFormatter={(value) => `$${value/1000}k`}
                    style={{ fontSize: '12px', fontFamily: 'monospace' }}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    tickFormatter={(value) => `$${value/1000}k`}
                    style={{ fontSize: '12px', fontFamily: 'monospace' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    wrapperStyle={{ fontSize: '12px', fontFamily: 'monospace' }}
                    iconType="circle"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="actual" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                    name="Actual Sales"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="predicted" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ fill: '#10b981', r: 4 }}
                    name="Predicted Sales"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Model Performance Metrics */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-secondary text-xl">&gt;&gt;</span>
                <h3 className="text-2xl font-bold text-primary font-mono">Model Performance</h3>
              </div>
              <p className="text-xs text-muted-foreground font-mono mb-6">
                // Statistical accuracy metrics
              </p>
            </div>

            {/* R² Score */}
            <Card className="bg-card/50 border-2 border-primary backdrop-blur-sm p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-5 h-5 text-primary" />
                    <span className="font-mono text-sm text-primary font-bold">R² Score</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">
                    // Coefficient of determination
                  </p>
                </div>
                <div className="text-3xl font-bold text-primary font-mono">0.94</div>
              </div>
            </Card>

            {/* RMSE */}
            <Card className="bg-card/50 border-2 border-accent/30 backdrop-blur-sm p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-5 h-5 text-accent" />
                    <span className="font-mono text-sm text-accent font-bold">RMSE</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">
                    // Root Mean Squared Error
                  </p>
                </div>
                <div className="text-3xl font-bold text-accent font-mono">
                  {fmtPct(relRmse)}
                </div>
              </div>
            </Card>

            {/* MAE */}
            <Card className="bg-card/50 border-2 border-primary backdrop-blur-sm p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    <span className="font-mono text-sm text-primary font-bold">MAE</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">
                    // Mean Absolute Error
                  </p>
                </div>
                <div className="text-3xl font-bold text-primary font-mono">{fmtPct(relMae)}</div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DataVisualization;
