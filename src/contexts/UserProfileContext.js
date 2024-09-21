import React, { createContext, useState, useContext } from 'react';

const UserProfileContext = createContext();

export const UserProfileProvider = ({ children }) => {
  const [activeProfile, setActiveProfile] = useState({
    id: 1,
    name: 'James',
    image: '/img/profile01.svg'
  });

  return (
    <UserProfileContext.Provider value={{ activeProfile, setActiveProfile }}>
      {children}
    </UserProfileContext.Provider>
  );
};

export const useUserProfile = () => useContext(UserProfileContext);