import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import VapeHubLogo from './VapeHubLogo';

interface BusinessLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'light' | 'dark' | 'contrast';
  showFallback?: boolean;
}

const BusinessLogo: React.FC<BusinessLogoProps> = ({
  className = '',
  size = 'md',
  variant = 'contrast',
  showFallback = true
}) => {
  const { user } = useAuth();
  const logoUrl = user?.logoUrl;
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  // If image failed to load or no logo URL, show fallback
  if (!logoUrl || imageError) {
    if (showFallback) {
      return <VapeHubLogo className={className} size={size} variant={variant} />;
    }
    return null;
  }

  // If user has a logo, show it with proper auto-fit
  return (
    <div className={`${sizeClasses[size]} ${className} flex items-center justify-center overflow-hidden relative p-0.5`}>
      <img
        src={logoUrl}
        alt={user?.businessName || 'Business Logo'}
        className="max-w-full max-h-full w-auto h-auto"
        style={{
          objectFit: 'contain',
          display: 'block'
        }}
        onError={() => setImageError(true)}
        onLoad={() => setImageError(false)}
      />
    </div>
  );
};

export default BusinessLogo;

