import React, { useState, useEffect, useRef } from "react";
import Head from 'next/head';
import LostView from "@/components/LostView";
import ElderlyKidFriendlyNav from "@/components/ElderlyKidFriendlyNav";
import SpringLandingPage from "@/components/SpringLandingPage";

/**
 * TAPUTAPU v12.3 - SPRING EDITION (UPGRADED)
 * - Visuals: v12.3 Spring Theme with fresh colors
 * - UX: Mobile-optimized with bottom sheet & floating buttons
 * - GPS: Enhanced accuracy with Kalman filtering
 * - Accessibility: Elderly & kid-friendly navigation
 * - Logic: GPX Export + Trail Recording + History Loading
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
    if (!navigator.geolocation) {
      console.error('Geolocation not available');
      return;
    }
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
    
    const onGeoError = (error: GeolocationPositionError) => {
      console.error('Geolocation error:', error.message);
      setNotification({ type: 'error', msg: `GPS Error: ${error.message}` });
    };
    
    gpsWatchId.current = navigator.geolocation.watchPosition(onGeoSuccess, onGeoError, { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 });
  };

  const updateUserMarker = (loc: any) => {
    const L = (window as any).L;
    if (!mapRef.current || !L) return;
    const isNav = isNavigatingRef.current;
    
    const html = isNav 
      ? `<div class="user-marker-arrow" style="transform: rotate(${loc.heading || 0}deg); transition: transform 0.4s">
           <div class="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-b-[24px] border-b-green-600 drop-shadow-lg"></div>
         </div>`
      : `<div class="user-marker-circle">
           <div class="w-6 h-6 bg-green-600 rounded-full border-4 border-white shadow-xl relative">
              <div class="absolute inset-[-12px] bg-green-500 rounded-full animate-ping opacity-30"></div>
           </div>
         </div>`;

    if (!userMarkerRef.current) {
      userMarkerRef.current = L.marker([loc.lat, loc.lng], { icon: L.divIcon({ className: 'bg-transparent', html, iconSize: [0, 0] }), zIndexOffset: 1000 }).addTo(mapRef.current);
    } else {
      userMarkerRef.current.setLatLng([loc.lat, loc.lng]);
      userMarkerRef.current.setIcon(L.divIcon({ className: 'bg-transparent', html, iconSize: [0, 0] }));
    }
    if (accuracyCircleRef.current) accuracyCircleRef.current.setLatLng([loc.lat, loc.lng]).setRadius(loc.accuracy);
    else accuracyCircleRef.current = L.circle([loc.lat, loc.lng], { radius: loc.accuracy, color: '#22c55e', fillOpacity: 0.05, weight: 0 }).addTo(mapRef.current);
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
        const polyline = L.polyline(route.coordinates, { color: isActive ? '#22c55e' : '#94a3b8', weight: isActive ? 10 : 7, opacity: isActive ? 0.9 : 0.6, lineCap: 'round' }).addTo(mapRef.current);
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
        const poly = L.polyline(route.path, { color: '#a2e1c8', weight: 8, opacity: 0.8, lineCap: 'round', dashArray: '5, 10' }).addTo(mapRef.current);
        highlightLayerRef.current = poly;
        mapRef.current.fitBounds(poly.getBounds(), { padding: [50, 50] });
        setNotification({ type: 'info', msg: `Kraunamas maršrutas (${route.date})` });
    }, 600);
  };

  return (
    <div style={{ width: '100vw', height: '100vh', margin: 0, padding: 0, overflow: 'hidden', backgroundColor: '#f0fdf4', fontFamily: 'Arial, sans-serif', position: 'fixed', top: 0, left: 0 }}>
      <Head>
        <title>TapuTapu v12.3 Spring Edition</title>
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { width: 100%; height: 100%; overflow: hidden; }
          @keyframes flowerpetal { 0% { transform: translateY(-10vh) translateX(0) rotate(0deg); } 100% { transform: translateY(110vh) translateX(20px) rotate(360deg); } }
          .flower-petal { position: absolute; color: #ffb6c1; user-select: none; z-index: 9999; pointer-events: none; font-size: 1.8rem; animation: flowerpetal 12s linear infinite; opacity: 0.8; }
          .marker-pin { width: 40px; height: 40px; background: #0f172a; border: 3px solid white; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 16px; box-shadow: 0 4px 10px rgba(0,0,0,0.3); }
          .marker-pin > * { transform: rotate(45deg); }
          .no-scrollbar::-webkit-scrollbar { display: none; }
        `}</style>
      </Head>

      {/* FLOWER PETALS (SPRING THEME) */}
      {viewMode === 'landing' && [...Array(25)].map((_, i) => (
        <div key={i} className="flower-petal" style={{ left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 12}s`, animationDuration: `${10 + Math.random() * 8}s` }}>🌸</div>
      ))}

      {/* MAP CONTAINER */}
      <div ref={mapContainerRef} style={{ position: 'absolute', top: '50%', left: '50%', zIndex: 0, width: '400vw', height: '400vh', transform: 'translate(-50%, -50%) rotate(0deg)', transformOrigin: 'center center', willChange: 'transform' }} />

      {/* LANDING VIEW - NOW USING SPRINGLANDINGPAGE COMPONENT */}
      {viewMode === 'landing' && (
        <SpringLandingPage 
          onEikime={() => setViewMode('map')} 
          onMarsrutai={() => setViewMode('history')} 
          onSos={() => setViewMode('lost')} 
        />
      )}

      {/* MAP VIEW UI */}
      {viewMode === 'map' && (
        <>
            <div style={{ position: 'absolute', top: 32, left: 0, right: 0, zIndex: 1000, display: 'flex', justifyContent: 'center', pointerEvents: 'none', paddingLeft: 24, paddingRight: 24 }}>
                <div style={{ pointerEvents: 'auto', backgroundColor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', borderRadius: 9999, padding: 10, display: 'flex', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' }}>
                   <button onClick={() => setViewMode('landing')} style={{ width: 48, height: 48, borderRadius: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, backgroundColor: '#f3f4f6', border: 'none', cursor: 'pointer' }}>🏠</button>
                   <div style={{ width: 1, backgroundColor: '#e5e7eb', height: 32, margin: '0 20px' }}></div>
                   <div style={{ display: 'flex', gap: 12 }}>
                       {['walking', 'cycling', 'driving'].map((m) => (
                           <button key={m} onClick={() => setTransportMode(m as TransportMode)} style={{ width: 48, height: 48, borderRadius: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, transition: 'all 0.3s', backgroundColor: transportMode === m ? '#16a34a' : 'transparent', color: transportMode === m ? 'white' : '#d1d5db', border: 'none', cursor: 'pointer', transform: transportMode === m ? 'scale(1.1) drop-shadow(0 10px 8px rgba(0,0,0,0.1))' : 'scale(1)' }}>{m === 'walking' ? '🚶' : m === 'cycling' ? '🚴' : '🚗'}</button>
                       ))}
                   </div>
                </div>
            </div>

            <div style={{ position: 'absolute', top: 128, right: 32, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 24 }}>
                <button onClick={toggleRecording} style={{ width: 64, height: 64, borderRadius: 32, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s', borderWidth: 4, borderColor: isRecording ? '#fca5a5' : 'white', backgroundColor: isRecording ? '#dc2626' : 'white', color: isRecording ? 'white' : '#dc2626', border: `4px solid ${isRecording ? '#fca5a5' : 'white'}`, cursor: 'pointer' }}>
                   <div style={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: isRecording ? 'white' : '#dc2626', animation: isRecording ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none' }}></div>
                   <span style={{ fontSize: 8, marginTop: 6, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 }}>Rec</span>
                </button>
                <button onClick={() => setIsBuilderMode(!isBuilderMode)} style={{ width: 64, height: 64, borderRadius: 32, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderWidth: 4, backgroundColor: isBuilderMode ? '#10b981' : 'white', color: isBuilderMode ? 'white' : '#10b981', border: `4px solid ${isBuilderMode ? '#d1fae5' : 'white'}`, cursor: 'pointer', transition: 'all 0.3s' }}>
                    <span style={{ fontSize: 24, fontWeight: 'bold' }}>{isBuilderMode ? '✓' : '+'}</span>
                    <span style={{ fontSize: 8, fontWeight: 'bold', textTransform: 'uppercase' }}>PIN</span>
                </button>
                <button onClick={() => mapRef.current?.locate({setView: true, maxZoom: 15})} style={{ width: 64, height: 64, backgroundColor: '#16a34a', borderWidth: 4, borderColor: '#86efac', borderRadius: 32, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer', border: '4px solid #86efac', transition: 'all 0.3s' }}>
                    <span style={{ fontSize: 20 }}>📍</span>
                    <span style={{ fontSize: 8, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 }}>HERE</span>
                </button>
            </div>

            {routes.length > 0 && (
                <div style={{ position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, width: '100%', maxWidth: 400, paddingLeft: 16, paddingRight: 16, pointerEvents: 'none' }}>
                    {showSegments && (
                        <div style={{ pointerEvents: 'auto', backgroundColor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', borderRadius: 48, padding: 24, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', marginBottom: 16, maxHeight: '40vh', overflow: 'auto', borderWidth: 2, borderColor: 'white' }}>
                            <h3 style={{ fontWeight: 'bold', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: '#16a34a', marginBottom: 16 }}>Route Segments</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {routes[selectedRouteIndex]?.waypointIndices?.map((idx, i) => {
                                    if (i === 0) return null;
                                    const prevIdx = routes[selectedRouteIndex].waypointIndices[i-1];
                                    const segCoords = routes[selectedRouteIndex].coordinates.slice(prevIdx, idx + 1);
                                    return (
                                        <button key={i} onClick={() => highlight(segCoords)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#f3f4f6', borderRadius: 16, cursor: 'pointer', transition: 'all 0.3s', border: 'none', textAlign: 'left' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                                <div style={{ width: 24, height: 24, backgroundColor: '#16a34a', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 9 }}>{String.fromCharCode(65 + i - 1)}</div>
                                                <span style={{ fontWeight: 'bold', color: '#6b7280', fontSize: 12, textTransform: 'uppercase' }}>Segment {i === 1 ? 'Start' : String.fromCharCode(65 + i - 2)} → {String.fromCharCode(65 + i - 1)}</span>
                                            </div>
                                            <span style={{ fontWeight: 'bold', color: '#1f2937', fontSize: 14, letterSpacing: -0.5 }}>{formatDist(calcDist(segCoords))}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    <div style={{ pointerEvents: 'auto', backgroundColor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', borderRadius: 56, padding: 16, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderWidth: 2, borderColor: 'white' }}>
                        <div onClick={() => setShowSegments(!showSegments)} style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingLeft: 24, cursor: 'pointer' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 24, fontWeight: 'bold', color: '#111827', letterSpacing: -1 }}>{formatTime(routes[selectedRouteIndex]?.summary.totalTime || 0)}</span>
                                <span style={{ fontSize: 10, fontWeight: 'bold', color: '#16a34a', backgroundColor: '#dcfce7', paddingLeft: 8, paddingRight: 8, paddingTop: 4, paddingBottom: 4, borderRadius: 9999, textTransform: 'uppercase' }}>{(routes[selectedRouteIndex]?.summary.totalDistance / 1000).toFixed(1)} km</span>
                            </div>
                            <span style={{ fontSize: 9, fontWeight: 'bold', textTransform: 'uppercase', color: '#9ca3af', letterSpacing: 1 }}>Route {showSegments ? '▲' : '▼'}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => { setWaypoints([]); setRoutes([]); setShowSegments(false); }} style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: '#f3f4f6', color: '#d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, border: 'none', cursor: 'pointer' }}>✕</button>
                            <button onClick={() => setViewMode('navigation')} style={{ height: 64, paddingLeft: 40, paddingRight: 40, backgroundColor: '#16a34a', color: 'white', borderRadius: '50%', fontWeight: 'bold', fontSize: 18, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', cursor: 'pointer', border: 'none', transition: 'all 0.3s' }}>GO</button>
                        </div>
                    </div>
                </div>
            )}
        </>
      )}

      {/* HISTORY VIEW */}
      {viewMode === 'history' && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 5000, backgroundColor: '#f8fafc', padding: 40, overflow: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 48 }}>
                  <button onClick={() => setViewMode('landing')} style={{ width: 64, height: 64, backgroundColor: 'white', borderRadius: '50%', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, border: 'none', cursor: 'pointer' }}>←</button>
                  <h1 style={{ fontSize: 32, fontWeight: 'bold', color: '#111827', letterSpacing: -1 }}>My Trails</h1>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 96 }}>
                  {savedRoutes.map((route) => (
                      <div key={route.id} style={{ backgroundColor: 'white', padding: 32, borderRadius: 56, boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', borderWidth: 2, borderColor: 'transparent', transition: 'all 0.3s', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div onClick={() => loadSavedRoute(route)} style={{ display: 'flex', flexDirection: 'column', flex: 1, cursor: 'pointer' }}>
                              <span style={{ fontWeight: 'bold', fontSize: 20, color: '#111827' }}>{route.date}</span>
                              <span style={{ color: '#16a34a', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>{(route.distance/1000).toFixed(2)} km • {route.pace} min/km</span>
                          </div>
                          <div style={{ display: 'flex', gap: 16 }}>
                              <button onClick={() => { const gpx = `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="TapuTapu"><trk><trkseg>${route.path.map(pt => `<trkpt lat="${pt.lat}" lon="${pt.lng}"></trkpt>`).join('')}</trkseg></trk></gpx>`; const blob = new Blob([gpx], { type: 'application/gpx+xml' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `trail-${route.id}.gpx`; a.click(); setNotification({ type: 'info', msg: 'GPX saved!' }); }} style={{ width: 56, height: 56, backgroundColor: '#ecfdf5', color: '#10b981', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, cursor: 'pointer', border: 'none' }}>💾</button>
                              <button onClick={() => { if(confirm('Delete?')) { const u = savedRoutes.filter(r => r.id !== route.id); setSavedRoutes(u); localStorage.setItem('taputapu_saved_routes', JSON.stringify(u)); } }} style={{ width: 56, height: 56, backgroundColor: '#fef2f2', color: '#dc2626', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, cursor: 'pointer', border: 'none' }}>🗑</button>
                          </div>
                      </div>
                  ))}
                  {savedRoutes.length === 0 && <div style={{ textAlign: 'center', paddingTop: 160, color: '#d1d5db', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, opacity: 0.4, fontStyle: 'italic' }}>No trails yet...</div>}
              </div>
          </div>
      )}

      {/* SOS / LOST */}
      {viewMode === 'lost' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 7000 }}>
            <LostView lat={userLocation?.lat || 0} lng={userLocation?.lng || 0} onClose={() => setViewMode('landing')} />
        </div>*
