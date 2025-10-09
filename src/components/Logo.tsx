import React from 'react';

interface LogoProps {
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ className }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label="EchoDay logo"
    >
      <defs>
        <linearGradient id="sunGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="1" />
          <stop offset="100%" stopColor="#1d4ed8" stopOpacity="1" />
        </linearGradient>
        
        <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="1" />
          <stop offset="100%" stopColor="#16a34a" stopOpacity="1" />
        </linearGradient>
        
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      {/* Central sun/day symbol */}
      <circle cx="32" cy="28" r="14" fill="url(#sunGradient)" filter="url(#glow)" opacity="0.3"/>
      <circle cx="32" cy="28" r="12" fill="url(#sunGradient)"/>
      
      {/* Inner light */}
      <circle cx="32" cy="28" r="9" fill="#dbeafe" opacity="0.7"/>
      <circle cx="32" cy="28" r="5" fill="#ffffff" opacity="0.9"/>
      
      {/* Sound waves emanating from the sun */}
      {/* First wave arc */}
      <path 
        d="M 12,38 Q 18,34 24,38 Q 28,36 32,38 Q 36,36 40,38 Q 46,34 52,38" 
        stroke="url(#waveGradient)" 
        strokeWidth="2.5" 
        fill="none" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        opacity="1"
      />
      
      {/* Second wave arc */}
      <path 
        d="M 14,46 Q 20,44 26,46 Q 29,45 32,46 Q 35,45 38,46 Q 44,44 50,46" 
        stroke="url(#waveGradient)" 
        strokeWidth="2" 
        fill="none" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        opacity="0.7"
      />
      
      {/* Third wave arc */}
      <path 
        d="M 18,52 Q 22,51 26,52 Q 29,51.5 32,52 Q 35,51.5 38,52 Q 42,51 46,52" 
        stroke="url(#waveGradient)" 
        strokeWidth="1.5" 
        fill="none" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        opacity="0.4"
      />
      
      {/* Small AI sparkle */}
      <circle cx="44" cy="20" r="2.5" fill="#f59e0b" opacity="0.9"/>
      <path d="M44,16 L44,24 M40,20 L48,20" stroke="#fbbf24" strokeWidth="1" strokeLinecap="round"/>
    </svg>
  );
};

export default Logo;
