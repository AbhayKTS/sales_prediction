import { Button } from "./ui/button";
import { Link } from "react-router-dom";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
      {/* Background grid pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3lhbiIgb3BhY2l0eT0iMC4xIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20" />
      
      {/* Scan line animation */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-full h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-scan-line opacity-30" />
      </div>

      <div className="relative z-10 text-center max-w-5xl">
        {/* Subtitle */}
        <div className="mb-4 text-secondary font-mono text-sm tracking-widest uppercase">
          Machine Learning Project // 2025
        </div>

        {/* Main Title */}
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 glitch-text">
          <span className="text-primary">SALES</span>{" "}
          <span className="text-foreground">PREDICTION</span>
        </h1>

        {/* Tagline */}
        <p className="text-xl md:text-2xl text-secondary font-mono mb-8 tracking-wide">
          BASED ON CAMPAIGNING EXPENSES
        </p>

        {/* Description */}
        <div className="max-w-3xl mx-auto mb-10 space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            Machine learning model that predicts sales figures by analyzing marketing campaign expenditure.
            Data-driven insights for optimal budget allocation and ROI maximization.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link to="/graphs">
            <Button 
              className="bg-primary hover:bg-primary/80 text-primary-foreground px-8 py-6 text-lg font-mono border-2 border-primary transition-all hover:shadow-[0_0_20px_rgba(0,255,255,0.5)]"
            >
              EXPLORE GRAPHS
            </Button>
          </Link>
          <a href="/advertising.csv" target="_blank" rel="noopener noreferrer">
            <Button 
              variant="outline"
              className="bg-transparent border-2 border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground px-8 py-6 text-lg font-mono transition-all hover:shadow-[0_0_20px_rgba(255,215,0,0.5)]"
            >
              VIEW DOCS
            </Button>
          </a>
        </div>

        {/* Tech badge */}
        <div className="mt-12 inline-block px-4 py-2 border border-primary/30 bg-card/50 backdrop-blur-sm font-mono text-xs">
          <span className="text-primary">●</span> PYTHON • SCIKIT-LEARN • PANDAS • MATPLOTLIB
        </div>
      </div>
    </section>
  );
};

export default Hero;
