import React, { useState, useCallback } from "react";
import Webcam from "react-webcam";
import './BackupCam.css';

const videoConstraints = {
    width: { min: 720 },
    height: { min: 480 },
};

export function BackupCam() {
    const [isLoading, setIsLoading] = useState(true);

    const handleUserMedia = useCallback(() => {
        setIsLoading(false);
    }, []);

    return (
        <div className="cameraWrapper">
            {isLoading && (
                <div className="loadingPlaceholder">
                    Loading camera...
                </div>
            )}
            <Webcam 
                videoConstraints={videoConstraints} 
                width={720} 
                height={480}
                mirrored={true}
                onUserMedia={handleUserMedia}
                style={{ display: isLoading ? 'none' : 'block' }}
            />
        </div>
    );
};

