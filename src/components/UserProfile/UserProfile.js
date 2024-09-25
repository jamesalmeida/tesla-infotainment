import React, { useState } from 'react';
import { useUserProfile } from '../../contexts/UserProfileContext';
import { getImagePath } from '../../utils/assetPaths';
import './UserProfile.css';

const profiles = [
  { id: 1, name: 'James', image: getImagePath("profile01.svg") },
  { id: 2, name: 'Lauren', image: getImagePath("icon-profile-default.svg") },
  { id: 3, name: 'Guest', image: getImagePath("icon-profile-default.svg") },
  { id: 4, name: 'Valet', image: getImagePath("icon-valet.svg") },
];

const UserProfile = () => {
  const { activeProfile, setActiveProfile } = useUserProfile();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleProfileClick = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleProfileSelect = (profile) => {
    setActiveProfile(profile);
    setIsDropdownOpen(false);
  };

  return (
    <div className="user-profile-container">
      <div className="userProfile no-select" onClick={handleProfileClick}>
        <img src={activeProfile.image} alt={`${activeProfile.name}'s Profile`} />
        <span>{activeProfile.name}</span>
      </div>
      {isDropdownOpen && (
        <div className="profile-dropdown">
          {/* <div className="profile-dropdown-header"></div> */}
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className="profile-option"
              onClick={() => handleProfileSelect(profile)}
            >
              <img className="profile-option-icon" src={profile.image} alt={`${profile.name}'s Profile`} />
              <span>{profile.name}</span>
              {profile.id === activeProfile.id && (
                <img
                  src={getImagePath("icon-green-check.svg")}
                  alt="Active Profile"
                  className="active-profile-icon"
                />
              )}
            </div>
          ))}
          <div className="driver-profile-settings">
            Driver Profile Settings
            <img src={getImagePath("icon-gear.svg")} alt="Driver Profile Settings" />
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;