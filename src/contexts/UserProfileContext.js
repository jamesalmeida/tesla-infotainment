import React, { createContext, useState, useContext } from 'react';
import { getImagePath } from '../utils/imagePath';

const UserProfileContext = createContext();

export const UserProfileProvider = ({ children }) => {
  const [activeProfile, setActiveProfile] = useState({
    id: 1,
    name: 'James',
    image: getImagePath("profile01.svg")
  });

  return (
    <UserProfileContext.Provider value={{ activeProfile, setActiveProfile }}>
      {children}
    </UserProfileContext.Provider>
  );
};

export const useUserProfile = () => useContext(UserProfileContext);