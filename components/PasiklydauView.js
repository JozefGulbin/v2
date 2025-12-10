
import React from 'react';

export default function PasiklydauView({ lat, lng, onClose }) {
  const handleSignal = () => {
    alert("SOS signalas išsiųstas!");
  };

  const handleUpload = () => {
    alert("Atidaroma kamera...");
  };

  return (
    <div className="absolute inset-0 z-[2000] bg-black/40 backdrop-blur-sm flex items-end justify-center pb-6 px-4">
      
      <button 
        onClick={onClose}
        className="absolute top-4 left-4 bg-white text-slate-800 px-3 py-1.5 rounded-lg shadow font-bold text-sm"
      >
        ← Atgal
      </button>

      <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl animate-slide-up flex flex-col items-center gap-3">
        
        <div className="w-12 h-1.5 bg-slate-100 rounded-full mb-2"></div>
        <h2 className="text-lg font-black text-slate-800">Jūsų koordinatės</h2>
        
        <div className="bg-slate-50 w-full py-3 rounded-xl border border-slate-100 text-center mb-2">
          <div className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Dabartinė vieta</div>
          <div className="text-xl font-mono font-bold text-slate-700">{lat.toFixed(5)}, {lng.toFixed(5)}</div>
        </div>

        <button 
          onClick={handleSignal}
          className="w-full py-3 bg-rose-500 text-white font-bold rounded-xl shadow-lg shadow-rose-100 text-base active:scale-95 transition-transform"
        >
          Siųsti SOS Signalą
        </button>

        <button 
          onClick={handleUpload}
          className="w-full py-3 bg-orange-400 text-white font-bold rounded-xl shadow-lg shadow-orange-100 text-base active:scale-95 transition-transform"
        >
          Įkelti vietovės nuotrauką
        </button>

      </div>
    </div>
  );
}
