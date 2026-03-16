import React from 'react';
import './MobileMapLayout.css'; // Ensure you create a CSS file for styling

const MobileMapLayout = () => {
  return (
    <div className="map-container">
      <div className="floating-buttons">
        <button className="button sos">SOS</button>
        <button className="button gps">GPS</button>
        <button className="button stats">Stats</button>
      </div>
      <div className="bottom-sheet panel">
        <h2>Bottom Sheet Panel</h2>
        <p>Some content goes here.</p>
      </div>
    </div>
  );
};

export default MobileMapLayout;
