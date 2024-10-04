import React, { useState, useEffect } from 'react';
import CarWashMode from './CarWashMode/CarWashMode';
import '../CarSettings.css'; // Make sure to create and import corresponding CSS
import { MirrorsAdjustment } from './MirrorsAdjustment';
import { SteeringAdjustment } from './SteeringAdjustment';

export const Controls = () => {
  // Row 1: Light modes and High Beams
  const [selectedLightMode, setSelectedLightMode] = useState('Auto');
  const [highBeamsOn, setHighBeamsOn] = useState(false);

  // Row 2: Fold Mirrors, Child Lock, Window Lock
  const [foldMirrorsOn, setFoldMirrorsOn] = useState(false);
  const [windowLockOn, setWindowLockOn] = useState(false);
  const [childLockOption, setChildLockOption] = useState('Off'); // 'Left', 'Right', 'Both'
  const [showChildLockPopup, setShowChildLockPopup] = useState(false);

  // Row 3: Wipers mode and speed
  const [wipersMode, setWipersMode] = useState('Auto');
  const [wiperSpeed, setWiperSpeed] = useState(null);

  // Function to handle wiper mode change
  const handleWiperModeChange = (mode) => {
    setWipersMode(mode);
    if (mode === 'Auto') {
      setWiperSpeed(null);
    }
  };

  // Function to handle wiper speed change
  const handleWiperSpeedChange = (speed) => {
    setWiperSpeed(speed);
    setWipersMode('On');
  };

  // Row 4: Various controls
  const [mirrorsOn, setMirrorsOn] = useState(false);
  const [steeringOn, setSteeringOn] = useState(false);
  const [dashcamOn, setDashcamOn] = useState(false);
  const [sentryModeOn, setSentryModeOn] = useState(false);
  const [showCarWashMode, setShowCarWashMode] = useState(false);
  const [gloveBoxClicked, setGloveBoxClicked] = useState(false);

  // Row 5: Brightness control
  const [brightness, setBrightness] = useState(100);
  const [autoBrightnessOn, setAutoBrightnessOn] = useState(false);

  // Adjust display brightness
  useEffect(() => {
    const displayWrapper = document.querySelector('.displayWrapper');
    if (displayWrapper) {
      if (autoBrightnessOn) {
        displayWrapper.style.opacity = '1';
      } else {
        const opacity = Math.max(0.1, brightness / 100);
        displayWrapper.style.opacity = opacity.toString();
      }
    }
  }, [brightness, autoBrightnessOn]);

  // Glovebox click effect
  useEffect(() => {
    if (gloveBoxClicked) {
      const timer = setTimeout(() => {
        setGloveBoxClicked(false);
      }, 500); // Highlight for 500ms
      return () => clearTimeout(timer);
    }
  }, [gloveBoxClicked]);

  const [showMirrorsModal, setShowMirrorsModal] = useState(false);
  const [showSteeringModal, setShowSteeringModal] = useState(false);

  const openMirrorsModal = () => setShowMirrorsModal(true);
  const closeMirrorsModal = () => setShowMirrorsModal(false);
  const openSteeringModal = () => setShowSteeringModal(true);
  const closeSteeringModal = () => setShowSteeringModal(false);

  return (
    <div className="buttons-container">
      {/* Row 1 */}
      <div className="flex-row row-1">
        {['Off', 'Parking', 'On', 'Auto'].map((mode) => (
          <div
            key={mode}
            className={`btn ${selectedLightMode === mode ? 'active' : ''}`}
            onClick={() => setSelectedLightMode(mode)}
          >
            {mode}
          </div>
        ))}
        <div
          className={`btn auto-high-beams-btn ${highBeamsOn ? 'active' : ''}`}
          onClick={() => setHighBeamsOn(!highBeamsOn)}
        >
          High Beams
        </div>
      </div>

      <div className="gap-row"></div>

      {/* Row 2 */}
      <div className="flex-row row-2">
        <div
          className={`btn ${foldMirrorsOn ? 'active' : ''}`}
          onClick={() => setFoldMirrorsOn(!foldMirrorsOn)}
        >
          Fold Mirrors
        </div>
        <div
          className={`btn ${childLockOption !== 'Off' ? 'active' : ''}`}
          onClick={() => setShowChildLockPopup(!showChildLockPopup)}
        >
          Child Lock
          {childLockOption !== 'Off' && <span className="subtext">{childLockOption}</span>}
        </div>
        <div
          className={`btn ${windowLockOn ? 'active' : ''}`}
          onClick={() => setWindowLockOn(!windowLockOn)}
        >
          Window Lock
        </div>
      </div>

      {/* Child Lock Popup */}
      {showChildLockPopup && (
        <div className="child-lock-popup">
          {['Off', 'Left', 'Right', 'Both'].map((option) => (
            <div
              key={option}
              className={`btn ${childLockOption === option ? 'active' : ''}`}
              onClick={() => {
                setChildLockOption(option);
                setShowChildLockPopup(false);
              }}
            >
              {option}
            </div>
          ))}
        </div>
      )}

      <div className="gap-row"></div>

      {/* Row 3 */}
      <div className="flex-row row-3">
        <div
          className={`btn ${wipersMode === 'Off' ? 'active' : ''}`}
          onClick={() => handleWiperModeChange('Off')}
        >
          Off
        </div>
        <div
          className={`btn ${wipersMode === 'Auto' ? 'active' : ''}`}
          onClick={() => handleWiperModeChange('Auto')}
        >
          Auto
        </div>
        {['I', 'II', 'III', 'IIII'].map((speed) => (
          <div
            key={speed}
            className={`btn ${wipersMode === 'On' && wiperSpeed === speed ? 'active' : ''}`}
            onClick={() => handleWiperSpeedChange(speed)}
          >
            {speed}
          </div>
        ))}
      </div>

      <div className="gap-row"></div>

      {/* Row 4 */}
      <div className="flex-row row-4">
        <div className="flex-column">
          <div
            className="btn"
            onClick={openMirrorsModal}
          >
            Mirrors
          </div>
          <div
            className="btn"
            onClick={openSteeringModal}
          >
            Steering
          </div>
        </div>
        <div className="gap-column"></div>
        <div className="flex-column">
          <div
            className={`btn ${dashcamOn ? 'active' : ''}`}
            onClick={() => setDashcamOn(!dashcamOn)}
          >
            Dashcam
          </div>
          <div
            className={`btn ${sentryModeOn ? 'active' : ''}`}
            onClick={() => setSentryModeOn(!sentryModeOn)}
          >
            Sentry
            {sentryModeOn && <span className="red-dot"></span>}
          </div>
        </div>
        <div className="gap-column"></div>
        <div className="flex-column">
          <div
            className="btn"
            onClick={() => setShowCarWashMode(true)}
          >
            Car Wash
          </div>
          <div
            className={`btn ${gloveBoxClicked ? 'active' : ''}`}
            onClick={() => setGloveBoxClicked(true)}
          >
            Glovebox
          </div>
        </div>
      </div>

      {/* Car Wash Mode Panel */}
      {showCarWashMode && (
        <div className="car-wash-mode-popup">
          <CarWashMode onClose={() => setShowCarWashMode(false)} />
        </div>
      )}

      <div className="gap-row"></div>

      {/* Row 5 */}
      <div className="flex-row row-5">
        <div className="brightness-slider">
          <input
            type="range"
            min="0"
            max="100"
            value={brightness}
            onChange={(e) => setBrightness(e.target.value)}
            disabled={autoBrightnessOn}
          />
        </div>
        <div
          className={`btn brightness-auto-btn ${autoBrightnessOn ? 'active' : ''}`}
          onClick={() => {
            setAutoBrightnessOn(!autoBrightnessOn);
            if (!autoBrightnessOn) {
              setBrightness(100);
            }
          }}
        >
          Auto
        </div>
      </div>

      {showMirrorsModal && (
        <div className="modal">
          <MirrorsAdjustment onClose={closeMirrorsModal} />
        </div>
      )}
      {showSteeringModal && (
        <div className="modal">
          <SteeringAdjustment onClose={closeSteeringModal} />
        </div>
      )}
    </div>
  );
};