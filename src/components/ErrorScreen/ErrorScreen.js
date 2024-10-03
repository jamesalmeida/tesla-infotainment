import React from 'react';
import { useDots } from '../../utils/dots';
import './ErrorScreen.css';


export default function ErrorScreen() {
    const dots = useDots();

    return (      
    <div id="page" className="errorScreen">
      <div className="hal">
        <div className="hal-eye -circular">
          <div className="__ring -circular"></div>
            <div className="__oculus -circular">
            <div className="__iris -circular -narrow"></div>
            <div className="__iris -circular -wide"></div>
            <div className="__highlight -alpha"></div>
            <div className="__highlight -beta"></div>
            <div className="__highlight -gamma"></div>
          </div>
        </div>
      <div className="error-message">I'm sorry, Dave. I'm afraid I can't do that{dots}</div>
      </div>
    </div>
  );
}