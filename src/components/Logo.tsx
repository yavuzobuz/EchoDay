import React, { useState } from 'react';

interface LogoProps {
  className?: string;
  alt?: string;
  priority?: boolean;
}

// Görsel logoya geçiş: public/app-icon.png varsa onu kullan, yoksa public/icon-512.svg'ye düş.
const Logo: React.FC<LogoProps> = ({ className, alt = 'EchoDay logo', priority = false }) => {
  const [src, setSrc] = useState<string>('/app-icon.png');

  return (
    <img
      src={src}
      onError={() => {
        if (src !== '/icon-512.svg') setSrc('/icon-512.svg');
      }}
      alt={alt}
      role="img"
      aria-label={alt}
      className={className}
      decoding="async"
      loading={priority ? 'eager' : 'lazy'}
      fetchpriority={priority ? 'high' : 'auto'}
      style={{ contentVisibility: 'auto' }}
    />
  );
};

export default Logo;
