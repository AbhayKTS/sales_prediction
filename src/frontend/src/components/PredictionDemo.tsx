import { useEffect, useMemo, useState } from "react";
import { TrendingUp, Loader2, Sparkles, ActivitySquare } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Progress } from "./ui/progress";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "./ui/chart";
import { cn } from "../lib/utils";
import {
  initModel,
  predictFromChannels,
  getModelMetrics,
  getModelCoefficients,
} from "../lib/model";

type ChannelKey = "tv" | "radio" | "newspaper";
type ModeOption = "local" | "server";

type FormValues = Record<ChannelKey, string> & { pricePerUnit: string };

type Metrics = {
  r2?: number | null;
  test_r2?: number | null;
  rmse?: number | null;
  test_rmse?: number | null;
  mae?: number | null;
  rel_rmse_pct?: number | null;
};

type PredictionResult = {
  unitsK: number;
  roiFraction: number | null;
  revenue: number;
  expense: number;
  units: number;
  channelSpend: Record<ChannelKey, number>;
};

type Coefficients = ReturnType<typeof getModelCoefficients>;

const fieldSchema = z.object({
  tv: z
    .number({ invalid_type_error: "Required" })
    .min(0, "TV spend must be ≥ 0")
    .max(1_000_000, "TV spend too large"),
  radio: z
    .number({ invalid_type_error: "Required" })
    .min(0, "Radio spend must be ≥ 0")
    .max(1_000_000, "Radio spend too large"),
  newspaper: z
    .number({ invalid_type_error: "Required" })
    .min(0, "Newspaper spend must be ≥ 0")
    .max(1_000_000, "Newspaper spend too large"),
  pricePerUnit: z
    .number({ invalid_type_error: "Required" })
    .min(1, "Price per unit must be ≥ 1"),
});

const DEFAULT_VALUES: FormValues = {
  tv: "30000",
  radio: "12000",
  newspaper: "9000",
  pricePerUnit: "10",
};

const CHANNEL_LABELS: Record<ChannelKey, string> = {
  tv: "TV",
  radio: "Radio",
  newspaper: "Newspaper",
};

const chartConfig = {
  spend: {
    label: "Spend ($)",
    theme: { light: "#facc15", dark: "#facc15" },
  },
  impact: {
    label: "Estimated Units (k)",
    theme: { light: "#fde047", dark: "#fde047" },
  },
};

const currency = (value: number, digits = 0) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);

const numberFmt = (value: number, digits = 0) =>
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);

type ImportMetaWithEnv = ImportMeta & { env?: Record<string, string | undefined> };

const getEnvBaseUrl = () => {
  try {
    return (import.meta as ImportMetaWithEnv)?.env?.VITE_API_BASE_URL;
  } catch {
    return undefined;
  }
};

const getApiBase = () => {
  if (typeof window === "undefined") return "";
  const envBase = getEnvBaseUrl();
  const apiWindow = window as typeof window & { __API_BASE__?: string };
  const candidate =
    apiWindow.__API_BASE__ ??
    envBase ??
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
      ? "http://127.0.0.1:8000"
      : "");
  if (!candidate) return "";
  return candidate.endsWith("/") ? candidate.slice(0, -1) : candidate;
};

const parseFormNumbers = (values: FormValues) => ({
  tv: Number(values.tv) || 0,
  radio: Number(values.radio) || 0,
  newspaper: Number(values.newspaper) || 0,
  pricePerUnit: Number(values.pricePerUnit) || 0,
});

const normalizeMetrics = (raw: unknown): Metrics | null => {
  if (!raw || typeof raw !== "object") return null;
  const metrics = raw as Record<string, any>;
  if (metrics.linear && typeof metrics.linear === "object") {
    return {
      r2: metrics.linear.r2 ?? metrics.r2 ?? null,
      test_r2: metrics.linear.test_r2 ?? metrics.test_r2 ?? null,
      rmse: metrics.linear.rmse ?? metrics.rmse ?? null,
      test_rmse: metrics.linear.test_rmse ?? metrics.test_rmse ?? null,
      mae: metrics.linear.mae ?? metrics.mae ?? null,
      rel_rmse_pct: metrics.linear.rel_rmse_pct ?? metrics.rel_rmse_pct ?? null,
    };
  }

  return {
    r2: metrics.r2 ?? null,
    test_r2: metrics.test_r2 ?? null,
    rmse: metrics.rmse ?? null,
    test_rmse: metrics.test_rmse ?? null,
    mae: metrics.mae ?? null,
    rel_rmse_pct: metrics.rel_rmse_pct ?? null,
  };
};

