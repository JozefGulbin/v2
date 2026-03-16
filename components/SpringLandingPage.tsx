import React, { useState } from 'react';

interface SpringLandingPageProps {
  onEikime: () => void;
  onMarsrutai: () => void;
  onSos: () => void;
}

const SpringLandingPage = ({ onEikime, onMarsrutai, onSos }: SpringLandingPageProps) => {
  const [activeTab, setActiveTab] = useState<'eikime' | 'marsrutai' | 'sos'>('eikime');

  return (
    <div style={{
      position: 'absolute',
      inset: '0',
      zIndex: '5000',
      background: 'linear-gradient(to bottom right, #dcfce7, #f0fdf4, #ffffff)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px',
      overflow: 'auto'
    }}>
      {/* Main Card - Width 2, Height 4 (tall block) */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '72px',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)',
        width: '100%',
        maxWidth: '400px',
        aspectRatio: '1 / 2',
        display: 'flex',
        flexDirection: 'column',
        padding: '30px',
        zIndex: '10',
        position: 'relative',
        border: '4px solid white'
      }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '30px'
        }}>
          <h1 style={{
            fontSize: '36px',
            color: '#16a34a',
            margin: '0 0 10px 0',
            fontWeight: 'bold'
          }}>
            🌱 TapuTapu
          </h1>
          <div style={{
            fontSize: '14px',
            color: '#7CB342',
            fontWeight: 'bold',
            letterSpacing: '1px'
          }}>
            PAVASARIO SEZONA
          </div>
        </div>

        {/* Mini Tabs */}
        <div style={{
          display: 'flex',
          gap: '10px',
          marginBottom: '25px',
          borderBottom: '2px solid #E0E0E0'
        }}>
          {/* EIKIME Tab */}
          <button
            onClick={() => setActiveTab('eikime')}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              background: activeTab === 'eikime' ? '#4CAF50' : 'transparent',
              color: activeTab === 'eikime' ? 'white' : '#666',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              borderRadius: '8px 8px 0 0',
              transition: 'all 0.3s',
              textAlign: 'center'
            }}
          >
            📍 EIKIME
          </button>

          {/* MANO MARŠRUTAI Tab */}
          <button
            onClick={() => setActiveTab('marsrutai')}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              background: activeTab === 'marsrutai' ? '#4CAF50' : 'transparent',
              color: activeTab === 'marsrutai' ? 'white' : '#666',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              borderRadius: '8px 8px 0 0',
              transition: 'all 0.3s',
              textAlign: 'center'
            }}
          >
            🗺️ MARŠRUTAI
          </button>

          {/* SOS Tab */}
          <button
            onClick={() => setActiveTab('sos')}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              background: activeTab === 'sos' ? '#FF5252' : 'transparent',
              color: activeTab === 'sos' ? 'white' : '#666',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              borderRadius: '8px 8px 0 0',
              transition: 'all 0.3s',
              textAlign: 'center'
            }}
          >
            🆘 SOS
          </button>
        </div>

        {/* Tab Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          
          {/* EIKIME Content */}
          {activeTab === 'eikime' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: '48px', marginBottom: '20px' }}>📍</div>
              <h2 style={{ color: '#333', marginBottom: '15px', fontSize: '18px' }}>
                START YOUR JOURNEY
              </h2>
              <p style={{ color: '#999', fontSize: '14px', marginBottom: '25px' }}>
                Pin your current location and start walking, cycling, or driving
              </p>
              <button onClick={onEikime} style={{
                width: '100%',
                padding: '15px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s',
                boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#45a049';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#4CAF50';
                e.currentTarget.style.transform = 'translateY(0)';
              }}>
                📍 PIN MY LOCATION
              </button>
            </div>
          )}

          {/* MANO MARŠRUTAI Content */}
          {activeTab === 'marsrutai' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: '48px', marginBottom: '20px' }}>🗺️</div>
              <h2 style={{ color: '#333', marginBottom: '15px', fontSize: '18px' }}>
                MY HIKING TRAILS
              </h2>
              <p style={{ color: '#999', fontSize: '14px', marginBottom: '25px' }}>
                View trails you've recorded and uploaded for future adventures
              </p>
              <button onClick={onMarsrutai} style={{
                width: '100%',
                padding: '15px',
                backgroundColor: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s',
                boxShadow: '0 4px 12px rgba(33, 150, 243, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#1976D2';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#2196F3';
                e.currentTarget.style.transform = 'translateY(0)';
              }}>
                🗺️ VIEW TRAILS
              </button>
            </div>
          )}

          {/* SOS Content */}
          {activeTab === 'sos' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: '48px', marginBottom: '20px' }}>🆘</div>
              <h2 style={{ color: '#333', marginBottom: '15px', fontSize: '18px' }}>
                EMERGENCY SOS
              </h2>
              <p style={{ color: '#999', fontSize: '14px', marginBottom: '15px' }}>
                Share your current GPS coordinates with emergency contacts
              </p>
              <div style={{
                backgroundColor: '#FFF3E0',
                padding: '15px',
                borderRadius: '10px',
                marginBottom: '20px',
                fontSize: '12px',
                color: '#E65100'
              }}>
                📍 Your location will be sent to your configured contacts
              </div>
              <button onClick={onSos} style={{
                width: '100%',
                padding: '15px',
                backgroundColor: '#FF5252',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s',
                boxShadow: '0 4px 12px rgba(255, 82, 82, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#E53935';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#FF5252';
                e.currentTarget.style.transform = 'translateY(0)';
              }}>
                🆘 SEND SOS
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          fontSize: '11px',
          color: '#CCC',
          marginTop: 'auto',
          paddingTop: '20px',
          borderTop: '1px solid #F0F0F0'
        }}>
          v12.3 SPRING EDITION
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-30px) rotate(15deg); }
        }
      `}</style>
    </div>
  );
};

export default SpringLandingPage;
