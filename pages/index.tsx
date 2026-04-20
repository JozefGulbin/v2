import React, { useState, useEffect, useRef } from "react";
import Head from 'next/head';

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

const translations = {
  en: { start: 'START', stop: 'STOP' },
  lt: { start: 'PRADĖTI', stop: 'SUSTABDYTI' },
};

const getDistanceString = (meters: number) => {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
};

const getDurationString = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  return `${mins}m`;
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

export default function MapPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('landing');
  const [transportMode, setTransportMode] = useState<TransportMode>('walking');
  const [language, setLanguage] = useState<Language>('en');
  
  const [mainDestination, setMainDestination] = useState<{lat: number, lng: number} | null>(null);
  const [pinSegments, setPinSegments] = useState<PinSegment[]>([]);
  const [segmentRoutes, setSegmentRoutes] = useState<SegmentRoute[]>([]);
  const [selectedSegmentIndex, setSelectedSegmentIndex] = useState<number | null>(null);
  
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isBuilderMode, setIsBuilderMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  const [nextInstruction, setNextInstruction] = useState('');
  
  const mapRef = useRef<any>(null);
  const mapWrapperRef = useRef<HTMLDivElement | null>(null);
  const mapInitializedRef = useRef(false);
  const routeLayersRef = useRef<any[]>([]);
  const waypointMarkersRef = useRef<Map<string, any>>(new Map());
  const destinationMarkerRef = useRef<any>(null);
  
  const isNavigatingRef = useRef(false);
  const isBuilderModeRef = useRef(false);
  const transportModeRef = useRef<TransportMode>('walking');
  const destinationRef = useRef<{ lat: number; lng: number } | null>(null);
  
  const t = translations[language];
  
  // Calculate routes only when destination or waypoints change
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
          drawRoutes(routes);
        } catch (error) {
          console.error('Error calculating routes:', error);
        }
      }
    };
    calculateAndDrawRoutes();
  }, [mainDestination, pinSegments, transportMode]);

  const drawRoutes = (routes: SegmentRoute[]) => {
    if (!mapRef.current) return;
    const L = (window as any).L;

    routeLayersRef.current.forEach(layer => {
      try {
        mapRef.current.removeLayer(layer);
      } catch (e) {}
    });
    routeLayersRef.current = [];

    routes.forEach((segment, index) => {
      const isMainRoute = index === 0;
      
      const polyline = L.polyline(segment.coordinates, {
        color: segment.color,
        weight: isMainRoute ? 5 : 3,
        opacity: isMainRoute ? 0.8 : 0.5,
        dashArray: isMainRoute ? undefined : '5, 5'
      }).addTo(mapRef.current);

      if (segment.coordinates.length > 1) {
        const midIndex = Math.floor(segment.coordinates.length / 2);
        const midpoint = segment.coordinates[midIndex];
        
        const marker = L.marker(midpoint, {
          icon: L.divIcon({
            html: `<div style="background-color: ${segment.color}; color: white; padding: 6px 10px; border-radius: 12px; font-size: 11px; font-weight: bold; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">${getDistanceString(segment.distance)}<br>${getDurationString(segment.duration)}</div>`,
            iconSize: [90, 40],
          })
        }).addTo(mapRef.current);

        routeLayersRef.current.push(polyline, marker);
      } else {
        routeLayersRef.current.push(polyline);
      }
    });
  };

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
    mapWrapper.style.display = 'none';
    
    document.body.appendChild(mapWrapper);
    mapWrapperRef.current = mapWrapper;

    try {
      const map = L.map(mapWrapper, { 
        zoomControl: false, 
        attributionControl: false 
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
                html: `<div style="background-color: #f59e0b; width: 40px; height: 40px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 16px;">${waypointLetter}</div>`,
                iconSize: [46, 46],
              })
            }).addTo(map);
            
            waypointMarkersRef.current.set(waypointLetter, waypointMarker);
            setPinSegments(prev => [...prev, newWaypoint]);
          }
          
          setMainDestination({ lat: e.latlng.lat, lng: e.latlng.lng });
          destinationRef.current = { lat: e.latlng.lat, lng: e.latlng.lng };
          
          destinationMarkerRef.current = L.marker([e.latlng.lat, e.latlng.lng], {
            icon: L.divIcon({
              html: '<div style="background-color: #dc2626; width: 40px; height: 40px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 20px;">📍</div>',
              iconSize: [46, 46],
            })
          }).addTo(map);
        } else {
          if (!mainDestination) {
            setMainDestination({ lat: e.latlng.lat, lng: e.latlng.lng });
            destinationRef.current = { lat: e.latlng.lat, lng: e.latlng.lng };
            
            destinationMarkerRef.current = L.marker([e.latlng.lat, e.latlng.lng], {
              icon: L.divIcon({
                html: '<div style="background-color: #dc2626; width: 40px; height: 40px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 20px;">📍</div>',
                iconSize: [46, 46],
              })
            }).addTo(map);
          }
        }
      };
      
      map.on('click', handleMapClick);
      mapRef.current = map;
      mapInitializedRef.current = true;
      
      if (navigator.geolocation) {
        navigator.geolocation.watchPosition((pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          
          if (mapRef.current) {
            if ((mapRef.current as any).userMarker) {
              (mapRef.current as any).userMarker.setLatLng([pos.coords.latitude, pos.coords.longitude]);
            } else {
              (mapRef.current as any).userMarker = L.marker([pos.coords.latitude, pos.coords.longitude], {
                icon: L.divIcon({
                  html: '<div style="background-color: #16a34a; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; color: white;">🧭</div>',
                  iconSize: [38, 38],
                })
              }).addTo(mapRef.current);
            }
          }
        }, (error) => {
          console.error('GPS error:', error.message);
        }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 });
      }
    } catch (error) {
      console.error('Map initialization error:', error);
    }
  };

  const handleReset = () => {
    setMainDestination(null);
    setPinSegments([]);
    setSegmentRoutes([]);
    setSelectedSegmentIndex(null);
    setIsBuilderMode(false);
    
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

  useEffect(() => {
    isBuilderModeRef.current = isBuilderMode;
  }, [isBuilderMode]);

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
          html, body { width: 100%; height: 100%; overflow: hidden; }
          body { position: fixed; }
          #__next { width: 100%; height: 100%; }
        `}</style>
      </Head>

      {viewMode === 'landing' && (
        <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#10b981', color: 'white', flexDirection: 'column' }}>
          <h1>TapuTapu v12.3</h1>
          <button onClick={() => setViewMode('map')} style={{ padding: '12px 24px', margin: '10px', backgroundColor: '#3b82f6', border: 'none', color: 'white', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>🗺️ Map</button>
          <button onClick={() => setViewMode('history')} style={{ padding: '12px 24px', margin: '10px', backgroundColor: '#3b82f6', border: 'none', color: 'white', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>📖 History</button>
        </div>
      )}

      {viewMode === 'history' && (
        <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6', flexDirection: 'column' }}>
          <h2>Saved Routes</h2>
          <button onClick={() => setViewMode('landing')} style={{ padding: '12px 24px', margin: '10px', backgroundColor: '#10b981', border: 'none', color: 'white', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>← Back</button>
        </div>
      )}

      {viewMode === 'map' && (
        <>
          {/* Top center nav bar */}
          <div style={{ position: 'fixed', top: 32, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, pointerEvents: 'auto' }}>
            <div style={{ backgroundColor: 'rgba(255,255,255,0.98)', backdropFilter: 'blur(12px)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', borderRadius: 40, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <button onClick={() => setViewMode('landing')} style={{ width: 48, height: 48, borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, backgroundColor: '#f3f4f6', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>🏠</button>
              {(['walking', 'cycling', 'driving'] as const).map((m) => (
                <button key={m} onClick={() => setTransportMode(m)} style={{ width: 48, height: 48, borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, backgroundColor: transportMode === m ? '#16a34a' : '#f3f4f6', color: transportMode === m ? 'white' : '#666', border: 'none', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.3s' }}>
                  {m === 'walking' ? '🚶' : m === 'cycling' ? '🚴' : '🚗'}
                </button>
              ))}
            </div>
          </div>

          {/* Top right buttons */}
          <div style={{ position: 'fixed', top: 32, right: 32, zIndex: 1000, display: 'flex', gap: 12, pointerEvents: 'auto' }}>
            {(mainDestination || pinSegments.length > 0) && (
              <button onClick={handleReset} style={{ width: 48, height: 48, borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, backgroundColor: '#fca5a5', border: 'none', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>↻</button>
            )}
            <button onClick={() => setSoundEnabled(!soundEnabled)} style={{ width: 48, height: 48, borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, backgroundColor: soundEnabled ? '#16a34a' : '#f3f4f6', border: 'none', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              {soundEnabled ? '🔊' : '🔇'}
            </button>
          </div>

          {/* Bottom center START button */}
          {mainDestination && (
            <div style={{ position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, pointerEvents: 'auto' }}>
              <button onClick={() => setViewMode('navigation')} style={{ width: 220, height: 60, backgroundColor: '#10b981', border: '4px solid white', borderRadius: 30, color: 'white', fontSize: 18, fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 16px rgba(16, 185, 129, 0.4)', transition: 'all 0.3s' }}>
                ▶️ {t.start}
              </button>
            </div>
          )}

          {/* Right side REC & PIN buttons */}
          <div style={{ position: 'fixed', top: 140, right: 32, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 16, pointerEvents: 'auto' }}>
            <button onClick={() => setIsRecording(!isRecording)} style={{ width: 64, height: 64, borderRadius: 32, boxShadow: '0 2px 12px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: `4px solid ${isRecording ? '#fca5a5' : 'white'}`, backgroundColor: isRecording ? '#dc2626' : 'white', color: isRecording ? 'white' : '#dc2626', cursor: 'pointer', fontWeight: 'bold' }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: isRecording ? 'white' : '#dc2626' }} />
              <span style={{ fontSize: 8, marginTop: 4 }}>REC</span>
            </button>
            {mainDestination && (
              <button onClick={() => setIsBuilderMode(!isBuilderMode)} style={{ width: 64, height: 64, borderRadius: 32, boxShadow: '0 2px 12px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: `4px solid ${isBuilderMode ? '#d1fae5' : 'white'}`, backgroundColor: isBuilderMode ? '#10b981' : 'white', color: isBuilderMode ? 'white' : '#10b981', cursor: 'pointer', fontWeight: 'bold', fontSize: 24, transition: 'all 0.3s' }}>
                {isBuilderMode ? '✓' : '+'}
              </button>
            )}
          </div>
        </>
      )}

      {viewMode === 'navigation' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, pointerEvents: 'none' }}>
          <button onClick={() => setViewMode('map')} style={{ position: 'absolute', top: 24, left: 24, width: 60, height: 60, borderRadius: 20, backgroundColor: '#a78bfa', color: 'white', border: '3px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 28, fontWeight: 'bold', pointerEvents: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>←</button>
          {nextInstruction && (
            <div style={{ position: 'absolute', top: 100, left: 24, pointerEvents: 'auto', backgroundColor: 'rgba(255,255,255,0.98)', backdropFilter: 'blur(12px)', borderRadius: 20, padding: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', border: '2px solid #3b82f6', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 28 }}>🧭</span>
              <div>
                <div style={{ fontSize: 10, fontWeight: 'bold', color: '#9ca3af' }}>NEXT</div>
                <div style={{ fontSize: 14, fontWeight: 'bold', color: '#111827' }}>{nextInstruction}</div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
