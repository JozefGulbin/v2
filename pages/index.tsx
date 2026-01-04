
import React, { useState, useEffect, useRef } from "react";
import Head from 'next/head';
import LostView from "@/components/LostView";

/**
 * TAPUTAPU v12.2.5 - WINTER PRO (RESTORED)
 * - Visuals: v12.2 Centered Card & Snowflakes.
 * - UX: Fixed SOS button cutoff (card moved up).
 * - Logic: GPX Export + Trail Recording + History Loading.
 * - Map: Reverted to round user marker (v10 style).
 */

type ViewMode = 'landing' | 'map' | 'lost' | 'navigation' | 'history';
type TransportMode = 'walking' | 'cycling' | 'driving';

interface SavedRoute {
  id: string;
  date: string;
  distance: number;
  duration: number;
  pace: string;
  calories: number;
  path: {lat: number, lng: number}[];
}

interface RouteInfo {
  id: number;
  summary: { totalDistance: number; totalTime: number };
  coordinates: any[];
  instructions: any[];
  waypoints: any[];
  waypointIndices: number[];
  routeObj?: any; 
}

export default function MapPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('landing');
  const [transportMode, setTransportMode] = useState<TransportMode>('walking');
  const [routes, setRoutes] = useState<RouteInfo[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number, accuracy: number, speed: number | null, heading: number | null } | null>(null);
  const [isBuilderMode, setIsBuilderMode] = useState(false); 
  const [waypoints, setWaypoints] = useState<{lat: number, lng: number}[]>([]);
  const [navStats, setNavStats] = useState({ speed: 0, distanceRem: 0, timeRem: 0, pace: '--:--', calories: 0 });
  const [showSegments, setShowSegments] = useState(false);
  const [notification, setNotification] = useState<{type: 'error' | 'info', msg: string} | null>(null);
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedPath, setRecordedPath] = useState<{lat: number, lng: number}[]>([]);
  const [totalRecordedDist, setTotalRecordedDist] = useState(0);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);

  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const routingControlRef = useRef<any>(null);
  const routePolylinesRef = useRef<any[]>([]);
  const segmentLayersRef = useRef<any[]>([]); 
  const highlightLayerRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const accuracyCircleRef = useRef<any>(null);
  const gpsWatchId = useRef<number | null>(null);
  const markerLayersRef = useRef<any[]>([]);
  
  const userLocationRef = useRef<{ lat: number; lng: number, heading: number | null } | null>(null);
  const isNavigatingRef = useRef(false);
  const destinationRef = useRef<{ lat: number; lng: number } | null>(null);
  const isRecordingRef = useRef(false);

  useEffect(() => {
    const localData = localStorage.getItem('taputapu_saved_routes');
    if (localData) setSavedRoutes(JSON.parse(localData));
  }, []);

  useEffect(() => { 
      if (userLocation) userLocationRef.current = { lat: userLocation.lat, lng: userLocation.lng, heading: userLocation.heading };
  }, [userLocation]);

  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);
  
  useEffect(() => {
      isNavigatingRef.current = viewMode === 'navigation';
      if (viewMode === 'map' && mapRef.current) {
          setTimeout(() => mapRef.current.invalidateSize(), 500);
      }
      if (viewMode !== 'navigation' && mapContainerRef.current) {
          mapContainerRef.current.style.transform = 'translate(-50%, -50%) rotate(0deg)';
      }
  }, [viewMode]);

  useEffect(() => {
      let intervalId: any = null;
      const initMap = () => {
        if (typeof window === 'undefined' || !mapContainerRef.current) return;
        const L = (window as any).L;
        if (!L || !L.Routing) return;
        if (intervalId) clearInterval(intervalId);
        if (mapRef.current) return;

        const map = L.map(mapContainerRef.current, { zoomControl: false, attributionControl: false }).setView([54.6872, 25.2797], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

        map.on('click', (e: any) => {
            if (isNavigatingRef.current) return;
            if (highlightLayerRef.current) highlightLayerRef.current.remove();
            if (isBuilderMode) setWaypoints(prev => [...prev, e.latlng]);
            else { setWaypoints([e.latlng]); setShowSegments(false); }
        });

        map.locate({ setView: true, maxZoom: 15, enableHighAccuracy: true });
        mapRef.current = map;
        startGpsTracking();
      };
      intervalId = setInterval(initMap, 100);
      return () => clearInterval(intervalId);
  }, [isBuilderMode]);

  const startGpsTracking = () => {
    if (!navigator.geolocation) return;
    const onGeoSuccess = (pos: GeolocationPosition) => {
        const { latitude, longitude, accuracy, speed, heading } = pos.coords;
        const newLoc = { lat: latitude, lng: longitude, accuracy, speed, heading };
        setUserLocation(newLoc);
        updateUserMarker(newLoc);

        if (isRecordingRef.current) {
            setRecordedPath(prev => {
                const last = prev[prev.length - 1];
                if (!last || getDistanceFromLatLonInM(latitude, longitude, last.lat, last.lng) > 3) {
                    if (last) setTotalRecordedDist(d => d + getDistanceFromLatLonInM(latitude, longitude, last.lat, last.lng));
                    return [...prev, { lat: latitude, lng: longitude }];
                }
                return prev;
            });
        }

        if (isNavigatingRef.current && mapRef.current) {
            if (heading !== null && mapContainerRef.current) {
                mapContainerRef.current.style.transform = `translate(-50%, -50%) rotate(${-heading}deg)`;
                mapContainerRef.current.style.transition = 'transform 1.0s cubic-bezier(0.4, 0, 0.2, 1)';
            }
            mapRef.current.setView([latitude, longitude], 18, { animate: true });
            const distRem = destinationRef.current ? getDistanceFromLatLonInM(latitude, longitude, destinationRef.current.lat, destinationRef.current.lng) : 0;
            setNavStats({ speed: speed ? Math.round(speed * 3.6) : 0, distanceRem: distRem, timeRem: speed && speed > 0 ? distRem / speed : distRem / 1.4, pace: calculatePace(speed), calories: Math.round((totalRecordedDist / 1000) * 65) });
        }
    };
    gpsWatchId.current = navigator.geolocation.watchPosition(onGeoSuccess, console.warn, { enableHighAccuracy: true });
  };

  const updateUserMarker = (loc: any) => {
    const L = (window as any).L;
    if (!mapRef.current || !L) return;
    const isNav = isNavigatingRef.current;
    
    const html = isNav 
      ? `<div class="user-marker-arrow" style="transform: rotate(${loc.heading || 0}deg); transition: transform 0.4s">
           <div class="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-b-[24px] border-b-blue-600 drop-shadow-lg"></div>
         </div>`
      : `<div class="user-marker-circle">
           <div class="w-6 h-6 bg-blue-600 rounded-full border-4 border-white shadow-xl relative">
              <div class="absolute inset-[-12px] bg-blue-500 rounded-full animate-ping opacity-30"></div>
           </div>
         </div>`;

    if (!userMarkerRef.current) {
      userMarkerRef.current = L.marker([loc.lat, loc.lng], { icon: L.divIcon({ className: 'bg-transparent', html, iconSize: [0, 0] }), zIndexOffset: 1000 }).addTo(mapRef.current);
    } else {
      userMarkerRef.current.setLatLng([loc.lat, loc.lng]);
      userMarkerRef.current.setIcon(L.divIcon({ className: 'bg-transparent', html, iconSize: [0, 0] }));
    }
    if (accuracyCircleRef.current) accuracyCircleRef.current.setLatLng([loc.lat, loc.lng]).setRadius(loc.accuracy);
    else accuracyCircleRef.current = L.circle([loc.lat, loc.lng], { radius: loc.accuracy, color: '#3b82f6', fillOpacity: 0.05, weight: 0 }).addTo(mapRef.current);
  };

  useEffect(() => {
    if (!mapRef.current) return;
    const L = (window as any).L;
    if (routingControlRef.current) mapRef.current.removeControl(routingControlRef.current);
    markerLayersRef.current.forEach(m => m.remove());
    markerLayersRef.current = [];
    if (waypoints.length === 0 || !userLocationRef.current) { setRoutes([]); return; }

    const planPoints = [L.latLng(userLocationRef.current.lat, userLocationRef.current.lng), ...waypoints.map(w => L.latLng(w.lat, w.lng))];
    let serviceUrl = transportMode === 'walking' ? 'https://routing.openstreetmap.de/routed-foot/route/v1' : (transportMode === 'cycling' ? 'https://routing.openstreetmap.de/routed-bike/route/v1' : 'https://router.project-osrm.org/route/v1');
    const control = L.Routing.control({
        waypoints: planPoints, router: L.Routing.osrmv1({ serviceUrl, profile: 'driving' }),
        lineOptions: { styles: [{ color: 'transparent', opacity: 0 }] }, createMarker: () => null, show: false, fitSelectedRoutes: false
    }).addTo(mapRef.current);

    control.on('routesfound', (e: any) => {
        setRoutes(e.routes.map((r: any, i: number) => ({ id: i, summary: r.summary, coordinates: r.coordinates, instructions: r.instructions, waypoints: r.waypoints, waypointIndices: r.waypointIndices, routeObj: r })));
        latLngsToMarkers(planPoints);
    });
    routingControlRef.current = control;
  }, [waypoints, transportMode]);

  useEffect(() => {
    if (!mapRef.current || routes.length === 0) {
        routePolylinesRef.current.forEach(l => l.remove());
        segmentLayersRef.current.forEach(l => l.remove());
        return;
    }
    const L = (window as any).L;
    routePolylinesRef.current.forEach(l => l.remove());
    segmentLayersRef.current.forEach(l => l.remove());
    routes.forEach((route, i) => {
        const isActive = i === selectedRouteIndex;
        const polyline = L.polyline(route.coordinates, { color: isActive ? '#2563eb' : '#94a3b8', weight: isActive ? 10 : 7, opacity: isActive ? 0.9 : 0.6, lineCap: 'round' }).addTo(mapRef.current);
        if (isActive) { polyline.bringToFront(); createSegments(route); }
        else { polyline.on('click', () => setSelectedRouteIndex(i)); }
        routePolylinesRef.current.push(polyline);
    });
  }, [routes, selectedRouteIndex]);

  const latLngsToMarkers = (latLngs: any[]) => {
      const L = (window as any).L;
      latLngs.forEach((latLng, i) => {
          if (i === 0) return; 
          const letter = String.fromCharCode(65 + i - 1);
          const icon = L.divIcon({ className: 'bg-transparent', html: `<div class="marker-pin">${letter}</div>`, iconSize: [40, 40], iconAnchor: [20, 40] });
          markerLayersRef.current.push(L.marker(latLng, { icon }).addTo(mapRef.current));
      });
  };

  const createSegments = (route: RouteInfo) => {
      const L = (window as any).L;
      if (!route.waypointIndices) return;
      for (let i = 0; i < route.waypointIndices.length - 1; i++) {
          const coords = route.coordinates.slice(route.waypointIndices[i], route.waypointIndices[i+1] + 1);
          if (coords.length < 2) continue;
          const hitLayer = L.polyline(coords, { color: '#fff', weight: 60, opacity: 0.01, interactive: true }).addTo(mapRef.current);
          hitLayer.on('click', (e: any) => { L.DomEvent.stopPropagation(e); highlight(coords); });
          segmentLayersRef.current.push(hitLayer);
      }
  };

  const highlight = (coords: any[]) => {
      const L = (window as any).L;
      if (highlightLayerRef.current) highlightLayerRef.current.remove();
      highlightLayerRef.current = L.polyline(coords, { color: '#f97316', weight: 12, opacity: 0.9, lineCap: 'round' }).addTo(mapRef.current).bringToFront();
      mapRef.current.panTo(coords[Math.floor(coords.length / 2)], { animate: true });
      setNotification({ type: 'info', msg: `Atkarpa: ${formatDist(calcDist(coords))}` });
  };

  const calcDist = (coords: any[]) => {
      const L = (window as any).L;
      let d = 0; for(let i=0; i<coords.length-1; i++) d += L.latLng(coords[i]).distanceTo(L.latLng(coords[i+1]));
      return d;
  };

  const getDistanceFromLatLonInM = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000; const dLat = (lat2 - lat1) * (Math.PI / 180); const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))); 
  };

  const calculatePace = (speed: number | null) => {
    if (!speed || speed < 0.3) return '--:--';
    const minPerKm = 1000 / (speed * 60); const mins = Math.floor(minPerKm); const secs = Math.round((minPerKm - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTime = (s: number) => {
      const h = Math.floor(s / 3600); const m = Math.round((s % 3600) / 60);
      return h > 0 ? `${h} v ${m} m` : `${m} min`;
  };

  const formatDist = (meters: number) => meters >= 1000 ? `${(meters/1000).toFixed(1)} km` : `${Math.round(meters)} m`;

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      const durationMs = Date.now() - (recordingStartTime || Date.now());
      const newSavedRoute: SavedRoute = {
          id: Date.now().toString(), date: new Date().toLocaleDateString('lt-LT'),
          distance: totalRecordedDist, duration: Math.floor(durationMs / 1000),
          pace: calculatePace(totalRecordedDist / (durationMs / 1000)),
          calories: Math.round((totalRecordedDist / 1000) * 65), path: recordedPath
      };
      const updated = [newSavedRoute, ...savedRoutes];
      setSavedRoutes(updated);
      localStorage.setItem('taputapu_saved_routes', JSON.stringify(updated));
      setNotification({ type: 'info', msg: 'Maršrutas išsaugotas!' });
    } else {
      setRecordedPath([]); setTotalRecordedDist(0); setRecordingStartTime(Date.now()); setIsRecording(true);
      setNotification({ type: 'info', msg: 'Įrašymas pradėtas 🔴' });
    }
  };

  const loadSavedRoute = (route: SavedRoute) => {
    setViewMode('map');
    setTimeout(() => {
        if (!mapRef.current) return;
        const L = (window as any).L;
        if (highlightLayerRef.current) highlightLayerRef.current.remove();
        const poly = L.polyline(route.path, { color: '#8b5cf6', weight: 8, opacity: 0.8, lineCap: 'round', dashArray: '5, 10' }).addTo(mapRef.current);
        highlightLayerRef.current = poly;
        mapRef.current.fitBounds(poly.getBounds(), { padding: [50, 50] });
        setNotification({ type: 'info', msg: `Kraunamas maršrutas (${route.date})` });
    }, 600);
  };

  return (
    <div className="w-full h-screen overflow-hidden bg-[#e0f2fe] font-sans touch-none select-none text-slate-900 relative">
      <Head>
        <title>TapuTapu v12.2 Winter Pro</title>
        <style>{`
          @keyframes snowfall { 0% { transform: translateY(-10vh) translateX(0); } 100% { transform: translateY(110vh) translateX(20px); } }
          .snowflake { position: absolute; color: white; user-select: none; z-index: 9999; pointer-events: none; font-size: 1.8rem; animation: snowfall 10s linear infinite; opacity: 0.8; }
          .marker-pin { width: 40px; height: 40px; background: #0f172a; border: 3px solid white; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 16px; box-shadow: 0 4px 10px rgba(0,0,0,0.3); }
          .marker-pin > * { transform: rotate(45deg); }
          .no-scrollbar::-webkit-scrollbar { display: none; }
        `}</style>
      </Head>

      {/* SNOWFLAKES (RESTORED) */}
      {viewMode === 'landing' && [...Array(30)].map((_, i) => (
        <div key={i} className="snowflake" style={{ left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 10}s`, animationDuration: `${8 + Math.random() * 8}s` }}>❄️</div>
      ))}

      {/* MAP CONTAINER */}
      <div ref={mapContainerRef} className="absolute top-1/2 left-1/2 z-0 w-[400vw] h-[400vh]" style={{ transform: `translate(-50%, -50%) rotate(0deg)`, transformOrigin: 'center center', willChange: 'transform' }} />

      {/* LANDING VIEW (v12.2 Aesthetics) */}
      {viewMode === 'landing' && (
        <div className="absolute inset-0 z-[5000] bg-gradient-to-br from-blue-200 via-sky-100 to-white flex flex-col items-center justify-center p-8 overflow-y-auto no-scrollbar">
           <div className="w-full max-w-sm bg-white/70 backdrop-blur-3xl border-4 border-white rounded-[4.5rem] p-10 py-14 shadow-2xl text-center relative mt-[-8vh]">
               <div className="w-28 h-28 bg-white rounded-full flex items-center justify-center mb-8 mx-auto shadow-xl text-6xl border-4 border-blue-50">🐧</div>
               <h1 className="text-5xl font-black text-blue-600 tracking-tighter drop-shadow-sm">TapuTapu</h1>
               <div className="bg-blue-600 text-white text-[11px] font-black uppercase px-6 py-2.5 rounded-full w-max mx-auto mt-4 tracking-[0.2em] shadow-lg">Žiemos Metas ❄️</div>
               
               <div className="mt-12 space-y-6">
                   <button onClick={() => setViewMode('map')} className="w-full py-7 bg-blue-500 text-white rounded-[2.5rem] font-black text-3xl shadow-xl active:scale-95 transition-all border-b-[10px] border-blue-700">EIKIME!</button>
                   <button onClick={() => setViewMode('history')} className="w-full py-6 bg-slate-500 text-white rounded-[2.5rem] font-black text-2xl shadow-xl active:scale-95 transition-all border-b-[10px] border-slate-700">MANO MARŠRUTAI</button>
                   <button onClick={() => setViewMode('lost')} className="w-full py-4 bg-rose-500 text-white rounded-[2.5rem] font-black text-xl shadow-xl active:scale-95 transition-all border-b-[8px] border-rose-700 uppercase">Pagalbos!</button>
               </div>
               <p className="mt-12 text-blue-400 font-black text-[10px] uppercase tracking-widest opacity-40">Versija 12.2 Pro Restored</p>
           </div>
        </div>
      )}

      {/* MAP VIEW UI */}
      {viewMode === 'map' && (
        <>
            <div className="absolute top-8 left-0 right-0 z-[1000] flex justify-center pointer-events-none px-6">
                <div className="pointer-events-auto bg-white/95 backdrop-blur-3xl shadow-2xl rounded-full p-2.5 flex items-center border border-white/50">
                   <button onClick={() => setViewMode('landing')} className="w-12 h-12 rounded-full flex items-center justify-center text-3xl active:scale-90 bg-slate-50">🏠</button>
                   <div className="w-px bg-slate-200 h-8 mx-5"></div>
                   <div className="flex gap-3">
                       {['walking', 'cycling', 'driving'].map((m) => (
                           <button key={m} onClick={() => setTransportMode(m as TransportMode)} className={`w-13 h-13 rounded-full flex items-center justify-center text-2xl transition-all ${transportMode === m ? 'bg-blue-600 text-white scale-110 shadow-lg' : 'text-slate-300 opacity-60'}`}>{m === 'walking' ? '🚶' : m === 'cycling' ? '🚴' : '🚗'}</button>
                       ))}
                   </div>
                </div>
            </div>

            <div className="absolute top-32 right-8 z-[1000] flex flex-col gap-6">
                <button onClick={toggleRecording} className={`w-16 h-16 rounded-[2rem] shadow-2xl flex flex-col items-center justify-center transition-all border-4 ${isRecording ? 'bg-rose-600 border-rose-300 text-white' : 'bg-white border-white text-rose-500 font-black'}`}>
                   <div className={`w-4 h-4 rounded-full ${isRecording ? 'bg-white animate-pulse' : 'bg-rose-500'}`}></div>
                   <span className="text-[8px] mt-1.5 uppercase font-black tracking-tighter">Įrašinėti</span>
                </button>
                <button onClick={() => setIsBuilderMode(!isBuilderMode)} className={`w-16 h-16 rounded-[2rem] shadow-2xl flex flex-col items-center justify-center border-4 transition-all ${isBuilderMode ? 'bg-emerald-500 border-emerald-300 text-white' : 'bg-white border-white text-emerald-600 font-black'}`}>
                    <span className="text-3xl font-black">{isBuilderMode ? '✓' : '+'}</span>
                    <span className="text-[8px] uppercase font-black">TAŠKAS</span>
                </button>
                <button onClick={() => mapRef.current?.locate({setView: true, maxZoom: 15})} className="w-16 h-16 bg-blue-600 border-4 border-blue-300 rounded-[2rem] shadow-2xl flex flex-col items-center justify-center text-white active:scale-90">
                    <span className="text-2xl">🎯</span>
                    <span className="text-[8px] font-black uppercase tracking-tighter">AŠ ČIA</span>
                </button>
            </div>

            {routes.length > 0 && (
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-sm px-4 pointer-events-none">
                    {showSegments && (
                        <div className="pointer-events-auto bg-white/95 backdrop-blur-xl rounded-[3rem] p-6 shadow-2xl mb-4 max-h-[40vh] overflow-y-auto no-scrollbar border-2 border-white">
                            <h3 className="font-black text-xs uppercase tracking-widest text-blue-600 mb-4">Maršruto Atkarpos</h3>
                            <div className="space-y-3">
                                {routes[selectedRouteIndex]?.waypointIndices?.map((idx, i) => {
                                    if (i === 0) return null;
                                    const prevIdx = routes[selectedRouteIndex].waypointIndices[i-1];
                                    const segCoords = routes[selectedRouteIndex].coordinates.slice(prevIdx, idx + 1);
                                    return (
                                        <button key={i} onClick={() => highlight(segCoords)} className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-2xl active:scale-95 transition-all text-left">
                                            <div className="flex items-center gap-4">
                                                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center font-black text-[9px]">{String.fromCharCode(65 + i - 1)}</div>
                                                <span className="font-bold text-slate-500 text-xs uppercase">Atkarpa {i === 1 ? 'Aš' : String.fromCharCode(65 + i - 2)} → {String.fromCharCode(65 + i - 1)}</span>
                                            </div>
                                            <span className="font-black text-slate-800 text-sm tracking-tighter">{formatDist(calcDist(segCoords))}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    <div className="pointer-events-auto bg-white/95 backdrop-blur-2xl rounded-[3.5rem] p-4 shadow-2xl flex items-center justify-between border-2 border-white">
                        <div onClick={() => setShowSegments(!showSegments)} className="flex-grow flex flex-col pl-6 cursor-pointer group">
                            <div className="flex items-center gap-2">
                                <span className="text-3xl font-black text-slate-900 tracking-tighter">{formatTime(routes[selectedRouteIndex]?.summary.totalTime || 0)}</span>
                                <span className="text-[10px] font-black text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full uppercase">{(routes[selectedRouteIndex]?.summary.totalDistance / 1000).toFixed(1)} km</span>
                            </div>
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Maršrutas {showSegments ? '▲' : '▼'}</span>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => { setWaypoints([]); setRoutes([]); setShowSegments(false); }} className="w-12 h-12 rounded-full bg-slate-50 text-slate-300 flex items-center justify-center text-sm">✕</button>
                            <button onClick={() => setViewMode('navigation')} className="h-16 px-10 bg-blue-600 text-white rounded-full font-black text-xl shadow-xl active:scale-95 transition-all">VYKSTAME</button>
                        </div>
                    </div>
                </div>
            )}
        </>
      )}

      {/* HISTORY VIEW */}
      {viewMode === 'history' && (
          <div className="absolute inset-0 z-[5000] bg-[#f8fafc] p-10 overflow-y-auto no-scrollbar animate-slide-up">
              <div className="flex items-center gap-6 mb-12">
                  <button onClick={() => setViewMode('landing')} className="w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center text-4xl">←</button>
                  <h1 className="text-4xl font-black text-slate-900 tracking-tight">Mano Maršrutai</h1>
              </div>
              <div className="space-y-6 pb-24">
                  {savedRoutes.map((route) => (
                      <div key={route.id} className="bg-white p-8 rounded-[3.5rem] shadow-sm border-2 border-transparent hover:border-blue-200 transition-all flex justify-between items-center group">
                          <div onClick={() => loadSavedRoute(route)} className="flex flex-col flex-grow cursor-pointer">
                              <span className="font-black text-2xl text-slate-800">{route.date}</span>
                              <span className="text-blue-500 text-xs font-black uppercase tracking-widest mt-1">{(route.distance/1000).toFixed(2)} km • {route.pace} min/km</span>
                          </div>
                          <div className="flex gap-4">
                              <button onClick={() => { const gpx = `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="TapuTapu"><trk><trkseg>${route.path.map(pt => `<trkpt lat="${pt.lat}" lon="${pt.lng}"></trkpt>`).join('')}</trkseg></trk></gpx>`; const blob = new Blob([gpx], { type: 'application/gpx+xml' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `trail-${route.id}.gpx`; a.click(); setNotification({ type: 'info', msg: 'GPX išsaugotas!' }); }} className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center text-2xl active:scale-90">💾</button>
                              <button onClick={() => { if(confirm('Ištrinti?')) { const u = savedRoutes.filter(r => r.id !== route.id); setSavedRoutes(u); localStorage.setItem('taputapu_saved_routes', JSON.stringify(u)); } }} className="w-14 h-14 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center text-2xl active:scale-90">🗑</button>
                          </div>
                      </div>
                  ))}
                  {savedRoutes.length === 0 && <div className="text-center py-40 text-slate-300 font-black uppercase tracking-widest italic opacity-40">Nėra maršrutų...</div>}
              </div>
          </div>
      )}

      {/* SOS / LOST */}
      {viewMode === 'lost' && (
        <div className="absolute inset-0 z-[7000]">
            <LostView lat={userLocation?.lat || 0} lng={userLocation?.lng || 0} onClose={() => setViewMode('landing')} />
        </div>
      )}

      {/* GLOBAL NOTIFICATION */}
      {notification && (
        <div className="absolute top-40 left-1/2 -translate-x-1/2 z-[8000] bg-slate-900 text-white px-10 py-5 rounded-full shadow-2xl text-lg font-black animate-fade-in whitespace-nowrap border-4 border-white/20 backdrop-blur-md">
            {notification.msg}
        </div>
      )}
    </div>
  );
}
