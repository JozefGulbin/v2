﻿import React, { useState, useEffect, useRef } from "react";
import Head from 'next/head';
import LostView from "@/components/LostView";
import ElderlyKidFriendlyNav from "@/components/ElderlyKidFriendlyNav";

type ViewMode = 'landing' | 'map' | 'lost' | 'navigation' | 'history' | 'photos';
type TransportMode = 'walking' | 'cycling' | 'driving';
type Language = 'en' | 'lt';

interface SavedRoute {
  id: string;
  startedAt?: string; // ISO
  endedAt?: string;   // ISO
  date: string;
  distance: number; // meters
  duration: number; // seconds
  pace: string;
  calories: number;
  path: { lat: number, lng: number }[];
}

interface PhotoPin {
  id: string;
  createdAt: string; // ISO
  title?: string;
  lat: number;
  lng: number;

  // simple fast ship: base64 data url
  dataUrl: string;

  // optional link to trail id in future
  trailId?: string;
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

    // trails / recording
    routeSaved: 'Trail saved!',
    recordingStarted: 'Trail recording started',
    recordingStopped: 'Trail recording stopped',
    delete: 'Delete',
    deleted: 'Deleted',
    duration: 'Duration',
    trailsBtn: 'Trails',
    trailsOn: 'ON',

    noTrailsYet: 'No trails yet...',
    myTrails: 'My Trails',
    loading: 'Loading trail',
    nextTurn: 'Next turn in',
    meters: 'meters',
    arrived: 'You have arrived',
    weather: 'Weather',
    temp: '°C',
    searchPlaceholder: 'Search destination…',
    searchGo: 'Go',
    tooShortNotSaved: 'Too short — not saved',
    destinationSet: 'Destination set',

    // photos
    photos: 'Photos',
    noPhotosYet: 'No photos yet...',
    addPhoto: 'Add photo',
    photoSaved: 'Photo saved!',
    photoDeleted: 'Photo deleted',
    photoNeedsGps: 'GPS not ready yet — please wait',
    photoTooLarge: 'Photo too large (try another or smaller)',
    photoPinTitle: 'Photo pin',
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

    // trails / recording
    routeSaved: 'Šliaužos išsaugotos!',
    recordingStarted: 'Šliaužų įrašymas pradėtas',
    recordingStopped: 'Šliaužų įrašymas sustabdytas',
    delete: 'Ištrinti',
    deleted: 'Ištrinta',
    duration: 'Trukmė',
    trailsBtn: 'Šliaužos',
    trailsOn: 'ON',

    noTrailsYet: 'Dar nėra šliaužų...',
    myTrails: 'Mano šliaužos',
    loading: 'Kraunamos šliaužos',
    nextTurn: 'Kitas posūkis per',
    meters: 'metrų',
    arrived: 'Jūs atvykote',
    weather: 'Oras',
    temp: '°C',
    searchPlaceholder: 'Ieškoti tikslo…',
    searchGo: 'GO',
    tooShortNotSaved: 'Per trumpa — neišsaugota',
    destinationSet: 'Tikslas nustatytas',

    // photos
    photos: 'Nuotraukos',
    noPhotosYet: 'Dar nėra nuotraukų...',
    addPhoto: 'Įkelti nuotrauką',
    photoSaved: 'Nuotrauka išsaugota!',
    photoDeleted: 'Nuotrauka ištrinta',
    photoNeedsGps: 'GPS dar neparuoštas — palaukite',
    photoTooLarge: 'Nuotrauka per didelė (rinkitės mažesnę)',
    photoPinTitle: 'Nuotraukos taškas',
  }
};

