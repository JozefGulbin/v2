import React, { useState, useEffect, useRef } from "react";
import Head from 'next/head';

// TYPE DEFINITIONS
type ViewMode = 'landing' | 'map' | 'navigation' | 'history' | 'lost';
type TransportMode = 'walking' | 'cycling' | 'driving';
type Language = 'en' | 'lt';

interface PinSegment {
  letter: string;
  lat: number;
  lng: number;
}

interface SavedRoute {
  id: string;
  date: string;
  distance: number;
  duration: number;
  pace: string;
  calories: number;
  path: Array<{ lat: number; lng: number }>;
}

interface SegmentRoute {
  distance: number;
  duration: number;
  coordinates: Array<[number, number]>;
  color: string;
}

interface RouteOption {
  id: string;
  type: 'fastest' | 'shortest' | 'scenic';
  distance: number;
  duration: number;
  coordinates: [number, number][];
  color: string;
  description: string;
}

// TRANSLATIONS
const translations = {
  en: { start: 'START', stop: 'STOP' },
  lt: { start: 'PRADĖTI', stop: 'SUSTABDYTI' },
};

// HELPER FUNCTIONS
const getDistanceString = (meters: number) => {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
};

const getDurationString = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  return `${mins}m`;
};

const generateTurnByTurnInstructions = (coordinates: Array<[number, number]>): string[] => {
  const instructions: string[] = ['Start your journey'];
  if (coordinates.length < 3) {
    return [...instructions, 'Continue straight ahead'];
  }
  for (let i = 1; i < Math.min(coordinates.length - 1, 10); i++) {
    instructions.push(`Continue ahead`);
  }
  instructions.push('Arrive at your destination');
  return instructions;
};

const fetchAlternateRoutes = async (
  startPoint: { lat: number; lng: number },
  endPoint: { lat: number; lng: number },
  transportMode: string
): Promise<RouteOption[]> => {
  try {
    const profile = transportMode === 'driving' ? 'car' : 'foot';
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/${profile}/${startPoint.lng},${startPoint.lat};${endPoint.lng},${endPoint.lat}?overview=full&geometries=geojson`
    );
    const data = await response.json();
    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      return [{
        id: 'fastest',
        type: 'fastest',
        distance: route.distance,
        duration: route.duration,
        coordinates: route.geometry.coordinates,
        color: '#3b82f6',
        description: `Fastest (${Math.round(route.duration / 60)}m)`
      }];
    }
  } catch (error) {
    console.error('Error fetching routes:', error);
  }
  return [];
};

const calculateRoutes = async (
  startPoint: { lat: number; lng: number },
  waypoints: PinSegment[],
  endPoint: { lat: number; lng: number },
  transportMode: string
): Promise<SegmentRoute[]> => {
  const routes: SegmentRoute[] = [];
  try {
    const profile = transportMode === 'driving' ? 'car' : 'foot';
    const coordinates = [startPoint, ...waypoints, endPoint];
    
    for (let i = 0; i < coordinates.length - 1; i++) {
      const from = coordinates[i];
      const to = coordinates[i + 1];
      
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/${profile}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`
      );
      const data = await response.json();
      
      if (data.routes && data.routes[0]) {
        const route = data.routes[0];
        routes.push({
          distance: route.distance,
          duration: route.duration,
          coordinates: route.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]] as [number, number]),
          color: i === 0 ? '#3b82f6' : '#10b981'
        });
      }
    }
  } catch (error) {
    console.error('Error calculating routes:', error);
  }
  return routes;
};

