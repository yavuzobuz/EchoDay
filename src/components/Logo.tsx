import React from 'react';

interface LogoProps {
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ className }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="currentColor" 
      className={className}
      aria-hidden="true"
    >
      <path 
        fillRule="evenodd" 
        d="M21.582 6.031a.75.75 0 01.446 1.323l-1.336.445a.75.75 0 01-.976-.976l.445-1.336a.75.75 0 011.42.544zm-2.48-2.48a.75.75 0 011.06 0l.97.97a.75.75 0 11-1.06 1.06l-.97-.97a.75.75 0 010-1.06zM12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-4-12a1 1 0 011-1h.01a1 1 0 011 1v4a1 1 0 01-1 1H9a1 1 0 01-1-1v-4zm4-3a1 1 0 011-1h.01a1 1 0 011 1v10a1 1 0 01-1 1H13a1 1 0 01-1-1V7zm4 3a1 1 0 011-1h.01a1 1 0 011 1v4a1 1 0 01-1 1H17a1 1 0 01-1-1v-4z" 
        clipRule="evenodd"
      />
    </svg>
  );
};

export default Logo;
