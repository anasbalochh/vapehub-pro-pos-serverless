import React from 'react';
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

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  // If user has a logo, show it
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={user?.businessName || 'Business Logo'}
        className={`${sizeClasses[size]} ${className} object-contain`}
        onError={(e) => {
          // If image fails to load, show fallback
          if (showFallback) {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const fallback = target.nextElementSibling as HTMLElement;
            if (fallback) fallback.style.display = 'block';
          }
        }}
      />
    );
  }

  // Fallback to default logo
  if (showFallback) {
    return <VapeHubLogo className={className} size={size} variant={variant} />;
  }

  return null;
};

export default BusinessLogo;