const computeClientROI = (unitsK: number, pricePerUnit: number, expense: number) => {
  const units = unitsK * 1000;
  const revenue = units * pricePerUnit;
  const roiFraction = expense === 0 ? null : (revenue - expense) / expense;
  return { units, revenue, roiFraction, expense };
};

const PredictionDemo = () => {
  const [formValues, setFormValues] = useState<FormValues>(DEFAULT_VALUES);
  const [mode, setMode] = useState<ModeOption>("local");
  const [predictROI, setPredictROI] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [progressValue, setProgressValue] = useState(0);
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [lastDuration, setLastDuration] = useState<number | null>(null);
  const [coefficients, setCoefficients] = useState<Coefficients | null>(null);

  const numericValues = useMemo(() => parseFormNumbers(formValues), [formValues]);
  const totalExpense = numericValues.tv + numericValues.radio + numericValues.newspaper;

  useEffect(() => {
    let mounted = true;
    initModel()
      .then(() => {
        if (!mounted) return;
        toast.success("Local linear model ready");
        try {
          const modelMetrics = getModelMetrics();
          setMetrics(normalizeMetrics(modelMetrics));
          setCoefficients(getModelCoefficients());
        } catch (err) {
          console.warn("Unable to bootstrap local metrics", err);
        }
      })
      .catch((err) => {
        console.error("Model init failed", err);
        if (mounted) toast.error("Model initialization failed — server mode only");
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (mode === "local") {
      setPredictROI(false);
    }
  }, [mode]);

  useEffect(() => {
    if (status !== "loading") return;
    setProgressValue(12);
    const interval = window.setInterval(() => {
      setProgressValue((prev) => (prev >= 88 ? 88 : prev + 4));
    }, 280);
    return () => window.clearInterval(interval);
  }, [status]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (status === "success") {
      setProgressValue(100);
      const timeout = window.setTimeout(() => setProgressValue(0), 500);
      return () => window.clearTimeout(timeout);
    }
    if (status === "error" || status === "idle") {
      setProgressValue(0);
    }
    return undefined;
  }, [status]);

  const chartData = useMemo(() => {
    return (Object.keys(CHANNEL_LABELS) as ChannelKey[]).map((key, index) => {
      const spend = numericValues[key];
      const beta = coefficients?.betas?.[index] ?? 0;
      const estimatedImpact = Math.max(0, (spend / 1000) * beta);
      return {
        channel: CHANNEL_LABELS[key],
        spend,
        impact: Number(estimatedImpact.toFixed(2)),
      };
    });
  }, [numericValues, coefficients]);

  const handleFieldChange = (key: keyof FormValues, value: string) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleModeChange = (next: ModeOption) => {
    setMode(next);
    setResult(null);
    setStatus("idle");
  };

  const validateForm = () => {
    const parsed = parseFormNumbers(formValues);
    const check = fieldSchema.safeParse(parsed);
    if (!check.success) {
      const fieldErrors = check.error.flatten().fieldErrors;
      setErrors({
        tv: fieldErrors.tv?.[0],
        radio: fieldErrors.radio?.[0],
        newspaper: fieldErrors.newspaper?.[0],
        pricePerUnit: fieldErrors.pricePerUnit?.[0],
      });
      return null;
    }

    if (parsed.tv + parsed.radio + parsed.newspaper <= 0) {
      setErrors((prev) => ({ ...prev, tv: "Add at least one channel spend" }));
      return null;
    }

    setErrors({});
    return parsed;
  };

  const requestServer = async (endpoint: string, payload: Record<string, number>) => {
    const base = getApiBase();
    if (!base) {
      throw new Error("Server base URL missing. Set VITE_API_BASE_URL or window.__API_BASE__.");
    }
    const resp = await fetch(`${base}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`Server error: ${resp.status} ${body}`);
    }
    return resp.json();
  };

  const handlePredict = async () => {
    const parsed = validateForm();
    if (!parsed) return;

    const payload = {
      tv: parsed.tv,
      radio: parsed.radio,
      newspaper: parsed.newspaper,
      price_per_unit: parsed.pricePerUnit,
    };

  setStatus("loading");
  setResult(null);
  setLastDuration(null);
  const start = typeof performance !== "undefined" ? performance.now() : Date.now();

    try {
      let unitsK: number;
      let roiFraction: number | null = null;
      let latestMetrics: Metrics | null = null;

      if (mode === "server") {
        const prediction = await requestServer("/predict/channels", payload);
        const predictedValue = Number(prediction.predicted_k);
        if (!Number.isFinite(predictedValue)) {
          throw new Error("Server response did not include a valid prediction");
        }
        unitsK = predictedValue;
        latestMetrics = normalizeMetrics(prediction.metrics);

        if (predictROI) {
          const roiResponse = await requestServer("/predict/roi/channels", payload);
          if (typeof roiResponse.predicted_roi === "number") {
            roiFraction = roiResponse.predicted_roi;
          } else if (typeof roiResponse.predicted_roi_pct === "number") {
            roiFraction = roiResponse.predicted_roi_pct / 100;
          }
        }
      } else {
        const pred = predictFromChannels(parsed.tv, parsed.radio, parsed.newspaper, true);
        const predictedValue = Number(pred);
        if (!Number.isFinite(predictedValue)) {
          throw new Error("Local model returned an invalid prediction");
        }
        unitsK = predictedValue;
        roiFraction = null;
        try {
          latestMetrics = normalizeMetrics(getModelMetrics());
        } catch (err) {
          console.warn("Unable to read client metrics", err);
        }
      }

      const roi = computeClientROI(unitsK, parsed.pricePerUnit, parsed.tv + parsed.radio + parsed.newspaper);
      const finalRoi = roiFraction ?? roi.roiFraction ?? null;
      setMetrics(latestMetrics);
      setResult({
        unitsK,
        roiFraction: finalRoi,
        revenue: roi.revenue,
        expense: roi.expense,
        units: roi.units,
        channelSpend: { tv: parsed.tv, radio: parsed.radio, newspaper: parsed.newspaper },
      });
  const end = typeof performance !== "undefined" ? performance.now() : Date.now();
  setStatus("success");
  setLastDuration((end - start) / 1000);
      toast.success("Prediction complete");
    } catch (err) {
      console.error(err);
      setStatus("error");
      toast.error(err instanceof Error ? err.message : "Prediction failed");
    }
  };

  const resetForm = () => {
    setFormValues(DEFAULT_VALUES);
    setResult(null);
    setErrors({});
    setStatus("idle");
    setProgressValue(0);
    setPredictROI(false);
  };

  const predictedUnits = result?.unitsK ?? null;
  const roiPercent = result?.roiFraction != null ? result.roiFraction * 100 : null;

  const statBlocks = [
    {
      label: "Predicted Sales",
      value: predictedUnits != null ? `${predictedUnits.toFixed(2)}k` : "—",
      helper: predictedUnits != null ? `${numberFmt((predictedUnits ?? 0) * 1000, 0)} units` : "Awaiting run",
    },
    {
      label: "Projected Revenue",
      value: result ? currency(result.revenue, 0) : "—",
      helper: result ? `Expense: ${currency(result.expense, 0)}` : "Tied to your spend",
    },
    {
      label: "ROI",
      value: roiPercent != null ? `${roiPercent.toFixed(1)}%` : "—",
      helper: roiPercent != null ? "Server ROI" : "Local ROI estimate",
    },
  ];

  return (
    <section className="relative py-24 px-4 bg-gradient-to-b from-card/10 to-background">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="h-full bg-card/60 border-primary/20 border backdrop-blur">
            <div className="flex items-center gap-3 border-b border-border/50 px-8 py-6">
              <TrendingUp className="w-6 h-6 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-[0.25em] font-mono">
                  Campaign inputs
                </p>
                <h3 className="text-2xl font-semibold">Allocate your budget</h3>
              </div>
            </div>

            <div className="p-8 space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {(Object.keys(CHANNEL_LABELS) as ChannelKey[]).map((key) => (
                  <div key={key} className="space-y-2">
                    <Label htmlFor={key} className="text-xs text-muted-foreground font-semibold">
                      {CHANNEL_LABELS[key]}
                    </Label>
                    <Input
                      id={key}
                      type="number"
                      inputMode="decimal"
                      value={formValues[key]}
                      onChange={(event) => handleFieldChange(key, event.target.value)}
                      className={cn(
                        "h-12 font-mono",
                        errors[key] ? "border-destructive focus-visible:ring-destructive" : "",
                      )}
                    />
                    {errors[key] && (
                      <p className="text-xs text-destructive">{errors[key]}</p>
                    )}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pricePerUnit" className="text-xs text-muted-foreground font-semibold">
                    Price per unit ($)
                  </Label>
                  <Input
                    id="pricePerUnit"
                    type="number"
                    inputMode="decimal"
                    value={formValues.pricePerUnit}
                    onChange={(event) => handleFieldChange("pricePerUnit", event.target.value)}
                    className={cn(
                      "h-12 font-mono",
                      errors.pricePerUnit ? "border-destructive focus-visible:ring-destructive" : "",
                    )}
                  />
                  {errors.pricePerUnit && (
                    <p className="text-xs text-destructive">{errors.pricePerUnit}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground font-semibold">Mode</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {["local", "server"].map((option) => (
                      <Button
                        key={option}
                        type="button"
                        variant={mode === option ? "default" : "outline"}
                        className="h-12"
                        onClick={() => handleModeChange(option as ModeOption)}
                      >
                        {option === "local" ? "Local" : "Server"}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 border border-border/50 rounded-lg p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">Use ROI model</p>
                    <p className="text-xs text-muted-foreground">
                      Server-side ROI predictions include ensemble adjustments.
                    </p>
                  </div>
                  <Switch
                    checked={predictROI}
                    onCheckedChange={(checked) => setPredictROI(Boolean(checked))}
                    disabled={mode === "local"}
                  />
                </div>
                <p className="text-xs font-mono text-muted-foreground">
                  Total spend: ${numberFmt(totalExpense, 0)}
                </p>
              </div>

              {status === "loading" && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-primary">
                    <Loader2 className="w-4 h-4 animate-spin" /> calibrating ensemble
                  </div>
                  <Progress value={progressValue} className="h-2" />
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handlePredict}
                  disabled={status === "loading"}
                  className="flex-1 h-12 text-lg font-semibold"
                >
                  {status === "loading" ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Running
                    </span>
                  ) : (
                    "Run prediction"
                  )}
                </Button>
                <Button type="button" variant="ghost" onClick={resetForm} disabled={status === "loading"}>
                  Reset
                </Button>
              </div>
            </div>
          </Card>

          <Card className="h-full bg-card/60 border-primary/20 border backdrop-blur">
            <div className="flex items-center gap-3 border-b border-border/50 px-8 py-6">
              <Sparkles className="w-6 h-6 text-secondary" />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-[0.25em] font-mono">
                  Insights
                </p>
                <h3 className="text-2xl font-semibold">Live prediction dashboard</h3>
              </div>
            </div>

            <div className="p-8 space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {statBlocks.map((stat) => (
                  <div key={stat.label} className="rounded-xl border border-border/60 bg-card/40 p-4 space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                    <p className="text-2xl font-semibold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.helper}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-border/60 p-5 bg-background/40">
                <div className="flex items-center gap-2 mb-4">
                  <ActivitySquare className="w-4 h-4 text-primary" />
                  <p className="text-sm font-semibold">Channel insight</p>
                </div>
                <ChartContainer config={chartConfig} className="w-full min-h-[260px]">
                  <BarChart data={chartData} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="channel" tickLine={false} axisLine={false} />
                    <YAxis yAxisId="left" tickLine={false} axisLine={false} width={40} />
                    <YAxis yAxisId="right" orientation="right" hide />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="spend" yAxisId="left" fill="var(--color-spend)" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="impact" yAxisId="right" fill="var(--color-impact)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ChartContainer>
                <p className="text-xs text-muted-foreground mt-3">
                  Impact uses the current linear coefficients to approximate marginal lift per channel.
                </p>
              </div>

              <div className="rounded-2xl border border-border/60 p-5 bg-background/40 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">Model telemetry</p>
                    <p className="text-xs text-muted-foreground">Fresh metrics from the selected engine.</p>
                  </div>
                  {lastDuration && (
                    <span className="text-xs text-muted-foreground font-mono">{lastDuration.toFixed(2)}s</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs uppercase">R²</p>
                    <p className="text-lg font-semibold">{metrics?.test_r2?.toFixed(3) ?? metrics?.r2?.toFixed(3) ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs uppercase">RMSE</p>
                    <p className="text-lg font-semibold">{metrics?.test_rmse?.toFixed(2) ?? metrics?.rmse?.toFixed(2) ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs uppercase">MAE</p>
                    <p className="text-lg font-semibold">{metrics?.mae?.toFixed(2) ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs uppercase">Rel. RMSE</p>
                    <p className="text-lg font-semibold">
                      {metrics?.rel_rmse_pct != null ? `${metrics.rel_rmse_pct.toFixed(1)}%` : "—"}
                    </p>
                  </div>
                </div>
              </div>

              {!result && status === "idle" && (
                <div className="rounded-2xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
                  Run a prediction to view ROI, revenue, and per-channel diagnostics.
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="mt-8 p-4 border border-dashed border-border/50 rounded-xl text-center text-xs font-mono text-muted-foreground uppercase tracking-[0.4em]">
          Real-time prediction engine // Powered by FastAPI + Vite
        </div>
      </div>
    </section>
  );
};

export default PredictionDemo;