// MAIN COMPONENT
export default function MapPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('landing');
  const [transportMode, setTransportMode] = useState<TransportMode>('walking');
  const [language, setLanguage] = useState<Language>('en');
  
  const [mainDestination, setMainDestination] = useState<{lat: number, lng: number} | null>(null);
  const [pinSegments, setPinSegments] = useState<PinSegment[]>([]);
  const [segmentRoutes, setSegmentRoutes] = useState<SegmentRoute[]>([]);
  const [selectedSegmentIndex, setSelectedSegmentIndex] = useState<number | null>(null);
  
  const [alternateRoutes, setAlternateRoutes] = useState<RouteOption[]>([]);
  const [selectedRouteType, setSelectedRouteType] = useState<'fastest' | 'shortest' | 'scenic'>('fastest');
  
  const [turnByTurnInstructions, setTurnByTurnInstructions] = useState<string[]>([]);
  const [currentInstructionIndex, setCurrentInstructionIndex] = useState(0);
  
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number, accuracy: number, speed: number | null, heading: number | null } | null>(null);
  
  const [isBuilderMode, setIsBuilderMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  const [recordedPath, setRecordedPath] = useState<{lat: number, lng: number}[]>([]);
  const [totalRecordedDist, setTotalRecordedDist] = useState(0);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  
  const [nextInstruction, setNextInstruction] = useState('');
  const [navStats, setNavStats] = useState({ speed: 0, distanceRem: 0, timeRem: 0, pace: '--:--', calories: 0 });
  
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);
  
  const mapRef = useRef<any>(null);
  const gpsWatchId = useRef<number | null>(null);
  const mapWrapperRef = useRef<HTMLDivElement | null>(null);
  const mapInitializedRef = useRef(false);
  const routeLayersRef = useRef<any[]>([]);
  const waypointMarkersRef = useRef<Map<string, any>>(new Map());
  const destinationMarkerRef = useRef<any>(null);
  
  const isNavigatingRef = useRef(false);
  const isRecordingRef = useRef(false);
  const isBuilderModeRef = useRef(false);
  const transportModeRef = useRef<TransportMode>('walking');
  const userLocationRef = useRef<{ lat: number; lng: number, heading: number | null } | null>(null);
  const destinationRef = useRef<{ lat: number; lng: number } | null>(null);
  
  const t = translations[language];

  const speakInstruction = (text: string) => {
    if (!soundEnabled) return;
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === 'lt' ? 'lt-LT' : 'en-US';
      utterance.rate = 1;
      speechSynthesis.cancel();
      speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    const localData = localStorage.getItem('taputapu_saved_routes');
    if (localData) setSavedRoutes(JSON.parse(localData));
    const savedLang = localStorage.getItem('taputapu_language') as Language;
    if (savedLang) setLanguage(savedLang);
  }, []);

  useEffect(() => {
    localStorage.setItem('taputapu_language', language);
  }, [language]);

  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);
  useEffect(() => { isBuilderModeRef.current = isBuilderMode; }, [isBuilderMode]);
  useEffect(() => { transportModeRef.current = transportMode; }, [transportMode]);
  useEffect(() => { isNavigatingRef.current = viewMode === 'navigation'; }, [viewMode]);

  useEffect(() => {
    if (userLocation) {
      userLocationRef.current = { lat: userLocation.lat, lng: userLocation.lng, heading: userLocation.heading };
    }
  }, [userLocation]);

  useEffect(() => {
    const fetchAlternates = async () => {
      if (userLocation && mainDestination) {
        const routes = await fetchAlternateRoutes(userLocation, mainDestination, transportMode);
        setAlternateRoutes(routes);
      }
    };
    fetchAlternates();
  }, [userLocation, mainDestination, transportMode]);

  useEffect(() => {
    const calculateAndDrawRoutes = async () => {
      if (userLocation && mainDestination) {
        try {
          const routes = await calculateRoutes(
            userLocation,
            pinSegments,
            mainDestination,
            transportMode
          );
          setSegmentRoutes(routes);
          
          if (routes.length > 0 && routes[0].coordinates) {
            const instructions = generateTurnByTurnInstructions(routes[0].coordinates);
            setTurnByTurnInstructions(instructions);
            setCurrentInstructionIndex(0);
          }
          
          drawRoutes(routes);
        } catch (error) {
          console.error('Error calculating routes:', error);
        }
      }
    };
    calculateAndDrawRoutes();
  }, [userLocation, mainDestination, pinSegments, transportMode]);

  const drawRoutes = (routes: SegmentRoute[]) => {
    if (!mapRef.current) return;
    const L = (window as any).L;

    routeLayersRef.current.forEach(layer => {
      try {
        mapRef.current.removeLayer(layer);
      } catch (e) {
        console.error('Error removing layer:', e);
      }
    });
    routeLayersRef.current = [];

    routes.forEach((segment, index) => {
      const isSelected = selectedSegmentIndex === index;
      const isMainRoute = index === 0;
      
      const polyline = L.polyline(segment.coordinates, {
        color: segment.color,
        weight: isSelected ? 8 : isMainRoute ? 5 : 3,
        opacity: isSelected ? 1 : isMainRoute ? 0.8 : 0.5,
        dashArray: isMainRoute ? undefined : '5, 5'
      }).addTo(mapRef.current);

      if (segment.coordinates.length > 1) {
        const midIndex = Math.floor(segment.coordinates.length / 2);
        const midpoint = segment.coordinates[midIndex];
        
        const marker = L.marker(midpoint, {
          icon: L.divIcon({
            html: `<div style="background-color: ${segment.color}; color: white; padding: 6px 10px; border-radius: 12px; font-size: 11px; font-weight: bold; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.2); border: ${isSelected ? '3px solid white' : 'none'}; cursor: pointer;">${getDistanceString(segment.distance)}<br>${getDurationString(segment.duration)}</div>`,
            iconSize: [90, 40],
            className: 'route-distance-marker'
          })
        }).addTo(mapRef.current);

        marker.on('click', () => {
          setSelectedSegmentIndex(index);
        });

        routeLayersRef.current.push(polyline, marker);
      } else {
        routeLayersRef.current.push(polyline);
      }
    });
  };

  useEffect(() => {
    if (segmentRoutes.length > 0) {
      drawRoutes(segmentRoutes);
    }
  }, [selectedSegmentIndex]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!(window as any).L) {
      setTimeout(() => {
        if ((window as any).L && !mapInitializedRef.current) initMap();
      }, 100);
      return;
    }
    if (!mapInitializedRef.current) {
      initMap();
    }
  }, []);

  const initMap = () => {
    if (typeof window === 'undefined') return;
    const L = (window as any).L;
    if (!L || mapInitializedRef.current) return;

    const mapWrapper = document.createElement('div');
    mapWrapper.id = 'map-wrapper';
    mapWrapper.style.position = 'fixed';
    mapWrapper.style.top = '0';
    mapWrapper.style.left = '0';
    mapWrapper.style.width = '100vw';
    mapWrapper.style.height = '100vh';
    mapWrapper.style.zIndex = '1';
    mapWrapper.style.pointerEvents = 'auto';
    mapWrapper.style.display = 'none';
    
    document.body.appendChild(mapWrapper);
    mapWrapperRef.current = mapWrapper;

    try {
      const map = L.map(mapWrapper, { 
        zoomControl: false, 
        attributionControl: false, 
        preferCanvas: true 
      }).setView([54.6872, 25.2797], 15);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { 
        maxZoom: 19 
      }).addTo(map);
      
      (map as any).userMarker = null;
      
      const handleMapClick = (e: any) => {
        const L = (window as any).L;
        
        if (isNavigatingRef.current) return;
        
        if (isBuilderModeRef.current) {
          if (mainDestination) {
            const waypointLetter = String.fromCharCode(66 + pinSegments.length);
            const newWaypoint: PinSegment = {
              letter: waypointLetter,
              lat: mainDestination.lat,
              lng: mainDestination.lng
            };
            
            if (destinationMarkerRef.current) {
              map.removeLayer(destinationMarkerRef.current);
            }
            
            const waypointMarker = L.marker([mainDestination.lat, mainDestination.lng], {
              icon: L.divIcon({
                html: `<div style="background-color: #f59e0b; width: 40px; height: 40px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">${waypointLetter}</div>`,
                iconSize: [46, 46],
                className: 'custom-div-icon'
              })
            }).addTo(map);
            
            waypointMarkersRef.current.set(waypointLetter, waypointMarker);
            setPinSegments(prev => [...prev, newWaypoint]);
          }
          
          setMainDestination({ lat: e.latlng.lat, lng: e.latlng.lng });
          destinationRef.current = { lat: e.latlng.lat, lng: e.latlng.lng };
          
          destinationMarkerRef.current = L.marker([e.latlng.lat, e.latlng.lng], {
            icon: L.divIcon({
              html: '<div style="background-color: #dc2626; width: 40px; height: 40px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">📍</div>',
              iconSize: [46, 46],
              className: 'custom-div-icon'
            })
          }).addTo(map);
        } else {
          if (!mainDestination) {
            setMainDestination({ lat: e.latlng.lat, lng: e.latlng.lng });
            destinationRef.current = { lat: e.latlng.lat, lng: e.latlng.lng };
            
            destinationMarkerRef.current = L.marker([e.latlng.lat, e.latlng.lng], {
              icon: L.divIcon({
                html: '<div style="background-color: #dc2626; width: 40px; height: 40px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">📍</div>',
                iconSize: [46, 46],
                className: 'custom-div-icon'
              })
            }).addTo(map);
          }
        }
      };
      
      map.on('click', handleMapClick);
      mapRef.current = map;
      mapInitializedRef.current = true;
      
      if (navigator.geolocation) {
        startGpsTracking();
        navigator.geolocation.getCurrentPosition((pos) => {
          if (mapRef.current) {
            mapRef.current.setView([pos.coords.latitude, pos.coords.longitude], 15);
            
            if ((mapRef.current as any).userMarker) {
              (mapRef.current as any).userMarker.remove();
            }
            (mapRef.current as any).userMarker = L.marker([pos.coords.latitude, pos.coords.longitude], {
              icon: L.divIcon({
                html: '<div style="background-color: #16a34a; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; color: white; font-size: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">🧭</div>',
                iconSize: [38, 38],
                className: 'custom-div-icon'
              })
            }).addTo(mapRef.current);
          }
        });
      }
    } catch (error) {
      console.error('Map initialization error:', error);
    }
  };

  const startGpsTracking = () => {
    if (!navigator.geolocation) return;
    
    const onGeoSuccess = (pos: GeolocationPosition) => {
      const { latitude, longitude, accuracy, speed, heading } = pos.coords;
      const newLoc = { lat: latitude, lng: longitude, accuracy, speed, heading };
      setUserLocation(newLoc);
      
      if (mapRef.current && (mapRef.current as any).userMarker) {
        (mapRef.current as any).userMarker.setLatLng([latitude, longitude]);
      }

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
        mapRef.current.setView([latitude, longitude], 18, { animate: true });
        const distRem = destinationRef.current ? getDistanceFromLatLonInM(latitude, longitude, destinationRef.current.lat, destinationRef.current.lng) : 0;
        setNavStats({ speed: speed ? Math.round(speed * 3.6) : 0, distanceRem: distRem, timeRem: speed && speed > 0 ? distRem / speed : distRem / 1.4, pace: calculatePace(speed), calories: Math.round((totalRecordedDist / 1000) * 65) });
      }
    };
    
    const onGeoError = (error: GeolocationPositionError) => {
      console.error('GPS error:', error.message);
    };
    
    gpsWatchId.current = navigator.geolocation.watchPosition(onGeoSuccess, onGeoError, { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 });
  };

  const getDistanceFromLatLonInM = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))); 
  };

  const calculatePace = (speed: number | null) => {
    if (!speed || speed < 0.3) return '--:--';
    const minPerKm = 1000 / (speed * 60);
    const mins = Math.floor(minPerKm);
    const secs = Math.round((minPerKm - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleReset = () => {
    setMainDestination(null);
    setPinSegments([]);
    setSegmentRoutes([]);
    setSelectedSegmentIndex(null);
    setIsBuilderMode(false);
    setAlternateRoutes([]);
    setTurnByTurnInstructions([]);
    setCurrentInstructionIndex(0);
    
    if (destinationMarkerRef.current && mapRef.current) {
      mapRef.current.removeLayer(destinationMarkerRef.current);
      destinationMarkerRef.current = null;
    }
    
    waypointMarkersRef.current.forEach((marker) => {
      if (mapRef.current) {
        mapRef.current.removeLayer(marker);
      }
    });
    waypointMarkersRef.current.clear();
    
    routeLayersRef.current.forEach(layer => {
      if (mapRef.current) {
        mapRef.current.removeLayer(layer);
      }
    });
    routeLayersRef.current = [];
    
    destinationRef.current = null;
  };

  const handleToggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
    } else {
      setRecordedPath([]);
      setTotalRecordedDist(0);
      setRecordingStartTime(Date.now());
      setIsRecording(true);
    }
  };

  const handleStartNavigation = () => {
    if (mainDestination && userLocation) {
      setViewMode('navigation');
      setCurrentInstructionIndex(0);
      if (turnByTurnInstructions.length > 0) {
        setNextInstruction(turnByTurnInstructions[0]);
        speakInstruction(turnByTurnInstructions[0]);
      }
    }
  };

  useEffect(() => {
    if (mapWrapperRef.current) {
      if (viewMode === 'map' || viewMode === 'navigation') {
        mapWrapperRef.current.style.display = 'block';
      } else {
        mapWrapperRef.current.style.display = 'none';
      }
    }
    if (mapRef.current) {
      setTimeout(() => mapRef.current.invalidateSize(), 300);
    }
  }, [viewMode]);

  return (
    <>
      <Head>
        <title>TapuTapu v12.3 Spring Edition</title>
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { width: 100%; height: 100%; overflow: hidden !important; position: fixed !important; }
          #__next { width: 100%; height: 100%; overflow: hidden !important; }
        `}</style>
      </Head>

      <div style={{ width: '100vw', height: '100vh', position: 'fixed', top: 0, left: 0, zIndex: 0 }}>
        {viewMode === 'landing' && (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#10b981', color: 'white', flexDirection: 'column' }}>
            <h1>TapuTapu v12.3</h1>
            <button onClick={() => setViewMode('map')} style={{ padding: '12px 24px', margin: '10px', backgroundColor: '#3b82f6', border: 'none', color: 'white', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>🗺️ Map</button>
            <button onClick={() => setViewMode('history')} style={{ padding: '12px 24px', margin: '10px', backgroundColor: '#3b82f6', border: 'none', color: 'white', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>📖 History</button>
          </div>
        )}

        {viewMode === 'history' && (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6', flexDirection: 'column' }}>
            <h2>Saved Routes</h2>
            <button onClick={() => setViewMode('landing')} style={{ padding: '12px 24px', margin: '10px', backgroundColor: '#10b981', border: 'none', color: 'white', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>← Back</button>
          </div>
        )}
      </div>

      {viewMode === 'map' && (
        <>
          {pinSegments.length > 0 && segmentRoutes.length > 0 && (
            <div style={{ position: 'fixed', left: 24, top: '50%', transform: 'translateY(-50%)', zIndex: 100, backgroundColor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', borderRadius: 20, padding: 16, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', maxHeight: '70vh', overflowY: 'auto', pointerEvents: 'auto', minWidth: 240 }}>
              <div style={{ fontSize: 12, fontWeight: 'bold', color: '#6b7280', marginBottom: 12, textTransform: 'uppercase' }}>Waypoints</div>
              {pinSegments.map((pin, idx) => {
                const route = segmentRoutes[idx];
                return (
                  <div key={idx} style={{ padding: 12, borderRadius: 12, marginBottom: 8, backgroundColor: '#f3f4f6', cursor: 'pointer' }}>
                    <div style={{ fontWeight: 'bold', fontSize: 14, color: '#111827' }}>{pin.letter}</div>
                    {route && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>📏 {getDistanceString(route.distance)}</div>}
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ position: 'fixed', top: 32, left: '50%', transform: 'translateX(-50%)', zIndex: 100, display: 'flex', justifyContent: 'center', pointerEvents: 'auto' }}>
            <div style={{ backgroundColor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', borderRadius: 9999, padding: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={() => setViewMode('landing')} style={{ width: 48, height: 48, borderRadius: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, backgroundColor: '#f3f4f6', border: 'none', cursor: 'pointer' }}>🏠</button>
              {(['walking', 'cycling', 'driving'] as const).map((m) => (
                <button key={m} onClick={() => setTransportMode(m)} style={{ width: 48, height: 48, borderRadius: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, backgroundColor: transportMode === m ? '#16a34a' : 'transparent', border: 'none', cursor: 'pointer' }}>
                  {m === 'walking' ? '🚶' : m === 'cycling' ? '🚴' : '🚗'}
                </button>
              ))}
            </div>
          </div>

          <div style={{ position: 'fixed', top: 32, right: 32, zIndex: 100, display: 'flex', gap: 12, pointerEvents: 'auto' }}>
            {(mainDestination || pinSegments.length > 0) && (
              <button onClick={handleReset} style={{ width: 48, height: 48, borderRadius: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, backgroundColor: '#fca5a5', border: 'none', cursor: 'pointer' }}>↻</button>
            )}
            <button onClick={() => setSoundEnabled(!soundEnabled)} style={{ width: 48, height: 48, borderRadius: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, backgroundColor: soundEnabled ? '#16a34a' : '#f3f4f6', border: 'none', cursor: 'pointer' }}>
              {soundEnabled ? '🔊' : '🔇'}
            </button>
          </div>

          {mainDestination && (
            <div style={{ position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)', zIndex: 100, pointerEvents: 'auto' }}>
              <button onClick={handleStartNavigation} style={{ width: 200, height: 60, backgroundColor: '#10b981', border: '4px solid white', borderRadius: 30, color: 'white', fontSize: 20, fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
                ▶️ {t.start}
              </button>
            </div>
          )}

          <div style={{ position: 'fixed', top: 128, right: 32, zIndex: 100, display: 'flex', flexDirection: 'column', gap: 24, pointerEvents: 'auto' }}>
            <button onClick={handleToggleRecording} style={{ width: 64, height: 64, borderRadius: 32, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: `4px solid ${isRecording ? '#fca5a5' : 'white'}`, backgroundColor: isRecording ? '#dc2626' : 'white', color: isRecording ? 'white' : '#dc2626', cursor: 'pointer' }}>
              <div style={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: isRecording ? 'white' : '#dc2626' }} />
              <span style={{ fontSize: 8, marginTop: 6, fontWeight: 'bold' }}>REC</span>
            </button>
            {mainDestination && (
              <button onClick={() => setIsBuilderMode(!isBuilderMode)} style={{ width: 64, height: 64, borderRadius: 32, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: `4px solid ${isBuilderMode ? '#d1fae5' : 'white'}`, backgroundColor: isBuilderMode ? '#10b981' : 'white', color: isBuilderMode ? 'white' : '#10b981', cursor: 'pointer' }}>
                <span style={{ fontSize: 24, fontWeight: 'bold' }}>{isBuilderMode ? '✓' : '+'}</span>
                <span style={{ fontSize: 8, fontWeight: 'bold' }}>PIN</span>
              </button>
            )}
          </div>
        </>
      )}

      {viewMode === 'navigation' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: 24, left: 24, pointerEvents: 'auto' }}>
            <button onClick={() => setViewMode('map')} style={{ width: 60, height: 60, borderRadius: '20px', backgroundColor: '#a78bfa', color: 'white', border: '3px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 28, fontWeight: 'bold' }}>←</button>
          </div>
          {nextInstruction && (
            <div style={{ position: 'absolute', top: 100, left: 24, pointerEvents: 'auto', backgroundColor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', borderRadius: 20, padding: '12px 16px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', border: '2px solid #3b82f6', display: 'flex', alignItems: 'center', gap: 12, maxWidth: 400 }}>
              <span style={{ fontSize: 24 }}>🧭</span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 10, fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase' }}>Next</span>
                <span style={{ fontSize: 14, fontWeight: 'bold', color: '#111827' }}>{nextInstruction}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
