'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';

const TrackingMap = dynamic(() => import('../components/TrackingMap'), { 
  ssr: false 
});

export default function MapPage() {
  const [location, setLocation] = useState(null);
  const [status, setStatus] = useState('Ieškoma jūsų vietos...');
  const router = useRouter();
  
  useEffect(() => {
    const { mode } = router.query;
    if (!mode) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setStatus('');
      },
      (error) => {
        setStatus(`Klaida: ${error.message}. Prašome leisti pasiekti jūsų vietą.`);
      }
    );
  }, [router.query]);

  if (!location) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <h1 className="text-2xl">{status}</h1>
      </div>
    );
  }

  return (
    <TrackingMap 
      initialLatitude={location.latitude}
      initialLongitude={location.longitude}
      mode={router.query.mode}
    />
  );
}