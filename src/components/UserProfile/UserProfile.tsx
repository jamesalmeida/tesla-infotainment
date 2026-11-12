import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
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
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<{ host: HTMLElement; style: CSSProperties } | null>(
    null,
  );

  // A press on the other profile button counts as outside, so only one is ever open.
  const closeDropdown = useCallback(() => setIsDropdownOpen(false), []);
  useDismiss([containerRef, dropdownRef], isDropdownOpen, closeDropdown);

  // The list is drawn at the top of the display, under the button, rather than inside the
  // status bar: there the car's Park View and the Settings sheet would cover it. Outside a
  // display, as in a test, it stays inline.
  const toggleDropdown = () => {
    if (isDropdownOpen) {
      closeDropdown();
      return;
    }
    const button = containerRef.current;
    const host = button?.closest<HTMLElement>('.displayWrapper');
    if (button && host) {
      const from = button.getBoundingClientRect();
      const origin = host.getBoundingClientRect();
      setPlacement({
        host,
        style: { left: from.left - origin.left, top: from.bottom - origin.top },
      });
    } else {
      setPlacement(null);
    }
    setIsDropdownOpen(true);
  };

  // Its place was measured on opening, so a resize closes it rather than leave it adrift.
  useEffect(() => {
    if (!isDropdownOpen) return;
    window.addEventListener('resize', closeDropdown);
    return () => window.removeEventListener('resize', closeDropdown);
  }, [isDropdownOpen, closeDropdown]);

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

  const dropdown = (style: CSSProperties) => (
    <div ref={dropdownRef} className={styles['profile-dropdown']} style={style}>
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
  );

  return (
    <div className={styles['user-profile-container']} ref={containerRef}>
      <button
        type="button"
        className={`${styles.userProfile} no-select`}
        aria-expanded={isDropdownOpen}
        onClick={toggleDropdown}
      >
        <img src={activeProfile.image} alt={`${activeProfile.name}'s Profile`} />
        <span>{activeProfile.name}</span>
      </button>
      {isDropdownOpen &&
        (placement
          ? createPortal(dropdown(placement.style), placement.host)
          : dropdown({ top: '100%', left: 0 }))}
    </div>
  );
};

export default UserProfile;
