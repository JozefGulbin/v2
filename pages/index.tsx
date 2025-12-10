
import React, { useState, useEffect, useRef } from "react";
import Head from 'next/head';
import { useRouter } from 'next/router';
import LostView from "@/components/LostView";

type ViewMode = 'landing' | 'map' | 'lost';
type TransportMode = 'walking' | 'cycling' | 'driving';

interface RouteInfo {
  id: number;
  summary: { totalDistance: number; totalTime: number };
  coordinates: any[];
  name?: string;
  isSelected: boolean;
  isDirect?: boolean;
  routeObj?: any; // Reference to the internal Leaflet route object
}

export default function MapPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('landing');
  const [transportMode, setTransportMode] = useState<TransportMode>('walking');
  const [routes, setRoutes] = useState<RouteInfo[]>([]);
  
  // State for UI
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number, accuracy: number } | null>(null);
  
  // Route Builder State
  const [isBuilderMode, setIsBuilderMode] = useState(false);
  const [waypoints, setWaypoints] = useState<{lat: number, lng: number}[]>([]);

  const [isLocating, setIsLocating] = useState(false);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [notification, setNotification] = useState<{type: 'error' | 'info', msg: string} | null>(null);
  const [isFollowingUser, setIsFollowingUser] = useState(false);
  
  // Refs
  const userLocationRef = useRef<{ lat: number; lng: number } | null>(null);
  const mapRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const accuracyCircleRef = useRef<any>(null);
  const waypointMarkersRef = useRef<any[]>([]);
  const routingControlRef = useRef<any>(null);
  const fallbackPolylineRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const gpsWatchId = useRef<number | null>(null);
  const builderModeRef = useRef(false);
  const destMarkerRef = useRef<any>(null);

  // Sync Ref for builder mode
  useEffect(() => { builderModeRef.current = isBuilderMode; }, [isBuilderMode]);

  // Sync Ref for user location
  useEffect(() => {
    if (userLocation) userLocationRef.current = { lat: userLocation.lat, lng: userLocation.lng };
  }, [userLocation]);

  // Notifications
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // --- MAP INITIALIZATION ---
  const initMap = () => {
    if (typeof window === 'undefined' || !(window as any).L || !mapContainerRef.current) return;
    
    const L = (window as any).L;

    if (mapRef.current) {
        mapRef.current.invalidateSize();
        return; 
    }

    // Init Map
    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([54.6872, 25.2797], 13); // Default view

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Auto-Locate immediately with High Accuracy
    map.locate({ setView: true, maxZoom: 16, enableHighAccuracy: true });

    map.on('locationfound', (e: any) => {
        const { lat, lng } = e.latlng;
        if (!userLocationRef.current) {
             const newLoc = { lat, lng, accuracy: e.accuracy };
             setUserLocation(newLoc);
             updateUserMarker(lat, lng, e.accuracy);
        }
    });

    map.on('locationerror', (e: any) => {
        console.warn("Leaflet locate error:", e.message);
    });

    // Click handler
    map.on('click', (e: any) => {
      handleMapClick(e.latlng);
    });

    map.on('dragstart', () => setIsFollowingUser(false));

    mapRef.current = map;
    startGpsTracking();
  };

  // --- MAP RENDER LOGIC ---
  useEffect(() => {
      // Initialize map on mount
      setTimeout(initMap, 500); // Slight delay to ensure DOM is ready
  }, []);

  // When switching TO map view, ensure resizing is correct and map is ready
  useEffect(() => {
    if (viewMode === 'map' && mapRef.current) {
        const map = mapRef.current;
        // CRITICAL: Invalidate size to prevent white map
        setTimeout(() => map.invalidateSize(), 100);
        
        // Re-center if we have location
        if (userLocationRef.current && isFollowingUser) {
            map.panTo([userLocationRef.current.lat, userLocationRef.current.lng], { animate: true });
        }
    }
  }, [viewMode]);


  const handleMapClick = (latlng: {lat: number, lng: number}) => {
      // 1. MANUAL GPS FALLBACK
      if (!userLocationRef.current) {
          const newLoc = { lat: latlng.lat, lng: latlng.lng, accuracy: 50 }; 
          setUserLocation(newLoc);
          updateUserMarker(latlng.lat, latlng.lng, 50);
          setNotification({type: 'info', msg: 'Vieta nustatyta rankiniu būdu'});
          return;
      }

      // 2. Routing Logic
      if (builderModeRef.current) {
          addWaypoint(latlng);
          setNotification({type: 'info', msg: 'Tarpinis taškas pridėtas'});
      } else {
          setWaypoints([latlng]);
          setNotification({type: 'info', msg: 'Tikslo vieta nustatyta'});
      }
  };

  const addWaypoint = (point: {lat: number, lng: number}) => {
      setWaypoints(prev => [...prev, point]);
  };

  const clearWaypoints = () => {
      setWaypoints([]);
      cleanupRouting();
      waypointMarkersRef.current.forEach(m => m.remove());
      waypointMarkersRef.current = [];
      if (destMarkerRef.current) {
          destMarkerRef.current.remove();
          destMarkerRef.current = null;
      }
  };

  const undoLastWaypoint = () => {
      setWaypoints(prev => prev.slice(0, -1));
  };

  // --- ROUTING CORE ---
  const updateRoute = (points: {lat: number, lng: number}[]) => {
      const L = (window as any).L;
      if (!mapRef.current) return;

      // 1. Clear old markers visual
      waypointMarkersRef.current.forEach(m => m.remove());
      waypointMarkersRef.current = [];
      if (destMarkerRef.current) {
          destMarkerRef.current.remove();
          destMarkerRef.current = null;
      }

      // 2. Draw Markers
      points.forEach((pt, index) => {
          const letter = String.fromCharCode(65 + index);
          const icon = L.divIcon({
              className: 'bg-transparent',
              html: `<div class="relative">
                        <div class="w-6 h-6 bg-slate-800 text-white rounded-full flex items-center justify-center text-xs font-bold border-2 border-white shadow-md -translate-x-1/2 -translate-y-1/2 transform active:scale-110 transition-transform">
                            ${letter}
                        </div>
                     </div>`,
              iconSize: [0, 0]
          });
          const marker = L.marker([pt.lat, pt.lng], { icon, draggable: true }).addTo(mapRef.current);
          
          marker.on('dragend', (e: any) => {
              const newPos = e.target.getLatLng();
              setWaypoints(current => {
                  const updated = [...current];
                  updated[index] = { lat: newPos.lat, lng: newPos.lng };
                  return updated;
              });
          });

          waypointMarkersRef.current.push(marker);
      });

      // 3. Trigger Route Calculation
      if (points.length === 0) {
          cleanupRouting();
          return;
      }

      if (!userLocationRef.current) {
          setNotification({type: 'error', msg: 'Spustelėkite žemėlapį, kad nustatytumėte savo vietą'});
          return;
      }

      const routePoints = [userLocationRef.current, ...points];
      executeRouteCreation(routePoints);
  };

  useEffect(() => {
      if (waypoints.length > 0) {
          updateRoute(waypoints);
      } else {
          cleanupRouting();
          waypointMarkersRef.current.forEach(m => m.remove());
          waypointMarkersRef.current = [];
          if (destMarkerRef.current) {
              destMarkerRef.current.remove();
              destMarkerRef.current = null;
          }
      }
  }, [waypoints, transportMode]);


  // --- GPS LOGIC ---
  const startGpsTracking = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);

    if (gpsWatchId.current) navigator.geolocation.clearWatch(gpsWatchId.current);

    const onGeoSuccess = (pos: GeolocationPosition) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const newLoc = { lat: latitude, lng: longitude, accuracy };
        
        setUserLocation(newLoc);
        setIsLocating(false);
        updateUserMarker(latitude, longitude, accuracy);

        if (isFollowingUser && mapRef.current) {
            mapRef.current.panTo([latitude, longitude], { animate: true });
        }
    };

    const onGeoError = (err: any) => {
        setIsLocating(false);
    };

    navigator.geolocation.getCurrentPosition(onGeoSuccess, onGeoError, { enableHighAccuracy: true });
    gpsWatchId.current = navigator.geolocation.watchPosition(onGeoSuccess, onGeoError, { 
        enableHighAccuracy: true, 
        timeout: 20000 
    });
  };

  const updateUserMarker = (lat: number, lng: number, accuracy: number) => {
    const L = (window as any).L;
    if (!mapRef.current || !L) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([lat, lng]);
    } else {
      const userIcon = L.divIcon({
        className: 'bg-transparent',
        html: `
          <div class="relative flex h-4 w-4 -translate-x-1/2 -translate-y-1/2">
            <span class="absolute inline-flex h-full w-full rounded-full bg-blue-500 border-2 border-white shadow-sm"></span>
            <span class="relative inline-flex rounded-full h-4 w-4 bg-blue-600"></span>
          </div>`,
        iconSize: [0, 0]
      });
      userMarkerRef.current = L.marker([lat, lng], { icon: userIcon, zIndexOffset: 1000 }).addTo(mapRef.current);
    }

    if (accuracyCircleRef.current) {
        accuracyCircleRef.current.setLatLng([lat, lng]);
        accuracyCircleRef.current.setRadius(accuracy);
    } else {
        accuracyCircleRef.current = L.circle([lat, lng], {
            radius: accuracy,
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.1,
            weight: 0,
        }).addTo(mapRef.current);
    }
  };

  const reCenterMap = () => {
      if (userLocation && mapRef.current) {
          mapRef.current.setView([userLocation.lat, userLocation.lng], 16, { animate: true });
          setIsFollowingUser(true);
      } else {
          setNotification({type:'info', msg:'Nustatoma vieta...'});
          startGpsTracking();
      }
  };

  // --- ROUTING ENGINE ---
  const cleanupRouting = () => {
      if (routingControlRef.current && mapRef.current) {
          try { mapRef.current.removeControl(routingControlRef.current); } catch(e) {}
          routingControlRef.current = null;
      }
      if (fallbackPolylineRef.current) fallbackPolylineRef.current.remove();
      setRoutes([]);
  };

  const executeRouteCreation = (points: {lat: number, lng: number}[]) => {
    const L = (window as any).L;
    if (!mapRef.current || !L.Routing) return;

    setIsCalculatingRoute(true);
    cleanupRouting(); 

    // OSRM DE Mirrors
    let serviceUrl = 'https://router.project-osrm.org/route/v1';
    let profile = 'car';

    if (transportMode === 'walking') {
        serviceUrl = 'https://routing.openstreetmap.de/routed-foot/route/v1';
        profile = 'driving'; 
    } else if (transportMode === 'cycling') {
        serviceUrl = 'https://routing.openstreetmap.de/routed-bike/route/v1';
        profile = 'driving';
    }

    const waypoints = points.map(p => L.latLng(p.lat, p.lng));

    try {
        const control = L.Routing.control({
          waypoints: waypoints,
          router: L.Routing.osrmv1({ 
              serviceUrl: serviceUrl,
              profile: profile 
          }),
          lineOptions: { 
              styles: [{ color: '#2563eb', opacity: 0.8, weight: 6 }] 
          },
          altLineOptions: {
              styles: [{ color: '#94a3b8', opacity: 0.6, weight: 6 }]
          },
          showAlternatives: true,
          show: false, // Hides the itinerary container
          addWaypoints: false,
          draggableWaypoints: false,
          fitSelectedRoutes: false,
          createMarker: () => null 
        }).addTo(mapRef.current);

        control.on('routesfound', (e: any) => {
            setIsCalculatingRoute(false);
            const foundRoutes = e.routes.map((r: any, i: number) => ({
                id: i,
                summary: r.summary,
                coordinates: r.coordinates,
                name: i === 0 ? "Greičiausias" : `Alternatyva ${i}`,
                isSelected: i === 0,
                isDirect: false,
                routeObj: r
            }));
            setRoutes(foundRoutes);
        });
        
        control.on('routeselected', (e: any) => {
            const selectedRoute = e.route;
            setRoutes(prev => prev.map((r, i) => {
                const match = Math.abs(r.summary.totalDistance - selectedRoute.summary.totalDistance) < 1; 
                return { ...r, isSelected: match };
            }));
        });

        control.on('routingerror', () => {
            console.warn("Routing failed.");
            setNotification({type: 'info', msg: 'Maršrutas nerastas. Rodomas tiesus atstumas.'});
            if(points.length >= 2) drawDirectFallback(points[0], points[points.length-1]);
        });

        routingControlRef.current = control;

    } catch (err) {
        console.error("Routing error", err);
    }
  };

  // Manually Select Route -> Sync with Map
  const selectRoute = (index: number) => {
      if (!routingControlRef.current) return;
      
      const selectedRouteInfo = routes[index];
      if (!selectedRouteInfo) return;

      setRoutes(prev => prev.map((r, i) => ({ ...r, isSelected: i === index })));

      if (selectedRouteInfo.routeObj) {
          try {
             // Wrap in try-catch to prevent classList error if container is hidden
             routingControlRef.current.fire('routeselected', { route: selectedRouteInfo.routeObj });
          } catch (e) {
             // Ignore visual update errors in headless mode
          }
      }
  };

  const drawDirectFallback = (start: any, dest: any) => {
     const L = (window as any).L;
     if (!mapRef.current) return;
     const startLatLng = L.latLng(start.lat, start.lng);
     const destLatLng = L.latLng(dest.lat, dest.lng);
     const dist = startLatLng.distanceTo(destLatLng);
     const speed = transportMode === 'driving' ? 50 : 5; 
     const time = (dist / 1000) / speed * 3600;

     const polyline = L.polyline([startLatLng, destLatLng], {
         color: '#64748b', weight: 4, dashArray: '10, 10', opacity: 0.7
     }).addTo(mapRef.current);
     
     fallbackPolylineRef.current = polyline;
     setRoutes([{
         id: 999,
         summary: { totalDistance: dist, totalTime: time },
         coordinates: [],
         name: "Tiesus",
         isSelected: true,
         isDirect: true
     }]);
     setIsCalculatingRoute(false);
  };

  // --- UI HELPERS ---
  const formatTime = (s: number) => {
      const min = Math.round(s / 60);
      if (min > 60) {
          const h = Math.floor(min/60);
          const m = min%60;
          return `${h} val ${m} min`;
      }
      return `${min} min`;
  };

  const formatDist = (meters: number) => {
      if (meters > 1000) return `${(meters/1000).toFixed(1)} km`;
      return `${Math.round(meters)} m`;
  };

  return (
    <div className="w-full h-screen overflow-hidden bg-slate-50 font-sans touch-none select-none text-slate-900">
      <Head>
        <title>TapuTapu</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </Head>

      {/* Notification */}
      {notification && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[3000] bg-slate-800/90 backdrop-blur text-white px-4 py-2 rounded-full shadow-lg text-xs font-medium animate-fade-in pointer-events-none">
            {notification.msg}
        </div>
      )}

      {/* MAP - ALWAYS RENDERED (Removed hidden class) */}
      <div 
        ref={mapContainerRef} 
        className="absolute inset-0 z-0"
      />

      {/* LANDING PAGE - OVERLAY Z-50 */}
      {viewMode === 'landing' && (
        <div className="absolute inset-0 z-50 bg-gradient-to-br from-teal-400 via-emerald-400 to-blue-500 flex flex-col p-6 items-center justify-center animate-fade-in">
           
           <div className="w-full max-w-sm bg-white/20 backdrop-blur-xl border border-white/40 rounded-[2rem] p-8 shadow-2xl flex flex-col gap-8 items-center text-center">
               
               <div className="flex flex-col items-center">
                   <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-4 shadow-lg text-5xl">
                       🌲
                   </div>
                   <h1 className="text-5xl font-black text-white drop-shadow-md tracking-tight">TapuTapu</h1>
                   <div className="text-white/80 font-mono text-xs mt-1 bg-black/10 px-2 py-0.5 rounded">v5.1</div>
                   <p className="text-white/90 text-sm font-bold tracking-widest mt-2 uppercase">Saugi kelionė visiems</p>
               </div>
               
               <div className="w-full space-y-4">
                   <button 
                     onClick={() => setViewMode('map')}
                     className="w-full py-5 bg-white text-slate-800 rounded-2xl font-black text-xl shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-4 hover:bg-slate-50 group"
                   >
                     <span className="text-2xl group-hover:animate-bounce">🗺️</span>
                     Kur aš esu?
                   </button>
                   
                   <button 
                     onClick={() => router.push('/trails')}
                     className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black text-xl shadow-xl shadow-emerald-500/20 active:scale-95 transition-transform flex items-center justify-center gap-4 hover:emerald-700 group"
                   >
                     <span className="text-2xl group-hover:rotate-12 transition-transform">🏔️</span>
                     AI Trail Finder
                   </button>

                   <button 
                     onClick={() => setViewMode('lost')}
                     className="w-full py-5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-2xl font-black text-xl shadow-xl shadow-orange-500/40 active:scale-95 transition-transform flex items-center justify-center gap-4 hover:brightness-110 group"
                   >
                     <span className="text-2xl group-hover:animate-pulse">🆘</span>
                     PASIKLYDAU!
                   </button>
               </div>

               <p className="text-white/70 text-xs mt-2 font-medium">
                   Paprasta. Saugu. Patikima.
               </p>
           </div>
        </div>
      )}

      {/* MAP CONTROLS - Z-10 */}
      {viewMode === 'map' && (
        <>
            {/* Top Bar */}
            <div className="absolute top-4 left-0 right-0 z-[1000] flex justify-center pointer-events-none">
                <div className="pointer-events-auto bg-white/90 backdrop-blur shadow-sm border border-slate-100 p-1 rounded-full flex gap-1">
                   <button onClick={() => setViewMode('landing')} className="p-2 rounded-full hover:bg-slate-50 text-slate-400">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                   </button>
                   <div className="w-px bg-slate-200 mx-1 my-1"></div>
                   {['walking', 'cycling', 'driving'].map((m) => (
                       <button
                         key={m}
                         onClick={() => setTransportMode(m as TransportMode)}
                         className={`p-2 rounded-full transition-all ${transportMode === m ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-50'}`}
                       >
                         {m === 'walking' ? '🚶' : m === 'cycling' ? '🚴' : '🚗'}
                       </button>
                   ))}
                </div>
            </div>

            {/* Right Side Controls */}
            <div className="absolute top-20 right-4 z-[1000] flex flex-col gap-3">
                 {/* Builder Toggle */}
                <button 
                    onClick={() => {
                        const nextState = !isBuilderMode;
                        setIsBuilderMode(nextState);
                        setNotification({type: 'info', msg: nextState ? 'Maršruto kūrimo režimas' : 'Žymėjimas baigtas'});
                    }}
                    className={`p-3 rounded-full shadow-lg transition-all active:scale-90 ${isBuilderMode ? 'bg-emerald-500 text-white ring-4 ring-emerald-200' : 'bg-white text-slate-600'}`}
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        {isBuilderMode ? (
                             <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        ) : (
                             <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        )}
                    </svg>
                </button>

                {/* Undo Button */}
                {isBuilderMode && waypoints.length > 0 && (
                    <button 
                        onClick={undoLastWaypoint}
                        className="p-3 bg-white text-slate-600 rounded-full shadow-lg active:scale-90"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                    </button>
                )}

                {/* Recenter */}
                <button 
                    onClick={reCenterMap}
                    className={`p-3 rounded-full shadow-lg transition-all active:scale-90 ${isFollowingUser ? 'bg-blue-500 text-white' : 'bg-white text-slate-600'}`}
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </button>
            </div>

            {/* BOTTOM INFO (Selectable Cards) */}
            {routes.length > 0 && (
                <div className="absolute bottom-8 left-0 right-0 z-[1000] flex justify-center pointer-events-none">
                    <div className="pointer-events-auto flex flex-col gap-2 items-center max-w-[95%]">
                        
                        {/* Alternative Routes Tabs */}
                        {routes.length > 1 && (
                            <div className="flex gap-2 overflow-x-auto pb-1 w-full justify-center px-4">
                                {routes.map((route, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => selectRoute(idx)}
                                        className={`px-4 py-1.5 rounded-full text-xs font-bold shadow-sm transition-all whitespace-nowrap border
                                            ${route.isSelected 
                                                ? 'bg-blue-600 text-white border-blue-600' 
                                                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                                    >
                                        {formatTime(route.summary.totalTime)}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Main Pill Info */}
                        <div className="bg-white/95 backdrop-blur shadow-lg border border-slate-100 rounded-full pl-6 pr-2 py-2 flex items-center gap-4 animate-slide-up">
                             {/* Route Details */}
                            <div className="flex flex-col min-w-[80px]">
                                {routes.find(r => r.isSelected) && (
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-lg font-bold text-slate-800">
                                            {formatTime(routes.find(r => r.isSelected)!.summary.totalTime)}
                                        </span>
                                        <span className="text-xs text-slate-500 font-medium">
                                            ({formatDist(routes.find(r => r.isSelected)!.summary.totalDistance)})
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => { clearWaypoints(); setIsBuilderMode(false); }}
                                    className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                                
                                <button className="h-9 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold text-sm shadow-md active:scale-95 transition-transform flex items-center gap-1.5">
                                    <span>Vykstame</span>
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
      )}

      {/* LOST VIEW - OVERLAY Z-60 */}
      {viewMode === 'lost' && (
        <div className="absolute inset-0 z-[60] bg-white/50 backdrop-blur-sm flex items-end justify-center pb-6 px-4 animate-fade-in">
            <LostView lat={userLocation?.lat || 0} lng={userLocation?.lng || 0} onClose={() => setViewMode('landing')} />
        </div>
      )}
    </div>
  );
}
