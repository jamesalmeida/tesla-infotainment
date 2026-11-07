import { useCallback, useRef, useState } from 'react';
import { useDismiss } from '../../hooks/useDismiss';
import { useCar, useCarActions } from '../../state/CarStateContext';
import { findProfile, VALET_PROFILE_ID } from '../../state/profiles';
import { getImagePath } from '../../utils/assetPaths';
import styles from './UserProfile.module.css';

const UserProfile = () => {
  const profiles = useCar((state) => state.profiles);
  const activeProfile = useCar((state) => findProfile(state.profiles, state.activeProfileId));
  const { openSettings, selectProfile } = useCarActions();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // A press on the other profile button counts as outside, so only one is ever open.
  const closeDropdown = useCallback(() => setIsDropdownOpen(false), []);
  useDismiss(containerRef, isDropdownOpen, closeDropdown);

  // Valet needs a PIN, which the Profiles panel asks for.
  const handleProfileSelect = (id: number) => {
    if (id === VALET_PROFILE_ID) openSettings('Profiles');
    else selectProfile(id);
    closeDropdown();
  };

  const handleOpenSettings = () => {
    openSettings('Profiles');
    closeDropdown();
  };

  return (
    <div className={styles['user-profile-container']} ref={containerRef}>
      <button
        type="button"
        className={`${styles.userProfile} no-select`}
        aria-expanded={isDropdownOpen}
        onClick={() => setIsDropdownOpen((isOpen) => !isOpen)}
      >
        <img src={activeProfile.image} alt={`${activeProfile.name}'s Profile`} />
        <span>{activeProfile.name}</span>
      </button>
      {isDropdownOpen && (
        <div className={styles['profile-dropdown']}>
          {profiles.map((profile) => (
            <button
              key={profile.id}
              type="button"
              className={styles['profile-option']}
              onClick={() => handleProfileSelect(profile.id)}
            >
              <img
                className={styles['profile-option-icon']}
                src={profile.image}
                alt={`${profile.name}'s Profile`}
              />
              <span>{profile.name}</span>
              {profile.id === activeProfile.id && (
                <img
                  src={getImagePath('icon-green-check.svg')}
                  alt="Active Profile"
                  className={styles['active-profile-icon']}
                />
              )}
            </button>
          ))}
          <button
            type="button"
            className={styles['driver-profile-settings']}
            onClick={handleOpenSettings}
          >
            Driver Profile Settings
            <img src={getImagePath('icon-gear.svg')} alt="" />
          </button>
        </div>
      )}
    </div>
  );
};

export default UserProfile;
