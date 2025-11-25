import { Badge } from "./ui/badge";

const skillCategories = [
  {
    category: "PROGRAMMING",
    skills: ["Python", "NumPy", "Pandas", "Scikit-learn"],
    color: "primary"
  },
  {
    category: "DATA SCIENCE",
    skills: ["Statistical Analysis", "Regression Models", "Feature Engineering", "Cross-validation"],
    color: "secondary"
  },
  {
    category: "VISUALIZATION",
    skills: ["Matplotlib", "Seaborn", "Plotly", "Data Storytelling"],
    color: "primary"
  },
  {
    category: "ML TECHNIQUES",
    skills: ["Linear Regression", "Random Forest", "Gradient Boosting", "Hyperparameter Tuning"],
    color: "secondary"
  }
];

const Skills = () => {
  return (
    <section className="relative py-24 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-primary">SKILLS</span>{" "}
            <span className="text-foreground">REQUIRED</span>
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-primary to-secondary mx-auto mb-6" />
          <p className="text-muted-foreground font-mono text-sm">
            TECHNICAL STACK // COMPETENCIES
          </p>
        </div>

        {/* Skills Grid */}
        <div className="space-y-8">
          {skillCategories.map((category, index) => (
            <div 
              key={index}
              className="relative"
            >
              {/* Category Header */}
              <div className={`flex items-center gap-4 mb-4`}>
                <div className={`w-2 h-2 ${
                  category.color === 'primary' ? 'bg-primary' : 'bg-secondary'
                } animate-pulse-glow`} />
                <h3 className={`text-xl font-bold font-mono ${
                  category.color === 'primary' ? 'text-primary' : 'text-secondary'
                }`}>
                  {category.category}
                </h3>
                <div className={`flex-1 h-px ${
                  category.color === 'primary' 
                    ? 'bg-gradient-to-r from-primary/50 to-transparent' 
                    : 'bg-gradient-to-r from-secondary/50 to-transparent'
                }`} />
              </div>

              {/* Skills Tags */}
              <div className="flex flex-wrap gap-3">
                {category.skills.map((skill, skillIndex) => (
                  <Badge
                    key={skillIndex}
                    variant="outline"
                    className={`px-4 py-2 text-sm font-mono border-2 ${
                      category.color === 'primary'
                        ? 'border-primary/50 text-primary hover:bg-primary/10'
                        : 'border-secondary/50 text-secondary hover:bg-secondary/10'
                    } transition-all hover:scale-105`}
                  >
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom info */}
        <div className="mt-16 p-6 border-2 border-muted bg-card/30 backdrop-blur-sm">
          <div className="flex items-start gap-4">
            <div className="text-primary text-2xl font-mono">
              ⚡
            </div>
            <div>
              <h4 className="text-lg font-bold mb-2 text-primary font-mono">
                REAL-WORLD APPLICATION
              </h4>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Enables companies to optimize marketing spend, forecast sales for product launches, 
                perform ROI analysis, and make data-driven decisions for campaign strategy. 
                Applicable across e-commerce, retail, and digital marketing sectors.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Skills;
