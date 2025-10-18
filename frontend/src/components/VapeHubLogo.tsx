import React from 'react';

interface VapeHubLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'light' | 'dark' | 'contrast';
}

const VapeHubLogo: React.FC<VapeHubLogoProps> = ({ className = '', size = 'md', variant = 'contrast' }) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const colorSchemes = {
    light: {
      device: '#60A5FA', // Light blue
      button: '#3B82F6', // Medium blue
      slots: '#1E40AF',  // Dark blue
      vapor: '#60A5FA'   // Light blue
    },
    dark: {
      device: '#1E40AF', // Dark blue
      button: '#1E3A8A', // Darker blue
      slots: '#1E3A8A',  // Darker blue
      vapor: '#1E40AF'   // Dark blue
    },
    contrast: {
      device: '#FFFFFF', // White
      button: '#E5E7EB', // Light gray
      slots: '#D1D5DB',  // Medium gray
      vapor: '#FFFFFF'   // White
    }
  };

  const colors = colorSchemes[variant];

  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      <svg viewBox="0 0 32 32" className="w-full h-full">
        {/* Vape Device Base */}
        <rect x="4" y="20" width="8" height="6" rx="1" fill={colors.device} />
        
        {/* Fire Button */}
        <circle cx="8" cy="23" r="1" fill={colors.button} />
        
        {/* Atomizer/Tank */}
        <rect x="6" y="14" width="4" height="6" rx="0.5" fill={colors.device} />
        
        {/* Airflow Slots */}
        <rect x="6.5" y="16" width="3" height="0.3" fill={colors.slots} />
        <rect x="6.5" y="17" width="3" height="0.3" fill={colors.slots} />
        <rect x="6.5" y="18" width="3" height="0.3" fill={colors.slots} />
        
        {/* Vapor Plume */}
        <path d="M8 14 Q6 10 8 6 Q10 10 8 14" stroke={colors.vapor} strokeWidth="0.5" fill="none" />
        <path d="M8 14 Q7 8 8 4 Q9 8 8 14" stroke={colors.vapor} strokeWidth="0.3" fill="none" />
      </svg>
    </div>
  );
};

export default VapeHubLogo;
