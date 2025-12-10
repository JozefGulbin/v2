
import React, { useState, useRef, useEffect } from "react";
import Head from 'next/head';
import { GoogleGenAI, Type } from "@google/genai";
import Link from 'next/link';

// --- Types ---
interface Trail {
  name: string;
  description: string;
  difficulty: "Easy" | "Moderate" | "Hard";
  length: string;
  elevation_gain: string;
  best_season?: string;
}

// --- Helper Components ---

const LoadingSkeleton = () => (
  <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm animate-pulse h-full flex flex-col">
    <div className="flex justify-between items-start mb-4">
      <div className="h-7 bg-slate-200 rounded-md w-3/4"></div>
      <div className="h-6 bg-slate-200 rounded-md w-16"></div>
    </div>
    <div className="space-y-3 mb-6 flex-grow">
      <div className="h-3 bg-slate-100 rounded w-full"></div>
      <div className="h-3 bg-slate-100 rounded w-full"></div>
      <div className="h-3 bg-slate-100 rounded w-2/3"></div>
    </div>
    <div className="flex gap-2 mt-auto pt-4">
      <div className="h-6 bg-slate-100 rounded-full w-16"></div>
      <div className="h-6 bg-slate-100 rounded-full w-16"></div>
    </div>
  </div>
);

