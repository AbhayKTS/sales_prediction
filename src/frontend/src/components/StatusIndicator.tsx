const StatusIndicator = () => {
  return (
    <div className="fixed bottom-8 right-8 space-y-1 font-mono text-xs text-right z-50">
      <div className="text-secondary">PWR: 96%</div>
      <div className="text-primary">SIG: -40 dBm</div>
      <div className="text-secondary">LAT: 54ms</div>
      <div className="text-primary">ERR: 0</div>
    </div>
  );
};

export default StatusIndicator;
