import React from 'react';
import './TemperatureControl.css';

const TemperatureControl = ({ temperature, onIncrement, onDecrement }) => (
  <div className="temperature-control">
    <img 
      className={`navIcons arrows`} 
      src="/img/icon-temp-down.svg" 
      alt="Decrease temperature" 
      onClick={onDecrement}
    />
    <span className="navIcons temperature-display no-select">{temperature}</span>
    <img 
      className={`navIcons arrows`}
      src="/img/icon-temp-up.svg" 
      alt="Increase temperature" 
      onClick={onIncrement}
    />
  </div>
);

export default TemperatureControl;