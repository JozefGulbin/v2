
import React, { useState, useEffect, useRef } from "react";
import Head from 'next/head';
import PasiklydauView from "../components/PasiklydauView";

type ViewMode = 'landing' | 'map' | 'lost';
type TransportMode = 'walking' | 'cycling' | 'driving';

export default function MapPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('landing');
  const [transportMode, setTransportMode] = useState<TransportMode>('walking');
  const [routeStats, setRouteStats] = useState<{ dist: string; time: string } | null>(null);
  
  // State for UI rendering
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsError, setGpsError] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState(false);
  
  // Refs for logic (avoid stale closures in Leaflet callbacks)
  const userLocationRef = useRef<{ lat: number; lng: number } | null>(null);
  const mapRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const destMarkerRef = useRef<any>(null);
  const tempMarkerRef = useRef<any>(null); // Marker for the selected point (before route)
  const routeLineRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Sync Ref with State
  useEffect(() => {
    userLocationRef.current = userLocation;
    
    // If we have a user marker, update its position
    if (userLocation && mapRef.current) {
      updateUserMarker(userLocation.lat, userLocation.lng);
    }
  }, [userLocation]);

  // --- HELPER: Calculate Distance & Time ---
  const calculateRouteStats = (start: {lat: number, lng: number}, end: {lat: number, lng: number}) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(end.lat - start.lat);
    const dLon = deg2rad(end.lng - start.lng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(start.lat)) * Math.cos(deg2rad(end.lat)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = R * c; // Distance in km

    // Estimate speeds (km/h)
    let speed = 5;
    if (transportMode === 'cycling') speed = 20;
    if (transportMode === 'driving') speed = 50;

    const timeHours = distanceKm / speed;
    const hours = Math.floor(timeHours);
    const minutes = Math.round((timeHours - hours) * 60);

    let timeString = "";
    if (hours > 0) timeString += `${hours}h `;
    timeString += `${minutes}m`;

    setRouteStats({
      dist: `${distanceKm.toFixed(2)} km`,
      time: timeString
    });
  };

  const deg2rad = (deg: number) => {
    return deg * (Math.PI / 180);
  };

  // --- MAP INITIALIZATION ---
  const initMap = () => {
    if (typeof window === 'undefined' || !(window as any).L || !mapContainerRef.current) return;
    
    const L = (window as any).L;

    // If map already exists, just resize it
    if (mapRef.current) {
      setTimeout(() => mapRef.current.invalidateSize(), 600); // Wait for transition
      return;
    }

    // Default center (will be updated by GPS)
    const defaultCenter = [54.6872, 25.2797]; 
    const startCenter = userLocationRef.current 
      ? [userLocationRef.current.lat, userLocationRef.current.lng] 
      : defaultCenter;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      tap: false // Fix mobile click delay
    }).setView(startCenter, 13);

    L.control.zoom({
      position: 'topleft'
    }).addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19
    }).addTo(map);

    // --- CLICK HANDLER (UPDATED) ---
    // Instead of a popup, we set state to render a React Component
    map.on('click', (e: any) => {
      const { lat, lng } = e.latlng;
      
      // Update React State
      setSelectedPoint({ lat, lng });
      setRouteStats(null); // Clear previous route stats if any

      // Visual feedback: Add a temporary marker
      if (tempMarkerRef.current) tempMarkerRef.current.remove();
      
      const tempIcon = L.divIcon({
        className: 'custom-temp-icon',
        html: `<div class="w-4 h-4 bg-white border-4 border-gray-800 rounded-full shadow-lg transform -translate-x-1/2 -translate-y-1/2"></div>`,
        iconSize: [0, 0] // Handled by html
      });
      
      tempMarkerRef.current = L.marker([lat, lng], { icon: tempIcon }).addTo(map);
      
      // Also remove old route if clicking a new spot
      if (routeLineRef.current) {
        routeLineRef.current.remove();
        routeLineRef.current = null;
      }
      if (destMarkerRef.current) {
        destMarkerRef.current.remove();
        destMarkerRef.current = null;
      }
    });

    mapRef.current = map;
    
    // Initial user marker render
    if (userLocationRef.current) {
      updateUserMarker(userLocationRef.current.lat, userLocationRef.current.lng);
      map.setView([userLocationRef.current.lat, userLocationRef.current.lng], 15);
    }
    
    // Fix gray tiles issue by forcing resize calculation after fade-in
    setTimeout(() => {
      map.invalidateSize();
    }, 600);
  };

  const updateUserMarker = (lat: number, lng: number) => {
    const L = (window as any).L;
    if (!mapRef.current || !L) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([lat, lng]);
    } else {
      const userIcon = L.divIcon({
        className: 'custom-user-icon',
        html: `
          <div class="relative flex h-6 w-6">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-6 w-6 bg-blue-500 border-2 border-white shadow-lg"></span>
          </div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });
      userMarkerRef.current = L.marker([lat, lng], { icon: userIcon, zIndexOffset: 1000 }).addTo(mapRef.current);
    }
  };

  const handleStartNavigation = () => {
    if (!selectedPoint) return;
    
    // Use REF to get the absolute latest location, avoiding state closure issues
    const currentLoc = userLocationRef.current;

    if (!currentLoc) {
      // If we somehow still don't have location, force a fetch
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition((pos) => {
         const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
         setUserLocation(newLoc);
         userLocationRef.current = newLoc;
         setIsLocating(false);
         handleCreateRoute(newLoc, selectedPoint);
         finishSelection();
      }, (err) => {
         alert("Nepavyko nustatyti jūsų vietos. Patikrinkite GPS nustatymus.");
         setIsLocating(false);
      });
      return;
    }

    // Create the route immediately
    handleCreateRoute(currentLoc, selectedPoint);
    finishSelection();
  };

  const finishSelection = () => {
    // UI Cleanup
    setSelectedPoint(null); // Hide the selection card, show stats instead
    if (tempMarkerRef.current) {
      tempMarkerRef.current.remove();
      tempMarkerRef.current = null;
    }
  };

  const handleCreateRoute = (start: {lat: number, lng: number}, dest: { lat: number; lng: number }) => {
    const L = (window as any).L;
    if (!mapRef.current) return;

    // 1. Add Destination Marker
    if (destMarkerRef.current) destMarkerRef.current.remove();
    
    const destIcon = L.divIcon({
      html: `<div class="text-4xl filter drop-shadow-lg transform -translate-y-4">🏁</div>`,
      className: 'bg-transparent',
      iconSize: [40, 40],
      iconAnchor: [20, 40]
    });
    
    destMarkerRef.current = L.marker([dest.lat, dest.lng], { icon: destIcon }).addTo(mapRef.current);

    // 2. Draw Route Line
    if (routeLineRef.current) routeLineRef.current.remove();
    
    const latlngs = [
      [start.lat, start.lng],
      [dest.lat, dest.lng]
    ];
    
    const isWalking = transportMode === 'walking';
    
    routeLineRef.current = L.polyline(latlngs, { 
      color: isWalking ? '#10b981' : '#3b82f6', 
      weight: 6, 
      opacity: 0.9,
      dashArray: isWalking ? '10, 15' : null,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(mapRef.current);

    // 3. Zoom map to fit
    mapRef.current.fitBounds(L.latLngBounds(latlngs), { 
      padding: [80, 80]
    });

    calculateRouteStats(start, dest);
  };

  // Recalculate if transport mode changes
  useEffect(() => {
    if (routeLineRef.current && userLocationRef.current && destMarkerRef.current) {
      // Update line style
      const isWalking = transportMode === 'walking';
      routeLineRef.current.setStyle({
        color: isWalking ? '#10b981' : '#3b82f6',
        dashArray: isWalking ? '10, 15' : null
      });

      const destLatLng = destMarkerRef.current.getLatLng();
      calculateRouteStats(userLocationRef.current, { lat: destLatLng.lat, lng: destLatLng.lng });
    }
  }, [transportMode]);

  // --- MANUAL FALLBACK ---
  const forceDemoLocation = () => {
    console.log("Forcing demo location");
    const demoLoc = { lat: 54.6872, lng: 25.2797 }; // Vilnius Center
    setUserLocation(demoLoc);
    setGpsError(true);
    
    if (mapRef.current) {
       updateUserMarker(demoLoc.lat, demoLoc.lng);
       mapRef.current.setView([demoLoc.lat, demoLoc.lng], 14);
    }
  };

  // --- GPS LOGIC ---
  useEffect(() => {
    if (viewMode === 'map' || viewMode === 'lost') {
      
      let timer: NodeJS.Timeout;

      // Initialize map container
      if (!mapRef.current) {
        setTimeout(initMap, 100);
      } else {
        // Wait for transition to finish before resizing
        setTimeout(() => mapRef.current?.invalidateSize(), 600);
      }

      if (!navigator.geolocation) {
        console.warn("Geolocation not supported by browser");
        forceDemoLocation();
        return;
      }

      // 1. Set a quicker "Giving Up" timer (3 seconds)
      timer = setTimeout(() => {
        if (!userLocationRef.current) {
          console.warn("GPS timeout - forcing fallback");
          forceDemoLocation();
        }
      }, 3000);

      const handleSuccess = (pos: GeolocationPosition) => {
        // Clear timeout immediately on success
        clearTimeout(timer);
        
        const { latitude, longitude } = pos.coords;
        const isFirstLocation = !userLocationRef.current;
        
        // Update state and ref
        setUserLocation({ lat: latitude, lng: longitude });
        userLocationRef.current = { lat: latitude, lng: longitude };
        setGpsError(false);
        
        if (mapRef.current) {
           updateUserMarker(latitude, longitude);
           if (isFirstLocation) {
             mapRef.current.setView([latitude, longitude], 15);
           }
        }
      };

      const handleError = (err: GeolocationPositionError) => {
        console.warn("GPS Error", err);
        // If error happens immediately (e.g. denied), fallback immediately
        if (!userLocationRef.current) {
           forceDemoLocation();
        }
      };

      // 2. Double-Tap Strategy: Call BOTH getCurrentPosition and watchPosition
      // This wakes up the GPS radio faster on some devices
      navigator.geolocation.getCurrentPosition(handleSuccess, handleError, { enableHighAccuracy: true, timeout: 5000 });
      
      const id = navigator.geolocation.watchPosition(
        handleSuccess,
        handleError,
        { 
            enableHighAccuracy: true, 
            maximumAge: 0, 
            timeout: 5000 
        }
      );

      return () => {
        navigator.geolocation.clearWatch(id);
        clearTimeout(timer);
      };
    }
  }, [viewMode]);

  const handleKurEsu = () => {
    setViewMode('map');
  };

  const handlePasiklydau = () => {
    setViewMode('lost');
  };

  // Clean up
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div className="w-full h-screen overflow-hidden font-sans bg-gray-50 relative select-none">
      <Head>
        <title>TapuTapu Navigation</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
      </Head>

      {/* --- LANDING PAGE --- */}
      {viewMode === 'landing' && (
        <div className="flex flex-col items-center justify-center h-full p-6 animate-in fade-in duration-700 bg-white">
          <div className="mb-12 text-center">
            <h1 className="text-6xl font-black text-gray-800 mb-2 tracking-tighter">TapuTapu</h1>
            <p className="text-gray-500 text-lg">Jūsų asmeninis vedlys</p>
          </div>
          
          <div className="flex flex-col gap-6 w-full max-w-xs">
            <button 
              onClick={handleKurEsu}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white text-xl font-bold py-6 rounded-3xl shadow-xl transform transition hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3"
            >
              <span className="text-3xl">🗺️</span> Kur aš esu?
            </button>

            <button 
              onClick={handlePasiklydau}
              className="w-full bg-red-500 hover:bg-red-600 text-white text-xl font-bold py-6 rounded-3xl shadow-xl transform transition hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3"
            >
              <span className="text-3xl">🆘</span> Pasiklydau!
            </button>
          </div>
        </div>
      )}

      {/* --- MAP VIEW --- */}
      <div 
        ref={mapContainerRef} 
        className={`w-full h-full absolute inset-0 z-0 transition-opacity duration-500 ${viewMode !== 'landing' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
      />

      {/* --- BLOCKING LOADER FOR MAP (Wait for GPS) --- */}
      {viewMode === 'map' && !userLocation && (
        <div className="absolute inset-0 z-[2000] bg-white flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 border-4 border-emerald-100 border-t-emerald-500 rounded-full animate-spin mb-6"></div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Ieškoma GPS signalo...</h2>
            <p className="text-gray-500 max-w-xs mx-auto mb-8">Nustatome jūsų buvimo vietą. Tai gali užtrukti kelias sekundes.</p>
            
            <div className="flex flex-col gap-3 w-full max-w-xs">
                 <button 
                  onClick={forceDemoLocation}
                  className="w-full bg-emerald-100 text-emerald-700 font-bold py-3 rounded-xl hover:bg-emerald-200 transition-colors"
                >
                  Naudoti demonstracinę vietą
                </button>
                <button 
                  onClick={() => setViewMode('landing')}
                  className="text-gray-400 font-semibold hover:text-gray-600 transition-colors py-2"
                >
                  Atšaukti
                </button>
            </div>
        </div>
      )}

      {/* --- MAP OVERLAY UI --- */}
      {viewMode === 'map' && userLocation && (
        <>
          {/* Top Bar */}
          <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
            <button 
              onClick={() => {
                setViewMode('landing');
                setSelectedPoint(null);
                setRouteStats(null);
              }}
              className="bg-white/90 backdrop-blur text-gray-700 px-4 py-3 rounded-2xl shadow-lg font-bold hover:bg-white active:scale-95 transition-all w-fit"
            >
              Atgal
            </button>
            {gpsError && (
              <div className="bg-orange-100 text-orange-800 px-3 py-2 rounded-xl text-xs font-bold border border-orange-200 shadow-sm animate-in slide-in-from-left">
                GPS nerastas. Rodoma demonstracinė vieta.
              </div>
            )}
          </div>

          {/* Transport Toggle (only if route exists) */}
          {routeStats && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000]">
               <div className="bg-white/90 backdrop-blur p-1.5 rounded-2xl shadow-lg flex gap-1">
                  <button 
                    onClick={() => setTransportMode('walking')}
                    className={`p-2.5 rounded-xl transition-all ${transportMode === 'walking' ? 'bg-emerald-500 text-white shadow-md' : 'text-gray-400 hover:bg-gray-100'}`}
                  >
                    🚶
                  </button>
                  <button 
                    onClick={() => setTransportMode('cycling')}
                    className={`p-2.5 rounded-xl transition-all ${transportMode === 'cycling' ? 'bg-blue-500 text-white shadow-md' : 'text-gray-400 hover:bg-gray-100'}`}
                  >
                    🚲
                  </button>
                  <button 
                    onClick={() => setTransportMode('driving')}
                    className={`p-2.5 rounded-xl transition-all ${transportMode === 'driving' ? 'bg-indigo-500 text-white shadow-md' : 'text-gray-400 hover:bg-gray-100'}`}
                  >
                    🚗
                  </button>
               </div>
            </div>
          )}

          {/* NEW: Selected Point Card (Replaces Popup) */}
          {selectedPoint && !routeStats && (
             <div className="absolute bottom-6 left-4 right-4 z-[1000] animate-in slide-in-from-bottom-10 fade-in duration-300 flex justify-center">
                <div className="bg-white rounded-3xl p-5 shadow-2xl border border-gray-100 w-full max-w-sm">
                   <h3 className="font-bold text-gray-800 text-lg mb-4 text-center">Pasirinktas taškas</h3>
                   <div className="flex flex-col gap-3">
                      <button 
                        onClick={handleStartNavigation}
                        disabled={isLocating}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-emerald-200 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:bg-gray-300"
                      >
                         {isLocating ? (
                           <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                         ) : (
                           <><span>🚀</span> Naviguoti čia</>
                         )}
                      </button>
                      <button 
                        onClick={() => alert("Kamera atidaroma...")}
                        className="w-full bg-orange-100 hover:bg-orange-200 text-orange-700 py-3.5 rounded-xl font-bold transition-all active:scale-95"
                      >
                        📸 Įkelti vaizdą
                      </button>
                      <button 
                         onClick={() => { setSelectedPoint(null); if(tempMarkerRef.current) tempMarkerRef.current.remove(); }}
                         className="mt-2 text-gray-400 text-sm font-semibold hover:text-gray-600"
                      >
                         Atšaukti
                      </button>
                   </div>
                </div>
             </div>
          )}

          {/* Route Stats Card */}
          {routeStats && (
            <div className="absolute bottom-8 left-4 right-4 z-[1000] animate-in slide-in-from-bottom-10 fade-in duration-300">
              <div className="bg-white rounded-3xl p-5 shadow-2xl border border-gray-100 flex items-center justify-between relative">
                <button 
                   onClick={() => { setRouteStats(null); if(routeLineRef.current) routeLineRef.current.remove(); if(destMarkerRef.current) destMarkerRef.current.remove(); }}
                   className="absolute -top-3 -right-3 bg-white text-gray-400 p-2 rounded-full shadow-md hover:text-red-500 w-8 h-8 flex items-center justify-center font-bold"
                >
                  ✕
                </button>
                <div>
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Atstumas</p>
                  <p className="text-3xl font-black text-gray-800">{routeStats.dist}</p>
                </div>
                <div className="h-10 w-px bg-gray-200 mx-4"></div>
                <div>
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Laikas</p>
                  <p className="text-3xl font-black text-emerald-500">{routeStats.time}</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* --- PASIKLYDAU OVERLAY --- */}
      {viewMode === 'lost' && userLocation && (
        <PasiklydauView 
          lat={userLocation.lat} 
          lng={userLocation.lng} 
          onClose={() => setViewMode('landing')} 
        />
      )}

      {/* Loading State for Lost Mode (if no GPS yet) */}
      {viewMode === 'lost' && !userLocation && (
        <div className="absolute inset-0 z-[2000] bg-white flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-red-500 rounded-full animate-spin mb-4"></div>
          <h2 className="text-2xl font-bold text-gray-800">Nustatoma jūsų vieta...</h2>
          <p className="text-gray-500 mb-6">Prašome palaukti, ieškome GPS signalo.</p>
           <button 
              onClick={forceDemoLocation}
              className="bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-bold mb-4 hover:bg-gray-200"
            >
              Naudoti demonstracinę vietą
            </button>
          <button onClick={() => setViewMode('landing')} className="text-gray-400 font-semibold underline">Atšaukti</button>
        </div>
      )}

    </div>
  );
}
