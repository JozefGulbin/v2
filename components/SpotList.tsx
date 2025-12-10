
import React from 'react';

interface Spot {
  name: string;
  description: string;
  lat: number;
  lng: number;
  type: 'nature' | 'camping' | 'hiking';
}

interface SpotListProps {
  spots: Spot[];
  onSpotClick: (spot: Spot) => void;
}

export default function SpotList({ spots, onSpotClick }: SpotListProps) {
  if (spots.length === 0) return null;

  return (
    <div className="absolute bottom-8 left-0 right-0 z-[1000] px-4 pb-safe">
      <div className="flex gap-4 overflow-x-auto pb-4 pt-2 snap-x scrollbar-hide">
        {spots.map((spot, i) => (
          <div 
            key={i} 
            className="flex-shrink-0 bg-white p-4 rounded-2xl shadow-xl min-w-[280px] max-w-[320px] snap-center border border-white/50 cursor-pointer hover:scale-[1.02] transition-transform active:scale-95"
            onClick={() => onSpotClick(spot)}
          >
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-bold text-slate-800 text-lg leading-tight">{spot.name}</h4>
              <span className={`text-[10px] font-bold tracking-wider px-2 py-1 rounded-full uppercase
                ${spot.type === 'hiking' ? 'bg-orange-100 text-orange-700' : 
                  spot.type === 'camping' ? 'bg-blue-100 text-blue-700' : 
                  'bg-emerald-100 text-emerald-700'}`}>
                {spot.type}
              </span>
            </div>
            <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">{spot.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
