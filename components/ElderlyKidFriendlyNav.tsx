import React from 'react';
import './ElderlyKidFriendlyNav.css';

const ElderlyKidFriendlyNav = () => {
    return (
        <nav className="navigation">
            <button className="nav-button start-button">🟢 START</button>
            <button className="nav-button stop-button">🔴 STOP</button>
            <button className="nav-button sos-button">🚨 SOS</button>
            <button className="nav-button settings-button">⚙️ SETTINGS</button>
        </nav>
    );
};

export default ElderlyKidFriendlyNav;