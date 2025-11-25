const workflowSteps = [
  { id: "01", title: "DATA COLLECTION", desc: "Gather historical sales & campaign data" },
  { id: "02", title: "DATA CLEANING", desc: "Handle missing values & outliers" },
  { id: "03", title: "EDA", desc: "Identify correlations & patterns" },
  { id: "04", title: "FEATURE SELECTION", desc: "Choose significant variables" },
  { id: "05", title: "MODEL BUILDING", desc: "Train regression algorithms" },
  { id: "06", title: "EVALUATION", desc: "Validate using R² & RMSE metrics" },
  { id: "07", title: "PREDICTION", desc: "Forecast sales from new data" },
  { id: "08", title: "VISUALIZATION", desc: "Present insights via dashboards" }
];

const Workflow = () => {
  return (
    <section className="relative py-24 px-4 bg-gradient-to-b from-background to-card/20">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-secondary">WORKFLOW</span>{" "}
            <span className="text-foreground">PIPELINE</span>
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-secondary to-primary mx-auto mb-6" />
          <p className="text-muted-foreground font-mono text-sm">
            8-STAGE PROCESS // END-TO-END IMPLEMENTATION
          </p>
        </div>

        {/* Workflow Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {workflowSteps.map((step, index) => (
            <div 
              key={index}
              className="relative group"
            >
              {/* Connector line */}
              {index < workflowSteps.length - 1 && (
                <div className="hidden lg:block absolute top-8 -right-3 w-6 h-0.5 bg-gradient-to-r from-primary to-secondary z-0" />
              )}

              {/* Step card */}
              <div className="relative bg-card border-2 border-primary/30 p-6 transition-all hover:border-primary hover:-translate-y-1">
                {/* Step number */}
                <div className="text-5xl font-bold text-primary/20 mb-2 font-mono">
                  {step.id}
                </div>
                
                {/* Step title */}
                <h3 className="text-lg font-bold text-primary mb-2 font-mono">
                  {step.title}
                </h3>
                
                {/* Step description */}
                <p className="text-sm text-muted-foreground">
                  {step.desc}
                </p>

                {/* Hover indicator */}
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
              </div>
            </div>
          ))}
        </div>

        {/* Bottom indicator */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 border border-secondary/30 bg-card/50 backdrop-blur-sm font-mono text-xs">
            <span className="w-2 h-2 bg-secondary animate-pulse-glow" />
            <span className="text-secondary">AUTOMATED PIPELINE // CONTINUOUS INTEGRATION</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Workflow;
