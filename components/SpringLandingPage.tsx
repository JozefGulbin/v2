import React from 'react';

const SpringLandingPage = () => {
    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E8F5E9', position: 'relative', fontFamily: 'Arial, sans-serif', overflow: 'hidden' }}>
            {/* Floating Spring Flowers */}
            <div style={{ position: 'absolute', top: '5%', left: '8%', fontSize: '45px', opacity: 0.6, animation: 'float 4s ease-in-out infinite' }}>🌸</div>
            <div style={{ position: 'absolute', top: '8%', right: '10%', fontSize: '40px', opacity: 0.6, animation: 'float 5s ease-in-out infinite' }}>🌸</div>
            <div style={{ position: 'absolute', top: '15%', left: '5%', fontSize: '38px', opacity: 0.6, animation: 'float 6s ease-in-out infinite' }}>🌸</div>
            <div style={{ position: 'absolute', top: '25%', right: '8%', fontSize: '42px', opacity: 0.6, animation: 'float 7s ease-in-out infinite' }}>🌸</div>
            <div style={{ position: 'absolute', top: '35%', left: '12%', fontSize: '40px', opacity: 0.6, animation: 'float 5.5s ease-in-out infinite' }}>🌸</div>
            <div style={{ position: 'absolute', top: '45%', right: '15%', fontSize: '38px', opacity: 0.6, animation: 'float 6.5s ease-in-out infinite' }}>🌸</div>
            <div style={{ position: 'absolute', top: '60%', left: '10%', fontSize: '42px', opacity: 0.6, animation: 'float 7.5s ease-in-out infinite' }}>🌸</div>
            <div style={{ position: 'absolute', top: '70%', right: '12%', fontSize: '40px', opacity: 0.6, animation: 'float 4.5s ease-in-out infinite' }}>🌸</div>
            <div style={{ position: 'absolute', top: '80%', left: '20%', fontSize: '38px', opacity: 0.6, animation: 'float 5.5s ease-in-out infinite' }}>🌸</div>
            <div style={{ position: 'absolute', top: '85%', right: '20%', fontSize: '42px', opacity: 0.6, animation: 'float 6.5s ease-in-out infinite' }}>🌸</div>

            {/* Main Card */}
            <div style={{ backgroundColor: 'white', borderRadius: '30px', padding: '60px 50px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', textAlign: 'center', maxWidth: '500px', zIndex: 10 }}>
                
                {/* Title */}
                <h1 style={{ fontSize: '52px', color: '#1976D2', margin: '0 0 20px 0', fontWeight: 'bold', letterSpacing: '-1px' }}>🌱 TapuTapu</h1>
                
                {/* Season Badge */}
                <div style={{ display: 'inline-block', backgroundColor: '#1976D2', color: 'white', padding: '12px 24px', borderRadius: '25px', fontSize: '14px', fontWeight: 'bold', marginBottom: '40px', letterSpacing: '1px' }}>
                    PAVASARIO METAS 🌸
                </div>
                
                {/* Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    
                    {/* EIKIME Button - Blue */}
                    <button style={{ padding: '18px', fontSize: '20px', fontWeight: 'bold', border: 'none', borderRadius: '15px', backgroundColor: '#1976D2', color: 'white', cursor: 'pointer', transition: 'all 0.3s', boxShadow: '0 4px 15px rgba(25,118,210,0.3)' }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#1565C0';
                            e.currentTarget.style.transform = 'translateY(-3px)';
                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(25,118,210,0.4)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#1976D2';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 15px rgba(25,118,210,0.3)';
                        }}>
                        EIKIME!
                    </button>
                    
                    {/* MANO MARŠRUTAI Button - Dark Gray */}
                    <button style={{ padding: '18px', fontSize: '20px', fontWeight: 'bold', border: 'none', borderRadius: '15px', backgroundColor: '#455A64', color: 'white', cursor: 'pointer', transition: 'all 0.3s', boxShadow: '0 4px 15px rgba(69,90,100,0.3)' }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#37474F';
                            e.currentTarget.style.transform = 'translateY(-3px)';
                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(69,90,100,0.4)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#455A64';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 15px rgba(69,90,100,0.3)';
                        }}>
                        MANO MARŠRUTAI
                    </button>
                    
                    {/* PAGALBOS Button - Pink/Red */}
                    <button style={{ padding: '18px', fontSize: '20px', fontWeight: 'bold', border: 'none', borderRadius: '15px', backgroundColor: '#E91E63', color: 'white', cursor: 'pointer', transition: 'all 0.3s', boxShadow: '0 4px 15px rgba(233,30,99,0.3)' }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#C2185B';
                            e.currentTarget.style.transform = 'translateY(-3px)';
                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(233,30,99,0.4)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#E91E63';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 15px rgba(233,30,99,0.3)';
                        }}>
                        PAGALBOS!
                    </button>
                </div>
                
                {/* Version Text */}
                <div style={{ marginTop: '40px', fontSize: '12px', color: '#BDBDBD', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                    VERSIJA 12.3 SPRING EDITION
                </div>
            </div>
            
            {/* Float Animation */}
            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    50% { transform: translateY(-30px) rotate(10deg); }
                }
            `}</style>
        </div>
    );
};

export default SpringLandingPage;
