import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { TrendingUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { initModel, predictFromChannels, getModelMetrics } from "../lib/model";

const getApiBase = () => {
  if (typeof window === "undefined") return "";
  const candidate =
    (window as any)["__API_BASE__"] ??
    import.meta.env.VITE_API_BASE_URL ??
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
      ? "http://127.0.0.1:8000"
      : "");
  if (!candidate) return "";
  return typeof candidate === "string" && candidate.endsWith("/") ? candidate.slice(0, -1) : candidate;
};

const PredictionDemo = () => {
  const [tvAmount, setTvAmount] = useState("30000");
  const [radioAmount, setRadioAmount] = useState("10000");
  const [newspaperAmount, setNewspaperAmount] = useState("10000");
  const [useServer, setUseServer] = useState(false); // false = local linear model, true = call server RF
  const [predictROI, setPredictROI] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [prediction, setPrediction] = useState<number | null>(null);
  const [predictedROI, setPredictedROI] = useState<number | null>(null); // fraction (e.g. 2.61 => 261%)
  const [metrics, setMetrics] = useState<any | null>(null);
  const DEFAULT_PRICE_PER_UNIT = 10; // default price per unit (currency)

  const handlePredict = async () => {
    const tvNum = parseFloat(tvAmount) || 0;
    const radioNum = parseFloat(radioAmount) || 0;
    const newspaperNum = parseFloat(newspaperAmount) || 0;
    const totalExpense = tvNum + radioNum + newspaperNum;
    if (isNaN(totalExpense) || totalExpense <= 0) {
      toast.error("Please enter positive amounts for TV, Radio or Newspaper");
      return;
    }

    setIsLoading(true);
    setPrediction(null);

    try {
      if (useServer) {
  const base = getApiBase();
        if (predictROI) {
          // Call server ROI endpoint (channel-level)
          const payload: any = { tv: tvNum, radio: radioNum, newspaper: newspaperNum, price_per_unit: DEFAULT_PRICE_PER_UNIT };
          const resp = await fetch(`${base}/predict/roi/channels`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
          if (!resp.ok) {
            const txt = await resp.text();
            throw new Error(`Server error: ${resp.status} ${txt}`);
          }
          const json = await resp.json();
          const roiFrac = json.predicted_roi != null ? Number(json.predicted_roi) : (json.predicted_roi_pct != null ? Number(json.predicted_roi_pct) / 100.0 : NaN);
          if (Number.isNaN(roiFrac)) throw new Error('Invalid ROI response from server');
          setPredictedROI(Number(roiFrac));
          setMetrics(json.metrics ?? null);
          setIsLoading(false);
          toast.success('Server ROI prediction completed');
          return;
        }

        // Regular channel-level prediction (server)
        const payload: any = { tv: tvNum, radio: radioNum, newspaper: newspaperNum, price_per_unit: DEFAULT_PRICE_PER_UNIT };
  const resp = await fetch(`${base}/predict/channels`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });
        if (!resp.ok) {
          const txt = await resp.text();
          throw new Error(`Server error: ${resp.status} ${txt}`);
        }
        const json = await resp.json();
        const predK = Number(json.predicted_k ?? json.predicted_k?.toString?.() ?? null) || Number(json.predicted_k === 0 ? 0 : NaN);
        if (Number.isNaN(predK)) throw new Error('Invalid response from prediction server');
        setPrediction(predK);
        setMetrics(json.metrics ?? null);
        setIsLoading(false);
        toast.success('Server prediction completed');
      } else {
        // Local prediction using per-channel inputs
        const pred = predictFromChannels(tvNum, radioNum, newspaperNum, true);
        setTimeout(() => {
          setPrediction(Number(pred));
          setPredictedROI(null);
          try { setMetrics(getModelMetrics()); } catch (e) { /* ignore */ }
          setIsLoading(false);
          toast.success("Prediction completed successfully");
        }, 400);
      }
    } catch (err) {
      setIsLoading(false);
      toast.error((err as Error).message || "Prediction failed");
    }
  };

  useEffect(() => {
    // initialize model on mount
    let mounted = true;
    initModel()
      .then(() => {
        if (mounted) toast.success('Model initialized');
        // fetch metrics
        try {
          const m = getModelMetrics();
          if (mounted) setMetrics(m);
        } catch (e) {
          // ignore
        }
      })
      .catch((e) => {
        console.error('Model init failed', e);
        if (mounted) toast.error('Model initialization failed — using fallback');
      });
    return () => { mounted = false; };
  }, []);

  return (
    <section className="relative py-24 px-4 bg-gradient-to-b from-card/20 to-background">
      <div className="max-w-7xl mx-auto">
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          {/* Input Section */}
          <Card className="bg-card/50 border-2 border-primary/30 backdrop-blur-sm p-8 h-full">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-6 h-6 text-accent" />
                <h3 className="text-2xl font-bold text-accent font-mono">&gt; Campaign Input</h3>
              </div>
              <p className="text-xs text-muted-foreground font-mono">
                // Enter marketing campaign budget
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <Label className="text-primary font-mono text-sm mb-3 block">&gt;&gt; Channel Expenses ($)</Label>
                <div className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-4">
                    <Label htmlFor="tv" className="text-xs text-muted-foreground font-mono mb-2">TV</Label>
                    <Input id="tv" type="number" value={tvAmount} onChange={(e) => setTvAmount(e.target.value)} className="w-full bg-background border-2 border-primary/50 text-foreground font-mono text-lg h-12" />
                  </div>
                  <div className="col-span-4">
                    <Label htmlFor="radio" className="text-xs text-muted-foreground font-mono mb-2">Radio</Label>
                    <Input id="radio" type="number" value={radioAmount} onChange={(e) => setRadioAmount(e.target.value)} className="w-full bg-background border-2 border-primary/50 text-foreground font-mono text-lg h-12" />
                  </div>
                  <div className="col-span-4">
                    <Label htmlFor="newspaper" className="text-xs text-muted-foreground font-mono mb-2">Newspaper</Label>
                    <Input id="newspaper" type="number" value={newspaperAmount} onChange={(e) => setNewspaperAmount(e.target.value)} className="w-full bg-background border-2 border-primary/50 text-foreground font-mono text-lg h-12" />
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-2 items-center mt-3">
                  <div className="col-span-8">
                    <p className="text-xs text-muted-foreground font-mono">Enter channel-level budgets in dollars. Values will be scaled to dataset units (thousands) automatically.</p>
                  </div>
                  <div className="col-span-4">
                    <label className="sr-only">Model</label>
                    <select value={useServer ? 'server' : 'local'} onChange={(e) => setUseServer(e.target.value === 'server')}
                      className="w-full h-12 bg-card/50 border-2 border-primary/50 text-foreground font-mono px-3">
                      <option value="local">Local (Linear)</option>
                      <option value="server">Server (RandomForest)</option>
                    </select>
                  </div>
                </div>

                <div className="mt-2 text-xs text-muted-foreground font-mono">
                  Entered total: ${Number((parseFloat(tvAmount || '0') + parseFloat(radioAmount || '0') + parseFloat(newspaperAmount || '0')) || 0).toLocaleString()}
                </div>
              </div>

              <Button
                onClick={handlePredict}
                disabled={isLoading}
                className="w-full h-14 text-lg font-mono bg-primary hover:bg-primary/80 text-primary-foreground border-2 border-primary transition-all hover:shadow-[0_0_20px_rgba(0,255,255,0.5)]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    PROCESSING...
                  </>
                ) : (
                  "&gt;&gt; Execute Prediction"
                )}
              </Button>

              {prediction && (
                <div className="mt-6 p-6 border-2 border-accent bg-accent/10 animate-fade-in">
                  <div className="text-sm text-accent font-mono mb-2">
                    &gt;&gt; PREDICTED SALES
                  </div>
                  <div className="text-4xl font-bold text-accent font-mono">
                    {prediction !== null ? `${prediction.toFixed(2)}k units` : '—'}
                  </div>
                  <div className="mt-3 text-sm text-muted-foreground font-mono">
                    {prediction !== null && (
                      <>
                        (~{Math.round(prediction * 1000).toLocaleString()} units)
                        <br />
                        R² — Linear: {metrics?.linear?.r2 != null ? metrics.linear.r2.toFixed(3) : metrics?.r2 != null ? metrics.r2.toFixed(3) : 'N/A'}; RF: {metrics?.random_forest?.r2 != null ? metrics.random_forest.r2.toFixed(3) : 'N/A'}
                        <br />
                        F1 — Linear: {metrics?.linear?.f1 != null ? Number(metrics.linear.f1).toFixed(3) : metrics?.f1 != null ? Number(metrics.f1).toFixed(3) : 'N/A'}; RF: {metrics?.random_forest?.f1 != null ? Number(metrics.random_forest.f1).toFixed(3) : 'N/A'}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Visualization/Info Section */}
          <Card className="bg-card/50 border-2 border-primary/30 backdrop-blur-sm p-8 flex items-center justify-center h-full">
            <div className="text-center">
              {!prediction && !isLoading && (
                <div className="space-y-6">
                  <div className="w-full h-48 bg-primary/10 border-2 border-primary/30 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-6xl text-primary mb-4 font-mono">&gt;_</div>
                      <div className="text-primary text-xl font-mono font-bold">
                        INITIALIZE PREDICTION SYSTEM
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground font-mono">
                        {prediction !== null && (
                          <>
                            (~{Math.round(prediction * 1000).toLocaleString()} units)
                            <br />
                            Confidence: {metrics?.r2 != null ? `${Math.round(metrics.r2 * 100)}%` : 'N/A'} // Model: Linear Regression
                          </>
                        )}
                        {predictedROI !== null && (
                          <>
                            Predicted ROI: {`${(predictedROI * 100).toFixed(1)}%`}
                            <br />
                            R² — Linear: {metrics?.linear?.r2 != null ? metrics.linear.r2.toFixed(3) : metrics?.r2 != null ? metrics.r2.toFixed(3) : 'N/A'}; RF: {metrics?.random_forest?.r2 != null ? metrics.random_forest.r2.toFixed(3) : 'N/A'}
                            <br />
                            F1 — Linear: {metrics?.linear?.f1 != null ? Number(metrics.linear.f1).toFixed(3) : metrics?.f1 != null ? Number(metrics.f1).toFixed(3) : 'N/A'}; RF: {metrics?.random_forest?.f1 != null ? Number(metrics.random_forest.f1).toFixed(3) : 'N/A'}
                          </>
                        )}
                  </p>
                  <div className="w-full h-48 bg-primary/10 border-2 border-primary/30 flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto mb-4" />
                      <div className="text-primary text-xl font-mono font-bold">
                        COMPUTING PREDICTION...
                      </div>
                      <div className="text-xs text-muted-foreground font-mono mt-2">
                        Analyzing model parameters
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {prediction && !isLoading && (
                <div className="space-y-6 animate-fade-in">
                  <div className="w-full p-8 bg-accent/10 border-2 border-accent">
                    <div className="text-6xl font-bold text-accent font-mono mb-4">
                      ✓
                    </div>
                    <div className="text-2xl text-accent font-mono font-bold mb-2">
                      PREDICTION COMPLETE
                    </div>
                    <div className="text-sm text-muted-foreground font-mono">
                      Model confidence: 94% // Execution time: 1.2s
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-left">
                    <div className="border border-primary/30 bg-card/30 p-4">
                      <div className="text-xs text-primary font-mono mb-1">ROI</div>
                        <div className="text-sm text-muted-foreground font-mono mb-2">ROI (using default price per unit)</div>
                        <div className="text-xl font-bold text-foreground font-mono">
                          {(() => {
                            const expenseNum = (parseFloat(tvAmount || '0') + parseFloat(radioAmount || '0') + parseFloat(newspaperAmount || '0')) || 0;
                            const priceNum = DEFAULT_PRICE_PER_UNIT;
                            if (!prediction || isNaN(expenseNum) || expenseNum <= 0) return 'N/A';
                            // prediction is in thousands of units; convert to units
                            const units = (prediction ?? 0) * 1000;
                            const revenue = units * priceNum;
                            const roi = ((revenue - expenseNum) / expenseNum) * 100;
                            return `${roi.toFixed(1)}%`;
                          })()}
                        </div>
                    </div>
                    <div className="border border-primary/30 bg-card/30 p-4">
                        <div className="text-xs text-primary font-mono mb-1">RMSE</div>
                        <div className="text-sm text-muted-foreground font-mono mb-2">Absolute / Relative</div>
                        <div className="text-xl font-bold text-foreground font-mono">
                          {metrics ? (
                            (() => {
                              const rmse = metrics.rmse ?? metrics.linear?.rmse ?? metrics.random_forest?.rmse;
                              const rel = metrics.rel_rmse_pct ?? metrics.linear?.rel_rmse_pct ?? metrics.random_forest?.rel_rmse_pct;
                              if (rmse != null) return `${Number(rmse).toFixed(2)} (±${rel != null ? Number(rel).toFixed(1) + '%' : 'N/A'})`;
                              return 'N/A';
                            })()
                          ) : 'N/A'}
                        </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Info banner */}
        <div className="mt-8 p-4 border-2 border-secondary/30 bg-card/30 backdrop-blur-sm">
          <div className="flex items-center justify-center gap-2 text-sm font-mono">
            <span className="w-2 h-2 bg-secondary animate-pulse-glow" />
            <span className="text-secondary">REAL-TIME PREDICTION ENGINE</span>
            <span className="text-muted-foreground">// POWERED BY MACHINE LEARNING</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PredictionDemo;
