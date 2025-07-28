

import React, { useEffect, useRef } from 'react';

const FloatingHeartsBackground: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const heartsData = [
    { char: '💖', delay: '0s', leftInitial: '10%' },
    { char: '✨', delay: '0.5s', leftInitial: '20%' },
    { char: '💫', delay: '1s', leftInitial: '30%' },
    { char: '', delay: '1.5s', leftInitial: '70%' },
    { char: '💝', delay: '2s', leftInitial: '80%' },
    { char: '', delay: '2.5s', leftInitial: '90%' },
    { char: '💖', delay: '0.2s', leftInitial: '50%' },
    { char: '', delay: '0.8s', leftInitial: '60%' },
    { char: '✨', delay: '1.2s', leftInitial: '5%' },
    { char: '💫', delay: '1.8s', leftInitial: '95%' },
  ];

  useEffect(() => {
    const hearts = containerRef.current?.querySelectorAll('.heart-item');
    hearts?.forEach((heart) => {
      (heart as HTMLElement).style.top = Math.random() * 20 + '%';
      (heart as HTMLElement).style.color = 'var(--accent-rose)'; // Use premium color
      (heart as HTMLElement).style.zIndex = '0'; // Ensure behind content
    });
  }, []);


  return (
    <div ref={containerRef} className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none -z-10">
      {heartsData.map((heart, index) => (
        <div
          key={index}
          className="heart heart-item" 
          style={{
            left: heart.leftInitial,
            animationDelay: heart.delay,
            fontSize: `${Math.random() * 10 + 15}px` 
          }}
          role="img"
          aria-hidden="true"
        >
          {heart.char}
        </div>
      ))}
    </div>
  );
};

export default FloatingHeartsBackground;