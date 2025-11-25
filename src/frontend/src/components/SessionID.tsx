const SessionID = () => {
  return (
    <div className="fixed bottom-8 left-8 font-mono text-xs z-50">
      <div className="flex items-center gap-2">
        <div className="flex gap-0.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="w-1 h-8 bg-secondary" />
          ))}
        </div>
        <div className="text-secondary">
          <div>ID: ML-PRED-2025</div>
        </div>
      </div>
    </div>
  );
};

export default SessionID;
