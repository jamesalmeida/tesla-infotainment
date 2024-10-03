import React, { useState, useEffect } from 'react';

const dotsContainerStyle = {
  display: 'inline-block',
  width: '15px',
  textAlign: 'left',
  fontFamily: 'monospace'
};

export const useDots = () => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const dotInterval = setInterval(() => {
      setDots(prevDots => {
        if (prevDots.length >= 3) return '';
        return prevDots + '.';
      });
    }, 500);

    return () => clearInterval(dotInterval);
  }, []);

  return <span style={dotsContainerStyle}>{dots}</span>;
};