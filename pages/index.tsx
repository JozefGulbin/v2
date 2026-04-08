import React, { useState, useEffect, useRef } from "react";
import Head from 'next/head';
import LostView from "@/components/LostView";
import ElderlyKidFriendlyNav from "@/components/ElderlyKidFriendlyNav";

type ViewMode = 'landing' | 'map' | 'lost' | 'navigation' | 'history';
type TransportMode = 'walking' | 'cycling' | 'driving';
type Language = 'en' | 'lt';

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

interface PinSegment {
  letter: string;
  lat: number;
  lng: number;
}

interface SegmentRoute {
  from: string;
  to: string;
  distance: number;
  time: number;
  coordinates: any[];
}

interface WeatherData {
  temp: number;
  condition: string;
  icon: string;
}

const translations = {
  en: {
    eikime: 'Eikime!',
    jauBuvau: 'Jau buvau!',
    sos: 'SOS',
    navigateWithNature: 'Navigate with nature',
    distance: 'Distance',
    speed: 'Speed',
    pitstops: 'PITSTOPS',
    start: 'START',
    chooseRoute: 'CHOOSE ROUTE',
    mainDestinationSet: 'Main destination set! Click PIN+ to add stops.',
    mapFailedToLoad: 'Map failed to load',
    gpsNotAvailable: 'GPS not available',
    routeSaved: 'Route saved!',
    recordingStarted: 'Recording started 🔴',
    gpxSaved: 'GPX saved!',
    noTrailsYet: 'No trails yet...',
    myTrails: 'My Trails',
    loading: 'Loading route',
    nextTurn: 'Next turn in',
    meters: 'meters',
    straightAhead: 'Go straight',
    turnLeft: 'Turn left',
    turnRight: 'Turn right',
    uturn: 'Make a U-turn',
    arrived: 'You have arrived',
    weather: 'Weather',
    temp: '°C',
  },
  lt: {
    eikime: 'Eikime!',
    jauBuvau: 'Jau buvau!',
    sos: 'SOS',
    navigateWithNature: 'Naršykite su gamta',
    distance: 'Atstumas',
    speed: 'Greitis',
    pitstops: 'SUSTOJIMO TAŠKAI',
    start: 'PRADŽIA',
    chooseRoute: 'PASIRINKITE MARŠRUTĄ',
    mainDestinationSet: 'Nustatytas pagrindinis tikslas! Norėdami pridėti sustojimą, spustelėkite PIN+.',
    mapFailedToLoad: 'Žemėlapis nepavyko įkelti',
    gpsNotAvailable: 'GPS nepasiekiamas',
    routeSaved: 'Maršrutas išsaugotas!',
    recordingStarted: 'Įrašymas pradėtas 🔴',
    gpxSaved: 'GPX išsaugotas!',
    noTrailsYet: 'Dar nėra šliaužų...',
    myTrails: 'Mano šliaužos',
    loading: 'Kraunamas maršrutas',
    nextTurn: 'Kitas posūkis per',
    meters: 'metrų',
    straightAhead: 'Eikite tiesiai',
    turnLeft: 'Susukit į kairę',
    turnRight: 'Susukit į dešinę',
    uturn: 'Pasukit atgal',
    arrived: 'Jūs atvykote',
    weather: 'Oras',
    temp: '°C',
  }
};

