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

  // If user has a logo, show it
  return (
    <div className={`${sizeClasses[size]} ${className} flex items-center justify-center overflow-hidden`}>
      <img
        src={logoUrl}
        alt={user?.businessName || 'Business Logo'}
        className="w-full h-full object-contain max-w-full max-h-full"
        style={{ objectFit: 'contain' }}
        onError={() => setImageError(true)}
        onLoad={() => setImageError(false)}
      />
    </div>
  );
};

export default BusinessLogo;

