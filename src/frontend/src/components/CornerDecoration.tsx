const CornerDecoration = () => {
  return (
    <>
      {/* Top Left */}
      <div className="fixed top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-primary pointer-events-none z-50" />
      
      {/* Top Right */}
      <div className="fixed top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-primary pointer-events-none z-50" />
      
      {/* Bottom Left */}
      <div className="fixed bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-secondary pointer-events-none z-50" />
      
      {/* Bottom Right */}
      <div className="fixed bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-secondary pointer-events-none z-50" />
      
      {/* Decorative X marks */}
      <div className="fixed top-24 right-12 text-primary text-4xl font-bold opacity-50 pointer-events-none">X</div>
      <div className="fixed top-1/2 left-12 text-primary text-4xl font-bold opacity-50 pointer-events-none">X</div>
      <div className="fixed bottom-24 right-24 text-secondary text-4xl font-bold opacity-50 pointer-events-none">X</div>
    </>
  );
};

export default CornerDecoration;
