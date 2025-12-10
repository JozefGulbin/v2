// This is the complete and clean code for components/Routing.jsx

import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

const Routing = ({ start, end, onRouteFound }) => {
  const map = useMap();
  const routeLayerRef = useRef(null);

  useEffect(() => {
    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }

    if (!map || !start || !end) {
      return;
    }

    // ===================================================================
    // PASTE YOUR REAL API KEY FROM THE WEBSITE HERE
    const apiKey = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjhlYzVmNDI1Yzc2MTQ3MDE5YzY3NmQ3MmRiOTFmYTVlIiwiaCI6Im11cm11cjY0In0=';
    // ===================================================================
    
    // THIS IS THE SINGLE, CORRECT DECLARATION
    const url = 'https://api.openrouteservice.org/v2/directions/foot-hiking/geojson';

    const body = JSON.stringify({
      coordinates: [
        [start.lng, start.lat],
        [end.lng, end.lat]
      ]
    });

    fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json, application/geo+json',
        'Content-Type': 'application/json',
        'Authorization': apiKey
      },
      body: body
    })
    .then(response => {
      if (!response.ok) {
        return response.json().then(errorData => {
            throw new Error(`API Error: ${response.status} - ${errorData.error?.message || 'Check your API key and network connection.'}`);
        });
      }
      return response.json();
    })
    .then(data => {
      if (data.features && data.features.length > 0) {
        const latLngs = data.features[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
        const routeLine = L.polyline(latLngs, { color: '#007bff', weight: 6, opacity: 0.8 });
        
        routeLayerRef.current = routeLine;
        map.addLayer(routeLayerRef.current);
        map.fitBounds(routeLine.getBounds());

        const summary = data.features[0].properties.summary;
        const kms = (summary.distance / 1000).toFixed(2);
        onRouteFound(kms);

      } else {
        throw new Error("No route was found in the API response.");
      }
    })
    .catch(err => {
      console.error('Routing Error:', err);
      alert(`Could not calculate the route.\n\nError: ${err.message}`);
      onRouteFound("Error");
    });

  }, [map, start, end, onRouteFound]);

  return null;
};

export default Routing;