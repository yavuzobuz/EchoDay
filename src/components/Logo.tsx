import React from 'react';

interface LogoProps {
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ className }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 400 400"
      className={className}
      role="img"
      aria-label="EchoDay logo"
    >
      <defs>
        <linearGradient id="primaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity="1" />
          <stop offset="50%" stopColor="#ec4899" stopOpacity="1" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="1" />
        </linearGradient>
        <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#06b6d4" stopOpacity="1" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="1" />
        </linearGradient>
        <linearGradient id="sunGlow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" stopOpacity="1" />
          <stop offset="100%" stopColor="#f97316" stopOpacity="1" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <circle cx="200" cy="200" r="180" fill="url(#primaryGrad)" opacity="0.05" />
      <circle cx="200" cy="200" r="150" fill="url(#primaryGrad)" opacity="0.03" />

      <g transform="translate(200, 180)">
        <circle cx="0" cy="0" r="45" fill="url(#sunGlow)" filter="url(#glow)" opacity="0.3" />
        <circle cx="0" cy="0" r="40" fill="url(#sunGlow)" />
        <circle cx="0" cy="0" r="32" fill="#fef3c7" opacity="0.4" />
        <g stroke="url(#sunGlow)" strokeWidth="4" strokeLinecap="round">
          <line x1="0" y1="-55" x2="0" y2="-70" />
          <line x1="39" y1="-39" x2="49" y2="-49" />
          <line x1="55" y1="0" x2="70" y2="0" />
          <line x1="39" y1="39" x2="49" y2="49" />
          <line x1="0" y1="55" x2="0" y2="70" />
          <line x1="-39" y1="39" x2="-49" y2="49" />
          <line x1="-55" y1="0" x2="-70" y2="0" />
          <line x1="-39" y1="-39" x2="-49" y2="-49" />
        </g>
        <g stroke="url(#sunGlow)" strokeWidth="3" strokeLinecap="round" opacity="0.5">
          <line x1="27" y1="-50" x2="32" y2="-58" transform="rotate(22.5)" />
          <line x1="50" y1="-27" x2="58" y2="-32" transform="rotate(22.5)" />
          <line x1="50" y1="27" x2="58" y2="32" transform="rotate(22.5)" />
          <line x1="27" y1="50" x2="32" y2="58" transform="rotate(22.5)" />
        </g>
      </g>

      <g transform="translate(200, 280)">
        <path
          d="M -80,0 Q -60,-20 -40,0 T 0,0 T 40,0 T 80,0"
          stroke="url(#waveGrad)"
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M -70,18 Q -50,-2 -30,18 T 10,18 T 50,18 T 70,18"
          stroke="url(#waveGrad)"
          strokeWidth="4"
          fill="none"
          opacity="0.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M -60,32 Q -45,17 -30,32 T 0,32 T 30,32 T 60,32"
          stroke="url(#waveGrad)"
          strokeWidth="3"
          fill="none"
          opacity="0.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="-90" cy="8" r="3" fill="url(#waveGrad)" opacity="0.6" />
        <circle cx="90" cy="8" r="3" fill="url(#waveGrad)" opacity="0.6" />
        <circle cx="-75" cy="25" r="2.5" fill="url(#waveGrad)" opacity="0.4" />
        <circle cx="75" cy="25" r="2.5" fill="url(#waveGrad)" opacity="0.4" />
      </g>

      <g transform="translate(145, 155)" opacity="0.3">
        <circle cx="0" cy="0" r="4" fill="url(#primaryGrad)" />
        <line x1="-3" y1="-3" x2="3" y2="3" stroke="url(#primaryGrad)" strokeWidth="1.5" />
        <line x1="3" y1="-3" x2="-3" y2="3" stroke="url(#primaryGrad)" strokeWidth="1.5" />
      </g>
    </svg>
  );
};

export default Logo;
