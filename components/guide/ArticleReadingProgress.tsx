'use client';

import { useEffect, useState } from 'react';

export default function ArticleReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (documentHeight <= 0) {
        setProgress(0);
        return;
      }
      setProgress(Math.min(100, Math.max(0, Math.round((window.scrollY / documentHeight) * 100))));
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[72px] z-40 h-1 bg-transparent print:hidden">
      <div className="h-full bg-cyan-400/85 transition-[width] duration-150 motion-reduce:transition-none" style={{ width: `${progress}%` }} />
    </div>
  );
}
