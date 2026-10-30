import { createContext, useState, useContext, type ReactNode } from 'react';

interface CarLockValue {
  isLocked: boolean;
  toggleLock: () => void;
}

const CarLockContext = createContext<CarLockValue | null>(null);

export const CarLockProvider = ({ children }: { children: ReactNode }) => {
  const [isLocked, setIsLocked] = useState(true);

  const toggleLock = () => {
    setIsLocked(!isLocked);
  };

  return (
    <CarLockContext.Provider value={{ isLocked, toggleLock }}>{children}</CarLockContext.Provider>
  );
};

export const useCarLock = (): CarLockValue => {
  const value = useContext(CarLockContext);
  if (!value) throw new Error('useCarLock must be used inside <CarLockProvider>');
  return value;
};
