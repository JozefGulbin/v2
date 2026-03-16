import React, { useState } from 'react';

interface SpringLandingPageProps {
  onTransportModeSelect: (mode: 'walking' | 'cycling' | 'driving') => void;
  onNavigateToMap: () => void;
}

const SpringLandingPage: React.FC<SpringLandingPageProps> = ({
  onTransportModeSelect,
  onNavigateToMap,
}) => {
  const [selectedMode, setSelectedMode] = useState<'walking' | 'cycling' | 'driving'>('walking');

  const handleModeSelect = (mode: 'walking' | 'cycling' | 'driving') => {
    setSelectedMode(mode);
    onTransportModeSelect(mode);
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: '#f0f8f0',
      fontFamily: 'Arial, sans-serif',
      overflow: 'hidden'
    }}>
      {/* LEFT SIDEBAR - YELLOW */}
      <div style={{
        width: '200px',
        backgroundColor: '#FFE66D',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '30px',
        boxShadow: '2px 0 8px rgba(0,0,0,0.1)'
      }}>
        {/* Logo/Icon */}
        <div style={{
          fontSize: '40px',
          marginTop: '10px'
        }}>
          🌱
        </div>

        {/* Transport Mode Icons */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          alignItems: 'center'
        }}>
          <button
            onClick={() => handleModeSelect('walking')}
            style={{
              background: selectedMode === 'walking' ? '#4CAF50' : 'transparent',
              border: selectedMode === 'walking' ? '2px solid #2E7D32' : '2px solid #999',
              borderRadius: '8px',
              padding: '15px',
              fontSize: '28px',
              cursor: 'pointer',
              transition: 'all 0.3s',
              color: selectedMode === 'walking' ? 'white' : 'black'
            }}
            title="Walking"
          >
            🚶
          </button>

          <button
            onClick={() => handleModeSelect('cycling')}
            style={{
              background: selectedMode === 'cycling' ? '#4CAF50' : 'transparent',
              border: selectedMode === 'cycling' ? '2px solid #2E7D32' : '2px solid #999',
              borderRadius: '8px',
              padding: '15px',
              fontSize: '28px',
              cursor: 'pointer',
              transition: 'all 0.3s',
              color: selectedMode === 'cycling' ? 'white' : 'black'
            }}
            title="Cycling"
          >
            🚴
          </button>

          <button
            onClick={() => handleModeSelect('driving')}
            style={{
              background: selectedMode === 'driving' ? '#4CAF50' : 'transparent',
              border: selectedMode === 'driving' ? '2px solid #2E7D32' : '2px solid #999',
              borderRadius: '8px',
              padding: '15px',
              fontSize: '28px',
              cursor: 'pointer',
              transition: 'all 0.3s',
              color: selectedMode === 'driving' ? 'white' : 'black'
            }}
            title="Driving"
          >
            🚗
          </button>
        </div>

        {/* Bottom Labels */}
        <div style={{
          marginTop: 'auto',
          textAlign: 'center',
          fontSize: '12px',
          fontWeight: 'bold',
          color: '#333'
        }}>
          <div>Išrašinėti</div>
          <div style={{ marginTop: '8px' }}>+TAŠKAS</div>
          <div style={{ marginTop: '8px' }}>AŠ ČIA</div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Floating spring flowers background */}
        <div style={{
          position: 'absolute',
          top: '10%',
          left: '10%',
          fontSize: '40px',
          opacity: 0.6,
          animation: 'float 6s ease-in-out infinite'
        }}>
          🌸
        </div>
        <div style={{
          position: 'absolute',
          top: '20%',
          right: '15%',
          fontSize: '40px',
          opacity: 0.6,
          animation: 'float 7s ease-in-out infinite'
        }}>
          🌼
        </div>
        <div style={{
          position: 'absolute',
          bottom: '20%',
          left: '20%',
          fontSize: '40px',
          opacity: 0.6,
          animation: 'float 8s ease-in-out infinite'
        }}>
          🌷
        </div>
        <div style={{
          position: 'absolute',
          bottom: '15%',
          right: '10%',
          fontSize: '40px',
          opacity: 0.6,
          animation: 'float 9s ease-in-out infinite'
        }}>
          🌺
        </div>

        {/* CENTER CARD */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '20px',
          padding: '50px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
          textAlign: 'center',
          maxWidth: '500px',
          zIndex: 10
        }}>
          {/* Header */}
          <h1 style={{
            fontSize: '48px',
            color: '#1976D2',
            margin: '0 0 20px 0',
            fontWeight: 'bold'
          }}>
            🌿 TapuTapu
          </h1>

          <p style={{
            fontSize: '14px',
            color: '#999',
            marginBottom: '30px',
            fontWeight: 'bold',
            letterSpacing: '1px'
          }}>
            ŽIEMOS METAS 🌱
          </p>

          {/* Main Buttons */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '15px'
          }}>
            <button
              onClick={onNavigateToMap}
              style={{
                padding: '20px',
                fontSize: '18px',
                fontWeight: 'bold',
                border: 'none',
                borderRadius: '12px',
                backgroundColor: '#1976D2',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.3s',
                boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)'
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1565C0';
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1976D2';
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
              }}
            >
              EIKIME!
            </button>

            <button
              style={{
                padding: '20px',
                fontSize: '18px',
                fontWeight: 'bold',
                border: 'none',
                borderRadius: '12px',
                backgroundColor: '#455A64',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.3s',
                boxShadow: '0 4px 12px rgba(69, 90, 100, 0.3)'
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#37474F';
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#455A64';
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
              }}
            >
              MANO MARŠRUTAI
            </button>

            <button
              style={{
                padding: '20px',
                fontSize: '18px',
                fontWeight: 'bold',
                border: 'none',
                borderRadius: '12px',
                backgroundColor: '#E91E63',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.3s',
                boxShadow: '0 4px 12px rgba(233, 30, 99, 0.3)'
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#C2185B';
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#E91E63';
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
              }}
            >
              PAGALBOS!
            </button>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          position: 'absolute',
          bottom: '20px',
          fontSize: '12px',
          color: '#999',
          zIndex: 10
        }}>
          VERSIJA 12.3 SPRING EDITION
        </div>

        {/* CSS Animation */}
        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
          }
        `}</style>
      </div>
    </div>
  );
};

export default SpringLandingPage;
