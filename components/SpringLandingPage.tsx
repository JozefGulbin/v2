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
      background: 'linear-gradient(135deg, #FFF9E6 0%, #FFE6F0 25%, #E8F5E9 50%, #E0F7FA 75%, #F3E5F5 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px',
      overflow: 'auto',
      width: '100%',
      height: '100%'
    }}>
      {/* Floating Spring Elements */}
      <div style={{ position: 'absolute', top: '5%', left: '5%', fontSize: '60px', opacity: 0.4, animation: 'float 6s ease-in-out infinite' }}>🌸</div>
      <div style={{ position: 'absolute', top: '10%', right: '8%', fontSize: '50px', opacity: 0.35, animation: 'float 7s ease-in-out infinite' }}>🌼</div>
      <div style={{ position: 'absolute', top: '20%', left: '12%', fontSize: '55px', opacity: 0.4, animation: 'float 5s ease-in-out infinite' }}>🌸</div>
      <div style={{ position: 'absolute', top: '15%', right: '15%', fontSize: '45px', opacity: 0.35, animation: 'float 8s ease-in-out infinite' }}>🦋</div>
      <div style={{ position: 'absolute', top: '35%', left: '8%', fontSize: '50px', opacity: 0.4, animation: 'float 6.5s ease-in-out infinite' }}>🌼</div>
      <div style={{ position: 'absolute', top: '30%', right: '10%', fontSize: '55px', opacity: 0.35, animation: 'float 7.5s ease-in-out infinite' }}>🌸</div>
      <div style={{ position: 'absolute', bottom: '25%', left: '10%', fontSize: '60px', opacity: 0.4, animation: 'float 5.5s ease-in-out infinite' }}>🌼</div>
      <div style={{ position: 'absolute', bottom: '20%', right: '12%', fontSize: '50px', opacity: 0.35, animation: 'float 7s ease-in-out infinite' }}>🦋</div>
      <div style={{ position: 'absolute', bottom: '10%', left: '15%', fontSize: '55px', opacity: 0.4, animation: 'float 8.5s ease-in-out infinite' }}>🌸</div>
      <div style={{ position: 'absolute', bottom: '15%', right: '8%', fontSize: '45px', opacity: 0.35, animation: 'float 6s ease-in-out infinite' }}>🌼</div>
      <div style={{ position: 'absolute', top: '50%', left: '3%', fontSize: '50px', opacity: 0.3, animation: 'float 9s ease-in-out infinite' }}>🦋</div>
      <div style={{ position: 'absolute', top: '60%', right: '5%', fontSize: '55px', opacity: 0.35, animation: 'float 5.5s ease-in-out infinite' }}>🌸</div>
      <div style={{ position: 'absolute', top: '45%', right: '20%', fontSize: '45px', opacity: 0.3, animation: 'float 7s ease-in-out infinite' }}>🌼</div>
      <div style={{ position: 'absolute', bottom: '35%', left: '20%', fontSize: '50px', opacity: 0.35, animation: 'float 8s ease-in-out infinite' }}>🦋</div>
      <div style={{ position: 'absolute', top: '25%', left: '85%', fontSize: '55px', opacity: 0.4, animation: 'float 6s ease-in-out infinite' }}>🌸</div>
      <div style={{ position: 'absolute', bottom: '30%', left: '88%', fontSize: '50px', opacity: 0.35, animation: 'float 7.5s ease-in-out infinite' }}>🌼</div>
      <div style={{ position: 'absolute', top: '3%', right: '3%', fontSize: '70px', opacity: 0.15 }}>☀️</div>

      {/* Main Card */}
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(10px)',
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
          marginBottom: '25px'
        }}>
          <h1 style={{
            fontSize: '48px',
            color: '#16a34a',
            margin: '0 0 5px 0',
            fontWeight: 'bold',
            textShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            🌱 TapuTapu
          </h1>
          <div style={{
            fontSize: '16px',
            color: '#fff',
            fontWeight: 'bold',
            letterSpacing: '2px',
            backgroundImage: 'linear-gradient(135deg, #7cb342, #4caf50)',
            padding: '8px 16px',
            borderRadius: '20px',
            display: 'inline-block',
            boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)',
            marginTop: '10px'
          }}>
            ✿ PAVASARIO SEZONA ✿
          </div>
        </div>

        {/* Mini Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '20px',
          borderBottom: '3px solid #E0E0E0',
          paddingBottom: '10px'
        }}>
          <button
            onClick={() => setActiveTab('eikime')}
            style={{
              flex: 1,
              padding: '14px 10px',
              border: 'none',
              background: activeTab === 'eikime' ? 'linear-gradient(135deg, #4CAF50, #45a049)' : 'transparent',
              color: activeTab === 'eikime' ? 'white' : '#888',
              fontSize: '15px',
              fontWeight: 'bold',
              cursor: 'pointer',
              borderRadius: '12px 12px 0 0',
              transition: 'all 0.3s ease',
              textAlign: 'center',
              boxShadow: activeTab === 'eikime' ? '0 4px 12px rgba(76, 175, 80, 0.3)' : 'none',
              transform: activeTab === 'eikime' ? 'scale(1.05)' : 'scale(1)'
            }}
          >
            📍 EIKIME
          </button>

          <button
            onClick={() => setActiveTab('marsrutai')}
            style={{
              flex: 1,
              padding: '14px 10px',
              border: 'none',
              background: activeTab === 'marsrutai' ? 'linear-gradient(135deg, #4CAF50, #45a049)' : 'transparent',
              color: activeTab === 'marsrutai' ? 'white' : '#888',
              fontSize: '15px',
              fontWeight: 'bold',
              cursor: 'pointer',
              borderRadius: '12px 12px 0 0',
              transition: 'all 0.3s ease',
              textAlign: 'center',
              boxShadow: activeTab === 'marsrutai' ? '0 4px 12px rgba(76, 175, 80, 0.3)' : 'none',
              transform: activeTab === 'marsrutai' ? 'scale(1.05)' : 'scale(1)'
            }}
          >
            🗺️ MARŠRUTAI
          </button>

          <button
            onClick={() => setActiveTab('sos')}
            style={{
              flex: 1,
              padding: '14px 10px',
              border: 'none',
              background: activeTab === 'sos' ? 'linear-gradient(135deg, #FF6B9D, #FF5252)' : 'transparent',
              color: activeTab === 'sos' ? 'white' : '#888',
              fontSize: '15px',
              fontWeight: 'bold',
              cursor: 'pointer',
              borderRadius: '12px 12px 0 0',
              transition: 'all 0.3s ease',
              textAlign: 'center',
              boxShadow: activeTab === 'sos' ? '0 4px 12px rgba(255, 82, 82, 0.3)' : 'none',
              transform: activeTab === 'sos' ? 'scale(1.05)' : 'scale(1)'
            }}
          >
            🆘 SOS
          </button>
        </div>

        {/* Tab Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          
          {/* EIKIME Content */}
          {activeTab === 'eikime' && (
            <div style={{ textAlign: 'center', padding: '20px 0', animation: 'fadeIn 0.4s ease', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
              {/* BIG PIRMYN BUTTON WITH BOUNCING TEXT */}
              <button onClick={onEikime} style={{
                width: 160,
                height: 160,
                borderRadius: '50%',
                backgroundColor: '#ec4899',
                color: 'white',
                border: '6px solid white',
                boxShadow: '0 20px 60px rgba(236, 72, 153, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontSize: 48,
                fontWeight: 'bold',
                animation: 'bounce 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.12)';
                e.currentTarget.style.boxShadow = '0 30px 80px rgba(236, 72, 153, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 20px 60px rgba(236, 72, 153, 0.4)';
              }}>
                PIRMYN!
              </button>
            </div>
          )}

          {/* MANO MARŠRUTAI Content */}
          {activeTab === 'marsrutai' && (
            <div style={{ textAlign: 'center', padding: '20px 0', animation: 'fadeIn 0.4s ease' }}>
              <div style={{ fontSize: '56px', marginBottom: '15px' }}>🗺️</div>
              <h2 style={{ color: '#2d5016', marginBottom: '12px', fontSize: '20px', fontWeight: 'bold' }}>
                🌿 MY TRAIL COLLECTION
              </h2>
              <p style={{ color: '#7cb342', fontSize: '14px', marginBottom: '25px', lineHeight: '1.6' }}>
                View all the exciting trails you've discovered and recorded! 🌲
              </p>
              <button onClick={onMarsrutai} style={{
                width: '100%',
                padding: '16px',
                backgroundColor: '#66BB6A',
                color: 'white',
                border: 'none',
                borderRadius: '16px',
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s',
                boxShadow: '0 6px 16px rgba(102, 187, 106, 0.4)',
                fontFamily: 'Arial, sans-serif'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#4CAF50';
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(76, 175, 80, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#66BB6A';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 187, 106, 0.4)';
              }}>
                🗺️ VIEW MY TRAILS
              </button>
            </div>
          )}

          {/* SOS Content */}
          {activeTab === 'sos' && (
            <div style={{ textAlign: 'center', padding: '20px 0', animation: 'fadeIn 0.4s ease' }}>
              <div style={{ fontSize: '56px', marginBottom: '15px' }}>🆘</div>
              <h2 style={{ color: '#d32f2f', marginBottom: '12px', fontSize: '20px', fontWeight: 'bold' }}>
                ⚠️ NEED HELP?
              </h2>
              <p style={{ color: '#d32f2f', fontSize: '14px', marginBottom: '15px', lineHeight: '1.6' }}>
                Share your exact location with trusted contacts instantly!
              </p>
              <div style={{
                backgroundColor: '#FFEBEE',
                padding: '12px',
                borderRadius: '12px',
                marginBottom: '20px',
                fontSize: '13px',
                color: '#c62828',
                border: '2px solid #EF5350',
                fontWeight: 'bold'
              }}>
                📍 Your GPS position will be sent right away
              </div>
              <button onClick={onSos} style={{
                width: '100%',
                padding: '16px',
                backgroundColor: '#FF5252',
                color: 'white',
                border: 'none',
                borderRadius: '16px',
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s',
                boxShadow: '0 6px 16px rgba(255, 82, 82, 0.4)',
                fontFamily: 'Arial, sans-serif'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#E53935';
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(255, 82, 82, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#FF5252';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(255, 82, 82, 0.4)';
              }}>
                🆘 SEND SOS NOW
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          fontSize: '12px',
          color: '#9CCC65',
          marginTop: 'auto',
          paddingTop: '20px',
          borderTop: '2px dashed #E0E0E0',
          fontWeight: 'bold'
        }}>
          🌿 v12.3 SPRING EDITION 🌿
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-30px) rotate(15deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
      `}</style>
    </div>
  );
};

export default SpringLandingPage;
