import React, { createContext, useState, useContext } from 'react';

const CarLockContext = createContext();

export const CarLockProvider = ({ children }) => {
  const [isLocked, setIsLocked] = useState(true);

  const toggleLock = () => {
    setIsLocked(!isLocked);
  };

  return (
    <CarLockContext.Provider value={{ isLocked, toggleLock }}>
      {children}
    </CarLockContext.Provider>
  );
};

export const useCarLock = () => useContext(CarLockContext);