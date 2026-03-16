import React from 'react';

const SpringLandingPage = () => {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      position: 'relative',
      fontFamily: 'Arial, sans-serif',
      padding: '20px'
    }}>
      {/* Floating Spring Flowers - LOTS of them! */}
      <div style={{ position: 'absolute', top: '5%', left: '10%', fontSize: '40px', opacity: 0.7 }}>🌸</div>
      <div style={{ position: 'absolute', top: '10%', right: '5%', fontSize: '35px', opacity: 0.7 }}>🌸</div>
      <div style={{ position: 'absolute', top: '15%', left: '5%', fontSize: '30px', opacity: 0.7 }}>🌸</div>
      <div style={{ position: 'absolute', top: '20%', right: '15%', fontSize: '38px', opacity: 0.7 }}>🌸</div>
      <div style={{ position: 'absolute', top: '25%', left: '20%', fontSize: '32px', opacity: 0.7 }}>🌸</div>
      <div style={{ position: 'absolute', top: '35%', right: '8%', fontSize: '36px', opacity: 0.7 }}>🌸</div>
      <div style={{ position: 'absolute', top: '40%', left: '8%', fontSize: '34px', opacity: 0.7 }}>🌸</div>
      <div style={{ position: 'absolute', top: '50%', right: '20%', fontSize: '30px', opacity: 0.7 }}>🌸</div>
      <div style={{ position: 'absolute', top: '60%', left: '15%', fontSize: '38px', opacity: 0.7 }}>🌸</div>
      <div style={{ position: 'absolute', top: '70%', right: '12%', fontSize: '35px', opacity: 0.7 }}>🌸</div>
      <div style={{ position: 'absolute', top: '75%', left: '25%', fontSize: '32px', opacity: 0.7 }}>🌸</div>
      <div style={{ position: 'absolute', top: '80%', right: '25%', fontSize: '36px', opacity: 0.7 }}>🌸</div>
      <div style={{ position: 'absolute', top: '85%', left: '5%', fontSize: '30px', opacity: 0.7 }}>🌸</div>
      <div style={{ position: 'absolute', top: '88%', right: '5%', fontSize: '34px', opacity: 0.7 }}>🌸</div>

      {/* MAIN CONTENT */}
      <div style={{ position: 'relative', zIndex: 10 }}>
        {/* Title */}
        <h1 style={{
          fontSize: '48px',
          fontWeight: 'bold',
          margin: '20px 0 10px 0',
          color: '#333'
        }}>
          TapuTapu
        </h1>

        {/* Subtitle with season */}
        <div style={{
          fontSize: '18px',
          color: '#666',
          marginBottom: '30px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          Pavasario Sezona <span style={{ fontSize: '24px' }}>🌸</span>
        </div>

        {/* YELLOW BUTTON BAR */}
        <div style={{
          backgroundColor: '#FFE66D',
          padding: '15px 20px',
          borderRadius: '8px',
          display: 'flex',
          gap: '20px',
          marginBottom: '40px',
          alignItems: 'center',
          width: 'fit-content',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <button style={{
            backgroundColor: 'transparent',
            border: 'none',
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#333',
            cursor: 'pointer',
            padding: '10px 15px',
            borderRadius: '4px',
            transition: 'all 0.3s'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FFD54F')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            EIKIME!
          </button>

          <button style={{
            backgroundColor: 'transparent',
            border: 'none',
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#333',
            cursor: 'pointer',
            padding: '10px 15px',
            borderRadius: '4px',
            transition: 'all 0.3s'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FFD54F')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            MANO MARŠRUTAI
          </button>

          <button style={{
            backgroundColor: 'transparent',
            border: 'none',
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#333',
            cursor: 'pointer',
            padding: '10px 15px',
            borderRadius: '4px',
            transition: 'all 0.3s'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FFD54F')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            Pagalbos!
          </button>
        </div>

        {/* Bottom text */}
        <div style={{
          fontSize: '14px',
          color: '#999',
          marginTop: '60px'
        }}>
          Versija 12.3 Spring Edition
        </div>
      </div>
    </div>
  );
};

export default SpringLandingPage;