export default function MapPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('landing');
  const [transportMode, setTransportMode] = useState<TransportMode>('walking');
  const [routes, setRoutes] = useState<RouteInfo[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number, accuracy: number, speed: number | null, heading: number | null } | null>(null);
  const [isBuilderMode, setIsBuilderMode] = useState(false); 
  const [mainDestination, setMainDestination] = useState<{lat: number, lng: number} | null>(null);
  const [pinSegments, setPinSegments] = useState<PinSegment[]>([]);
  const [segmentRoutes, setSegmentRoutes] = useState<SegmentRoute[]>([]);
  const [navStats, setNavStats] = useState({ speed: 0, distanceRem: 0, timeRem: 0, pace: '--:--', calories: 0 });
  const [showRouteSelector, setShowRouteSelector] = useState(false);
  const [notification, setNotification] = useState<{type: 'error' | 'info', msg: string} | null>(null);
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedPath, setRecordedPath] = useState<{lat: number, lng: number}[]>([]);
  const [totalRecordedDist, setTotalRecordedDist] = useState(0);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [highlightedSegmentIndex, setHighlightedSegmentIndex] = useState<number | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [language, setLanguage] = useState<Language>('en');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [nextInstruction, setNextInstruction] = useState<string>('');

  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapContainerNavRef = useRef<HTMLDivElement>(null);
  const routingControlRef = useRef<any>(null);
  const routePolylinesRef = useRef<any[]>([]);
  const mainRoutePolylineRef = useRef<any>(null);
  const highlightLayerRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const accuracyCircleRef = useRef<any>(null);
  const gpsWatchId = useRef<number | null>(null);
  const markerLayersRef = useRef<any[]>([]);
  const pinMarkerLayersRef = useRef<any[]>([]);
  const segmentPolylinesRef = useRef<any[]>([]);
  const mainDestinationMarkerRef = useRef<any>(null);
  const isBuilderModeRef = useRef(false);
  const lastAnnounceDistRef = useRef<number>(0);
  
  const userLocationRef = useRef<{ lat: number; lng: number, heading: number | null } | null>(null);
  const isNavigatingRef = useRef(false);
  const destinationRef = useRef<{ lat: number; lng: number } | null>(null);
  const isRecordingRef = useRef(false);
  const transportModeRef = useRef<TransportMode>('walking');
  const currentRouteRef = useRef<RouteInfo | null>(null);

  const t = translations[language];

  useEffect(() => {
    const localData = localStorage.getItem('taputapu_saved_routes');
    if (localData) setSavedRoutes(JSON.parse(localData));
    const savedLang = localStorage.getItem('taputapu_language') as Language;
    if (savedLang) setLanguage(savedLang);
  }, []);

  useEffect(() => {
    localStorage.setItem('taputapu_language', language);
  }, [language]);

  useEffect(() => {
    if (userLocation) {
      userLocationRef.current = { lat: userLocation.lat, lng: userLocation.lng, heading: userLocation.heading };
      fetchWeather(userLocation.lat, userLocation.lng);
    }
  }, [userLocation]);

  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);
  useEffect(() => { isBuilderModeRef.current = isBuilderMode; }, [isBuilderMode]);
  useEffect(() => { transportModeRef.current = transportMode; }, [transportMode]);
  
  useEffect(() => {
      isNavigatingRef.current = viewMode === 'navigation';
      if (viewMode === 'map' && mapRef.current) {
          setTimeout(() => mapRef.current.invalidateSize(), 500);
      }
      if (viewMode === 'navigation' && mapRef.current) {
          setTimeout(() => mapRef.current.invalidateSize(), 500);
      }
      if (viewMode !== 'navigation' && mapContainerRef.current) {
          mapContainerRef.current.style.transform = 'translate(-50%, -50%) rotate(0deg)';
      }
      if (viewMode === 'navigation' && soundEnabled) {
        playSound('navigation-start');
      }
  }, [viewMode]);

  const fetchWeather = async (lat: number, lon: number) => {
    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&temperature_unit=celsius`
      );
      const data = await response.json();
      if (data.current) {
        const code = data.current.weather_code;
        let icon = '☀️';
        if (code === 0) icon = '☀️';
        else if (code === 1 || code === 2) icon = '🌤️';
        else if (code === 3) icon = '☁️';
        else if (code === 45 || code === 48) icon = '🌫️';
        else if (code >= 51 && code <= 67) icon = '🌧️';
        else if (code >= 80 && code <= 82) icon = '⛈️';
        else if (code >= 85 && code <= 86) icon = '❄️';
        
        setWeather({
          temp: Math.round(data.current.temperature_2m),
          condition: icon,
          icon: icon
        });
      }
    } catch (error) {
      console.error('Weather fetch error:', error);
    }
  };

  const getInstructionIcon = (instruction: string) => {
    if (!instruction) return '➡️';
    const lower = instruction.toLowerCase();
    if (lower.includes('left')) return '↙️';
    if (lower.includes('right')) return '↘️';
    if (lower.includes('straight') || lower.includes('continue')) return '⬇️';
    if (lower.includes('uturn') || lower.includes('u-turn')) return '🔄';
    return '➡️';
  };

  const getNextTurnInstruction = (route: RouteInfo) => {
    if (!route || !route.instructions || route.instructions.length === 0) return '';
    const nextInst = route.instructions[0];
    if (!nextInst) return '';
    return `${getInstructionIcon(nextInst.text)} ${nextInst.text} - ${Math.round(nextInst.distance)}m`;
  };

  const speak = (text: string) => {
    if (!soundEnabled || typeof window === 'undefined') return;
    window.speechSynthesis?.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    window.speechSynthesis?.speak(utterance);
  };

  const playSound = (type: 'navigation-start' | 'turn-alert' | 'waypoint' | 'destination-reached') => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = audioContext.currentTime;

      if (type === 'navigation-start') {
        const osc1 = audioContext.createOscillator();
        const gain1 = audioContext.createGain();
        osc1.connect(gain1);
        gain1.connect(audioContext.destination);
        osc1.frequency.value = 800;
        gain1.gain.setValueAtTime(0.3, now);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc1.start(now);
        osc1.stop(now + 0.2);

        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);
        osc2.frequency.value = 1000;
        gain2.gain.setValueAtTime(0.3, now + 0.25);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
        osc2.start(now + 0.25);
        osc2.stop(now + 0.45);
      } else if (type === 'turn-alert') {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.frequency.value = 1200;
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'waypoint') {
        for (let i = 0; i < 3; i++) {
          const osc = audioContext.createOscillator();
          const gain = audioContext.createGain();
          osc.connect(gain);
          gain.connect(audioContext.destination);
          osc.frequency.value = 1000;
          gain.gain.setValueAtTime(0.2, now + i * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.08);
          osc.start(now + i * 0.1);
          osc.stop(now + i * 0.1 + 0.08);
        }
      } else if (type === 'destination-reached') {
        const osc1 = audioContext.createOscillator();
        const gain1 = audioContext.createGain();
        osc1.connect(gain1);
        gain1.connect(audioContext.destination);
        osc1.frequency.value = 1000;
        gain1.gain.setValueAtTime(0.3, now);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc1.start(now);
        osc1.stop(now + 0.3);

        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);
        osc2.frequency.value = 1500;
        gain2.gain.setValueAtTime(0.3, now + 0.35);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.65);
        osc2.start(now + 0.35);
        osc2.stop(now + 0.65);
      }
    } catch (error) {
      console.error('Audio error:', error);
    }
  };

  useEffect(() => {
    if (!mapLoaded) return;
    const initMap = async () => {
      if (typeof window === 'undefined') return;
      if (!(window as any).L) {
        setTimeout(initMap, 100);
        return;
      }
      const L = (window as any).L;
      if (mapRef.current) return;
      const container = viewMode === 'navigation' ? mapContainerNavRef.current : mapContainerRef.current;
      if (!container) return;
      try {
        const map = L.map(container, { zoomControl: false, attributionControl: false, preferCanvas: true }).setView([54.6872, 25.2797], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
        const handleMapClick = (e: any) => {
            if (isNavigatingRef.current) return;
            if (highlightLayerRef.current) highlightLayerRef.current.remove();
            if (isBuilderModeRef.current) {
              setPinSegments(prev => {
                const newPin: PinSegment = {
                  letter: String.fromCharCode(66 + prev.length),
                  lat: e.latlng.lat,
                  lng: e.latlng.lng
                };
                return [...prev, newPin];
              });
            }
            else { 
              if (!mainDestination) {
                setMainDestination({ lat: e.latlng.lat, lng: e.latlng.lng });
                setNotification({ type: 'info', msg: t.mainDestinationSet });
              }
            }
        };
        map.on('click', handleMapClick);
        mapRef.current = map;
        startGpsTracking();
        map.locate({ setView: true, maxZoom: 15, enableHighAccuracy: true });
      } catch (error) {
        console.error('Map error:', error);
        setNotification({ type: 'error', msg: t.mapFailedToLoad });
      }
    };
    setTimeout(initMap, 300);
  }, [mapLoaded]);

  useEffect(() => {
    if (viewMode === 'map' || viewMode === 'navigation') {
      if (!mapLoaded) setMapLoaded(true);
    }
  }, [viewMode, mapLoaded]);

  const startGpsTracking = () => {
    if (!navigator.geolocation) {
      setNotification({ type: 'error', msg: t.gpsNotAvailable });
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
            
            if (currentRouteRef.current) {
              setNextInstruction(getNextTurnInstruction(currentRouteRef.current));
            }

            if (soundEnabled) {
              if (distRem < 50 && lastAnnounceDistRef.current > 50) {
                playSound('destination-reached');
                speak(t.arrived);
                lastAnnounceDistRef.current = distRem;
              } else if (distRem < 200 && lastAnnounceDistRef.current > 200) {
                playSound('waypoint');
                speak(`${Math.round(distRem)} ${t.meters}`);
                lastAnnounceDistRef.current = distRem;
              } else if (distRem < 500 && lastAnnounceDistRef.current > 500) {
                playSound('turn-alert');
                speak(`${Math.round(distRem)} ${t.meters}`);
                lastAnnounceDistRef.current = distRem;
              }
            }
            setNavStats({ speed: speed ? Math.round(speed * 3.6) : 0, distanceRem: distRem, timeRem: speed && speed > 0 ? distRem / speed : distRem / 1.4, pace: calculatePace(speed), calories: Math.round((totalRecordedDist / 1000) * 65) });
        }
    };
    
    const onGeoError = (error: GeolocationPositionError) => {
      console.error('GPS error:', error.message);
    };
    
    gpsWatchId.current = navigator.geolocation.watchPosition(onGeoSuccess, onGeoError, { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 });
  };

  const updateUserMarker = (loc: any) => {
    const L = (window as any).L;
    if (!mapRef.current || !L) return;
    const isNav = isNavigatingRef.current;
    const html = isNav 
      ? `<div class="user-marker-arrow" style="transform: rotate(${loc.heading || 0}deg); transition: transform 0.4s">
           <div style="width: 0; height: 0; border-left: 12px solid transparent; border-right: 12px solid transparent; border-bottom: 24px solid #16a34a; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));"></div>
         </div>`
      : `<div class="user-marker-circle">
           <div style="width: 24px; height: 24px; background: #16a34a; border-radius: 50%; border: 4px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.3); position: relative;">
              <div style="position: absolute; inset: -12px; background: #22c55e; border-radius: 50%; animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; opacity: 0.3;"></div>
           </div>
         </div>`;
    if (!userMarkerRef.current) {
      userMarkerRef.current = L.marker([loc.lat, loc.lng], { icon: L.divIcon({ className: 'bg-transparent', html, iconSize: [0, 0] }), zIndexOffset: 1000 }).addTo(mapRef.current);
    } else {
      userMarkerRef.current.setLatLng([loc.lat, loc.lng]);
      userMarkerRef.current.setIcon(L.divIcon({ className: 'bg-transparent', html, iconSize: [0, 0] }));
    }
    if (accuracyCircleRef.current) accuracyCircleRef.current.setLatLng([loc.lat, loc.lng]).setRadius(loc.accuracy);
    else accuracyCircleRef.current = L.circle([loc.lat, loc.lng], { radius: loc.accuracy, color: '#16a34a', fillOpacity: 0.05, weight: 0 }).addTo(mapRef.current);
  };

  useEffect(() => {
    const L = (window as any).L;
    if (!mapRef.current || !L) return;
    if (mainDestinationMarkerRef.current) {
      mainDestinationMarkerRef.current.remove();
      mainDestinationMarkerRef.current = null;
    }
    if (mainDestination) {
      const icon = L.divIcon({ 
        className: 'bg-transparent', 
        html: `<div style="width: 50px; height: 50px; background: #0f172a; border: 4px solid white; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 20px; box-shadow: 0 4px 10px rgba(0,0,0,0.3);"><span style="transform: rotate(45deg);">A</span></div>`, 
        iconSize: [50, 50], 
        iconAnchor: [25, 50] 
      });
      mainDestinationMarkerRef.current = L.marker([mainDestination.lat, mainDestination.lng], { icon }).addTo(mapRef.current);
    }
  }, [mainDestination]);

  useEffect(() => {
    const L = (window as any).L;
    if (!mapRef.current || !L) return;
    if (mainRoutePolylineRef.current) {
      mainRoutePolylineRef.current.remove();
      mainRoutePolylineRef.current = null;
    }
    if (mainDestination && userLocationRef.current && viewMode === 'navigation') {
      const coords = `${userLocationRef.current.lng},${userLocationRef.current.lat};${mainDestination.lng},${mainDestination.lat}`;
      const profile = transportModeRef.current === 'walking' ? 'foot' : transportModeRef.current === 'cycling' ? 'bike' : 'car';
      fetch(`https://router.project-osrm.org/route/v1/${profile}/${coords}?overview=full&geometries=geojson&steps=true&annotations=distance`)
        .then(res => res.json())
        .then(data => {
          if (data.routes && data.routes[0]) {
            const coordinates = data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]]);
            if (mainRoutePolylineRef.current) mainRoutePolylineRef.current.remove();
            mainRoutePolylineRef.current = L.polyline(coordinates, {
              color: '#3b82f6',
              weight: 4,
              opacity: 0.9,
              lineCap: 'round'
            }).addTo(mapRef.current);
          }
        })
        .catch(err => console.error('Main route fetch error:', err));
    }
  }, [mainDestination, transportMode, viewMode]);

  const fetchSegmentRoute = async (from: { lat: number; lng: number }, to: PinSegment, fromLetter: string, toIndex: number) => {
    const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
    const profile = transportModeRef.current === 'walking' ? 'foot' : transportModeRef.current === 'cycling' ? 'bike' : 'car';
    try {
      const response = await fetch(`https://router.project-osrm.org/route/v1/${profile}/${coords}?overview=full&geometries=geojson`);
      const data = await response.json();
      if (data.routes && data.routes[0]) {
        const route = data.routes[0];
        const newRoute: SegmentRoute = {
          from: fromLetter,
          to: to.letter,
          distance: route.distance,
          time: route.duration,
          coordinates: route.geometry.coordinates.map((c: any) => [c[1], c[0]])
        };
        setSegmentRoutes(prev => {
          const updated = [...prev];
          updated[toIndex] = newRoute;
          return updated;
        });
      }
    } catch (error) {
      console.error('Route fetch error:', error);
    }
  };

  useEffect(() => {
    if (!mainDestination || pinSegments.length === 0) {
      setSegmentRoutes([]);
      return;
    }
    let previousPoint: { lat: number; lng: number } = mainDestination;
    let previousLetter = 'A';
    pinSegments.forEach((pin, idx) => {
      fetchSegmentRoute(previousPoint, pin, previousLetter, idx);
      previousPoint = { lat: pin.lat, lng: pin.lng };
      previousLetter = pin.letter;
    });
  }, [pinSegments, mainDestination]);

  useEffect(() => {
    if (!mapRef.current) {
      segmentPolylinesRef.current.forEach(l => l.remove());
      segmentPolylinesRef.current = [];
      return;
    }
    const L = (window as any).L;
    segmentPolylinesRef.current.forEach(l => l.remove());
    segmentPolylinesRef.current = [];
    if (segmentRoutes.length > 0 && pinSegments.length > 0) {
      segmentRoutes.forEach((segment, idx) => {
        if (!segment || !segment.coordinates || segment.coordinates.length === 0) return;
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7', '#a8e6cf'];
        const color = colors[idx % colors.length];
        const isHighlighted = idx === highlightedSegmentIndex;
        const polyline = L.polyline(segment.coordinates, {
          color: color,
          weight: isHighlighted ? 8 : 5,
          opacity: isHighlighted ? 1 : 0.7,
          lineCap: 'round'
        }).addTo(mapRef.current);
        segmentPolylinesRef.current.push(polyline);
      });
    }
  }, [segmentRoutes, highlightedSegmentIndex, pinSegments]);

  useEffect(() => {
    if (!mapRef.current || !isBuilderMode) return;
    const L = (window as any).L;
    pinMarkerLayersRef.current.forEach(m => m.remove());
    pinMarkerLayersRef.current = [];
    pinSegments.forEach((pin) => {
      const icon = L.divIcon({ 
        className: 'bg-transparent', 
        html: `<div style="width: 45px; height: 45px; background: #10b981; border: 3px solid white; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);"><span>${pin.letter}</span></div>`, 
        iconSize: [45, 45], 
        iconAnchor: [22.5, 22.5] 
      });
      pinMarkerLayersRef.current.push(L.marker([pin.lat, pin.lng], { icon }).addTo(mapRef.current));
    });
  }, [pinSegments, isBuilderMode]);

  const removePinSegment = (letterToRemove: string) => {
    setPinSegments(prev => {
      const updated = prev.filter(p => p.letter !== letterToRemove);
      const renamed = updated.map((p, idx) => ({
        ...p,
        letter: String.fromCharCode(66 + idx)
      }));
      return renamed;
    });
    setHighlightedSegmentIndex(null);
  };

  useEffect(() => {
    if (!mapRef.current) return;
    const L = (window as any).L;
    if (routingControlRef.current) mapRef.current.removeControl(routingControlRef.current);
    markerLayersRef.current.forEach(m => m.remove());
    markerLayersRef.current = [];
    if (!mainDestination || !userLocationRef.current) { setRoutes([]); return; }
    const planPoints = [L.latLng(userLocationRef.current.lat, userLocationRef.current.lng), L.latLng(mainDestination.lat, mainDestination.lng), ...pinSegments.map(p => L.latLng(p.lat, p.lng))];
    let serviceUrl = transportMode === 'walking' ? 'https://routing.openstreetmap.de/routed-foot/route/v1' : (transportMode === 'cycling' ? 'https://routing.openstreetmap.de/routed-bike/route/v1' : 'https://router.project-osrm.org/route/v1');
    const control = L.Routing.control({
        waypoints: planPoints, router: L.Routing.osrmv1({ serviceUrl, profile: 'driving' }),
        lineOptions: { styles: [{ color: 'transparent', opacity: 0 }] }, createMarker: () => null, show: false, fitSelectedRoutes: false
    }).addTo(mapRef.current);
    control.on('routesfound', (e: any) => {
        setRoutes(e.routes.map((r: any, i: number) => ({ id: i, summary: r.summary, coordinates: r.coordinates, instructions: r.instructions, waypoints: r.waypoints, waypointIndices: r.waypointIndices, routeObj: r })));
    });
    routingControlRef.current = control;
  }, [mainDestination, pinSegments, transportMode]);

  useEffect(() => {
    if (!mapRef.current || routes.length === 0) {
        routePolylinesRef.current.forEach(l => l.remove());
        return;
    }
    const L = (window as any).L;
    routePolylinesRef.current.forEach(l => l.remove());
    routes.forEach((route, i) => {
        const isActive = i === selectedRouteIndex;
        const isNavigating = viewMode === 'navigation';
        if (isNavigating) {
          if (isActive) currentRouteRef.current = route;
          if (!isActive) return;
        }
        const polyline = L.polyline(route.coordinates, { 
          color: isActive ? '#3b82f6' : '#93c5fd', 
          weight: isActive ? 12 : 5, 
          opacity: isActive ? 1 : 0.5, 
          lineCap: 'round',
          interactive: false
        }).addTo(mapRef.current);
        if (isActive) { polyline.bringToFront(); }
        routePolylinesRef.current.push(polyline);
    });
  }, [routes, selectedRouteIndex, viewMode]);

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
      setNotification({ type: 'info', msg: t.routeSaved });
    } else {
      setRecordedPath([]); setTotalRecordedDist(0); setRecordingStartTime(Date.now()); setIsRecording(true);
      setNotification({ type: 'info', msg: t.recordingStarted });
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
        setNotification({ type: 'info', msg: `${t.loading} (${route.date})` });
    }, 600);
  };

  return (
    <>
      <Head>
        <title>TapuTapu v12.3 Spring Edition</title>
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { width: 100%; height: 100%; overflow: hidden !important; position: fixed !important; }
          #__next { width: 100%; height: 100%; overflow: hidden !important; }
          @keyframes flowerpetal { 0% { transform: translateY(-10vh) translateX(0) rotate(0deg); } 100% { transform: translateY(110vh) translateX(20px) rotate(360deg); } }
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
          @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-20px); } }
          .flower-petal { position: absolute; color: #ffb6c1; user-select: none; z-index: 9999; pointer-events: none; font-size: 1.8rem; animation: flowerpetal 12s linear infinite; opacity: 0.8; }
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .forest-animal { position: absolute; user-select: none; pointer-events: none; animation: float 4s ease-in-out infinite; }
        `}</style>
      </Head>

      <div style={{ width: '100vw', height: '100vh', margin: 0, padding: 0, overflow: 'hidden', backgroundColor: '#f0fdf4', fontFamily: 'Arial, sans-serif', position: 'fixed', top: 0, left: 0 }}>

        {viewMode === 'landing' && (
          <>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #87ceeb 0%, #98fb98 40%, #228b22 100%)', zIndex: 0 }} />
            <div style={{ position: 'absolute', bottom: 0, left: '5%', width: '90px', height: '200px', zIndex: 1 }}>
              <div style={{ width: '100%', height: '100%', background: 'linear-gradient(180deg, transparent 0%, #1b4d1b 100%)', clipPath: 'polygon(50% 0%, 100% 38%, 82% 38%, 100% 55%, 80% 55%, 100% 72%, 75% 72%, 100% 90%, 50% 100%, 0% 90%, 25% 72%, 0% 72%, 20% 55%, 0% 55%, 18% 38%, 0% 38%)', opacity: 0.6 }} />
            </div>
            <div style={{ position: 'absolute', bottom: 0, right: '8%', width: '110px', height: '220px', zIndex: 1 }}>
              <div style={{ width: '100%', height: '100%', background: 'linear-gradient(180deg, transparent 0%, #0d3d0d 100%)', clipPath: 'polygon(50% 0%, 100% 35%, 85% 35%, 100% 50%, 82% 50%, 100% 68%, 78% 68%, 100% 85%, 50% 100%, 0% 85%, 22% 68%, 0% 68%, 18% 50%, 0% 50%, 15% 35%, 0% 35%)', opacity: 0.7 }} />
            </div>
            <div style={{ position: 'absolute', bottom: '15%', left: '15%', width: '200px', height: '120px', background: 'radial-gradient(ellipse at 40% 30%, rgba(100, 200, 255, 0.6), rgba(30, 120, 200, 0.8))', borderRadius: '50%', zIndex: 2, filter: 'blur(2px)' }} />
            <div className="forest-animal" style={{ bottom: '35%', left: '20%', fontSize: '60px', zIndex: 3, animationDelay: '0s' }}>🦌</div>
            <div className="forest-animal" style={{ bottom: '28%', right: '18%', fontSize: '50px', zIndex: 3, animationDelay: '1s' }}>🦉</div>
            <div className="forest-animal" style={{ bottom: '40%', left: '60%', fontSize: '45px', zIndex: 3, animationDelay: '2s' }}>🦊</div>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 40, zIndex: 10 }}>
              <div style={{ marginBottom: 20, textAlign: 'center' }}>
                <h1 style={{ fontSize: 56, fontWeight: 'bold', color: '#0f5f0f', textShadow: '2px 2px 4px rgba(0,0,0,0.2)' }}>TapuTapu</h1>
                <p style={{ fontSize: 16, color: '#1b4d1b', marginTop: 8, fontStyle: 'italic' }}>{t.navigateWithNature}</p>
              </div>
              <button onClick={() => setViewMode('map')} style={{ width: 280, height: 70, borderRadius: 20, backgroundColor: '#10b981', color: 'white', fontSize: 28, fontWeight: 'bold', border: '4px solid white', cursor: 'pointer', transition: 'all 0.3s ease', boxShadow: '0 10px 30px rgba(16, 185, 129, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 15px 40px rgba(16, 185, 129, 0.6)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(16, 185, 129, 0.4)'; }}>🗺️ {t.eikime}</button>
              <button onClick={() => setViewMode('history')} style={{ width: 280, height: 70, borderRadius: 20, backgroundColor: '#3b82f6', color: 'white', fontSize: 28, fontWeight: 'bold', border: '4px solid white', cursor: 'pointer', transition: 'all 0.3s ease', boxShadow: '0 10px 30px rgba(59, 130, 246, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 15px 40px rgba(59, 130, 246, 0.6)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(59, 130, 246, 0.4)'; }}>📚 {t.jauBuvau}</button>
              <button onClick={() => setViewMode('lost')} style={{ width: 280, height: 70, borderRadius: 20, backgroundColor: '#dc2626', color: 'white', fontSize: 28, fontWeight: 'bold', border: '4px solid white', cursor: 'pointer', transition: 'all 0.3s ease', boxShadow: '0 10px 30px rgba(220, 38, 38, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 15px 40px rgba(220, 38, 38, 0.6)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(220, 38, 38, 0.4)'; }}>🆘 {t.sos}</button>
            </div>
            <div style={{ position: 'absolute', bottom: 32, right: 32, zIndex: 10, display: 'flex', gap: 8 }}>
              <button onClick={() => setLanguage('en')} style={{ width: 50, height: 50, borderRadius: '50%', backgroundColor: language === 'en' ? '#3b82f6' : '#f3f4f6', color: language === 'en' ? 'white' : '#6b7280', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: 16, transition: 'all 0.3s' }}>EN</button>
              <button onClick={() => setLanguage('lt')} style={{ width: 50, height: 50, borderRadius: '50%', backgroundColor: language === 'lt' ? '#3b82f6' : '#f3f4f6', color: language === 'lt' ? 'white' : '#6b7280', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: 16, transition: 'all 0.3s' }}>LT</button>
            </div>
          </>
        )}

        {viewMode === 'map' && (
          <>
              <div ref={mapContainerRef} style={{ position: 'absolute', top: '50%', left: '50%', zIndex: 0, width: '400vw', height: '400vh', transform: 'translate(-50%, -50%) rotate(0deg)', transformOrigin: 'center center', willChange: 'transform' }} />
              <div style={{ position: 'absolute', top: 32, left: 0, right: 0, zIndex: 1000, display: 'flex', justifyContent: 'center', pointerEvents: 'none', paddingLeft: 24, paddingRight: 24 }}>
                  <div style={{ pointerEvents: 'auto', backgroundColor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', borderRadius: 9999, padding: 10, display: 'flex', alignItems: 'center', border: '1px solid rgba(255,255,255,0.5)' }}>
                     <button onClick={() => setViewMode('landing')} style={{ width: 48, height: 48, borderRadius: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, backgroundColor: '#f3f4f6', border: 'none', cursor: 'pointer' }}>🏠</button>
                     <div style={{ width: 1, backgroundColor: '#e5e7eb', height: 32, margin: '0 20px' }} />
                     <div style={{ display: 'flex', gap: 12 }}>
                         {['walking', 'cycling', 'driving'].map((m) => (
                             <button key={m} onClick={() => setTransportMode(m as TransportMode)} style={{ width: 48, height: 48, borderRadius: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, transition: 'all 0.3s', backgroundColor: transportMode === m ? '#16a34a' : 'transparent', color: transportMode === m ? 'white' : '#d1d5db', border: 'none', cursor: 'pointer', transform: transportMode === m ? 'scale(1.1)' : 'scale(1)' }}>{m === 'walking' ? '🚶' : m === 'cycling' ? '🚴' : '🚗'}</button>
                         ))}
                     </div>
                  </div>
              </div>
              <div style={{ position: 'absolute', top: 32, right: 32, zIndex: 1000, display: 'flex', gap: 12 }}>
                  <button onClick={() => setSoundEnabled(!soundEnabled)} style={{ width: 48, height: 48, borderRadius: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, backgroundColor: soundEnabled ? '#16a34a' : '#f3f4f6', border: 'none', cursor: 'pointer', transition: 'all 0.3s' }}>{soundEnabled ? '🔊' : '🔇'}</button>
                  <button onClick={() => setLanguage(language === 'en' ? 'lt' : 'en')} style={{ width: 48, height: 48, borderRadius: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, backgroundColor: '#3b82f6', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.3s' }}>{language.toUpperCase()}</button>
              </div>
              {weather && (
                <div style={{ position: 'absolute', top: 32, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, backgroundColor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', borderRadius: 20, padding: '8px 16px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: '1px solid rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 28 }}>{weather.icon}</span>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: 11, fontWeight: 'bold', color: '#9ca3af' }}>{t.weather}</span>
                    <span style={{ fontSize: 16, fontWeight: 'bold', color: '#111827' }}>{weather.temp}{t.temp}</span>
                  </div>
                </div>
              )}
              <div style={{ position: 'absolute', top: 128, right: 32, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 24 }}>
                  <button onClick={toggleRecording} style={{ width: 64, height: 64, borderRadius: 32, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s', border: `4px solid ${isRecording ? '#fca5a5' : 'white'}`, backgroundColor: isRecording ? '#dc2626' : 'white', color: isRecording ? 'white' : '#dc2626', cursor: 'pointer' }}>
                     <div style={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: isRecording ? 'white' : '#dc2626', animation: isRecording ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none' }} />
                     <span style={{ fontSize: 8, marginTop: 6, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 }}>Rec</span>
                  </button>
                  {mainDestination && (
                    <button onClick={() => { setIsBuilderMode(!isBuilderMode); if (isBuilderMode) { setPinSegments([]); setSegmentRoutes([]); setHighlightedSegmentIndex(null); pinMarkerLayersRef.current.forEach(m => m.remove()); pinMarkerLayersRef.current = []; segmentPolylinesRef.current.forEach(p => p.remove()); segmentPolylinesRef.current = []; } }} style={{ width: 64, height: 64, borderRadius: 32, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: `4px solid ${isBuilderMode ? '#d1fae5' : 'white'}`, backgroundColor: isBuilderMode ? '#10b981' : 'white', color: isBuilderMode ? 'white' : '#10b981', cursor: 'pointer', transition: 'all 0.3s' }}>
                      <span style={{ fontSize: 24, fontWeight: 'bold' }}>{isBuilderMode ? '✓' : '+'}</span>
                      <span style={{ fontSize: 8, fontWeight: 'bold', textTransform: 'uppercase' }}>PIN</span>
                    </button>
                  )}
                  <button onClick={() => mapRef.current?.locate({setView: true, maxZoom: 15, enableHighAccuracy: true})} style={{ width: 64, height: 64, backgroundColor: '#16a34a', border: '4px solid #86efac', borderRadius: 32, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer', transition: 'all 0.3s' }}>
                      <span style={{ fontSize: 20 }}>📍</span>
                      <span style={{ fontSize: 8, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 }}>HERE</span>
                  </button>
              </div>
              {isBuilderMode && (
                  <div style={{ position: 'absolute', bottom: 40, left: 32, zIndex: 1000, pointerEvents: 'auto', backgroundColor: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(12px)', borderRadius: 40, padding: 20, boxShadow: '0 10px 30px rgba(0,0,0,0.15)', border: '2px solid white', maxWidth: 320 }}>
                      <h4 style={{ color: '#111827', fontWeight: 'bold', marginBottom: 16, fontSize: 14 }}>📍 {t.pitstops}</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 300, overflowY: 'auto' }}>
                          <div onClick={() => { setViewMode('navigation'); destinationRef.current = mainDestination; }} style={{ backgroundColor: '#f3f4f6', padding: 12, borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s', border: '2px solid #3b82f6' }}>
                              <span style={{ fontWeight: 'bold', color: '#111827', fontSize: 16 }}>PIN A ({t.start})</span>
                              <span style={{ fontSize: 20, color: '#3b82f6' }}>▶</span>
                          </div>
                          {pinSegments.length > 0 && pinSegments.map((pin, idx) => (
                              <div key={idx} onClick={() => setHighlightedSegmentIndex(highlightedSegmentIndex === idx ? null : idx)} style={{ backgroundColor: highlightedSegmentIndex === idx ? '#dbeafe' : '#f3f4f6', padding: 12, borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, cursor: 'pointer', border: highlightedSegmentIndex === idx ? '2px solid #3b82f6' : '2px solid transparent', transition: 'all 0.2s' }}>
                                  <div style={{ flex: 1 }}>
                                      <span style={{ fontWeight: 'bold', color: '#10b981', fontSize: 16 }}>PIN {pin.letter}</span>
                                      {segmentRoutes[idx] && (
                                          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6, backgroundColor: 'white', padding: 8, borderRadius: 8 }}>
                                              <div>← From PIN {segmentRoutes[idx].from}</div>
                                              <div style={{ color: '#3b82f6', fontWeight: 'bold' }}>{formatDist(segmentRoutes[idx].distance)}</div>
                                              <div style={{ color: '#16a34a', fontWeight: 'bold' }}>{formatTime(segmentRoutes[idx].time)}</div>
                                          </div>
                                      )}
                                  </div>
                                  <button onClick={(e) => { e.stopPropagation(); removePinSegment(pin.letter); }} style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✕</button>
                              </div>
                          ))}
                      </div>
                  </div>
              )}
              {mainDestination && routes.length > 0 && !isBuilderMode && (
                  <div style={{ position: 'absolute', bottom: 40, right: 32, zIndex: 1000, width: '100%', maxWidth: 420, pointerEvents: 'none', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'flex-end' }}>
                      {showRouteSelector && (
                          <div style={{ pointerEvents: 'auto', backgroundColor: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(12px)', borderRadius: 56, padding: 28, boxShadow: '0 25px 40px -5px rgba(0,0,0,0.15)', maxHeight: '55vh', overflow: 'auto', border: '2px solid white', width: '100%' }}>
                              <h3 style={{ fontWeight: 'bold', fontSize: 14, textTransform: 'uppercase', letterSpacing: 1.5, color: '#3b82f6', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>🔀 {t.chooseRoute}</h3>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                  {routes.map((route, idx) => (
                                      <button key={idx} onClick={() => { setSelectedRouteIndex(idx); setShowRouteSelector(false); }} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 18, backgroundColor: selectedRouteIndex === idx ? '#dbeafe' : '#f9fafb', borderRadius: 20, cursor: 'pointer', transition: 'all 0.3s ease', border: selectedRouteIndex === idx ? '3px solid #3b82f6' : '2px solid #e5e7eb', textAlign: 'left', boxShadow: selectedRouteIndex === idx ? '0 4px 12px rgba(59, 130, 246, 0.15)' : 'none' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 18, flex: 1 }}>
                                              <div style={{ width: 36, height: 36, backgroundColor: selectedRouteIndex === idx ? '#3b82f6' : '#e5e7eb', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 16 }}>{idx + 1}</div>
                                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                  <span style={{ fontWeight: 'bold', color: '#111827', fontSize: 16 }}>{formatTime(route.summary.totalTime)}</span>
                                                  <span style={{ color: '#9ca3af', fontSize: 12, marginTop: 2 }}>{(route.summary.totalDistance / 1000).toFixed(2)} km</span>
                                              </div>
                                          </div>
                                          {selectedRouteIndex === idx && <span style={{ fontSize: 24, color: '#3b82f6', fontWeight: 'bold' }}>✓</span>}
                                      </button>
                                  ))}
                              </div>
                          </div>
                      )}
                      <div style={{ pointerEvents: 'auto', backgroundColor: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(12px)', borderRadius: 56, padding: 18, boxShadow: '0 25px 40px -5px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '2px solid white', width: '100%' }}>
                          <div onClick={() => setShowRouteSelector(!showRouteSelector)} style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingLeft: 24, cursor: 'pointer' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <span style={{ fontSize: 28, fontWeight: 'bold', color: '#111827' }}>{formatTime(routes[selectedRouteIndex]?.summary.totalTime || 0)}</span>
                                  <span style={{ fontSize: 12, fontWeight: 'bold', color: '#3b82f6', backgroundColor: '#dbeafe', paddingLeft: 10, paddingRight: 10, paddingTop: 5, paddingBottom: 5, borderRadius: 20, textTransform: 'uppercase' }}>{(routes[selectedRouteIndex]?.summary.totalDistance / 1000).toFixed(1)} km</span>
                              </div>
                              <span style={{ fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', color: '#9ca3af', letterSpacing: 1.2, marginTop: 4 }}>{routes.length} ROUTE{routes.length !== 1 ? 'S' : ''} {showRouteSelector ? '▲' : '▼'}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 12 }}>
                              <button onClick={() => { setMainDestination(null); setPinSegments([]); setRoutes([]); setShowRouteSelector(false); setHighlightedSegmentIndex(null); }} style={{ width: 52, height: 52, borderRadius: '50%', backgroundColor: '#f3f4f6', color: '#d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}>✕</button>
                              <button onClick={() => { setViewMode('navigation'); destinationRef.current = mainDestination; lastAnnounceDistRef.current = 0; }} style={{ height: 52, paddingLeft: 36, paddingRight: 36, backgroundColor: '#3b82f6', color: 'white', borderRadius: '50%', fontWeight: 'bold', fontSize: 16, boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.3)', cursor: 'pointer', border: 'none', transition: 'all 0.3s', whiteSpace: 'nowrap' }}>GO</button>
                          </div>
                      </div>
                  </div>
              )}
          </>
        )}

        {viewMode === 'navigation' && (
          <>
              <div ref={mapContainerNavRef} style={{ position: 'absolute', inset: 0, zIndex: 0, width: '100%', height: '100%' }} />
              <div style={{ position: 'absolute', inset: 0, zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start', paddingTop: 24, paddingLeft: 24, pointerEvents: 'none' }}>
                  <button onClick={() => setViewMode('map')} style={{ pointerEvents: 'auto', width: 60, height: 60, borderRadius: '20px', backgroundColor: '#a78bfa', color: 'white', border: '3px solid white', boxShadow: '0 8px 20px rgba(167, 139, 250, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.3s ease', fontSize: 28, fontWeight: 'bold' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 12px 28px rgba(167, 139, 250, 0.4)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(167, 139, 250, 0.3)'; }}>← </button>
                  {nextInstruction && (
                    <div style={{ pointerEvents: 'auto', backgroundColor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', borderRadius: 20, padding: '12px 16px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', border: '2px solid #3b82f6', marginTop: 16, display: 'flex', alignItems: 'center', gap: 12, maxWidth: 300 }}>
                      <span style={{ fontSize: 24 }}>🧭</span>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: 10, fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 }}>{t.nextTurn}</span>
                          <span style={{ fontSize: 14, fontWeight: 'bold', color: '#111827', marginTop: 2 }}>{nextInstruction}</span>
                      </div>
                    </div>
                  )}
                  <div style={{ pointerEvents: 'auto', backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', borderRadius: 20, padding: '12px 20px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', border: '1px solid rgba(255,255,255,0.6)', marginTop: 16, display: 'flex', alignItems: 'center', gap: 20 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <span style={{ fontSize: 9, fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 }}>{t.distance}</span>
                          <span style={{ fontSize: 18, fontWeight: 'bold', color: '#111827', marginTop: 2 }}>{formatDist(navStats.distanceRem)}</span>
                      </div>
                      <div style={{ width: 1, backgroundColor: '#e5e7eb', height: 50 }} />
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <span style={{ fontSize: 9, fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 }}>{t.speed}</span>
                          <span style={{ fontSize: 18, fontWeight: 'bold', color: '#16a34a', marginTop: 2 }}>{navStats.speed} km/h</span>
                      </div>
                  </div>
              </div>
          </>
        )}

        {viewMode === 'history' && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 5000, backgroundColor: '#f8fafc', padding: 40, overflow: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 48 }}>
                    <button onClick={() => setViewMode('landing')} style={{ width: 64, height: 64, backgroundColor: 'white', borderRadius: '50%', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, border: 'none', cursor: 'pointer' }}>←</button>
                    <h1 style={{ fontSize: 32, fontWeight: 'bold', color: '#111827', letterSpacing: -1 }}>{t.myTrails}</h1>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 96 }}>
                    {savedRoutes.map((route) => (
                        <div key={route.id} style={{ backgroundColor: 'white', padding: 32, borderRadius: 56, boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', border: '2px solid transparent', transition: 'all 0.3s', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div onClick={() => loadSavedRoute(route)} style={{ display: 'flex', flexDirection: 'column', flex: 1, cursor: 'pointer' }}>
                                <span style={{ fontWeight: 'bold', fontSize: 20, color: '#111827' }}>{route.date}</span>
                                <span style={{ color: '#16a34a', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>{(route.distance/1000).toFixed(2)} km • {route.pace} min/km</span>
                            </div>
                            <div style={{ display: 'flex', gap: 16 }}>
                                <button onClick={() => { const gpx = `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="TapuTapu"><trk><trkseg>${route.path.map(pt => `<trkpt lat="${pt.lat}" lon="${pt.lng}"></trkpt>`).join('')}</trkseg></trk></gpx>`; const blob = new Blob([gpx], { type: 'application/gpx+xml' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `trail-${route.id}.gpx`; a.click(); setNotification({ type: 'info', msg: t.gpxSaved }); }} style={{ width: 56, height: 56, backgroundColor: '#ecfdf5', color: '#10b981', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, cursor: 'pointer', border: 'none' }}>💾</button>
                                <button onClick={() => { if(confirm('Delete?')) { const u = savedRoutes.filter(r => r.id !== route.id); setSavedRoutes(u); localStorage.setItem('taputapu_saved_routes', JSON.stringify(u)); } }} style={{ width: 56, height: 56, backgroundColor: '#fef2f2', color: '#dc2626', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, cursor: 'pointer', border: 'none' }}>🗑</button>
                            </div>
                        </div>
                    ))}
                    {savedRoutes.length === 0 && <div style={{ textAlign: 'center', paddingTop: 160, color: '#d1d5db', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, opacity: 0.4, fontStyle: 'italic' }}>{t.noTrailsYet}</div>}
                </div>
            </div>
        )}

        {viewMode === 'lost' && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 7000 }}>
              <LostView lat={userLocation?.lat || 0} lng={userLocation?.lng || 0} onClose={() => setViewMode('landing')} />
          </div>
        )}

        {notification && viewMode !== 'navigation' && (
          <div style={{ position: 'absolute', top: 32, right: 120, zIndex: 8000, backgroundColor: '#1f2937', color: 'white', paddingLeft: 28, paddingRight: 28, paddingTop: 14, paddingBottom: 14, borderRadius: 9999, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)', fontSize: 14, fontWeight: 'bold', whiteSpace: 'nowrap', border: '2px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)' }}>
              {notification.msg}
          </div>
        )}
      </div>
    </>
  );
}
