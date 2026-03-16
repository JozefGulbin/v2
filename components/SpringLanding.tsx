import React from 'react';

const SpringLanding: React.FC = () => {
    const buttonStyle = {
        backgroundColor: '#ffcc00', // Warm yellow
        color: '#ffffff',
        padding: '15px 30px',
        fontSize: '22px',
        borderRadius: '5px',
        border: 'none',
        cursor: 'pointer',
    };

    return (
        <div style={{ 
            backgroundColor: '#a2e1c8', // Soft green background
            color: '#ff6347', // Warm pink text
            textAlign: 'center', 
            padding: '50px' 
        }}>
            <h1>Welcome to Spring!</h1>
            <p>Enjoy the season of new beginnings with our cheerful offerings!</p>
            <button style={buttonStyle}>Explore More</button>
            <button style={{ ...buttonStyle, marginLeft: '20px' }}>Join Us</button>
        </div>
    );
};

export default SpringLanding;