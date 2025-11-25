const Objective = () => {
  return (
    <section className="relative py-24 px-4 bg-gradient-to-b from-card/20 to-background">
      <div className="max-w-4xl mx-auto">
        {/* Main objective card */}
        <div className="relative border-2 border-primary/50 bg-card/50 backdrop-blur-sm p-8 md:p-12">
          {/* Corner decorations */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary" />
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary" />
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-secondary" />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-secondary" />

          {/* Content */}
          <div className="relative">
            {/* Label */}
            <div className="inline-block px-3 py-1 mb-6 border border-primary/30 bg-primary/10 font-mono text-xs text-primary">
              PROJECT OBJECTIVE
            </div>

            {/* Title */}
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">
              Develop a <span className="text-primary">predictive model</span> that accurately 
              estimates future sales based on varying levels of{" "}
              <span className="text-secondary">campaigning expenses</span>
            </h2>

            {/* Description */}
            <p className="text-lg text-muted-foreground leading-relaxed mb-8">
              Enable businesses to optimize their marketing strategy through data-driven insights 
              and accurate forecasting of sales performance relative to advertising investment.
            </p>

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="border-l-2 border-primary pl-4">
                <div className="text-2xl font-bold text-primary font-mono">95%+</div>
                <div className="text-sm text-muted-foreground">Target Accuracy</div>
              </div>
              <div className="border-l-2 border-secondary pl-4">
                <div className="text-2xl font-bold text-secondary font-mono">&lt; 5%</div>
                <div className="text-sm text-muted-foreground">RMSE Target</div>
              </div>
              <div className="border-l-2 border-primary pl-4">
                <div className="text-2xl font-bold text-primary font-mono">Real-time</div>
                <div className="text-sm text-muted-foreground">Prediction Speed</div>
              </div>
            </div>
          </div>
        </div>

        {/* Impact indicators */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-primary/30 bg-card/30 p-4 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-primary animate-pulse-glow" />
              <div>
                <div className="font-mono text-sm text-primary mb-1">BUSINESS IMPACT</div>
                <div className="text-xs text-muted-foreground">
                  Optimize budget allocation and maximize ROI
                </div>
              </div>
            </div>
          </div>
          <div className="border border-secondary/30 bg-card/30 p-4 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-secondary animate-pulse-glow" />
              <div>
                <div className="font-mono text-sm text-secondary mb-1">STRATEGIC VALUE</div>
                <div className="text-xs text-muted-foreground">
                  Data-driven decision making for campaigns
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Objective;
