import React, { useState, useRef, useEffect } from 'react';
import './VerticalSliderPanel.css';
import { AppleMusic } from '../Apps/AppleMusic/AppleMusic';
import { Arcade } from '../Apps/Arcade/Arcade';
import { BackupCam } from '../Apps/BackupCam/BackupCam';
import { Bluetooth } from '../Apps/Bluetooth/Bluetooth';
import { Calendar } from '../Apps/Calendar/Calendar';
import { CarSettings } from '../Apps/CarSettings/CarSettings';
import { Dashcam } from '../Apps/Dashcam/Dashcam';
import { Podcasts } from '../Apps/Podcasts/Podcasts';
import { Toybox } from '../Apps/Toybox/Toybox';

const VerticalSliderPanel = ({ isOpen, activeIcon, onClose, isCameraForced }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [startY, setStartY] = useState(0);
    const [currentY, setCurrentY] = useState(0);
    const [isClosing, setIsClosing] = useState(false);
    const panelRef = useRef(null);

    const getPanelClassName = () => {
        let className = `vertical-slider-panel ${isOpen ? 'open' : ''} ${isClosing ? 'closing' : ''} ${isDragging ? 'dragging' : ''}`;
        if (isOpen) {
          className += ' open';
        }
        if (activeIcon === 'camera') {
          className += ' camera-background';
        }
        return className;
      };

    useEffect(() => {
        if (!isOpen) {
            setIsClosing(true);
            setTimeout(() => {
                setIsClosing(false);
                setCurrentY(0);
            }, 300); // Match this with your CSS transition duration
        } else {
            setIsClosing(false);
            setCurrentY(0);
        }
    }, [isOpen]);

    const handleStart = (clientY) => {
        if (isOpen && !isClosing) {
            setIsDragging(true);
            setStartY(clientY - currentY);
        }
    };

    const handleMove = (clientY) => {
        if (isDragging) {
            const deltaY = clientY - startY;
            setCurrentY(Math.max(0, deltaY));
        }
    };

    const handleEnd = () => {
        if (isDragging) {
            setIsDragging(false);
            if (currentY > 50) { // If dragged down more than 50px
                onClose(); // Trigger closing animation
            } else {
                setCurrentY(0);
            }
        }
    };

    const handleClose = () => {
        if (!isCameraForced) {
            onClose();
        }
    };

    const renderContent = () => {
        switch (activeIcon) {
            case 'apple-music':
                return <AppleMusic />;
            case 'arcade':
                return <Arcade />;
            case 'bluetooth':
                return <Bluetooth />;
            case 'calendar':
                return <Calendar />;
            case 'camera':
                return <BackupCam />;
            case 'car-settings':
                return <CarSettings />;
            case 'dashcam':
                return <Dashcam />;
            case 'podcasts':
                return <Podcasts />;
            case 'toybox':
                return <Toybox />;
            default:
                return null;
        }
    };

    const panelStyle = isDragging ? { transform: `translateY(${currentY}px)` } : {};

    return (
        <div 
            ref={panelRef}
            className={getPanelClassName()}
            style={panelStyle}
            onTouchStart={(e) => handleStart(e.touches[0].clientY)}
            onTouchMove={(e) => handleMove(e.touches[0].clientY)}
            onTouchEnd={handleEnd}
            onMouseDown={(e) => handleStart(e.clientY)}
            onMouseMove={(e) => handleMove(e.clientY)}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
        >
            <div className="slider-handle"></div>
            <div className="slider-content">
                {renderContent()}
            </div>
            {/* {!isCameraForced && <button onClick={handleClose}>Close</button>} */}
        </div>
    );
};

export default VerticalSliderPanel;