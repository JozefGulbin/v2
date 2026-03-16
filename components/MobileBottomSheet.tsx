import React from 'react';

const MobileMapLayout = () => {
  const [isStatsOpen, setIsStatsOpen] = React.useState(false);

  const handleSOSClick = () => {
    alert('SOS activated!');
  };

  const handleGPSClick = () => {
    alert('GPS recenter!');
  };

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100vh',
      overflow: 'hidden'
    }}>
      {/* Map Component would be here */}
      <div style={{
        flex: 1,
        backgroundColor: '#f0f0f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '18px',
        color: '#666'
      }}>
        Map Container
      </div>

      {/* Floating Buttons */}
      <button
        onClick={handleSOSClick}
        style={{
          position: 'absolute',
          bottom: '110px',
          right: '20px',
          backgroundColor: '#f0c14b',
          padding: '10px 14px',
          borderRadius: '50%',
          border: 'none',
          cursor: 'pointer',
          fontWeight: 'bold',
          width: '50px',
          height: '50px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        SOS
      </button>

      <button
        onClick={handleGPSClick}
        style={{
          position: 'absolute',
          bottom: '55px',
          right: '20px',
          backgroundColor: '#f0c14b',
          padding: '10px 14px',
          borderRadius: '50%',
          border: 'none',
          cursor: 'pointer',
          fontWeight: 'bold',
          width: '50px',
          height: '50px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        GPS
      </button>

      <button
        onClick={() => setIsStatsOpen(!isStatsOpen)}
        style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          backgroundColor: '#f0c14b',
          padding: '10px 14px',
          borderRadius: '50%',
          border: 'none',
          cursor: 'pointer',
          fontWeight: 'bold',
          width: '50px',
          height: '50px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        📊
      </button>

      {/* Bottom Sheet Stats Panel */}
      {isStatsOpen && (
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'white',
          padding: '20px',
          borderTop: '1px solid #ccc',
          boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
          maxHeight: '450px',
          overflowY: 'auto',
          zIndex: 100
        }}>
          <h3>Your Stats</h3>
          <p>Stats content here...</p>
          <button
            onClick={() => setIsStatsOpen(false)}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};

export default MobileMapLayout;
