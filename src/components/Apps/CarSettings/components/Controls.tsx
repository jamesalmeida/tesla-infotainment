import { useState, useEffect } from 'react';
import CarWashMode from './CarWashMode/CarWashMode';
import styles from '../CarSettings.module.css';
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
  const [wiperSpeed, setWiperSpeed] = useState<string | null>(null);

  // Function to handle wiper mode change
  const handleWiperModeChange = (mode: string) => {
    setWipersMode(mode);
    if (mode === 'Auto') {
      setWiperSpeed(null);
    }
  };

  // Function to handle wiper speed change
  const handleWiperSpeedChange = (speed: string) => {
    setWiperSpeed(speed);
    setWipersMode('On');
  };

  // Row 4: Various controls
  const [dashcamOn, setDashcamOn] = useState(false);
  const [sentryModeOn, setSentryModeOn] = useState(false);
  const [showCarWashMode, setShowCarWashMode] = useState(false);
  const [gloveBoxClicked, setGloveBoxClicked] = useState(false);

  // Row 5: Brightness control
  const [brightness, setBrightness] = useState(100);
  const [autoBrightnessOn, setAutoBrightnessOn] = useState(false);

  // Adjust display brightness
  useEffect(() => {
    const displayWrapper = document.querySelector<HTMLElement>('.displayWrapper');
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
    <div className={styles['buttons-container']}>
      {/* Row 1 */}
      <div className={`${styles['flex-row']} ${styles['row-1']}`}>
        {['Off', 'Parking', 'On', 'Auto'].map((mode) => (
          <div
            key={mode}
            className={`${styles.btn} ${selectedLightMode === mode ? styles.active : ''}`}
            onClick={() => setSelectedLightMode(mode)}
          >
            {mode}
          </div>
        ))}
        <div
          className={`${styles.btn} ${styles['auto-high-beams-btn']} ${highBeamsOn ? styles.active : ''}`}
          onClick={() => setHighBeamsOn(!highBeamsOn)}
        >
          High Beams
        </div>
      </div>

      <div className={styles['gap-row']}></div>

      {/* Row 2 */}
      <div className={`${styles['flex-row']} ${styles['row-2']}`}>
        <div
          className={`${styles.btn} ${foldMirrorsOn ? styles.active : ''}`}
          onClick={() => setFoldMirrorsOn(!foldMirrorsOn)}
        >
          Fold Mirrors
        </div>
        <div
          className={`${styles.btn} ${childLockOption !== 'Off' ? styles.active : ''}`}
          onClick={() => setShowChildLockPopup(!showChildLockPopup)}
        >
          Child Lock
          {childLockOption !== 'Off' && <span className={styles.subtext}>{childLockOption}</span>}
        </div>
        <div
          className={`${styles.btn} ${windowLockOn ? styles.active : ''}`}
          onClick={() => setWindowLockOn(!windowLockOn)}
        >
          Window Lock
        </div>
      </div>

      {/* Child Lock Popup */}
      {showChildLockPopup && (
        <div className={styles['child-lock-popup']}>
          {['Off', 'Left', 'Right', 'Both'].map((option) => (
            <div
              key={option}
              className={`${styles.btn} ${childLockOption === option ? styles.active : ''}`}
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

      <div className={styles['gap-row']}></div>

      {/* Row 3 */}
      <div className={`${styles['flex-row']} ${styles['row-3']}`}>
        <div
          className={`${styles.btn} ${wipersMode === 'Off' ? styles.active : ''}`}
          onClick={() => handleWiperModeChange('Off')}
        >
          Off
        </div>
        <div
          className={`${styles.btn} ${wipersMode === 'Auto' ? styles.active : ''}`}
          onClick={() => handleWiperModeChange('Auto')}
        >
          Auto
        </div>
        {['I', 'II', 'III', 'IIII'].map((speed) => (
          <div
            key={speed}
            className={`${styles.btn} ${wipersMode === 'On' && wiperSpeed === speed ? styles.active : ''}`}
            onClick={() => handleWiperSpeedChange(speed)}
          >
            {speed}
          </div>
        ))}
      </div>

      <div className={styles['gap-row']}></div>

      {/* Row 4 */}
      <div className={`${styles['flex-row']} ${styles['row-4']}`}>
        <div className={styles['flex-column']}>
          <div className={styles.btn} onClick={openMirrorsModal}>
            Mirrors
          </div>
          <div className={styles.btn} onClick={openSteeringModal}>
            Steering
          </div>
        </div>
        <div className={styles['gap-column']}></div>
        <div className={styles['flex-column']}>
          <div
            className={`${styles.btn} ${dashcamOn ? styles.active : ''}`}
            onClick={() => setDashcamOn(!dashcamOn)}
          >
            Dashcam
          </div>
          <div
            className={`${styles.btn} ${sentryModeOn ? styles.active : ''}`}
            onClick={() => setSentryModeOn(!sentryModeOn)}
          >
            Sentry
            {sentryModeOn && <span className={styles['red-dot']}></span>}
          </div>
        </div>
        <div className={styles['gap-column']}></div>
        <div className={styles['flex-column']}>
          <div className={styles.btn} onClick={() => setShowCarWashMode(true)}>
            Car Wash
          </div>
          <div
            className={`${styles.btn} ${gloveBoxClicked ? styles.active : ''}`}
            onClick={() => setGloveBoxClicked(true)}
          >
            Glovebox
          </div>
        </div>
      </div>

      {/* Car Wash Mode Panel */}
      {showCarWashMode && (
        <div className={styles['car-wash-mode-popup']}>
          <CarWashMode onClose={() => setShowCarWashMode(false)} />
        </div>
      )}

      <div className={styles['gap-row']}></div>

      {/* Row 5 */}
      <div className={`${styles['flex-row']} ${styles['row-5']}`}>
        <div className={styles['brightness-slider']}>
          <input
            type="range"
            min="0"
            max="100"
            value={brightness}
            onChange={(e) => setBrightness(Number(e.target.value))}
            disabled={autoBrightnessOn}
          />
        </div>
        <div
          className={`${styles.btn} ${styles['brightness-auto-btn']} ${autoBrightnessOn ? styles.active : ''}`}
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
        <div className={styles.modal}>
          <MirrorsAdjustment onClose={closeMirrorsModal} />
        </div>
      )}
      {showSteeringModal && (
        <div className={styles.modal}>
          <SteeringAdjustment onClose={closeSteeringModal} />
        </div>
      )}
    </div>
  );
};
