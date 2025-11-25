import { Card } from "./ui/card";

const features = [
  {
    title: "DATA PREPROCESSING",
    description: "Advanced cleaning and preparation of historical sales data with outlier detection",
    color: "primary"
  },
  {
    title: "EXPLORATORY ANALYSIS",
    description: "Deep dive into spending-sales correlations and market trend identification",
    color: "secondary"
  },
  {
    title: "ML ALGORITHMS",
    description: "Implementation of regression models including Linear, Random Forest, and Neural Networks",
    color: "primary"
  },
  {
    title: "MODEL EVALUATION",
    description: "Rigorous testing using R², RMSE, and cross-validation techniques",
    color: "secondary"
  },
  {
    title: "VISUALIZATION",
    description: "Interactive charts comparing predicted vs actual sales performance",
    color: "primary"
  },
  {
    title: "FORECASTING",
    description: "Real-time predictions for future campaigns with confidence intervals",
    color: "secondary"
  }
];

const Features = () => {
  return (
    <section className="relative py-24 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-primary">KEY</span>{" "}
            <span className="text-foreground">FEATURES</span>
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-primary to-secondary mx-auto" />
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card 
              key={index}
              className={`relative p-6 bg-card/50 border-2 ${
                feature.color === 'primary' 
                  ? 'border-primary/50 hover:border-primary' 
                  : 'border-secondary/50 hover:border-secondary'
              } backdrop-blur-sm transition-all hover:shadow-lg hover:scale-105 group`}
            >
              {/* Corner accent */}
              <div className={`absolute top-0 left-0 w-3 h-3 ${
                feature.color === 'primary' ? 'bg-primary' : 'bg-secondary'
              }`} />
              <div className={`absolute bottom-0 right-0 w-3 h-3 ${
                feature.color === 'primary' ? 'bg-primary' : 'bg-secondary'
              }`} />

              {/* Content */}
              <div className="relative">
                <div className={`font-mono text-xs mb-2 ${
                  feature.color === 'primary' ? 'text-primary' : 'text-secondary'
                }`}>
                  [{String(index + 1).padStart(2, '0')}]
                </div>
                <h3 className="text-xl font-bold mb-3 font-mono group-hover:glitch-text">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
