import React from 'react';

const ElderlyKidFriendlyNav = () => {
    return (
        <nav style={{
            display: 'flex',
            gap: '10px',
            padding: '15px',
            backgroundColor: '#f5f5f5',
            borderRadius: '8px',
            justifyContent: 'center',
            flexWrap: 'wrap'
        }}>
            <button style={{
                padding: '15px 25px',
                fontSize: '18px',
                fontWeight: 'bold',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                backgroundColor: '#4CAF50',
                color: 'white',
                transition: 'transform 0.2s'
            }}>�� START</button>
            
            <button style={{
                padding: '15px 25px',
                fontSize: '18px',
                fontWeight: 'bold',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                backgroundColor: '#f44336',
                color: 'white',
                transition: 'transform 0.2s'
            }}>🔴 STOP</button>
            
            <button style={{
                padding: '15px 25px',
                fontSize: '18px',
                fontWeight: 'bold',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                backgroundColor: '#ff9800',
                color: 'white',
                transition: 'transform 0.2s'
            }}>🚨 SOS</button>
            
            <button style={{
                padding: '15px 25px',
                fontSize: '18px',
                fontWeight: 'bold',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                backgroundColor: '#2196F3',
                color: 'white',
                transition: 'transform 0.2s'
            }}>⚙️ SETTINGS</button>
        </nav>
    );
};

export default ElderlyKidFriendlyNav;
