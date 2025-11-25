import SystemStats from "@/components/SystemStats";
import StatusIndicator from "@/components/StatusIndicator";
import SessionID from "@/components/SessionID";
import CornerDecoration from "@/components/CornerDecoration";
import Hero from "@/components/Hero";
import Objective from "@/components/Objective";
import Features from "@/components/Features";
import Workflow from "@/components/Workflow";
import Skills from "@/components/Skills";
import DataVisualization from "@/components/DataVisualization";
import SystemBenefits from "@/components/SystemBenefits";
import PredictionDemo from "@/components/PredictionDemo";

const Index = () => {
  return (
    <div className="min-h-screen bg-background relative">
      {/* Decorative elements */}
      <SystemStats />
      <StatusIndicator />
      <SessionID />
      <CornerDecoration />
      
      {/* Main content */}
      <main>
        <Hero />
        <Objective />
        <Features />
        <DataVisualization />
        <SystemBenefits />
        <PredictionDemo />
        <Workflow />
        <Skills />
      </main>

      {/* Footer */}
      <footer className="border-t border-primary/30 py-8 mt-24">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="font-mono text-xs text-muted-foreground">
            <span className="text-primary">●</span> MACHINE LEARNING PROJECT // 2025
            <span className="mx-4">|</span>
            SALES PREDICTION ENGINE
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
