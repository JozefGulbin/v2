// EnhancedGpsTracker.tsx
import React, { useEffect, useRef, useState } from 'react';

interface GpsData {
    latitude: number;
    longitude: number;
    accuracy: number;
    heading?: number;
    filteredLatitude: number;
    filteredLongitude: number;
}

interface KalmanState {
    x: number;
    y: number;
    px: number;
    py: number;
}

const EnhancedGpsTracker = () => {
    const gpsDataRef = useRef<GpsData>({
        latitude: 0,
        longitude: 0,
        accuracy: 0,
        heading: undefined,
        filteredLatitude: 0,
        filteredLongitude: 0,
    });

    const kalmanStateRef = useRef<KalmanState>({
        x: 0,
        y: 0,
        px: 0.1,
        py: 0.1,
    });

    const previousCoordsRef = useRef<{ lat: number; lon: number } | null>(null);
    const watchIdRef = useRef<number | null>(null);
    const [gpsData, setGpsData] = useState<GpsData>(gpsDataRef.current);

    // Kalman Filter implementation for improved accuracy
    const applyKalmanFilter = (
        measurement: { lat: number; lon: number },
        accuracy: number
    ): { lat: number; lon: number } => {
        const state = kalmanStateRef.current;
        const q = 0.00001; // Process noise
        const r = Math.max(accuracy * accuracy, 1); // Measurement noise (based on accuracy)

        // Predict
        const px = state.px + q;
        const py = state.py + q;

        // Update
        const kx = px / (px + r);
        const ky = py / (py + r);

        state.x = state.x + kx * (measurement.lat - state.x);
        state.y = state.y + ky * (measurement.lon - state.y);
        state.px = (1 - kx) * px;
        state.py = (1 - ky) * py;

        return { lat: state.x, lon: state.y };
    };

    // Calculate heading between two points
    const calculateHeading = (
        lat1: number,
        lon1: number,
        lat2: number,
        lon2: number
    ): number => {
        const dLon = lon2 - lon1;
        const y = Math.sin(dLon) * Math.cos(lat2);
        const x =
            Math.cos(lat1) * Math.sin(lat2) -
            Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
        const heading = Math.atan2(y, x);
        return ((heading * 180) / Math.PI + 360) % 360;
    };

    useEffect(() => {
        const handleGPSUpdate = (event: GeolocationPosition) => {
            const { latitude, longitude, accuracy } = event.coords;

            // Apply Kalman filter for improved accuracy
            const filtered = applyKalmanFilter(
                { lat: latitude, lon: longitude },
                accuracy
            );

            // Calculate heading if we have previous coordinates
            let heading: number | undefined;
            if (previousCoordsRef.current) {
                heading = calculateHeading(
                    previousCoordsRef.current.lat,
                    previousCoordsRef.current.lon,
                    latitude,
                    longitude
                );
            }
            previousCoordsRef.current = { lat: latitude, lon: longitude };

            // Update ref and state
            gpsDataRef.current = {
                latitude,
                longitude,
                accuracy,
                heading,
                filteredLatitude: filtered.lat,
                filteredLongitude: filtered.lon,
            };

            setGpsData({ ...gpsDataRef.current });
        };

        const handleGPSError = (error: GeolocationPositionError) => {
            console.error('Error getting GPS data:', error.message);
        };

        // Start watching position
        watchIdRef.current = navigator.geolocation.watchPosition(
            handleGPSUpdate,
            handleGPSError,
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            }
        );

        // Cleanup function
        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
        };
    }, []);

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <h2>Enhanced GPS Tracker</h2>
            <div style={{ marginBottom: '10px' }}>
                <h3>Raw GPS Data:</h3>
                <p>Latitude: {gpsData.latitude.toFixed(6)}°</p>
                <p>Longitude: {gpsData.longitude.toFixed(6)}°</p>
                <p>Accuracy: ±{gpsData.accuracy.toFixed(2)} meters</p>
            </div>
            <div style={{ marginBottom: '10px' }}>
                <h3>Filtered GPS Data (Kalman):</h3>
                <p>Latitude: {gpsData.filteredLatitude.toFixed(6)}°</p>
                <p>Longitude: {gpsData.filteredLongitude.toFixed(6)}°</p>
            </div>
            {gpsData.heading !== undefined && (
                <div>
                    <h3>Navigation:</h3>
                    <p>Heading: {gpsData.heading.toFixed(2)}° from North</p>
                </div>
            )}
        </div>
    );
};

export default EnhancedGpsTracker;