const TrailCard: React.FC<{ 
  trail: Trail; 
  index: number; 
  isFavorite: boolean; 
  onToggleFavorite: (trail: Trail) => void 
}> = ({ trail, index, isFavorite, onToggleFavorite }) => {
  
  const getDifficultyColor = (diff: string) => {
    const d = (diff || 'moderate').toLowerCase();
    if (d.includes('easy')) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (d.includes('moderate')) return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-rose-100 text-rose-700 border-rose-200';
  };

  const handleDirections = () => {
    const query = encodeURIComponent(`${trail.name} hiking trail`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div 
      className="group flex flex-col bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-slate-100 h-full relative"
      style={{ animation: `fadeIn 0.5s ease-out forwards`, animationDelay: `${index * 100}ms`, opacity: 0 }}
    >
      {/* Favorite Button */}
      <button 
        onClick={(e) => { e.stopPropagation(); onToggleFavorite(trail); }}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/90 backdrop-blur-sm border border-slate-100 shadow-sm hover:bg-slate-50 transition-all z-10 group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100"
        title={isFavorite ? "Remove from favorites" : "Add to favorites"}
      >
        <svg 
          className={`w-5 h-5 transition-colors duration-300 ${isFavorite ? 'text-rose-500 fill-rose-500' : 'text-slate-400 hover:text-rose-400'}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor" 
          strokeWidth={isFavorite ? 0 : 2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      </button>

      <div className="p-6 flex-grow flex flex-col">
        <div className="flex justify-between items-start gap-3 mb-3 pr-10">
          <h3 className="text-xl font-bold text-slate-800 leading-tight group-hover:text-emerald-700 transition-colors">
            {trail.name}
          </h3>
        </div>
        <div className="mb-4">
           <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${getDifficultyColor(trail.difficulty)}`}>
            {trail.difficulty}
          </span>
        </div>

        <p className="text-slate-600 text-sm leading-relaxed mb-6 flex-grow">
          {trail.description}
        </p>

        <div className="grid grid-cols-2 gap-2 mt-auto">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-100">
            <svg className="w-4 h-4 text-emerald-500" style={{ width: 16, height: 16 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            {trail.elevation_gain}
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-100">
            <svg className="w-4 h-4 text-emerald-500" style={{ width: 16, height: 16 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {trail.length}
          </div>
          {trail.best_season && (
            <div className="col-span-2 flex items-center gap-2 text-xs font-medium text-slate-500 bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-100">
              <svg className="w-4 h-4 text-emerald-500" style={{ width: 16, height: 16 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Best: {trail.best_season}
            </div>
          )}
        </div>
      </div>

      <button
        onClick={handleDirections}
        className="w-full py-3 bg-slate-50 hover:bg-emerald-600 hover:text-white text-slate-600 text-sm font-semibold transition-colors border-t border-slate-100 flex items-center justify-center gap-2"
      >
        View on Maps
        <svg className="w-4 h-4" style={{ width: 16, height: 16 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </button>
    </div>
  );
};

// --- Main Page Component ---

export default function TrailsPage() {
  const [location, setLocation] = useState("");
  const [trails, setTrails] = useState<Trail[]>([]);
  const [favorites, setFavorites] = useState<Trail[]>([]);
  const [view, setView] = useState<'explorer' | 'favorites'>('explorer');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load favorites on mount
  useEffect(() => {
    const saved = localStorage.getItem('taputapu_favorites');
    if (saved) {
      try {
        setFavorites(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load favorites");
      }
    }
  }, []);

  const toggleFavorite = (trail: Trail) => {
    setFavorites(prev => {
      const isFav = prev.some(t => t.name === trail.name);
      let newFavs;
      if (isFav) {
        newFavs = prev.filter(t => t.name !== trail.name);
      } else {
        newFavs = [...prev, trail];
      }
      localStorage.setItem('taputapu_favorites', JSON.stringify(newFavs));
      return newFavs;
    });
  };

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setError("Please enter a location.");
      inputRef.current?.focus();
      return;
    }

    if (!process.env.API_KEY) {
      setError("API Key is missing. Please check settings.");
      return;
    }

    setIsLoading(true);
    setTrails([]);
    setError(null);
    setHasSearched(true);
    setView('explorer'); // Switch back to explorer on search

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const prompt = `Find 6 popular and scenic hiking trails in or near ${searchQuery}. 
      Include a mix of difficulty levels.
      Return JSON data with: name, description (short & catchy), difficulty (Easy/Moderate/Hard), length, elevation_gain, best_season.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are an enthusiastic expert hiking guide. You prioritize safety and accurate details.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              trails: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    description: { type: Type.STRING },
                    difficulty: { type: Type.STRING },
                    length: { type: Type.STRING },
                    elevation_gain: { type: Type.STRING },
                    best_season: { type: Type.STRING },
                  },
                  required: ["name", "description", "difficulty", "length"],
                },
              },
            },
            required: ["trails"],
          },
        }
      });
      
      let text = response.text || "";
      // Robust JSON cleaning
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      
      if (text) {
        const result = JSON.parse(text);
        if (result.trails && result.trails.length > 0) {
          setTrails(result.trails);
        } else {
          setError(`No trails found for "${searchQuery}". Try a different area.`);
        }
      }

    } catch (err: any) {
      console.error("Search Error:", err);
      setError("Unable to fetch trails. Please try again. " + (err.message || ""));
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(location);
  };

  const handleLocationClick = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported.");
      return;
    }
    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation("My Current Location");
        performSearch(`latitude ${pos.coords.latitude}, longitude ${pos.coords.longitude}`);
      },
      () => {
        setIsLoading(false);
        setError("Location access denied. Please type a location.");
      }
    );
  };

  const displayedTrails = view === 'explorer' ? trails : favorites;

  return (
    <div className="min-h-screen flex flex-col bg-[#fafafa] font-sans text-slate-900">
      <Head>
        <title>TapuTapu | AI Trail Finder</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
          body { background-color: #FAFAFA; color: #1e293b; }
        `}</style>
      </Head>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 cursor-pointer">
            <div className="bg-emerald-600 text-white p-1.5 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6" style={{ width: 24, height: 24 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-800">TapuTapu</span>
          </Link>
          <nav className="hidden md:flex gap-8 text-sm font-medium text-slate-500 items-center">
            <button 
              onClick={() => setView('explorer')} 
              className={`${view === 'explorer' ? 'text-emerald-600' : 'hover:text-emerald-600'} transition-colors`}
            >
              Explorer
            </button>
            <button 
              onClick={() => setView('favorites')}
              className={`${view === 'favorites' ? 'text-emerald-600' : 'hover:text-emerald-600'} transition-colors flex items-center gap-1`}
            >
              Favorites
              {favorites.length > 0 && (
                <span className="bg-emerald-100 text-emerald-700 text-[10px] px-1.5 rounded-full h-4 flex items-center justify-center">
                  {favorites.length}
                </span>
              )}
            </button>
            <a href="#" className="hover:text-emerald-600 transition-colors">About</a>
          </nav>
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center w-full">
        <div className="max-w-7xl w-full px-4 sm:px-6 py-12 md:py-20 flex flex-col">
          
          {/* Explorer View */}
          {view === 'explorer' && (
            <>
              {/* Hero / Search Section */}
              <div className={`transition-all duration-700 ease-in-out flex flex-col items-center text-center ${hasSearched ? 'mb-12' : 'min-h-[40vh] justify-center'}`}>
                
                {!hasSearched && (
                  <div className="mb-10 space-y-6 max-w-3xl animate-[fadeIn_0.8s_ease-out]">
                    <h1 className="text-4xl md:text-7xl font-black tracking-tight text-slate-900 leading-tight">
                      Nature is waiting.
                      <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">
                        Find your path.
                      </span>
                    </h1>
                    <p className="text-lg md:text-xl text-slate-500 font-medium leading-relaxed max-w-2xl mx-auto">
                      Discover the perfect hiking trail anywhere in the world, powered by AI.
                    </p>
                  </div>
                )}

                <div className={`w-full max-w-xl relative group z-20 ${hasSearched ? '' : 'animate-[fadeIn_1s_ease-out_0.2s]'}`}>
                  <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
                  <form onSubmit={handleFormSubmit} className="relative bg-white rounded-xl shadow-xl flex items-center p-2 border border-slate-100">
                    <div className="pl-4 text-slate-400">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      ref={inputRef}
                      type="text"
                      className="flex-grow p-4 bg-transparent outline-none text-slate-800 placeholder-slate-400 font-medium"
                      placeholder="Where do you want to hike? (e.g. Kyoto, Yosemite)"
                      value={location}
                      onChange={(e) => {
                        setLocation(e.target.value);
                        if (error) setError(null);
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleLocationClick}
                      className="p-3 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all mr-1"
                      title="Use my location"
                    >
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                    <button 
                      type="submit"
                      disabled={isLoading}
                      className="bg-slate-900 hover:bg-emerald-600 text-white px-8 py-3.5 rounded-lg font-bold transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-lg"
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Exploring...
                        </span>
                      ) : "Search"}
                    </button>
                  </form>
                </div>

                {error && (
                  <div className="mt-6 text-rose-500 bg-rose-50 px-4 py-2 rounded-lg text-sm font-medium border border-rose-100 animate-bounce">
                    {error}
                  </div>
                )}
                
                {/* Suggestions Pills (only show if no search yet) */}
                {!hasSearched && (
                  <div className="mt-8 flex flex-wrap justify-center gap-3 animate-[fadeIn_1s_ease-out_0.4s]">
                    {["Zion National Park", "Swiss Alps", "Patagonia", "Blue Mountains"].map(place => (
                      <button 
                        key={place}
                        onClick={() => { setLocation(place); performSearch(place); }}
                        className="px-4 py-2 bg-white border border-slate-200 rounded-full text-sm font-medium text-slate-500 hover:border-emerald-500 hover:text-emerald-600 transition-colors shadow-sm"
                      >
                        {place}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Results Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                {isLoading && Array(6).fill(0).map((_, i) => (
                  <div key={i} className="h-80"><LoadingSkeleton /></div>
                ))}
                
                {!isLoading && trails.map((trail, index) => (
                  <TrailCard 
                    key={index} 
                    trail={trail} 
                    index={index} 
                    isFavorite={favorites.some(f => f.name === trail.name)}
                    onToggleFavorite={toggleFavorite}
                  />
                ))}
              </div>
            </>
          )}

          {/* Favorites View */}
          {view === 'favorites' && (
             <div className="w-full animate-[fadeIn_0.5s_ease-out]">
               <h2 className="text-3xl font-bold mb-8 text-slate-800">Your Saved Trails</h2>
               {favorites.length === 0 ? (
                 <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
                    <div className="text-6xl mb-4">🏔️</div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">No favorites yet</h3>
                    <p className="text-slate-500 mb-6">Start exploring to save your dream hikes.</p>
                    <button onClick={() => setView('explorer')} className="text-emerald-600 font-bold hover:underline">Go to Explorer</button>
                 </div>
               ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {favorites.map((trail, index) => (
                      <TrailCard 
                        key={index} 
                        trail={trail} 
                        index={index} 
                        isFavorite={true}
                        onToggleFavorite={toggleFavorite}
                      />
                    ))}
                 </div>
               )}
             </div>
          )}

        </div>
      </main>
      
      <footer className="py-8 text-center text-slate-400 text-sm font-medium">
         <p>© {new Date().getFullYear()} TapuTapu. Powered by Google Gemini.</p>
      </footer>
    </div>
  );
}
