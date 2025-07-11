import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface PerspectiveContextType {
  perspective: number;
  setPerspective: (perspective: number) => void;
  resetPerspective: () => void;
}

const PerspectiveContext = createContext<PerspectiveContextType | undefined>(undefined);

export const usePerspective = () => {
  const context = useContext(PerspectiveContext);
  if (!context) {
    throw new Error('usePerspective must be used within a PerspectiveProvider');
  }
  return context;
};

interface PerspectiveProviderProps {
  children: ReactNode;
}

export default function PerspectiveProvider({ children }: PerspectiveProviderProps) {
  const [perspective, setPerspective] = useState<number>(1000);

  const resetPerspective = () => {
    setPerspective(1000);
  };

  useEffect(() => {
    const handleResize = () => {
      resetPerspective();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <PerspectiveContext.Provider value={{ perspective, setPerspective, resetPerspective }}>
      <div style={{ perspective: `${perspective}px` }}>
        {children}
      </div>
    </PerspectiveContext.Provider>
  );
}