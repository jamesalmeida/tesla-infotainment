import React from 'react';
import { getImagePath } from '../../utils/imagePath';

const NavIcon = ({ icon, onClick }) => (
  <img 
    className={`navIcons ${icon}`} 
    src={getImagePath(`icon-${icon}.svg`)} 
    alt={`${icon} icon`}
    onClick={onClick}
  />
);

export default NavIcon;