import { useLocation } from "wouter";
import { useEffect, useState } from "react";

export function TopLoader() {
  const [location] = useLocation();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    setProgress(0);

    // Simulate progress
    const t1 = setTimeout(() => setProgress(30), 50);
    const t2 = setTimeout(() => setProgress(70), 250);
    const t3 = setTimeout(() => setProgress(100), 500);
    const t4 = setTimeout(() => {
        setVisible(false);
        setProgress(0);
    }, 800);

    return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        clearTimeout(t4);
    };
  }, [location]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-1 bg-transparent pointer-events-none" aria-hidden="true">
      <div
        className="h-full bg-primary transition-all ease-out duration-300 shadow-[0_0_10px_var(--primary)]"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
