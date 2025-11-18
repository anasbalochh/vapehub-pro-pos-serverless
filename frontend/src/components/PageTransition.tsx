import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

interface PageTransitionProps {
  children: ReactNode;
}

export default function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();

  return (
    <div
      key={location.pathname}
      className="animate-fade-in animate-slide-up"
      style={{
        animationDuration: '0.3s',
        animationFillMode: 'both',
      }}
    >
      {children}
    </div>
  );
}

