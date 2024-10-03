import React from 'react';
import YouTube from 'react-youtube';
import './Dashcam.css';

export function Dashcam() {
    // YouTube video options
    const opts = {
        height: '100%',
        width: '100%',
        playerVars: {
            // https://developers.google.com/youtube/player_parameters
            autoplay: 1,
            cc_load_policy: 0, // Disable captions
            controls: 0,  // toggle hiding controls
            disablekb: 0, // Disable keyboard controls
            end: 355,      // End at 5:55
            fs: 0,        // Disable fullscreen button
            iv_load_policy: 3, // Hide video information
            loop: 1,      // Loop the video
            modestbranding: 1, // Minimal YouTube branding
            mute: 1,      // Mute the video by default
            playlist: 'wTS-OF_zrZ8', // Required for looping, use the same video ID
            rel: 0,       // Don't show related videos
            start: 24,    // Start at 24 seconds
        },
    };

    // YouTube video ID
    const videoId = '5gFR3sMWSO0'; // Video ID for speicific video to play on load.

    return (
        <div className="dashcam-container">
            <h2>Dashcam Footage</h2>
            <YouTube className="dashcam-video" videoId={videoId} opts={opts} />
        </div>
    );
}