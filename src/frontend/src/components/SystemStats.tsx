const SystemStats = () => {
  return (
    <div className="fixed top-8 left-8 space-y-2 font-mono text-xs z-50">
      <div className="bg-card/50 border border-primary/50 px-3 py-2 backdrop-blur-sm">
        <div className="text-secondary">CPU: 59%</div>
        <div className="text-primary">MEM: 63%</div>
        <div className="text-secondary">NET: 58 KB/s</div>
        <div className="text-primary">TEMP: 39°C</div>
      </div>
    </div>
  );
};

export default SystemStats;
