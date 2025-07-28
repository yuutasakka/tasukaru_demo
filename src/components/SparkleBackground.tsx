

import React from 'react';

const SparkleBackground: React.FC = () => {
  const sparkles = [
    { top: '20%', left: '10%', animationDelay: '0s' },
    { top: '60%', left: '80%', animationDelay: '1s' },
    { top: '30%', left: '70%', animationDelay: '2s' },
    { top: '80%', left: '20%', animationDelay: '0.5s' },
    { top: '40%', left: '90%', animationDelay: '1.5s' },
  ];

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
      {sparkles.map((sparkle, index) => (
        <div
          key={index}
          className="sparkle"
          style={{
            top: sparkle.top,
            left: sparkle.left,
            animationDelay: sparkle.animationDelay,
          }}
        ></div>
      ))}
    </div>
  );
};

export default SparkleBackground;