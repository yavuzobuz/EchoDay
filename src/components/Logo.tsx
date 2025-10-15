import React, { useState } from 'react';

interface LogoProps {
  className?: string;
  alt?: string;
}

// Görsel logoya geçiş: public/app-icon.png varsa onu kullan, yoksa public/icon-512.svg'ye düş.
const Logo: React.FC<LogoProps> = ({ className, alt = 'EchoDay logo' }) => {
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
      loading="eager"
    />
  );
};

export default Logo;
