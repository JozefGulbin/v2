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
                const last = prev[prev.length - *
