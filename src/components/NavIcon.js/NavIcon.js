import React from 'react';

const NavIcon = ({ icon, onClick }) => (
  <img 
    className={`navIcons ${icon}`} 
    src={`/img/icon-${icon}.svg`} 
    alt={`${icon} icon`}
    onClick={onClick}
  />
);

export default NavIcon;