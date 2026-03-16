// EnhancedGpsTracker.tsx
import React, { useEffect, useState } from 'react';

const EnhancedGpsTracker = () => {
    const [location, setLocation] = useState({
        latitude: null,
        longitude: null,
        heading: null,
    });

    // Kalman filter variables
    let q = 0.01, r = 0.1;
    let xhat = 0, p = 1, k = 0;

    const kalmanFilter = (measurement) => {
        // Prediction
        p += q;
        // Measurement update
        k = p / (p + r);
        xhat += k * (measurement - xhat);
        p *= (1 - k);
        return xhat;
    };

    useEffect(() => {
        const handleSuccess = (position) => {
            const { latitude, longitude } = position.coords;
            const heading = position.coords.heading;
            // Apply Kalman filter to the obtained latitude and longitude
            const filteredLatitude = kalmanFilter(latitude);
            const filteredLongitude = kalmanFilter(longitude);
            setLocation({
                latitude: filteredLatitude,
                longitude: filteredLongitude,
                heading,
            });
        };

        const handleError = (error) => {
            console.error('Error obtaining location:', error);
        };

        navigator.geolocation.watchPosition(handleSuccess, handleError);
    }, []);

    return (
        <div>
            <h1>Enhanced GPS Tracker</h1>
            <p>Latitude: {location.latitude}</p>
            <p>Longitude: {location.longitude}</p>
            <p>Heading: {location.heading}</p>
        </div>
    );
};

export default EnhancedGpsTracker;