export default function MapPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('landing');
  const [transportMode, setTransportMode] = useState<TransportMode>('walking');
  const [routes, setRoutes] = useState<RouteInfo[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number, accuracy: number, speed: number | null, heading: number | null } | null>(null);
  const [isBuilderMode, setIsBuilderMode] = useState(false);
  const [mainDestination, setMainDestination] = useState<{ lat: number, lng: number } | null>(null);
  const [pinSegments, setPinSegments] = useState<PinSegment[]>([]);
  const [segmentRoutes, setSegmentRoutes] = useState<SegmentRoute[]>([]);
  const [navStats, setNavStats] = useState({ speed: 0, distanceRem: 0, timeRem: 0, pace: '--:--', calories: 0 });
  const [showRouteSelector, setShowRouteSelector] = useState(false);
  const [notification, setNotification] = useState<{ type: 'error' | 'info', msg: string } | null>(null);

  // trails
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedPath, setRecordedPath] = useState<{ lat: number, lng: number }[]>([]);
  const [totalRecordedDist, setTotalRecordedDist] = useState(0);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);

  // photos
  const [photoPins, setPhotoPins] = useState<PhotoPin[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [highlightedSegmentIndex, setHighlightedSegmentIndex] = useState<number | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [language, setLanguage] = useState<Language>('en');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [nextInstruction, setNextInstruction] = useState<string>('');

  // Mobile + UI state
  const [isMobile, setIsMobile] = useState(false);
  const [pitstopsCollapsed, setPitstopsCollapsed] = useState(true);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
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

  // Photo markers on map
  const photoMarkerLayersRef = useRef<any[]>([]);

  // Rotation throttle (Safari-friendly)
  const lastRotateAtRef = useRef(0);
  const lastHeadingRef = useRef<number | null>(null);

  const userLocationRef = useRef<{ lat: number; lng: number, heading: number | null } | null>(null);
  const isNavigatingRef = useRef(false);
  const destinationRef = useRef<{ lat: number; lng: number } | null>(null);
  const isRecordingRef = useRef(false);
  const transportModeRef = useRef<TransportMode>('walking');
  const currentRouteRef = useRef<RouteInfo | null>(null);

  const t = translations[language];

  // ---- safe-area helpers (iOS notch etc) ----
  // (used only as strings in inline styles)
  const uiPad = isMobile ? 10 : 18;
  const uiTop = `calc(var(--sat) + ${uiPad}px)`;
  const uiLeft = `calc(var(--sal) + ${uiPad}px)`;
  const uiRight = `calc(var(--sar) + ${uiPad}px)`;
  const uiBottom = `calc(var(--sab) + ${uiPad}px)`;

  const resetMapAndSearch = () => {
    // stop builder UI
    setIsBuilderMode(false);
    isBuilderModeRef.current = false;

    setPinSegments([]);
    setSegmentRoutes([]);
    setHighlightedSegmentIndex(null);
    setShowRouteSelector(false);

    // clear destination + routes
    setMainDestination(null);
    destinationRef.current = null;
    currentRouteRef.current = null;

    setRoutes([]);
    setSelectedRouteIndex(0);

    // clear overlays
    try {
      highlightLayerRef.current?.remove?.();
      highlightLayerRef.current = null;
    } catch { }

    try {
      mainRoutePolylineRef.current?.remove?.();
      mainRoutePolylineRef.current = null;
    } catch { }

    try {
      routePolylinesRef.current.forEach((l) => l?.remove?.());
      routePolylinesRef.current = [];
    } catch { }

    try {
      pinMarkerLayersRef.current.forEach((m) => m?.remove?.());
      pinMarkerLayersRef.current = [];
    } catch { }

    try {
      segmentPolylinesRef.current.forEach((l) => l?.remove?.());
      segmentPolylinesRef.current = [];
    } catch { }

    // reset search UI
    setSearchQuery('');
    setSearchResults([]);

    // go to map screen (ready to search again)
    setViewMode('map');

    // best-effort center to user
    const loc = userLocationRef.current;
    if (loc && mapRef.current) {
      mapRef.current.setView([loc.lat, loc.lng], 15, { animate: true });
    }

    setNotification({ type: 'info', msg: 'Reset' });
  };

  // ---------- load persisted ----------
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const check = () => setIsMobile(window.innerWidth <= 480);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    const localTrails = localStorage.getItem('taputapu_saved_routes');
    if (localTrails) {
      try {
        const parsed = JSON.parse(localTrails);
        if (Array.isArray(parsed)) setSavedRoutes(parsed);
      } catch { }
    }

    const localPhotos = localStorage.getItem('taputapu_photo_pins');
    if (localPhotos) {
      try {
        const parsed = JSON.parse(localPhotos);
        if (Array.isArray(parsed)) setPhotoPins(parsed);
      } catch { }
    }

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

    // reset rotation when leaving navigation
    if (viewMode !== 'navigation' && mapContainerRef.current) {
      mapContainerRef.current.style.transform = 'translate(-50%, -50%) rotate(0deg)';
    }

    // Only invalidate on mode changes (not every GPS tick)
    if (mapRef.current) {
      requestAnimationFrame(() => mapRef.current.invalidateSize());
      setTimeout(() => mapRef.current?.invalidateSize(), 250);
      setTimeout(() => mapRef.current?.invalidateSize(), 750);
    }
  }, [viewMode]);

  // Keep pitstops collapsed by default on mobile
  useEffect(() => {
    if (isMobile) setPitstopsCollapsed(true);
  }, [isMobile]);

  // ---------- utils ----------
  const getDistanceFromLatLonInM = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
      + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180))
      * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  };

  const calculatePace = (speed: number | null) => {
    if (!speed || speed < 0.3) return '--:--';
    const minPerKm = 1000 / (speed * 60);
    const mins = Math.floor(minPerKm);
    const secs = Math.round((minPerKm - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.round((s % 3600) / 60);
    return h > 0 ? `${h} v ${m} m` : `${m} min`;
  };

  const formatDist = (meters: number) => meters >= 1000 ? `${(meters / 1000).toFixed(2)} km` : `${Math.round(meters)} m`;

  const formatTrailDate = (route: SavedRoute) => {
    const iso = route.startedAt || route.endedAt;
    if (iso) {
      const d = new Date(iso);
      return d.toLocaleString(language === 'lt' ? 'lt-LT' : 'en-GB', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
      });
    }
    return route.date;
  };

  const formatPhotoDate = (p: PhotoPin) => {
    const d = new Date(p.createdAt);
    return d.toLocaleString(language === 'lt' ? 'lt-LT' : 'en-GB', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const safePersistPhotos = (pins: PhotoPin[]) => {
    setPhotoPins(pins);
    try {
      localStorage.setItem('taputapu_photo_pins', JSON.stringify(pins));
    } catch (e) {
      console.error('photo persist error', e);
      setNotification({ type: 'error', msg: t.photoTooLarge });
    }
  };

  // ---------- weather ----------
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

  // ---------- navigation speech / sounds ----------
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

  // ---------- search ----------
  const searchAddress = async () => {
    const q = searchQuery.trim();
    if (!q) return;

    setSearchLoading(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      const data = await res.json();
      setSearchResults(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Search error', e);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // ---------- map init ----------
  useEffect(() => {
    if (!mapLoaded) return;

    const initMap = async () => {
      if (typeof window === 'undefined') return;
      if (!(window as any).L) {
        setTimeout(initMap, 100);
        return;
      }

      const L = (window as any).L;

      if (mapRef.current) {
        setTimeout(() => mapRef.current.invalidateSize(), 100);
        return;
      }

      const container = mapContainerRef.current;
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
          } else {
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

        setTimeout(() => map.invalidateSize(), 100);
        setTimeout(() => map.invalidateSize(), 500);
      } catch (error) {
        console.error('Map error:', error);
        setNotification({ type: 'error', msg: t.mapFailedToLoad });
      }
    };

    setTimeout(initMap, 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapLoaded]);

  useEffect(() => {
    if (viewMode === 'map' || viewMode === 'navigation') {
      if (!mapLoaded) setMapLoaded(true);
      if (mapRef.current) setTimeout(() => mapRef.current.invalidateSize(), 100);
    }
  }, [viewMode, mapLoaded]);

  // ---------- gps ----------
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

          // record even small movements (better for slow walking)
          const thresholdM = 1.5;

          if (!last) {
            return [{ lat: latitude, lng: longitude }];
          }

          const delta = getDistanceFromLatLonInM(latitude, longitude, last.lat, last.lng);
          if (delta > thresholdM) {
            setTotalRecordedDist(d => d + delta);
            return [...prev, { lat: latitude, lng: longitude }];
          }

          return prev;
        });
      }

      if (isNavigatingRef.current && mapRef.current) {
        if (heading !== null && mapContainerRef.current) {
          const now = Date.now();
          const prevHeading = lastHeadingRef.current;

          const changedEnough = prevHeading === null ? true : Math.abs(prevHeading - heading) > 10;
          const timeOk = now - lastRotateAtRef.current > 700;

          if (changedEnough && timeOk) {
            mapContainerRef.current.style.transform = `translate(-50%, -50%) rotate(${-heading}deg)`;
            mapContainerRef.current.style.transition = 'transform 0.7s ease-out';
            lastRotateAtRef.current = now;
            lastHeadingRef.current = heading;
          }
        }

        mapRef.current.setView([latitude, longitude], 18, { animate: true });

        const distRem = destinationRef.current
          ? getDistanceFromLatLonInM(latitude, longitude, destinationRef.current.lat, destinationRef.current.lng)
          : 0;

        if (currentRouteRef.current) setNextInstruction(getNextTurnInstruction(currentRouteRef.current));

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

        setNavStats({
          speed: speed ? Math.round(speed * 3.6) : 0,
          distanceRem: distRem,
          timeRem: speed && speed > 0 ? distRem / speed : distRem / 1.4,
          pace: calculatePace(speed),
          calories: Math.round((totalRecordedDist / 1000) * 65)
        });
      }
    };

    const onGeoError = (error: GeolocationPositionError) => {
      console.error('GPS error:', error.message);
    };

    gpsWatchId.current = navigator.geolocation.watchPosition(
      onGeoSuccess,
      onGeoError,
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
  };

  const updateUserMarker = (loc: any) => {
    const L = (window as any).L;
    if (!mapRef.current || !L) return;
    const isNav = isNavigatingRef.current;

    const html = isNav
      ? `<div class="user-marker-arrow" style="transform: rotate(${loc.heading || 0}deg); transition: transform 0.4s">
           <div style="width: 0; height: 0; border-left: 12px solid transparent; border-right: 12px solid transparent; border-bottom: 24px solid #16a34a; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.25));"></div>
         </div>`
      : `<div class="user-marker-circle">
           <div style="width: 24px; height: 24px; background: #16a34a; border-radius: 50%; border: 4px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.3); position: relative;">
             <div style="position: absolute; inset: -12px; background: #22c55e; border-radius: 50%; animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; opacity: 0.3;"></div>
           </div>
         </div>`;

    if (!userMarkerRef.current) {
      userMarkerRef.current = L.marker([loc.lat, loc.lng], {
        icon: L.divIcon({ className: 'bg-transparent', html, iconSize: [0, 0] }),
        zIndexOffset: 1000
      }).addTo(mapRef.current);
    } else {
      userMarkerRef.current.setLatLng([loc.lat, loc.lng]);
      userMarkerRef.current.setIcon(L.divIcon({ className: 'bg-transparent', html, iconSize: [0, 0] }));
    }

    if (accuracyCircleRef.current) accuracyCircleRef.current.setLatLng([loc.lat, loc.lng]).setRadius(loc.accuracy);
    else accuracyCircleRef.current = L.circle([loc.lat, loc.lng], { radius: loc.accuracy, color: '#16a34a', fillOpacity: 0.05, weight: 0 }).addTo(mapRef.current);
  };

  // ---------- destination marker ----------
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
        html: `<div style="width: 50px; height: 50px; background: #0f172a; border: 4px solid white; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 24px rgba(0,0,0,0.18);">
                 <div style="transform: rotate(45deg); font-size: 18px; color: white; font-weight: bold;">A</div>
               </div>`,
        iconSize: [50, 50],
        iconAnchor: [25, 50]
      });

      mainDestinationMarkerRef.current = L.marker([mainDestination.lat, mainDestination.lng], { icon }).addTo(mapRef.current);
    }
  }, [mainDestination]);

  // ---------- photo markers on map (both map + navigation) ----------
  useEffect(() => {
    const L = (window as any).L;
    if (!mapRef.current || !L) return;
    if (!(viewMode === 'map' || viewMode === 'navigation')) return;

    // clear existing
    photoMarkerLayersRef.current.forEach(m => m.remove());
    photoMarkerLayersRef.current = [];

    // add markers
    photoPins.forEach((p) => {
      const icon = L.divIcon({
        className: 'bg-transparent',
        html: `<div style="
              width: 36px; height: 36px;
              background: white;
              border: 3px solid #f59e0b;
              border-radius: 9999px;
              display:flex; align-items:center; justify-content:center;
              box-shadow: 0 12px 22px rgba(0,0,0,0.14);
              font-size: 18px;
            ">📷</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      const marker = L.marker([p.lat, p.lng], { icon, zIndexOffset: 600 }).addTo(mapRef.current);
      marker.bindPopup(`
        <div style="max-width: 220px;">
          <div style="font-weight: 800; margin-bottom: 6px;">${t.photoPinTitle}</div>
          <div style="font-size: 11px; color: #6b7280; margin-bottom: 8px;">
            ${new Date(p.createdAt).toLocaleString()}
          </div>
          <img src="${p.dataUrl}" style="width: 100%; border-radius: 12px; border: 1px solid #e5e7eb;" />
        </div>
      `);

      photoMarkerLayersRef.current.push(marker);
    });

  }, [photoPins, viewMode, language]);

  // ---------- main route during navigation (thin) ----------
  useEffect(() => {
    const L = (window as any).L;
    if (!mapRef.current || !L) return;

    if (mainRoutePolylineRef.current) {
      mainRoutePolylineRef.current.remove();
      mainRoutePolylineRef.current = null;
    }

    if (mainDestination && userLocationRef.current && viewMode === 'navigation' && pinSegments.length === 0) {
      const coords = `${userLocationRef.current.lng},${userLocationRef.current.lat};${mainDestination.lng},${mainDestination.lat}`;
      const profile = transportModeRef.current === 'walking' ? 'foot' : transportModeRef.current === 'cycling' ? 'bike' : 'car';

      fetch(`https://router.project-osrm.org/route/v1/${profile}/${coords}?overview=full&geometries=geojson&steps=true&annotations=distance`)
        .then(res => res.json())
        .then(data => {
          if (data.routes && data.routes[0]) {
            const coordinates = data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]]);
            if (mainRoutePolylineRef.current) mainRoutePolylineRef.current.remove();

            mainRoutePolylineRef.current = L.polyline(coordinates, {
              color: '#2563eb',
              weight: 3,
              opacity: 0.65,
              lineCap: 'round',
              lineJoin: 'round'
            }).addTo(mapRef.current);
          }
        })
        .catch(err => console.error('Main route fetch error:', err));
    }
  }, [mainDestination, transportMode, viewMode, pinSegments]);

  // ---------- segment routes ----------
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinSegments, mainDestination]);

  useEffect(() => {
    if (!mapRef.current) {
      segmentPolylinesRef.current.forEach(l => l.remove());
      segmentPolylinesRef.current = [];
      return;
    }
    const L = (window as any).L;
    if (!L) return;

    segmentPolylinesRef.current.forEach(l => l.remove());
    segmentPolylinesRef.current = [];

    if (segmentRoutes.length > 0 && pinSegments.length > 0) {
      segmentRoutes.forEach((segment, idx) => {
        if (!segment || !segment.coordinates || segment.coordinates.length === 0) return;
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7', '#a8e6cf'];
        const color = colors[idx % colors.length];
        const isHighlighted = idx === highlightedSegmentIndex;

        const polyline = L.polyline(segment.coordinates, {
          color,
          weight: isHighlighted ? 7 : 4,
          opacity: isHighlighted ? 0.9 : 0.55,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(mapRef.current);

        segmentPolylinesRef.current.push(polyline);
      });
    }
  }, [segmentRoutes, highlightedSegmentIndex, pinSegments]);

  useEffect(() => {
    if (!mapRef.current || !isBuilderMode) return;
    const L = (window as any).L;
    if (!L) return;

    pinMarkerLayersRef.current.forEach(m => m.remove());
    pinMarkerLayersRef.current = [];

    pinSegments.forEach((pin) => {
      const icon = L.divIcon({
        className: 'bg-transparent',
        html: `<div style="width: 42px; height: 42px; background: #10b981; border: 3px solid white; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; box-shadow: 0 12px 22px rgba(0,0,0,0.14);">${pin.letter}</div>`,
        iconSize: [42, 42],
        iconAnchor: [21, 21]
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

  // ---------- routing (transparent lines; we draw our own) ----------
  useEffect(() => {
    if (!mapRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    if (routingControlRef.current) mapRef.current.removeControl(routingControlRef.current);

    if (!mainDestination || !userLocationRef.current) { setRoutes([]); return; }

    const planPoints = [
      L.latLng(userLocationRef.current.lat, userLocationRef.current.lng),
      L.latLng(mainDestination.lat, mainDestination.lng),
      ...pinSegments.map(p => L.latLng(p.lat, p.lng))
    ];

    const serviceUrl =
      transportMode === 'walking'
        ? 'https://routing.openstreetmap.de/routed-foot/route/v1'
        : (transportMode === 'cycling'
          ? 'https://routing.openstreetmap.de/routed-bike/route/v1'
          : 'https://routing.openstreetmap.de/routed-car/route/v1');

    const control = L.Routing.control({
      waypoints: planPoints,
      router: L.Routing.osrmv1({ serviceUrl, profile: 'driving' }),
      lineOptions: { styles: [{ color: 'transparent', opacity: 0 }] },
      createMarker: () => null,
      show: false,
      fitSelectedRoutes: false
    }).addTo(mapRef.current);

    control.on('routesfound', (e: any) => {
      setRoutes(e.routes.map((r: any, i: number) => ({
        id: i,
        summary: r.summary,
        coordinates: r.coordinates,
        instructions: r.instructions,
        waypoints: r.waypoints,
        waypointIndices: r.waypointIndices,
        routeObj: r
      })));
    });

    routingControlRef.current = control;
  }, [mainDestination, pinSegments, transportMode]);

  useEffect(() => {
    if (!mapRef.current || routes.length === 0) {
      routePolylinesRef.current.forEach(l => l.remove());
      return;
    }
    const L = (window as any).L;
    if (!L) return;

    routePolylinesRef.current.forEach(l => l.remove());
    routePolylinesRef.current = [];

    routes.forEach((route, i) => {
      const isActive = i === selectedRouteIndex;
      const isNavigating = viewMode === 'navigation';

      if (isNavigating) {
        if (isActive) currentRouteRef.current = route;
        if (!isActive) return;
      }

      const polyline = L.polyline(route.coordinates, {
        color: isActive ? '#2563eb' : '#93c5fd',
        weight: isActive ? 7 : 4,
        opacity: isActive ? 0.75 : 0.35,
        lineCap: 'round',
        lineJoin: 'round',
        interactive: false
      }).addTo(mapRef.current);

      if (isActive) polyline.bringToFront();
      routePolylinesRef.current.push(polyline);
    });
  }, [routes, selectedRouteIndex, viewMode]);

  // ---------- trails recording ----------
  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);

      const started = recordingStartTime || Date.now();
      const ended = Date.now();
      const durationMs = ended - started;

      if (recordedPath.length < 2 || totalRecordedDist < 5) {
        setNotification({ type: 'info', msg: t.tooShortNotSaved });
        return;
      }

      const durationSec = Math.max(1, Math.floor(durationMs / 1000));

      const newSavedRoute: SavedRoute = {
        id: Date.now().toString(),
        startedAt: new Date(started).toISOString(),
        endedAt: new Date(ended).toISOString(),
        date: new Date(started).toLocaleDateString('lt-LT'),
        distance: totalRecordedDist,
        duration: durationSec,
        pace: calculatePace(totalRecordedDist / durationSec),
        calories: Math.round((totalRecordedDist / 1000) * 65),
        path: recordedPath
      };

      const updated = [newSavedRoute, ...savedRoutes];
      setSavedRoutes(updated);
      localStorage.setItem('taputapu_saved_routes', JSON.stringify(updated));
      setNotification({ type: 'info', msg: t.routeSaved });
    } else {
      setRecordedPath(userLocation ? [{ lat: userLocation.lat, lng: userLocation.lng }] : []);
      setTotalRecordedDist(0);
      setRecordingStartTime(Date.now());
      setIsRecording(true);
      setNotification({ type: 'info', msg: t.recordingStarted });
    }
  };

  const deleteSavedRoute = (id: string) => {
    const updated = savedRoutes.filter(r => r.id !== id);
    setSavedRoutes(updated);
    localStorage.setItem('taputapu_saved_routes', JSON.stringify(updated));
    setNotification({ type: 'info', msg: t.deleted });
  };

  // ---------- robust map readiness (fix blank tiles) ----------
  const ensureMapReady = async (timeoutMs = 3500) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (mapRef.current && (window as any).L) return true;
      await new Promise(r => setTimeout(r, 50));
    }
    return false;
  };

  const forceMapRepaint = () => {
    if (!mapRef.current) return;
    requestAnimationFrame(() => mapRef.current?.invalidateSize());
    setTimeout(() => mapRef.current?.invalidateSize(), 250);
    setTimeout(() => mapRef.current?.invalidateSize(), 650);
    setTimeout(() => mapRef.current?.invalidateSize(), 1200);

    // extra robustness: force setView to current center/zoom after invalidation
    setTimeout(() => {
      try {
        if (!mapRef.current) return;
        mapRef.current.setView(mapRef.current.getCenter(), mapRef.current.getZoom(), { animate: false });
      } catch { }
    }, 700);
  };

  const loadSavedRoute = async (route: SavedRoute) => {
    setViewMode('map');
    if (!mapLoaded) setMapLoaded(true);

    const ok = await ensureMapReady(3500);
    if (!ok) {
      setNotification({ type: 'error', msg: 'Map not ready yet' });
      return;
    }

    await new Promise(r => setTimeout(r, 150));
    forceMapRepaint();

    if (!mapRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    if (!route.path || route.path.length < 2) {
      setNotification({ type: 'info', msg: `${t.loading}: ${formatTrailDate(route)} (too short)` });
      return;
    }

    if (highlightLayerRef.current) highlightLayerRef.current.remove();

    const poly = L.polyline(route.path, {
      color: '#10b981',
      weight: 6,
      opacity: 0.75,
      lineCap: 'round'
    }).addTo(mapRef.current);

    highlightLayerRef.current = poly;

    try {
      mapRef.current.fitBounds(poly.getBounds(), { padding: [50, 50] });
    } catch (e) {
      console.error('fitBounds error', e);
    }

    setNotification({ type: 'info', msg: `${t.loading}: ${formatTrailDate(route)}` });
  };

  // ---------- Photos: add / delete / center ----------
  const openPhotoPicker = () => {
    if (!userLocationRef.current) {
      setNotification({ type: 'info', msg: t.photoNeedsGps });
      return;
    }
    photoInputRef.current?.click();
  };

  const readFileAsDataURL = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const onPhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow same file again
    if (!file) return;

    if (!userLocationRef.current) {
      setNotification({ type: 'info', msg: t.photoNeedsGps });
      return;
    }

    try {
      // keep it manageable for localStorage: if > ~4-5MB might fail
      // We still try; if it fails, we show error via safePersistPhotos.
      const dataUrl = await readFileAsDataURL(file);

      const loc = userLocationRef.current;
      const pin: PhotoPin = {
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        lat: loc.lat,
        lng: loc.lng,
        dataUrl
      };

      const updated = [pin, ...photoPins];
      safePersistPhotos(updated);
      setNotification({ type: 'info', msg: t.photoSaved });

      // Show immediately on map if present
      if (mapRef.current && (viewMode === 'map' || viewMode === 'navigation')) {
        mapRef.current.setView([pin.lat, pin.lng], Math.max(16, mapRef.current.getZoom()), { animate: true });
      }
    } catch (err) {
      console.error('photo read error', err);
      setNotification({ type: 'error', msg: t.photoTooLarge });
    }
  };

  const deletePhotoPin = (id: string) => {
    const updated = photoPins.filter(p => p.id !== id);
    safePersistPhotos(updated);
    setNotification({ type: 'info', msg: t.photoDeleted });
  };

  const centerOnPhoto = async (p: PhotoPin) => {
    setViewMode('map');
    if (!mapLoaded) setMapLoaded(true);

    const ok = await ensureMapReady(3500);
    if (!ok) return;

    await new Promise(r => setTimeout(r, 120));
    forceMapRepaint();

    mapRef.current?.setView([p.lat, p.lng], 17, { animate: true });

    // find marker and open popup (best effort)
    setTimeout(() => {
      try {
        const marker = photoMarkerLayersRef.current.find((m: any) => {
          const ll = m.getLatLng?.();
          return ll && Math.abs(ll.lat - p.lat) < 0.000001 && Math.abs(ll.lng - p.lng) < 0.000001;
        });
        marker?.openPopup?.();
      } catch { }
    }, 600);
  };

  const pitstopsHasContent = Boolean(mainDestination);
  const showPitstopsPanel = isBuilderMode && pitstopsHasContent;

  return (
    <>
      <Head>
        <title>TapuTapu v12.3 Spring Edition</title>
        <style>{`
          :root{
            --sat: env(safe-area-inset-top, 0px);
            --sar: env(safe-area-inset-right, 0px);
            --sab: env(safe-area-inset-bottom, 0px);
            --sal: env(safe-area-inset-left, 0px);
          }

          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { width: 100%; height: 100%; overflow: hidden !important; position: fixed !important; }
          #__next { width: 100%; height: 100%; overflow: hidden !important; }

          /* Helps iOS Safari with notches + bottom bars */
          body { padding-top: env(safe-area-inset-top); padding-bottom: env(safe-area-inset-bottom); }

          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
          @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-20px); } }
          .forest-animal { position: absolute; user-select: none; pointer-events: none; animation: float 4s ease-in-out infinite; }
        `}</style>
      </Head>

      <div style={{ width: '100vw', height: '100vh', margin: 0, padding: 0, overflow: 'hidden', backgroundColor: '#f0fdf4', fontFamily: 'Arial, sans-serif', position: 'fixed', top: 0, left: 0 }}>

        {/* hidden photo input */}
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={onPhotoSelected}
        />

        {/* SINGLE MAP CONTAINER */}
        {(viewMode === 'map' || viewMode === 'navigation') && (
          <div
            ref={mapContainerRef}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              zIndex: 0,
              width: isMobile ? '180vw' : '220vw',
              height: isMobile ? '180vh' : '220vh',
              transform: 'translate(-50%, -50%) rotate(0deg)',
              transformOrigin: 'center center'
            }}
          />
        )}

        {viewMode === 'landing' && (
          <>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #87ceeb 0%, #98fb98 40%, #228b22 100%)', zIndex: 0 }} />
            <div className="forest-animal" style={{ bottom: '35%', left: '20%', fontSize: '60px', zIndex: 3, animationDelay: '0s' }}>🦌</div>
            <div className="forest-animal" style={{ bottom: '28%', right: '18%', fontSize: '50px', zIndex: 3, animationDelay: '1s' }}>🦉</div>
            <div className="forest-animal" style={{ bottom: '40%', left: '60%', fontSize: '45px', zIndex: 3, animationDelay: '2s' }}>🦊</div>

            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28, zIndex: 10 }}>
              <div style={{ marginBottom: 12, textAlign: 'center' }}>
                <h1 style={{ fontSize: 56, fontWeight: 'bold', color: '#0f5f0f', textShadow: '2px 2px 4px rgba(0,0,0,0.2)' }}>TapuTapu</h1>
                <p style={{ fontSize: 16, color: '#1b4d1b', marginTop: 8, fontStyle: 'italic' }}>{t.navigateWithNature}</p>
              </div>

              <button
                onClick={() => setViewMode('map')}
                style={{
                  width: 280, height: 70, borderRadius: 20,
                  backgroundColor: '#10b981', color: 'white',
                  fontSize: 28, fontWeight: 'bold', border: 'none',
                  cursor: 'pointer', boxShadow: '0 16px 26px rgba(0,0,0,0.12)'
                }}
              >
                {t.eikime}
              </button>

              <button
                onClick={() => setViewMode('history')}
                style={{
                  width: 280, height: 70, borderRadius: 20,
                  backgroundColor: '#3b82f6', color: 'white',
                  fontSize: 28, fontWeight: 'bold', border: 'none',
                  cursor: 'pointer', boxShadow: '0 16px 26px rgba(0,0,0,0.12)'
                }}
              >
                {t.jauBuvau}
              </button>

              <button
                onClick={() => setViewMode('photos')}
                style={{
                  width: 280, height: 70, borderRadius: 20,
                  backgroundColor: '#f59e0b', color: 'white',
                  fontSize: 28, fontWeight: 'bold', border: 'none',
                  cursor: 'pointer', boxShadow: '0 16px 26px rgba(0,0,0,0.12)'
                }}
              >
                {t.photos}
              </button>

              <button
                onClick={() => setViewMode('lost')}
                style={{
                  width: 280, height: 70, borderRadius: 20,
                  backgroundColor: '#dc2626', color: 'white',
                  fontSize: 28, fontWeight: 'bold', border: 'none',
                  cursor: 'pointer', boxShadow: '0 16px 26px rgba(0,0,0,0.12)'
                }}
              >
                {t.sos}
              </button>
            </div>

            <div style={{ position: 'absolute', bottom: `calc(var(--sab) + 32px)`, right: `calc(var(--sar) + 32px)`, zIndex: 10, display: 'flex', gap: 8 }}>
              <button
                onClick={() => setLanguage('en')}
                style={{
                  width: 50, height: 50, borderRadius: '50%',
                  backgroundColor: language === 'en' ? '#3b82f6' : '#f3f4f6',
                  color: language === 'en' ? 'white' : '#111827',
                  border: 'none', fontWeight: 900, cursor: 'pointer'
                }}
              >
                EN
              </button>
              <button
                onClick={() => setLanguage('lt')}
                style={{
                  width: 50, height: 50, borderRadius: '50%',
                  backgroundColor: language === 'lt' ? '#3b82f6' : '#f3f4f6',
                  color: language === 'lt' ? 'white' : '#111827',
                  border: 'none', fontWeight: 900, cursor: 'pointer'
                }}
              >
                LT
              </button>
            </div>
          </>
        )}

        {(viewMode === 'map' || viewMode === 'navigation') && (
          <>
            {/* top-left: home + transport + reset */}
            <div style={{ position: 'absolute', top: uiTop, left: uiLeft, zIndex: 1100, display: 'flex', alignItems: 'center', gap: 10, pointerEvents: 'auto' }}>
              <button
                onClick={() => setViewMode('landing')}
                style={{
                  width: isMobile ? 44 : 46,
                  height: isMobile ? 44 : 46,
                  borderRadius: 18,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#a78bfa',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 12px 22px rgba(0,0,0,0.12)',
                  fontSize: 18,
                  fontWeight: 900
                }}
                title="Home"
              >
                🏠
              </button>

              {viewMode === 'map' && (
                <button
                  onClick={resetMapAndSearch}
                  style={{
                    width: isMobile ? 44 : 46,
                    height: isMobile ? 44 : 46,
                    borderRadius: 18,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(255,255,255,0.95)',
                    color: '#111827',
                    border: '1px solid rgba(255,255,255,0.6)',
                    cursor: 'pointer',
                    boxShadow: '0 12px 22px rgba(0,0,0,0.10)',
                    fontSize: 18,
                    fontWeight: 900
                  }}
                  title="Reset map & search"
                >
                  ♻️
                </button>
              )}

              {viewMode === 'map' && (
                <div style={{ backgroundColor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', boxShadow: '0 12px 22px rgba(0,0,0,0.10)', borderRadius: 9999, padding: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {(['walking', 'cycling', 'driving'] as TransportMode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setTransportMode(m)}
                      style={{
                        width: isMobile ? 40 : 42,
                        height: isMobile ? 40 : 42,
                        borderRadius: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: isMobile ? 16 : 18,
                        backgroundColor: transportMode === m ? '#3b82f6' : '#f3f4f6',
                        color: transportMode === m ? 'white' : '#111827',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      {m === 'walking' ? '🚶' : m === 'cycling' ? '🚴' : '🚗'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* top-right: sound + language */}
            <div style={{ position: 'absolute', top: uiTop, right: uiRight, zIndex: 1100, display: 'flex', gap: 10 }}>
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                style={{
                  width: isMobile ? 44 : 46,
                  height: isMobile ? 44 : 46,
                  borderRadius: 9999,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(255,255,255,0.92)',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 12px 22px rgba(0,0,0,0.10)'
                }}
              >
                {soundEnabled ? '🔊' : '🔇'}
              </button>
              <button
                onClick={() => setLanguage(language === 'en' ? 'lt' : 'en')}
                style={{
                  width: isMobile ? 44 : 46,
                  height: isMobile ? 44 : 46,
                  borderRadius: 9999,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(255,255,255,0.92)',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 12px 22px rgba(0,0,0,0.10)',
                  fontWeight: 900
                }}
              >
                {language.toUpperCase()}
              </button>
            </div>

            {/* Map view: search + weather */}
            {viewMode === 'map' && (
              <>
                {/* Search bar */}
                <div style={{
                  position: 'absolute',
                  top: `calc(var(--sat) + ${isMobile ? 60 : 72}px)`,
                  left: uiLeft,
                  right: uiRight,
                  zIndex: 1200,
                  pointerEvents: 'auto',
                }}>
                  <div style={{
                    display: 'flex',
                    gap: 8,
                    alignItems: 'center',
                    backgroundColor: 'rgba(255,255,255,0.92)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255,255,255,0.7)',
                    borderRadius: 16,
                    padding: '8px 10px',
                    boxShadow: '0 12px 24px rgba(0,0,0,0.10)'
                  }}>
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') searchAddress(); }}
                      placeholder={t.searchPlaceholder}
                      style={{
                        flex: 1,
                        border: 'none',
                        outline: 'none',
                        background: 'transparent',
                        fontSize: 14
                      }}
                    />
                    <button
                      onClick={searchAddress}
                      disabled={searchLoading}
                      style={{
                        border: 'none',
                        cursor: 'pointer',
                        backgroundColor: '#2563eb',
                        color: 'white',
                        borderRadius: 12,
                        padding: '8px 10px',
                        fontWeight: 700,
                        fontSize: 12,
                        opacity: searchLoading ? 0.7 : 1
                      }}
                    >
                      {searchLoading ? '…' : t.searchGo}
                    </button>
                  </div>

                  {searchResults.length > 0 && (
                    <div style={{
                      marginTop: 8,
                      backgroundColor: 'rgba(255,255,255,0.95)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(255,255,255,0.7)',
                      borderRadius: 16,
                      overflow: 'hidden',
                      maxHeight: isMobile ? 180 : 220,
                      overflowY: 'auto'
                    }}>
                      {searchResults.map((r, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            const lat = Number(r.lat);
                            const lng = Number(r.lon);
                            setMainDestination({ lat, lng });
                            setNotification({ type: 'info', msg: t.destinationSet });
                            setSearchResults([]);
                            mapRef.current?.setView([lat, lng], 15, { animate: true });
                            if (isMobile) setPitstopsCollapsed(true);
                          }}
                          style={{
                            width: '100%',
                            textAlign: 'left',
                            padding: '10px 12px',
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            borderBottom: idx === searchResults.length - 1 ? 'none' : '1px solid #eef2f7'
                          }}
                        >
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#111827' }}>
                            {String(r.display_name).split(',').slice(0, 2).join(',')}
                          </div>
                          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                            {r.display_name}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* weather */}
                {weather && !isMobile && (
                  <div style={{ position: 'absolute', top: `calc(var(--sat) + 124px)`, left: uiLeft, zIndex: 1100, backgroundColor: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', borderRadius: 9999, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 12px 22px rgba(0,0,0,0.10)' }}>
                    <span style={{ fontSize: 22 }}>{weather.icon}</span>
                    <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                      <span style={{ fontSize: 10, fontWeight: 'bold', color: '#9ca3af' }}>{t.weather}</span>
                      <span style={{ fontSize: 14, fontWeight: 'bold', color: '#111827' }}>{weather.temp}{t.temp}</span>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Floating buttons (map + navigation) */}
            <div style={{
              position: 'absolute',
              top: `calc(var(--sat) + ${isMobile ? 120 : 150}px)`,
              right: uiRight,
              zIndex: 1100,
              display: 'flex',
              flexDirection: 'column',
              gap: isMobile ? 12 : 16
            }}>
              {viewMode === 'map' && (
                <button
                  onClick={toggleRecording}
                  style={{
                    width: isMobile ? 54 : 60,
                    height: isMobile ? 54 : 60,
                    borderRadius: 9999,
                    boxShadow: '0 16px 26px rgba(0,0,0,0.12)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isRecording ? '#dc2626' : 'white',
                    color: isRecording ? 'white' : '#111827',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                  title="Record trail"
                >
                  <div style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: isRecording ? 'white' : '#dc2626', animation: isRecording ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none' }} />
                  <span style={{ fontSize: 8, marginTop: 6, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {t.trailsBtn}{isRecording ? ` ${t.trailsOn}` : ''}
                  </span>
                </button>
              )}

              {/* Add photo */}
              <button
                onClick={openPhotoPicker}
                style={{
                  width: isMobile ? 54 : 60,
                  height: isMobile ? 54 : 60,
                  borderRadius: 9999,
                  boxShadow: '0 16px 26px rgba(0,0,0,0.12)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer'
                }}
                title={t.addPhoto}
              >
                <span style={{ fontSize: 20, fontWeight: 900 }}>📷</span>
                <span style={{ fontSize: 8, marginTop: 4, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {t.photos}
                </span>
              </button>

              {viewMode === 'map' && mainDestination && (
                <button
                  onClick={() => {
                    setIsBuilderMode(!isBuilderMode);
                    if (isBuilderMode) {
                      setPinSegments([]);
                      setSegmentRoutes([]);
                      setHighlightedSegmentIndex(null);
                      pinMarkerLayersRef.current.forEach((m) => m.remove());
                      pinMarkerLayersRef.current = [];
                      if (isMobile) setPitstopsCollapsed(true);
                    } else {
                      if (isMobile) setPitstopsCollapsed(false);
                    }
                  }}
                  style={{
                    width: isMobile ? 54 : 60,
                    height: isMobile ? 54 : 60,
                    borderRadius: 9999,
                    backgroundColor: isBuilderMode ? '#16a34a' : '#10b981',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 16px 26px rgba(0,0,0,0.12)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Pins"
                >
                  <span style={{ fontSize: isMobile ? 20 : 22, fontWeight: 'bold' }}>{isBuilderMode ? '✓' : '+'}</span>
                  <span style={{ fontSize: 8, fontWeight: 'bold', textTransform: 'uppercase' }}>PIN</span>
                </button>
              )}

              <button
                onClick={() => mapRef.current?.locate({ setView: true, maxZoom: 15, enableHighAccuracy: true })}
                style={{
                  width: isMobile ? 54 : 60,
                  height: isMobile ? 54 : 60,
                  borderRadius: 9999,
                  backgroundColor: '#16a34a',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 16px 26px rgba(0,0,0,0.12)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Center on me"
              >
                <span style={{ fontSize: 18 }}>📍</span>
                <span style={{ fontSize: 8, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 }}>HERE</span>
              </button>
            </div>

            {/* navigation HUD */}
            {viewMode === 'navigation' && (
              <div style={{ position: 'absolute', inset: 0, zIndex: 1100, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start', paddingTop: uiPad, paddingLeft: uiPad }}>
                <button
                  onClick={() => setViewMode('map')}
                  style={{
                    pointerEvents: 'auto',
                    width: isMobile ? 48 : 56,
                    height: isMobile ? 48 : 56,
                    borderRadius: 18,
                    backgroundColor: '#a78bfa',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 12px 22px rgba(0,0,0,0.12)',
                    fontSize: 18,
                    fontWeight: 900,
                    marginTop: `calc(var(--sat) + 0px)`
                  }}
                >
                  ←
                </button>

                {nextInstruction && (
                  <div style={{ pointerEvents: 'auto', marginTop: 12, backgroundColor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', borderRadius: 18, padding: '10px 14px', boxShadow: '0 4px 12px rgba(0,0,0,0.10)', maxWidth: 360 }}>
                    <span style={{ fontSize: 22 }}>🧭</span>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: 10, fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 }}>{t.nextTurn}</span>
                      <span style={{ fontSize: 13, fontWeight: 'bold', color: '#111827', marginTop: 2 }}>{nextInstruction}</span>
                    </div>
                  </div>
                )}

                <div style={{ pointerEvents: 'auto', marginTop: 12, backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', borderRadius: 18, padding: '10px 16px', boxShadow: '0 4px 12px rgba(0,0,0,0.10)', display: 'flex', gap: 14 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: 9, fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 }}>{t.distance}</span>
                    <span style={{ fontSize: 16, fontWeight: 'bold', color: '#111827', marginTop: 2 }}>{formatDist(navStats.distanceRem)}</span>
                  </div>
                  <div style={{ width: 1, backgroundColor: '#e5e7eb', height: 44 }} />
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: 9, fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 }}>{t.speed}</span>
                    <span style={{ fontSize: 16, fontWeight: 'bold', color: '#16a34a', marginTop: 2 }}>{navStats.speed} km/h</span>
                  </div>
                </div>
              </div>
            )}

            {/* PITSTOPS as collapsible bottom sheet on mobile (map view only) */}
            {viewMode === 'map' && showPitstopsPanel && (
              <div
                style={{
                  position: 'absolute',
                  left: `calc(var(--sal) + ${isMobile ? 10 : 24}px)`,
                  right: isMobile ? `calc(var(--sar) + 10px)` : undefined,
                  bottom: uiBottom,
                  zIndex: 1200,
                  pointerEvents: 'auto',
                  backgroundColor: 'rgba(255,255,255,0.92)',
                  backdropFilter: 'blur(12px)',
                  borderRadius: isMobile ? 22 : 28,
                  padding: isMobile ? 12 : 16,
                  width: isMobile ? 'auto' : 280,
                  boxShadow: '0 18px 32px rgba(0,0,0,0.12)',
                  border: '1px solid rgba(255,255,255,0.7)',
                }}
              >
                <div
                  onClick={() => { if (isMobile) setPitstopsCollapsed(v => !v); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: isMobile ? 'pointer' : 'default',
                    paddingBottom: isMobile ? 8 : 12,
                    userSelect: 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 9999, backgroundColor: '#10b981' }} />
                    <h4 style={{ color: '#111827', fontWeight: 'bold', fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', margin: 0 }}>
                      {t.pitstops}
                    </h4>
                  </div>

                  {isMobile && (
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#2563eb' }}>
                      {pitstopsCollapsed ? '▲' : '▼'}
                    </div>
                  )}
                </div>

                {!isMobile || !pitstopsCollapsed ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: isMobile ? 170 : 240, overflowY: 'auto' }}>
                    <div
                      onClick={() => {
                        setViewMode('navigation');
                        destinationRef.current = mainDestination;
                        lastAnnounceDistRef.current = 0;
                        if (soundEnabled) playSound('navigation-start');
                      }}
                      style={{ backgroundColor: '#f3f4f6', padding: 12, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                    >
                      <span style={{ fontWeight: 'bold', color: '#111827', fontSize: 14 }}>PIN A ({t.start})</span>
                      <span style={{ fontSize: 18, color: '#2563eb' }}>▶</span>
                    </div>

                    {pinSegments.length > 0 && pinSegments.map((pin, idx) => (
                      <div
                        key={idx}
                        onClick={() => setHighlightedSegmentIndex(highlightedSegmentIndex === idx ? null : idx)}
                        style={{
                          backgroundColor: highlightedSegmentIndex === idx ? '#dbeafe' : '#f9fafb',
                          padding: 12,
                          borderRadius: 14,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          border: highlightedSegmentIndex === idx ? '2px solid #2563eb' : '1px solid #e5e7eb'
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <span style={{ fontWeight: 'bold', color: '#10b981', fontSize: 14 }}>PIN {pin.letter}</span>
                          {segmentRoutes[idx] && (
                            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6, backgroundColor: 'white', padding: 8, borderRadius: 10 }}>
                              <div>← From PIN {segmentRoutes[idx].from}</div>
                              <div style={{ color: '#2563eb', fontWeight: 'bold' }}>{formatDist(segmentRoutes[idx].distance)}</div>
                              <div style={{ color: '#16a34a', fontWeight: 'bold' }}>{formatTime(segmentRoutes[idx].time)}</div>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={(e) => { e.stopPropagation(); removePinSegment(pin.letter); }}
                          style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', cursor: 'pointer', fontWeight: 900 }}
                          title={t.delete}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: '#6b7280' }}>
                    Tap to expand…
                  </div>
                )}
              </div>
            )}

            {/* route selector (map view only) */}
            {viewMode === 'map' && mainDestination && routes.length > 0 && !isBuilderMode && (
              <div style={{
                position: 'absolute',
                bottom: `calc(var(--sab) + ${isMobile ? 14 : 32}px)`,
                right: `calc(var(--sar) + ${isMobile ? 10 : 24}px)`,
                zIndex: 1100,
                width: '100%',
                maxWidth: 420,
                pointerEvents: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: 10
              }}>
                {showRouteSelector && (
                  <div style={{ pointerEvents: 'auto', backgroundColor: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(12px)', borderRadius: 40, padding: 18, boxShadow: '0 25px 40px -5px rgba(0,0,0,0.12)', width: '100%', maxWidth: 420 }}>
                    <h3 style={{ fontWeight: 'bold', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1.5, color: '#2563eb', marginBottom: 12 }}>Routes</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {routes.map((route, idx) => (
                        <button
                          key={idx}
                          onClick={() => { setSelectedRouteIndex(idx); setShowRouteSelector(false); }}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: 14,
                            backgroundColor: selectedRouteIndex === idx ? '#dbeafe' : '#f9fafb',
                            borderRadius: 18,
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            border: selectedRouteIndex === idx ? '3px solid #2563eb' : '2px solid #e5e7eb',
                            textAlign: 'left',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
                            <div style={{ width: 34, height: 34, backgroundColor: selectedRouteIndex === idx ? '#2563eb' : '#e5e7eb', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>
                              {idx + 1}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontWeight: 'bold', color: '#111827', fontSize: 15 }}>{formatTime(route.summary.totalTime)}</span>
                              <span style={{ color: '#9ca3af', fontSize: 12, marginTop: 2 }}>{(route.summary.totalDistance / 1000).toFixed(2)} km</span>
                            </div>
                          </div>
                          {selectedRouteIndex === idx && <span style={{ fontSize: 22, color: '#2563eb', fontWeight: 'bold' }}>✓</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ pointerEvents: 'auto', backgroundColor: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(12px)', borderRadius: 40, padding: 14, boxShadow: '0 25px 40px -5px rgba(0,0,0,0.12)', width: '100%', maxWidth: 420 }}>
                  <div onClick={() => setShowRouteSelector(!showRouteSelector)} style={{ display: 'flex', flexDirection: 'column', paddingLeft: 10, cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 22, fontWeight: 'bold', color: '#111827' }}>{formatTime(routes[selectedRouteIndex]?.summary.totalTime || 0)}</span>
                      <span style={{ fontSize: 12, fontWeight: 'bold', color: '#2563eb', backgroundColor: '#dbeafe', paddingLeft: 10, paddingRight: 10, paddingTop: 5, paddingBottom: 5, borderRadius: 9 }}>
                        {(routes[selectedRouteIndex]?.summary.totalDistance / 1000).toFixed(2)} km
                      </span>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', color: '#9ca3af', letterSpacing: 1.2, marginTop: 4 }}>
                      {routes.length} ROUTE{routes.length === 1 ? '' : 'S'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: 10, marginTop: 10, justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => { resetMapAndSearch(); }}
                      style={{
                        width: 46, height: 46, borderRadius: 18,
                        backgroundColor: '#f3f4f6',
                        border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 18, fontWeight: 900
                      }}
                      title="Reset"
                    >
                      ♻️
                    </button>
                    <button
                      onClick={() => {
                        setViewMode('navigation');
                        destinationRef.current = mainDestination;
                        lastAnnounceDistRef.current = 0;
                        if (soundEnabled) playSound('navigation-start');
                      }}
                      style={{
                        width: 56, height: 46, borderRadius: 18,
                        backgroundColor: '#2563eb',
                        border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontSize: 18, fontWeight: 900
                      }}
                      title="Start navigation"
                    >
                      ▶
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {viewMode === 'history' && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 5000, backgroundColor: '#f8fafc', padding: 24, overflow: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
              <button onClick={() => setViewMode('landing')} style={{ width: 64, height: 64, backgroundColor: 'white', borderRadius: '50%', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', fontSize: 20, fontWeight: 900 }}>
                ←
              </button>
              <h1 style={{ fontSize: 32, fontWeight: 'bold', color: '#111827', letterSpacing: -1 }}>{t.myTrails}</h1>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 96 }}>
              {savedRoutes.map((route) => (
                <div key={route.id} style={{ backgroundColor: 'white', padding: 18, borderRadius: 28, boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.10)', border: '1px solid #eef2f7', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div onClick={() => { void loadSavedRoute(route); }} style={{ display: 'flex', flexDirection: 'column', flex: 1, cursor: 'pointer' }}>
                    <span style={{ fontWeight: 900, fontSize: 18, color: '#111827' }}>{formatTrailDate(route)}</span>
                    <div style={{ marginTop: 6, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <span style={{ color: '#16a34a', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                        {formatDist(route.distance)}
                      </span>
                      <span style={{ color: '#6b7280', fontSize: 12, fontWeight: 700 }}>
                        {t.duration}: {formatTime(route.duration)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => deleteSavedRoute(route.id)}
                    style={{ width: 44, height: 44, borderRadius: 14, border: 'none', cursor: 'pointer', backgroundColor: '#fee2e2', color: '#dc2626', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    title={t.delete}
                  >
                    🗑️
                  </button>
                </div>
              ))}

              {savedRoutes.length === 0 && (
                <div style={{ textAlign: 'center', paddingTop: 160, color: '#d1d5db', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, opacity: 0.9 }}>
                  {t.noTrailsYet}
                </div>
              )}
            </div>
          </div>
        )}

        {viewMode === 'photos' && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 5000, backgroundColor: '#fff7ed', padding: 24, overflow: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
              <button onClick={() => setViewMode('landing')} style={{ width: 64, height: 64, backgroundColor: 'white', borderRadius: '50%', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', fontSize: 20, fontWeight: 900 }}>
                ←
              </button>
              <h1 style={{ fontSize: 32, fontWeight: 'bold', color: '#111827', letterSpacing: -1 }}>{t.photos}</h1>

              <button
                onClick={openPhotoPicker}
                style={{
                  marginLeft: 'auto',
                  height: 48,
                  paddingLeft: 16,
                  paddingRight: 16,
                  borderRadius: 9999,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: '#f59e0b',
                  color: 'white',
                  fontWeight: 900,
                  boxShadow: '0 12px 22px rgba(0,0,0,0.12)'
                }}
              >
                📷 {t.addPhoto}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 96 }}>
              {photoPins.map((p) => (
                <div key={p.id} style={{ backgroundColor: 'white', padding: 14, borderRadius: 24, border: '1px solid #fde68a', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', gap: 14, alignItems: 'center' }}>
                  <div
                    onClick={() => { void centerOnPhoto(p); }}
                    style={{ cursor: 'pointer', width: 96, height: 72, borderRadius: 16, overflow: 'hidden', border: '1px solid #e5e7eb', background: '#f3f4f6', flexShrink: 0 }}
                    title="Open on map"
                  >
                    <img src={p.dataUrl} alt="photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>

                  <div onClick={() => { void centerOnPhoto(p); }} style={{ flex: 1, cursor: 'pointer' }}>
                    <div style={{ fontWeight: 900, color: '#111827' }}>{formatPhotoDate(p)}</div>
                    <div style={{ marginTop: 6, fontSize: 12, color: '#6b7280', fontWeight: 700 }}>
                      {p.lat.toFixed(5)}, {p.lng.toFixed(5)}
                    </div>
                  </div>

                  <button
                    onClick={() => deletePhotoPin(p.id)}
                    style={{ width: 44, height: 44, borderRadius: 14, border: 'none', cursor: 'pointer', backgroundColor: '#fee2e2', color: '#dc2626', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    title={t.delete}
                  >
                    🗑️
                  </button>
                </div>
              ))}

              {photoPins.length === 0 && (
                <div style={{ textAlign: 'center', paddingTop: 160, color: '#fdba74', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, opacity: 0.9 }}>
                  {t.noPhotosYet}
                </div>
              )}
            </div>
          </div>
        )}

        {viewMode === 'lost' && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 7000 }}>
            <LostView lat={userLocation?.lat || 0} lng={userLocation?.lng || 0} onClose={() => setViewMode('landing')} />
          </div>
        )}

        {notification && viewMode !== 'navigation' && (
          <div style={{
            position: 'absolute',
            bottom: uiBottom,
            left: uiLeft,
            zIndex: 8000,
            backgroundColor: 'rgba(17,24,39,0.92)',
            color: 'white',
            padding: '10px 14px',
            borderRadius: 16,
            boxShadow: '0 12px 24px rgba(0,0,0,0.18)',
            maxWidth: 420,
            fontSize: 13,
            fontWeight: 600
          }}>
            {notification.msg}
          </div>
        )}
      </div>
    </>
  );
}