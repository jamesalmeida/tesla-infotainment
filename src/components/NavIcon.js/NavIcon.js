import React from 'react';
import { getImagePath } from '../../utils/assetPaths';

const NavIcon = ({ icon, onClick }) => (
  <img 
    className={`navIcons ${icon}`} 
    src={getImagePath(`icon-${icon}.svg`)} 
    alt={`${icon} icon`}
    onClick={onClick}
  />
);

export default NavIcon;