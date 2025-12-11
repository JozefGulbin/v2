
import React, { useState, useEffect, useRef } from "react";
import Head from 'next/head';
import { useRouter } from 'next/router';
import LostView from "@/components/LostView";

type ViewMode = 'landing' | 'map' | 'lost' | 'navigation';
type TransportMode = 'walking' | 'cycling' | 'driving';

interface RouteInfo {
  id: number;
  summary: { totalDistance: number; totalTime: number };
  coordinates: any[];
  instructions: any[];
  waypoints: any[];
  waypointIndices: number[]; // Store indices for segment splitting
  name?: string;
  routeObj?: any; 
}

export default function MapPage() {
  // --- STATE ---
  // Start in 'landing' mode as requested
  const [viewMode, setViewMode] = useState<ViewMode>('landing');
  const [transportMode, setTransportMode] = useState<TransportMode>('walking');
  
  // Routing State
  const [routes, setRoutes] = useState<RouteInfo[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number, accuracy: number, speed: number | null, heading: number | null } | null>(null);
  
  // Route Building
  const [isBuilderMode, setIsBuilderMode] = useState(false); 
  const [waypoints, setWaypoints] = useState<{lat: number, lng: number}[]>([]);
  
  // Navigation State
  const [navStats, setNavStats] = useState({ speed: 0, distanceRem: 0, timeRem: 0 });
  const [showSegments, setShowSegments] = useState(false);

  // Notification System
  const [notification, setNotification] = useState<{type: 'error' | 'info', msg: string} | null>(null);

  // --- REFS ---
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const routingControlRef = useRef<any>(null);
  const routePolylinesRef = useRef<any[]>([]); // Store custom route lines
  const segmentLayersRef = useRef<any[]>([]); 
  const highlightLayerRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const accuracyCircleRef = useRef<any>(null);
  const gpsWatchId = useRef<number | null>(null);
  const markerLayersRef = useRef<any[]>([]);
  
  const userLocationRef = useRef<{ lat: number; lng: number } | null>(null);
  const isNavigatingRef = useRef(false);
  const destinationRef = useRef<{ lat: number; lng: number } | null>(null);
  const waypointsRef = useRef<{lat: number, lng: number}[]>([]);
  const builderModeRef = useRef(false);

  // --- SYNC REFS ---
  useEffect(() => { 
      if (userLocation) userLocationRef.current = { lat: userLocation.lat, lng: userLocation.lng };
  }, [userLocation]);

  useEffect(() => {
      waypointsRef.current = waypoints;
      if (waypoints.length > 0) {
          destinationRef.current = waypoints[waypoints.length - 1];
      } else {
          destinationRef.current = null;
      }
      // Reset selection when points change
      setSelectedRouteIndex(0);
  }, [waypoints]);

  useEffect(() => {
      builderModeRef.current = isBuilderMode;
  }, [isBuilderMode]);
  
  useEffect(() => {
      isNavigatingRef.current = viewMode === 'navigation';
      // Prevent screen sleep during navigation
      if (viewMode === 'navigation' && 'wakeLock' in navigator) {
          try { (navigator as any).wakeLock.request('screen'); } catch(e){}
      }
      
      // Resize map when switching from Landing to Map
      if (viewMode === 'map' && mapRef.current) {
          setTimeout(() => {
              mapRef.current.invalidateSize();
              if (userLocationRef.current) {
                  mapRef.current.panTo([userLocationRef.current.lat, userLocationRef.current.lng], { animate: true });
              }
          }, 100);
      }
  }, [viewMode]);

  // --- NOTIFICATIONS ---
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // --- MAP INITIALIZATION ---
  useEffect(() => {
      const initMap = () => {
        if (typeof window === 'undefined' || !(window as any).L || !mapContainerRef.current) return;
        if (mapRef.current) return;

        const L = (window as any).L;
        const map = L.map(mapContainerRef.current, {
          zoomControl: false,
          attributionControl: false,
        }).setView([54.6872, 25.2797], 13); 

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap'
        }).addTo(map);

        L.control.zoom({ position: 'bottomright' }).addTo(map);

        // MAP CLICK LISTENER
        map.on('click', (e: any) => {
            if (isNavigatingRef.current) return;

            // Clear highlight
            if (highlightLayerRef.current) {
                map.removeLayer(highlightLayerRef.current);
                highlightLayerRef.current = null;
            }

            // --- LOGIC v10.0 ---
            // 1. If Builder Mode is ON -> Append Pin
            if (builderModeRef.current) {
                addWaypoint(e.latlng);
                return;
            }

            // 2. If Route is Empty -> Allow adding Pin A (Single Destination Mode)
            if (waypointsRef.current.length === 0) {
                addWaypoint(e.latlng);
                return;
            }
            
            // 3. If Route Exists & Builder OFF -> Replace Pin A (Standard GPS behavior)
            // But if multiple pins exist, we lock it to prevent accidental deletions
            if (waypointsRef.current.length === 1) {
                 setWaypoints([e.latlng]); // Move the single pin
                 return;
            }

            // 4. Locked
            setNotification({type: 'info', msg: "Paspauskite '+', kad pridėtumėte taškus"});
        });

        // Initial Location
        map.locate({ setView: true, maxZoom: 16, enableHighAccuracy: true });

        map.on('locationfound', (e: any) => {
            const { lat, lng } = e.latlng;
            const newLoc = { lat, lng, accuracy: e.accuracy, speed: null, heading: null };
            setUserLocation(newLoc);
            updateUserMarker(newLoc);
        });
        
        map.on('locationerror', () => {
             setNotification({type: 'error', msg: "Nepavyko nustatyti vietos"});
        });

        mapRef.current = map;
        startGpsTracking();
      };

      // Delay init slightly to ensure container is ready
      setTimeout(initMap, 100);
  }, []);

  const addWaypoint = (latlng: {lat: number, lng: number}) => {
      setWaypoints(prev => [...prev, latlng]);
  };

  // --- GPS TRACKING ---
  const startGpsTracking = () => {
    if (!navigator.geolocation) return;

    if (gpsWatchId.current) navigator.geolocation.clearWatch(gpsWatchId.current);

    const onGeoSuccess = (pos: GeolocationPosition) => {
        const { latitude, longitude, accuracy, speed, heading } = pos.coords;
        const newLoc = { lat: latitude, lng: longitude, accuracy, speed, heading };
        
        setUserLocation(newLoc);
        updateUserMarker(newLoc);

        if (isNavigatingRef.current && mapRef.current && destinationRef.current) {
            mapRef.current.setView([latitude, longitude], 19, { animate: true });
            
            const currentSpeedKmh = speed ? Math.round(speed * 3.6) : 0;
            const dist = getDistanceFromLatLonInM(latitude, longitude, destinationRef.current.lat, destinationRef.current.lng);
            const effectiveSpeed = (speed && speed > 0.5) ? speed : 1.4; 
            const time = dist / effectiveSpeed;

            setNavStats({
                speed: currentSpeedKmh,
                distanceRem: dist,
                timeRem: time
            });
        }
    };

    const onGeoError = (err: any) => console.warn("GPS Watch Error", err);

    navigator.geolocation.getCurrentPosition(onGeoSuccess, onGeoError, { enableHighAccuracy: true });
    gpsWatchId.current = navigator.geolocation.watchPosition(onGeoSuccess, onGeoError, { 
        enableHighAccuracy: true, 
        timeout: 2000 
    });
  };

  const updateUserMarker = (loc: { lat: number, lng: number, accuracy: number, heading: number | null }) => {
    const L = (window as any).L;
    if (!mapRef.current || !L) return;

    if (!userMarkerRef.current) {
      const userIcon = L.divIcon({
        className: 'bg-transparent',
        html: `
          <div class="relative flex h-5 w-5 -translate-x-1/2 -translate-y-1/2">
            <span class="absolute inline-flex h-full w-full rounded-full bg-blue-500 border-2 border-white shadow-sm opacity-50 animate-ping"></span>
            <span class="relative inline-flex rounded-full h-5 w-5 bg-blue-600 border-2 border-white shadow-md">
               ${loc.heading ? '<div style="position:absolute; top:-4px; left:50%; transform:translateX(-50%); width:0; height:0; border-left:4px solid transparent; border-right:4px solid transparent; border-bottom:6px solid white;"></div>' : ''}
            </span>
          </div>`,
        iconSize: [0, 0]
      });
      userMarkerRef.current = L.marker([loc.lat, loc.lng], { icon: userIcon, zIndexOffset: 1000 }).addTo(mapRef.current);
    } else {
      userMarkerRef.current.setLatLng([loc.lat, loc.lng]);
    }

    if (!accuracyCircleRef.current) {
        accuracyCircleRef.current = L.circle([loc.lat, loc.lng], {
            radius: loc.accuracy,
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.05,
            weight: 0,
        }).addTo(mapRef.current);
    } else {
        accuracyCircleRef.current.setLatLng([loc.lat, loc.lng]);
        accuracyCircleRef.current.setRadius(loc.accuracy);
    }
  };

  const reCenterMap = () => {
      if (userLocation && mapRef.current) {
          mapRef.current.setView([userLocation.lat, userLocation.lng], 16, { animate: true });
      } else {
          setNotification({type:'info', msg:'Nustatoma vieta...'});
          if (mapRef.current) mapRef.current.locate({ setView: true, maxZoom: 16 });
      }
  };

  const undoLastWaypoint = () => {
      setWaypoints(prev => prev.slice(0, -1));
  };

  // --- ROUTING CALCULATION ---
  useEffect(() => {
      if (!mapRef.current) return;
      const L = (window as any).L;
      
      // Cleanup previous control
      if (routingControlRef.current) {
          try { mapRef.current.removeControl(routingControlRef.current); } catch(e){}
          routingControlRef.current = null;
      }
      
      // Cleanup visual layers managed by us
      markerLayersRef.current.forEach(m => m.remove());
      markerLayersRef.current = [];

      if (waypoints.length === 0 || !userLocationRef.current) {
          setRoutes([]);
          return;
      }

      const planPoints = [
          L.latLng(userLocationRef.current.lat, userLocationRef.current.lng),
          ...waypoints.map(w => L.latLng(w.lat, w.lng))
      ];

      let serviceUrl = 'https://router.project-osrm.org/route/v1';
      let profile = 'car';
      
      if (transportMode === 'walking') {
          serviceUrl = 'https://routing.openstreetmap.de/routed-foot/route/v1';
          profile = 'driving'; 
      } else if (transportMode === 'cycling') {
          serviceUrl = 'https://routing.openstreetmap.de/routed-bike/route/v1';
          profile = 'driving'; 
      }

      try {
          const control = L.Routing.control({
              waypoints: planPoints,
              router: L.Routing.osrmv1({ serviceUrl, profile }),
              // We hide the default lines (opacity 0) so we can draw our own custom ones
              lineOptions: { styles: [{ color: 'transparent', opacity: 0 }] },
              altLineOptions: { styles: [{ color: 'transparent', opacity: 0 }] },
              show: false,
              addWaypoints: false,
              draggableWaypoints: false,
              fitSelectedRoutes: false,
              showAlternatives: true, // IMPORTANT: Enable multiple routes
              createMarker: () => null 
          }).addTo(mapRef.current);

          control.on('routesfound', (e: any) => {
              // Map all found routes to our state
              const foundRoutes = e.routes.map((r: any, i: number) => ({
                  id: i,
                  summary: r.summary,
                  coordinates: r.coordinates,
                  instructions: r.instructions,
                  waypoints: r.waypoints,
                  waypointIndices: r.waypointIndices,
                  routeObj: r
              }));

              setRoutes(foundRoutes);
              drawCustomMarkers(planPoints);
              
              // Reset selection if out of bounds, otherwise keep current selection if possible
              if (selectedRouteIndex >= foundRoutes.length) {
                setSelectedRouteIndex(0);
              }
          });
          
          control.on('routingerror', (e: any) => {
              console.warn("Routing Error:", e);
              // setNotification({type: 'error', msg: "Nepavyko rasti maršruto"}); // Optional: noisy if it's just a temporary glitch
          });

          routingControlRef.current = control;

      } catch (err) {
          console.error("Routing Setup Error", err);
      }
  }, [waypoints, transportMode, userLocation?.lat, userLocation?.lng]);

  // --- MAP DRAWING EFFECT ---
  // This handles drawing the Blue/Grey lines based on selection
  useEffect(() => {
    if (!mapRef.current || routes.length === 0) {
        // Clear if no routes
        routePolylinesRef.current.forEach(l => mapRef.current.removeLayer(l));
        routePolylinesRef.current = [];
        segmentLayersRef.current.forEach(l => mapRef.current.removeLayer(l));
        segmentLayersRef.current = [];
        return;
    }

    const L = (window as any).L;

    // 1. Clear old lines
    routePolylinesRef.current.forEach(l => mapRef.current.removeLayer(l));
    routePolylinesRef.current = [];
    segmentLayersRef.current.forEach(l => mapRef.current.removeLayer(l));
    segmentLayersRef.current = [];
    if (highlightLayerRef.current) {
        mapRef.current.removeLayer(highlightLayerRef.current);
        highlightLayerRef.current = null;
    }

    // 2. Draw Routes (Alternatives first, then Active)
    // We sort so active is last (on top)
    const sortedRoutes = routes.map((r, i) => ({...r, originalIndex: i}))
                               .sort((a, b) => (a.originalIndex === selectedRouteIndex ? 1 : -1));

    sortedRoutes.forEach((route) => {
        const isActive = route.originalIndex === selectedRouteIndex;

        // Visual Polyline
        const polyline = L.polyline(route.coordinates, {
            color: isActive ? '#2563eb' : '#94a3b8', // Blue vs Slate-400
            weight: isActive ? 7 : 5,
            opacity: isActive ? 0.9 : 0.6,
            lineCap: 'round',
            lineJoin: 'round',
            zIndexOffset: isActive ? 100 : 10
        }).addTo(mapRef.current);
        
        if (isActive) {
            polyline.bringToFront();
            // Create interactive click zones only for active route
            createInteractiveSegments(route);
            
            // Update stats for the active route
            if (!isNavigatingRef.current) {
                setNavStats({
                    speed: 0,
                    distanceRem: route.summary.totalDistance,
                    timeRem: route.summary.totalTime
                });
            }
        } else {
            // Click alternative to select it
            polyline.on('click', () => setSelectedRouteIndex(route.originalIndex));
        }

        routePolylinesRef.current.push(polyline);
    });

  }, [routes, selectedRouteIndex]);


  const drawCustomMarkers = (latLngs: any[]) => {
      const L = (window as any).L;
      latLngs.forEach((latLng, i) => {
          if (i === 0) return; 
          
          const waypointIndex = i - 1;
          const letter = String.fromCharCode(65 + waypointIndex);
          
          const icon = L.divIcon({
              className: 'bg-transparent',
              html: `<div class="relative w-8 h-8 flex items-center justify-center transform hover:scale-110 transition-transform cursor-pointer">
                        <div class="absolute inset-0 bg-slate-900 rounded-full border-2 border-white shadow-lg"></div>
                        <span class="relative text-white font-bold text-sm">${letter}</span>
                     </div>`,
              iconSize: [32, 32],
              iconAnchor: [16, 32]
          });

          const marker = L.marker(latLng, { icon, draggable: true }).addTo(mapRef.current);
          
          marker.on('dragend', (e: any) => {
              const newPos = e.target.getLatLng();
              setWaypoints(prev => {
                  const updated = [...prev];
                  updated[waypointIndex] = { lat: newPos.lat, lng: newPos.lng };
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
          const startIndex = route.waypointIndices[i];
          const endIndex = route.waypointIndices[i+1];
          const segmentCoords = route.coordinates.slice(startIndex, endIndex + 1);
          
          if (segmentCoords.length < 2) continue;

          // 50px Click Zone - FORCE TO FRONT
          const hitLayer = L.polyline(segmentCoords, {
              color: '#ffffff', // White
              weight: 50, 
              opacity: 0.01, // Almost invisible but registered
              zIndexOffset: 1000,
              bubblingMouseEvents: false, 
              interactive: true
          }).addTo(mapRef.current);
          
          // Force click layer to front
          hitLayer.bringToFront();

          const dist = calculateDistance(segmentCoords);
          const time = (dist / 1000) / (transportMode === 'driving' ? 50 : 5) * 60; 

          const startLabel = i === 0 ? "Jūsų vieta" : `Taškas ${String.fromCharCode(64 + i)}`;
          const endLabel = `Taškas ${String.fromCharCode(65 + i)}`;

          hitLayer.on('click', (e: any) => {
              L.DomEvent.stopPropagation(e);
              
              if (highlightLayerRef.current) {
                  mapRef.current.removeLayer(highlightLayerRef.current);
              }

              const highlight = L.polyline(segmentCoords, {
                  color: '#f97316', // Orange highlight
                  weight: 8,
                  opacity: 0.9,
                  lineCap: 'round',
                  interactive: false
              }).addTo(mapRef.current);
              highlight.bringToFront();
              
              highlightLayerRef.current = highlight;

              L.popup()
                .setLatLng(e.latlng)
                .setContent(`
                     <div class="text-center font-sans min-w-[100px]">
                        <div class="font-bold text-[9px] text-slate-400 uppercase tracking-wide mb-0.5">${startLabel} ➔ ${endLabel}</div>
                        <div class="text-lg font-black text-slate-800">${formatDist(dist)}</div>
                        <div class="text-xs text-blue-600 font-bold">~${Math.round(time)} min</div>
                     </div>
                `)
                .openOn(mapRef.current);
          });

          segmentLayersRef.current.push(hitLayer);
      }
  };

  const calculateDistance = (coords: any[]) => {
      const L = (window as any).L;
      let d = 0;
      for(let i=0; i<coords.length-1; i++) {
          d += L.latLng(coords[i]).distanceTo(L.latLng(coords[i+1]));
      }
      return d;
  };

  const startNavigation = () => {
      if (routes.length === 0) return;
      setViewMode('navigation');
      if (mapRef.current && userLocation) {
          mapRef.current.setZoom(18);
          mapRef.current.panTo([userLocation.lat, userLocation.lng], { animate: true });
      }
  };

  const stopNavigation = () => {
      setViewMode('map');
      if (mapRef.current) mapRef.current.setZoom(15);
  };

  // --- MATH ---
  const getDistanceFromLatLonInM = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000; 
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; 
  };

  const getSegmentDistance = (index: number) => {
      if (routes.length === 0) return 0;
      // Use selected Route
      const r = routes[selectedRouteIndex];
      if (!r || !r.waypointIndices || r.waypointIndices.length <= index + 1) return 0;
      
      const startI = r.waypointIndices[index];
      const endI = r.waypointIndices[index+1];
      const coords = r.coordinates.slice(startI, endI + 1);
      return calculateDistance(coords);
  };

  const formatTime = (s: number) => {
      const h = Math.floor(s / 3600);
      const m = Math.round((s % 3600) / 60);
      if (h > 0) return `${h} val ${m} min`;
      return `${m} min`;
  };

  const formatDist = (meters: number) => {
      if (meters >= 1000) return `${(meters/1000).toFixed(1)} km`;
      return `${Math.round(meters)} m`;
  };

  return (
    <div className="w-full h-screen overflow-hidden bg-slate-50 font-sans touch-none select-none text-slate-900">
      <Head>
        <title>TapuTapu v10.3</title>
      </Head>

      {/* Notification Toast */}
      {notification && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[3000] bg-slate-800/95 text-white px-5 py-2.5 rounded-full shadow-xl text-sm font-medium animate-fade-in pointer-events-none whitespace-nowrap">
            {notification.msg}
        </div>
      )}

      {/* MAP LAYER */}
      <div ref={mapContainerRef} className="absolute inset-0 z-0" />

      {/* LANDING PAGE - OVERLAY Z-50 */}
      {viewMode === 'landing' && (
        <div className="absolute inset-0 z-50 bg-gradient-to-br from-teal-400 via-emerald-400 to-blue-500 flex flex-col p-6 items-center justify-center animate-fade-in">
           
           <div className="w-full max-w-sm bg-white/20 backdrop-blur-xl border border-white/40 rounded-[2rem] p-8 shadow-2xl flex flex-col gap-8 items-center text-center">
               
               <div className="flex flex-col items-center">
                   <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-4 shadow-lg text-5xl">
                       🌲
                   </div>
                   <h1 className="text-5xl font-black text-white drop-shadow-md tracking-tight">TapuTapu</h1>
                   <div className="text-white/80 font-mono text-xs mt-1 bg-black/10 px-2 py-0.5 rounded">v10.3</div>
                   <p className="text-white/90 text-sm font-bold tracking-widest mt-2 uppercase">Atraskime kartu!</p>
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

      {/* --- UI OVERLAYS (Only visible in MAP mode) --- */}
      {viewMode === 'map' && (
        <>
            {/* Top Bar: Transport Modes */}
            <div className="absolute top-4 left-4 right-4 z-[1000] flex justify-center pointer-events-none">
                <div className="pointer-events-auto bg-white/90 backdrop-blur shadow-md rounded-full p-1 flex gap-1 border border-slate-100">
                   <button onClick={() => setViewMode('landing')} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-50 text-slate-400">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                   </button>
                   <div className="w-px bg-slate-200 mx-1 my-1"></div>
                   {['walking', 'cycling', 'driving'].map((m) => (
                       <button
                         key={m}
                         onClick={() => setTransportMode(m as TransportMode)}
                         className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${transportMode === m ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-50'}`}
                       >
                         {m === 'walking' ? '🚶' : m === 'cycling' ? '🚴' : '🚗'}
                       </button>
                   ))}
                </div>
            </div>

            {/* Right Control Bar */}
            <div className="absolute top-20 right-4 z-[1000] flex flex-col gap-3">
                {/* 1. BUILDER TOGGLE */}
                <button 
                  onClick={() => {
                      const newState = !isBuilderMode;
                      setIsBuilderMode(newState);
                      setNotification({type: 'info', msg: newState ? 'Paspauskite žemėlapį, kad pridėtumėte tašką' : 'Maršrutas užrakintas'});
                  }} 
                  className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all border-2 ${isBuilderMode ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-white text-slate-600 border-white'}`}
                >
                  <span className="text-2xl font-bold">{isBuilderMode ? '✓' : '+'}</span>
                </button>

                {/* 2. UNDO */}
                {isBuilderMode && waypoints.length > 0 && (
                    <button 
                        onClick={undoLastWaypoint}
                        className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-slate-600 active:scale-95"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                    </button>
                )}
                
                {/* 3. RECENTER */}
                <button 
                    onClick={reCenterMap}
                    className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-blue-600"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </button>

                {/* 4. SOS */}
                <button 
                    onClick={() => setViewMode('lost')}
                    className="w-12 h-12 bg-rose-500 rounded-full shadow-lg flex items-center justify-center text-white animate-pulse"
                >
                    <span className="text-xs font-bold">SOS</span>
                </button>
            </div>

            {/* Bottom Route Info Pill */}
            {routes.length > 0 && (
                <div className="absolute bottom-6 left-4 right-4 z-[1000] pointer-events-none flex flex-col items-center gap-2">
                    
                    {/* Route Selection Toggles - COMPACT */}
                    {routes.length > 1 && (
                        <div className="pointer-events-auto flex gap-2 mb-1 overflow-x-auto p-1 max-w-full">
                            {routes.map((r, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setSelectedRouteIndex(idx)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-md transition-all whitespace-nowrap ${
                                        selectedRouteIndex === idx 
                                        ? 'bg-blue-600 text-white ring-2 ring-blue-300' 
                                        : 'bg-white text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    {formatTime(r.summary.totalTime)}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Segments (Collapsible) - COMPACT */}
                    {showSegments && (
                        <div className="pointer-events-auto w-full max-w-sm bg-white/95 backdrop-blur rounded-xl p-3 shadow-xl border border-slate-200 mb-1 max-h-40 overflow-y-auto">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Maršruto Atkarpos</h4>
                            <div className="text-xs text-slate-600 space-y-1">
                                {waypoints.map((wp, i) => (
                                    <div key={i} className="flex justify-between border-b border-slate-100 pb-1">
                                        <span>{i === 0 ? "Nuo Jūsų" : `Taškas ${String.fromCharCode(64 + i)}`} → {String.fromCharCode(65 + i)}</span>
                                        <span className="font-mono font-bold">{formatDist(getSegmentDistance(i))}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Main Pill - COMPACT */}
                    <div className="pointer-events-auto w-full max-w-sm bg-white rounded-xl p-3 shadow-2xl flex items-center justify-between border border-slate-100">
                        <div onClick={() => setShowSegments(!showSegments)} className="flex flex-col cursor-pointer active:opacity-70 transition-opacity">
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-black text-slate-800">{formatTime(routes[selectedRouteIndex]?.summary.totalTime || 0)}</span>
                                <span className="text-xs font-medium text-slate-500">({formatDist(routes[selectedRouteIndex]?.summary.totalDistance || 0)})</span>
                            </div>
                            <div className="text-[10px] text-blue-600 font-bold flex items-center gap-1">
                                {waypoints.length} taškai (Išskleisti)
                            </div>
                        </div>
                        
                        <div className="flex gap-2">
                            <button onClick={() => { setWaypoints([]); setRoutes([]); }} className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center hover:bg-slate-200">
                                ✕
                            </button>
                            <button onClick={startNavigation} className="h-10 px-6 bg-blue-600 text-white rounded-full font-bold shadow-lg shadow-blue-200 active:scale-95 transition-transform flex items-center gap-2">
                                <span>Vykstame</span>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
      )}

      {/* --- NAVIGATION MODE --- */}
      {viewMode === 'navigation' && (
          <>
            <div className="absolute top-0 left-0 right-0 bg-slate-900 text-white p-4 pt- safe z-[1000] flex justify-between items-start shadow-xl">
                 <div className="flex flex-col">
                     <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">Kitas posūkis</span>
                     <span className="text-2xl font-bold flex items-center gap-2">
                         ⬆️ {formatDist(navStats.distanceRem > 100 ? 100 : navStats.distanceRem)}
                     </span>
                 </div>
                 <button onClick={stopNavigation} className="bg-slate-800 text-white px-3 py-1 rounded text-xs font-bold border border-slate-700">
                     Baigti
                 </button>
            </div>

            <div className="absolute bottom-0 left-0 right-0 bg-white p-6 pb-safe z-[1000] rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
                 <div className="grid grid-cols-3 gap-4 text-center">
                     <div className="flex flex-col">
                         <span className="text-3xl font-black text-slate-800">{navStats.speed}</span>
                         <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">km/h</span>
                     </div>
                     <div className="flex flex-col border-x border-slate-100">
                         <span className="text-3xl font-black text-slate-800">{formatTime(navStats.timeRem)}</span>
                         <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Liko</span>
                     </div>
                     <div className="flex flex-col">
                         <span className="text-3xl font-black text-slate-800">{(navStats.distanceRem / 1000).toFixed(1)}</span>
                         <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">km</span>
                     </div>
                 </div>
            </div>
          </>
      )}

      {/* --- LOST MODE --- */}
      {viewMode === 'lost' && (
        <div className="absolute inset-0 z-[2000]">
            <LostView lat={userLocation?.lat || 0} lng={userLocation?.lng || 0} onClose={() => setViewMode('landing')} />
        </div>
      )}
    </div>
  );
}
