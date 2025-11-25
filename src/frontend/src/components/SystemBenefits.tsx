import { Card } from "./ui/card";
import { Target, TrendingUp, BarChart3 } from "lucide-react";

const benefits = [
  {
    title: "ACCURATE PREDICTIONS",
    description: "Advanced regression models trained on historical data for reliable forecasts",
    icon: Target,
    color: "primary",
    bgColor: "bg-blue-600"
  },
  {
    title: "ROI OPTIMIZATION",
    description: "Maximize return on investment by identifying optimal spending levels",
    icon: TrendingUp,
    color: "accent",
    bgColor: "bg-green-500"
  },
  {
    title: "VISUAL INSIGHTS",
    description: "Interactive charts and metrics for comprehensive analysis",
    icon: BarChart3,
    color: "primary",
    bgColor: "bg-blue-600"
  }
];

const SystemBenefits = () => {
  return (
    <section className="relative py-16 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-primary text-xl">&gt;&gt;</span>
            <h3 className="text-3xl font-bold text-primary font-mono">SYSTEM WORKFLOW</h3>
          </div>
          <div className="w-full h-1 bg-gradient-to-r from-primary via-secondary to-transparent" />
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {benefits.map((benefit, index) => (
            <Card
              key={index}
              className={`bg-card/50 border-2 ${
                benefit.color === 'primary' ? 'border-primary/50' : 'border-accent/50'
              } backdrop-blur-sm p-6 hover:scale-105 transition-all group`}
            >
              {/* Icon */}
              <div className="mb-4">
                <div className={`w-16 h-16 ${benefit.bgColor} flex items-center justify-center`}>
                  <benefit.icon className="w-8 h-8 text-white" />
                </div>
              </div>

              {/* Title */}
              <h4 className={`text-xl font-bold font-mono mb-3 ${
                benefit.color === 'primary' ? 'text-primary' : 'text-accent'
              }`}>
                {benefit.title}
              </h4>

              {/* Description */}
              <p className="text-sm text-muted-foreground leading-relaxed">
                <span className="text-primary">&gt;</span> {benefit.description}
              </p>

              {/* Bottom accent line */}
              <div className={`mt-4 h-1 w-0 group-hover:w-full transition-all duration-300 ${
                benefit.color === 'primary' ? 'bg-primary' : 'bg-accent'
              }`} />
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SystemBenefits;
