
import React, { useState, useEffect, useRef } from "react";
import Head from 'next/head';
import LostView from "@/components/LostView";

/**
 * TAPUTAPU v10.9 - FINAL POLISH
 * - UI: Restored and improved "Maršrutas" segment list.
 * - Fix: Legs (A->B, B->C) now show individual distances.
 * - Fix: Clicking a leg highlights the specific part of the path.
 * - Stability: Map zoom and location handling refined.
 */

type ViewMode = 'landing' | 'map' | 'lost' | 'navigation';
type TransportMode = 'walking' | 'cycling' | 'driving';

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
  // --- STATE ---
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

  // Path Maker (GPS Recorder)
  const [isRecording, setIsRecording] = useState(false);
  const [recordedPath, setRecordedPath] = useState<{lat: number, lng: number}[]>([]);
  const [totalRecordedDist, setTotalRecordedDist] = useState(0);

  // --- REFS ---
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
  const recordedPathPolylineRef = useRef<any>(null);
  
  const userLocationRef = useRef<{ lat: number; lng: number, heading: number | null } | null>(null);
  const isNavigatingRef = useRef(false);
  const destinationRef = useRef<{ lat: number; lng: number } | null>(null);
  const waypointsRef = useRef<{lat: number, lng: number}[]>([]);
  const isRecordingRef = useRef(false);
  const isBuilderModeRef = useRef(false);

  // --- SYNC REFS ---
  useEffect(() => { 
      if (userLocation) userLocationRef.current = { lat: userLocation.lat, lng: userLocation.lng, heading: userLocation.heading };
  }, [userLocation]);

  useEffect(() => {
      waypointsRef.current = waypoints;
      if (waypoints.length > 0) destinationRef.current = waypoints[waypoints.length - 1];
  }, [waypoints]);

  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);
  useEffect(() => { isBuilderModeRef.current = isBuilderMode; }, [isBuilderMode]);
  
  useEffect(() => {
      isNavigatingRef.current = viewMode === 'navigation';
      if (viewMode === 'map' && mapRef.current) {
          setTimeout(() => {
              mapRef.current.invalidateSize();
          }, 400);
      }
      if (viewMode !== 'navigation' && mapContainerRef.current) {
          mapContainerRef.current.style.transform = 'translate(-50%, -50%) rotate(0deg)';
      }
  }, [viewMode]);

  // --- MAP INITIALIZATION ---
  useEffect(() => {
      let intervalId: any = null;
      const initMap = () => {
        if (typeof window === 'undefined' || !mapContainerRef.current) return;
        const L = (window as any).L;
        if (!L || !L.Routing) return;
        if (intervalId) clearInterval(intervalId);
        if (mapRef.current) return;

        const map = L.map(mapContainerRef.current, {
          zoomControl: false,
          attributionControl: false,
        }).setView([54.6872, 25.2797], 13); 

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap'
        }).addTo(map);

        map.on('click', (e: any) => {
            if (isNavigatingRef.current) return;
            if (highlightLayerRef.current) { map.removeLayer(highlightLayerRef.current); highlightLayerRef.current = null; }
            
            // LOGIC FIX: Check mode
            if (isBuilderModeRef.current) {
                setWaypoints(prev => [...prev, e.latlng]);
            } else {
                setWaypoints([e.latlng]);
                setShowSegments(false); // Close panel if starting new
            }
        });

        map.locate({ setView: true, maxZoom: 16, enableHighAccuracy: true });
        mapRef.current = map;
        startGpsTracking();
      };
      intervalId = setInterval(initMap, 100);
      return () => clearInterval(intervalId);
  }, []);

  // --- GPS TRACKING ---
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
                    if (last) {
                        const d = getDistanceFromLatLonInM(latitude, longitude, last.lat, last.lng);
                        setTotalRecordedDist(prevD => prevD + d);
                    }
                    return [...prev, { lat: latitude, lng: longitude }];
                }
                return prev;
            });
        }

        if (isNavigatingRef.current && mapRef.current) {
            if (heading !== null && mapContainerRef.current) {
                mapContainerRef.current.style.transform = `translate(-50%, -50%) rotate(${-heading}deg)`;
                mapContainerRef.current.style.transition = 'transform 1.2s cubic-bezier(0.4, 0, 0.2, 1)';
            }
            mapRef.current.setView([latitude, longitude], 19, { animate: true });
            
            const currentSpeedKmh = speed ? Math.round(speed * 3.6) : 0;
            const distRem = destinationRef.current ? getDistanceFromLatLonInM(latitude, longitude, destinationRef.current.lat, destinationRef.current.lng) : 0;
            
            let paceStr = '--:--';
            if (speed && speed > 0.3) {
                const minPerKm = 1000 / (speed * 60);
                const mins = Math.floor(minPerKm);
                const secs = Math.round((minPerKm - mins) * 60);
                paceStr = `${mins}:${secs.toString().padStart(2, '0')}`;
            }

            const cal = Math.round((totalRecordedDist / 1000) * (transportMode === 'walking' ? 65 : 45));

            setNavStats({ 
                speed: currentSpeedKmh, 
                distanceRem: distRem, 
                timeRem: speed && speed > 0 ? distRem / speed : distRem / 1.4,
                pace: paceStr,
                calories: cal
            });
        }
    };
    gpsWatchId.current = navigator.geolocation.watchPosition(onGeoSuccess, console.warn, { enableHighAccuracy: true });
  };

  const updateUserMarker = (loc: any) => {
    const L = (window as any).L;
    if (!mapRef.current || !L) return;
    const rotation = isNavigatingRef.current ? 0 : (loc.heading || 0);
    
    if (!userMarkerRef.current) {
      const userIcon = L.divIcon({
        className: 'bg-transparent',
        html: `<div class="user-marker-container" style="transform: rotate(${rotation}deg); transition: transform 0.3s">
            <span class="absolute inline-flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500 opacity-20 animate-ping"></span>
            <div class="relative flex items-center justify-center rounded-full h-10 w-10 bg-blue-600 border-4 border-white shadow-2xl -translate-x-1/2 -translate-y-1/2">
                 <div class="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-bottom-[16px] border-white mb-1"></div>
            </div>
          </div>`,
        iconSize: [0, 0]
      });
      userMarkerRef.current = L.marker([loc.lat, loc.lng], { icon: userIcon, zIndexOffset: 1000 }).addTo(mapRef.current);
    } else {
      userMarkerRef.current.setLatLng([loc.lat, loc.lng]);
      const el = userMarkerRef.current.getElement();
      if (el) {
          const inner = el.querySelector('.user-marker-container');
          if (inner) inner.style.transform = `rotate(${rotation}deg)`;
      }
    }
    if (!accuracyCircleRef.current) {
        accuracyCircleRef.current = L.circle([loc.lat, loc.lng], { radius: loc.accuracy, color: '#3b82f6', fillOpacity: 0.05, weight: 0 }).addTo(mapRef.current);
    } else {
        accuracyCircleRef.current.setLatLng([loc.lat, loc.lng]).setRadius(loc.accuracy);
    }
  };

  // --- ROUTING LOGIC ---
  useEffect(() => {
      if (!mapRef.current) return;
      const L = (window as any).L;
      if (routingControlRef.current) { try { mapRef.current.removeControl(routingControlRef.current); } catch(e){} }
      markerLayersRef.current.forEach(m => m.remove());
      markerLayersRef.current = [];

      if (waypoints.length === 0 || !userLocationRef.current) { setRoutes([]); return; }

      const planPoints = [
        L.latLng(userLocationRef.current.lat, userLocationRef.current.lng), 
        ...waypoints.map(w => L.latLng(w.lat, w.lng))
      ];

      let serviceUrl = transportMode === 'walking' 
          ? 'https://routing.openstreetmap.de/routed-foot/route/v1' 
          : (transportMode === 'cycling' ? 'https://routing.openstreetmap.de/routed-bike/route/v1' : 'https://router.project-osrm.org/route/v1');

      const control = L.Routing.control({
          waypoints: planPoints,
          router: L.Routing.osrmv1({ serviceUrl, profile: 'driving' }),
          lineOptions: { styles: [{ color: 'transparent', opacity: 0 }] },
          altLineOptions: { styles: [{ color: 'transparent', opacity: 0 }] },
          show: false,
          showAlternatives: true,
          createMarker: () => null,
          fitSelectedRoutes: false,
          routeWhileDragging: false
      }).addTo(mapRef.current);

      control.on('routesfound', (e: any) => {
          setRoutes(e.routes.map((r: any, i: number) => ({
              id: i, summary: r.summary, coordinates: r.coordinates, instructions: r.instructions, waypoints: r.waypoints, waypointIndices: r.waypointIndices, routeObj: r
          })));
          drawCustomMarkers(planPoints);
      });
      routingControlRef.current = control;
  }, [waypoints, transportMode]);

  useEffect(() => {
    if (!mapRef.current || routes.length === 0) {
        routePolylinesRef.current.forEach(l => mapRef.current.removeLayer(l));
        segmentLayersRef.current.forEach(l => mapRef.current.removeLayer(l));
        return;
    }
    const L = (window as any).L;
    routePolylinesRef.current.forEach(l => mapRef.current.removeLayer(l));
    segmentLayersRef.current.forEach(l => mapRef.current.removeLayer(l));
    if (highlightLayerRef.current) mapRef.current.removeLayer(highlightLayerRef.current);

    routes.forEach((route, i) => {
        const isActive = i === selectedRouteIndex;
        const polyline = L.polyline(route.coordinates, {
            color: isActive ? '#2563eb' : '#94a3b8',
            weight: isActive ? 10 : 7,
            opacity: isActive ? 0.9 : 0.6,
            lineCap: 'round',
            zIndexOffset: isActive ? 100 : 10
        }).addTo(mapRef.current);
        
        if (isActive) {
            polyline.bringToFront();
            createInteractiveSegments(route);
        } else {
            polyline.on('click', () => setSelectedRouteIndex(i));
        }
        routePolylinesRef.current.push(polyline);
    });
  }, [routes, selectedRouteIndex]);

  const drawCustomMarkers = (latLngs: any[]) => {
      const L = (window as any).L;
      latLngs.forEach((latLng, i) => {
          if (i === 0) return; 
          const letter = String.fromCharCode(65 + i - 1);
          const icon = L.divIcon({
              className: 'bg-transparent',
              html: `<div class="marker-pin">${letter}</div>`,
              iconSize: [40, 40], iconAnchor: [20, 40]
          });
          const marker = L.marker(latLng, { icon, draggable: true }).addTo(mapRef.current);
          marker.on('dragend', (e: any) => {
              setWaypoints(prev => {
                  const updated = [...prev];
                  updated[i-1] = { lat: e.target.getLatLng().lat, lng: e.target.getLatLng().lng };
                  return updated;
              });
          });
          markerLayersRef.current.push(marker);
      });
  };

  const createInteractiveSegments = (route: RouteInfo) => {
      const L = (window as any).L;
      if (!mapRef.current || !route.waypointIndices) return;
      for (let i = 0; i < route.waypointIndices.length - 1; i++) {
          const segmentCoords = route.coordinates.slice(route.waypointIndices[i], route.waypointIndices[i+1] + 1);
          if (segmentCoords.length < 2) continue;
          const hitLayer = L.polyline(segmentCoords, { color: '#fff', weight: 60, opacity: 0.01, zIndexOffset: 1000, interactive: true }).addTo(mapRef.current);
          hitLayer.bringToFront();
          hitLayer.on('click', (e: any) => {
              L.DomEvent.stopPropagation(e);
              highlightSegment(segmentCoords);
          });
          segmentLayersRef.current.push(hitLayer);
      }
  };

  const highlightSegment = (coords: any[]) => {
      const L = (window as any).L;
      if (highlightLayerRef.current) mapRef.current.removeLayer(highlightLayerRef.current);
      highlightLayerRef.current = L.polyline(coords, { color: '#f97316', weight: 12, opacity: 0.9, lineCap: 'round' }).addTo(mapRef.current).bringToFront();
      const dist = calculateDistance(coords);
      mapRef.current.panTo(coords[Math.floor(coords.length / 2)], { animate: true });
      setNotification({ type: 'info', msg: `Atkarpa: ${formatDist(dist)}` });
  };

  const calculateDistance = (coords: any[]) => {
      const L = (window as any).L;
      let d = 0;
      for(let i=0; i<coords.length-1; i++) d += L.latLng(coords[i]).distanceTo(L.latLng(coords[i+1]));
      return d;
  };

  const getDistanceFromLatLonInM = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000; 
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))); 
  };

  const formatTime = (s: number) => {
      const h = Math.floor(s / 3600);
      const m = Math.round((s % 3600) / 60);
      return h > 0 ? `${h} v ${m} m` : `${m} min`;
  };

  const formatDist = (meters: number) => meters >= 1000 ? `${(meters/1000).toFixed(1)} km` : `${Math.round(meters)} m`;

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      setNotification({ type: 'info', msg: 'Įrašymas sustabdytas' });
    } else {
      setRecordedPath([]);
      setTotalRecordedDist(0);
      setIsRecording(true);
      setNotification({ type: 'info', msg: 'Įrašymas pradėtas 🔴' });
    }
  };

  return (
    <div className="w-full h-screen overflow-hidden bg-[#f0f9ff] font-sans touch-none select-none text-slate-900 relative">
      <Head>
        <title>TapuTapu v10.9 Winter</title>
        <style>{`
          @keyframes snowfall {
            0% { transform: translateY(-10vh) translateX(0); }
            100% { transform: translateY(110vh) translateX(30px); }
          }
          .snowflake {
            position: absolute; color: white; user-select: none; z-index: 6000; pointer-events: none;
            font-size: 1.5rem; animation: snowfall 10s linear infinite;
          }
          .marker-pin {
            width: 42px; height: 42px; background: #1e293b; border: 4px solid white; border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg); display: flex; align-items: center; justify-content: center;
            color: white; font-weight: 900; font-size: 18px; box-shadow: 0 4px 15px rgba(0,0,0,0.5);
          }
          .marker-pin > * { transform: rotate(45deg); }
          .user-marker-container { position: relative; width: 0; height: 0; }
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>
      </Head>

      {/* SNOW ON LANDING */}
      {viewMode === 'landing' && [...Array(25)].map((_, i) => (
        <div key={i} className="snowflake" style={{ 
            left: `${Math.random() * 100}%`, 
            animationDelay: `${Math.random() * 8}s`,
            animationDuration: `${5 + Math.random() * 8}s`,
            opacity: 0.5 + Math.random() * 0.5
        }}>❄️</div>
      ))}

      {/* MAP CONTAINER */}
      <div 
        ref={mapContainerRef} 
        className="absolute top-1/2 left-1/2 z-0 w-[400vw] h-[400vh]"
        style={{ 
            transform: `translate(-50%, -50%) rotate(0deg)`,
            transformOrigin: 'center center',
            willChange: 'transform'
        }} 
      />

      {/* LANDING */}
      {viewMode === 'landing' && (
        <div className="absolute inset-0 z-[5000] bg-gradient-to-br from-blue-300 via-sky-100 to-white flex flex-col p-6 items-center justify-center animate-fade-in">
           <div className="w-full max-w-sm bg-white/50 backdrop-blur-3xl border-4 border-white/80 rounded-[4rem] p-12 shadow-2xl text-center relative">
               <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mb-6 mx-auto shadow-xl text-7xl border-4 border-blue-100">🐧</div>
               <h1 className="text-5xl font-black text-blue-600 tracking-tighter drop-shadow-sm">TapuTapu</h1>
               <div className="bg-blue-600 text-white text-[12px] font-black uppercase px-5 py-2 rounded-full w-max mx-auto mt-4 tracking-[0.2em] shadow-lg">Žiemos Metas ❄️</div>
               <div className="mt-12 space-y-6">
                   <button onClick={() => setViewMode('map')} className="w-full py-6 bg-blue-500 text-white rounded-[2.5rem] font-black text-3xl shadow-2xl active:scale-95 transition-all border-b-[10px] border-blue-700">EIKIME!</button>
                   <button onClick={() => setViewMode('lost')} className="w-full py-5 bg-rose-500 text-white rounded-[2.5rem] font-black text-2xl shadow-2xl active:scale-95 transition-all border-b-[10px] border-rose-700">PAGALBOS!</button>
               </div>
               <p className="mt-12 text-blue-400 font-black text-[11px] uppercase tracking-widest opacity-70">v10.9 Pro</p>
           </div>
        </div>
      )}

      {/* MAP UI ELEMENTS */}
      {viewMode === 'map' && (
        <>
            <div className="absolute top-6 left-4 right-4 z-[1000] flex justify-center pointer-events-none">
                <div className="pointer-events-auto bg-white/95 backdrop-blur-2xl shadow-2xl rounded-full p-2 flex items-center border-2 border-white">
                   <button onClick={() => setViewMode('landing')} className="w-12 h-12 rounded-full flex items-center justify-center text-3xl hover:bg-slate-50 transition-colors">🐧</button>
                   <div className="w-px bg-slate-200 h-8 mx-4"></div>
                   <div className="flex gap-2">
                       {['walking', 'cycling', 'driving'].map((m) => (
                           <button key={m} onClick={() => setTransportMode(m as TransportMode)} className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-all ${transportMode === m ? 'bg-blue-600 text-white scale-110 shadow-xl' : 'text-slate-400 hover:bg-slate-100'}`}>
                             {m === 'walking' ? '🚶' : m === 'cycling' ? '🚴' : '🚗'}
                           </button>
                       ))}
                   </div>
                </div>
            </div>

            {/* SIDEBAR */}
            <div className="absolute top-28 right-4 z-[1000] flex flex-col gap-5">
                <button onClick={toggleRecording} className={`w-16 h-16 rounded-full shadow-2xl flex flex-col items-center justify-center transition-all border-4 ${isRecording ? 'bg-rose-600 border-rose-300' : 'bg-white border-white text-rose-500 font-black'}`}>
                   <div className={`w-5 h-5 rounded-full bg-rose-500 ${isRecording ? 'animate-pulse' : ''} border-2 border-white`}></div>
                   <span className="text-[9px] mt-1 uppercase tracking-tighter leading-none">REC</span>
                </button>

                <button onClick={() => setIsBuilderMode(!isBuilderMode)} className={`w-16 h-16 rounded-full shadow-2xl flex flex-col items-center justify-center border-4 transition-all ${isBuilderMode ? 'bg-emerald-500 border-emerald-300 text-white' : 'bg-white border-white text-emerald-600 font-black'}`}>
                    <span className="text-4xl font-black leading-none">{isBuilderMode ? '✓' : '+'}</span>
                    <span className="text-[9px] uppercase mt-1 tracking-tighter leading-none">TAŠKAS</span>
                </button>

                <button onClick={() => mapRef.current?.locate({setView: true, maxZoom: 16})} className="w-16 h-16 bg-blue-600 border-4 border-blue-300 rounded-full shadow-2xl flex flex-col items-center justify-center text-white">
                    <span className="text-3xl">🎯</span>
                    <span className="text-[9px] font-black uppercase mt-1 tracking-tighter leading-none">AŠ ČIA</span>
                </button>

                <button onClick={() => setViewMode('lost')} className="w-16 h-16 bg-rose-700 border-4 border-rose-400 rounded-full shadow-2xl flex flex-col items-center justify-center text-white animate-pulse">
                    <span className="text-2xl font-black leading-none">🆘</span>
                    <span className="text-[9px] font-black mt-1 tracking-tighter leading-none uppercase">SOS</span>
                </button>
            </div>

            {/* ROUTE SUMMARY & DETAILS */}
            {routes.length > 0 && (
                <div className="absolute bottom-6 left-4 right-4 z-[1000] pointer-events-none flex flex-col items-center gap-3">
                    {/* SEGMENT LIST (Pins A, B, C...) */}
                    {showSegments && (
                        <div className="pointer-events-auto w-full max-w-sm bg-white/95 backdrop-blur-xl rounded-[2.5rem] p-5 shadow-2xl border-4 border-white mb-2 animate-slide-up max-h-[40vh] overflow-y-auto no-scrollbar">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-black text-xs uppercase tracking-widest text-blue-600">Maršruto Atkarpos</h3>
                                <button onClick={() => setShowSegments(false)} className="text-slate-300">✕</button>
                            </div>
                            <div className="space-y-2">
                                {routes[selectedRouteIndex]?.waypointIndices?.map((idx, i) => {
                                    if (i === 0) return null;
                                    const prevIdx = routes[selectedRouteIndex].waypointIndices[i-1];
                                    const segCoords = routes[selectedRouteIndex].coordinates.slice(prevIdx, idx + 1);
                                    const d = calculateDistance(segCoords);
                                    const startLabel = i === 1 ? 'Aš' : String.fromCharCode(65 + i - 2);
                                    const endLabel = String.fromCharCode(65 + i - 1);
                                    return (
                                        <button 
                                            key={i} 
                                            onClick={() => highlightSegment(segCoords)}
                                            className="w-full flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 active:scale-95 transition-all text-left"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-7 h-7 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-black text-[10px]">{startLabel}</div>
                                                <div className="text-slate-300">➔</div>
                                                <div className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center font-black text-[10px]">{endLabel}</div>
                                            </div>
                                            <span className="font-black text-slate-700 text-sm">{formatDist(d)}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="pointer-events-auto w-full max-w-sm bg-white/95 backdrop-blur-xl rounded-[2.5rem] p-3 shadow-2xl flex items-center justify-between border-4 border-white relative overflow-hidden">
                        <div className="flex flex-col pl-4">
                            <div className="flex items-center gap-2">
                                <span className="text-3xl font-black text-slate-800 tracking-tighter leading-tight">{formatTime(routes[selectedRouteIndex]?.summary.totalTime || 0)}</span>
                                <span className="text-xs font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">{(routes[selectedRouteIndex]?.summary.totalDistance / 1000).toFixed(1)} km</span>
                            </div>
                            <div 
                                onClick={() => setShowSegments(!showSegments)} 
                                className={`text-[9px] font-black uppercase tracking-widest mt-0.5 cursor-pointer flex items-center gap-1 transition-colors ${showSegments ? 'text-blue-600' : 'text-slate-400'}`}
                            >
                                Maršrutas {showSegments ? '▲' : '▼'}
                            </div>
                        </div>
                        
                        <div className="flex gap-2">
                            <button onClick={() => { setWaypoints([]); setRoutes([]); setShowSegments(false); }} className="w-11 h-11 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-sm hover:bg-slate-200 transition-colors">✕</button>
                            <button onClick={() => setViewMode('navigation')} className="h-12 px-8 bg-blue-600 text-white rounded-full font-black text-base shadow-xl active:scale-95 transition-all border-b-4 border-blue-800">
                                VYKSTAME!
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
      )}

      {/* NAVIGATION OVERLAY */}
      {viewMode === 'navigation' && (
          <div className="absolute inset-0 z-[4000] pointer-events-none flex flex-col justify-between">
            <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-3xl text-white p-8 pt-14 shadow-2xl flex justify-between items-center border-b-8 border-white/5">
                 <div className="flex flex-col">
                     <span className="text-xs text-blue-400 font-black uppercase tracking-[0.3em] mb-1">Tiesiog pirmyn</span>
                     <span className="text-4xl font-black tracking-tighter flex items-center gap-5">
                         <span className="text-5xl animate-bounce">⬆️</span> 100 m
                     </span>
                 </div>
                 <button onClick={() => setViewMode('map')} className="bg-white text-slate-900 px-10 py-4 rounded-full font-black text-lg shadow-2xl active:scale-95">Baigti</button>
            </div>

            {transportMode !== 'driving' && (
                <div className="absolute top-48 left-4 flex flex-col gap-5">
                    <div className="bg-white/95 backdrop-blur-2xl rounded-[2.5rem] p-6 shadow-2xl border-4 border-white w-32 flex flex-col items-center">
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Tempas</span>
                        <span className="text-2xl font-black text-slate-800 tracking-tighter">{navStats.pace}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase mt-1">min/km</span>
                    </div>
                    <div className="bg-white/95 backdrop-blur-2xl rounded-[2.5rem] p-6 shadow-2xl border-4 border-white w-32 flex flex-col items-center">
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Kcal</span>
                        <span className="text-2xl font-black text-slate-800 tracking-tighter">{navStats.calories}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase mt-1">kcal</span>
                    </div>
                </div>
            )}

            <div className="pointer-events-auto bg-white p-10 rounded-t-[4.5rem] shadow-[0_-30px_100px_rgba(0,0,0,0.3)] border-t-[10px] border-slate-50">
                 <div className="grid grid-cols-3 gap-8 text-center">
                     <div className="flex flex-col">
                         <span className="text-5xl font-black text-slate-800 tracking-tighter">{navStats.speed}</span>
                         <span className="text-[12px] text-slate-400 font-black uppercase mt-2 tracking-widest">km/val</span>
                     </div>
                     <div className="flex flex-col border-x-4 border-slate-50 px-5">
                         <span className="text-5xl font-black text-slate-800 tracking-tighter">{formatTime(navStats.timeRem)}</span>
                         <span className="text-[12px] text-slate-400 font-black uppercase mt-2 tracking-widest">Liko</span>
                     </div>
                     <div className="flex flex-col">
                         <span className="text-5xl font-black text-slate-800 tracking-tighter">{(navStats.distanceRem / 1000).toFixed(1)}</span>
                         <span className="text-[12px] text-slate-400 font-black uppercase mt-2 tracking-widest">km</span>
                     </div>
                 </div>
            </div>
          </div>
      )}

      {/* SOS OVERLAY */}
      {viewMode === 'lost' && (
        <div className="absolute inset-0 z-[6000]">
            <LostView lat={userLocation?.lat || 0} lng={userLocation?.lng || 0} onClose={() => setViewMode('landing')} />
        </div>
      )}

      {/* NOTIFICATIONS */}
      {notification && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 z-[8000] bg-slate-900/95 text-white px-8 py-4 rounded-full shadow-2xl text-lg font-black animate-fade-in border-4 border-white/20 whitespace-nowrap">
            {notification.msg}
        </div>
      )}
    </div>
  );
}
