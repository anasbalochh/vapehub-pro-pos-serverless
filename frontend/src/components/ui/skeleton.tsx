import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  variant?: 'text' | 'title' | 'button' | 'card' | 'circle';
  width?: string;
  height?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'text',
  width,
  height,
  style,
  ...props
}) => {
  const baseClasses = 'animate-pulse bg-muted rounded';

  const variantClasses = {
    text: 'h-4 w-full',
    title: 'h-6 w-3/4',
    button: 'h-10 w-24',
    card: 'h-32 w-full',
    circle: 'h-12 w-12 rounded-full'
  };

  const combinedStyle = {
    ...(width && { width }),
    ...(height && { height }),
    ...style
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={combinedStyle}
      {...props}
    />
  );
};

interface LoadingSkeletonProps {
  rows?: number;
  columns?: number;
}

export const TableSkeleton: React.FC<LoadingSkeletonProps> = ({ rows = 5, columns = 4 }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex space-x-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              variant="text"
              className="flex-1"
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <div className="card-professional p-6 space-y-4">
      <Skeleton variant="title" />
      <Skeleton variant="text" />
      <Skeleton variant="text" className="w-2/3" />
      <div className="flex justify-between items-center">
        <Skeleton variant="button" />
        <Skeleton variant="button" />
      </div>
    </div>
  );
};

export const MetricCardSkeleton: React.FC = () => {
  return (
    <div className="metric-card space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton variant="text" className="w-24" />
        <Skeleton variant="circle" />
      </div>
      <Skeleton variant="title" className="w-16" />
      <Skeleton variant="text" className="w-20" />
    </div>
  );
};

export const ProductCardSkeleton: React.FC = () => {
  return (
    <div className="card-professional p-4 space-y-3">
      <Skeleton variant="title" className="w-3/4" />
      <Skeleton variant="text" className="w-1/2" />
      <div className="flex justify-between items-center">
        <Skeleton variant="text" className="w-16" />
        <Skeleton variant="button" className="w-16" />
      </div>
    </div>
  );
};

export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className={`loading-spinner ${sizeClasses[size]}`} />
  );
};

export const LoadingDots: React.FC = () => {
  return (
    <div className="loading-dots">
      <div />
      <div />
      <div />
    </div>
  );
};

export const EmptyState: React.FC<{
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}> = ({ icon, title, description, action }) => {
  return (
    <div className="empty-state">
      {icon && <div className="empty-state-icon">{icon}</div>}
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-description">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
};