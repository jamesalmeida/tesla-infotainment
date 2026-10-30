import { createContext, useState, useContext, type ReactNode } from 'react';
import { getImagePath } from '../utils/assetPaths';

export interface Profile {
  id: number;
  name: string;
  image: string;
}

interface UserProfileValue {
  activeProfile: Profile;
  setActiveProfile: (profile: Profile) => void;
}

const UserProfileContext = createContext<UserProfileValue | null>(null);

export const UserProfileProvider = ({ children }: { children: ReactNode }) => {
  const [activeProfile, setActiveProfile] = useState<Profile>({
    id: 1,
    name: 'James',
    image: getImagePath('profile01.svg'),
  });

  return (
    <UserProfileContext.Provider value={{ activeProfile, setActiveProfile }}>
      {children}
    </UserProfileContext.Provider>
  );
};

export const useUserProfile = (): UserProfileValue => {
  const value = useContext(UserProfileContext);
  if (!value) throw new Error('useUserProfile must be used inside <UserProfileProvider>');
  return value;
};
