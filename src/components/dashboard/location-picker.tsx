
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin } from 'lucide-react';

interface LocationPickerProps {
  lat: number | null;
  lng: number | null;
  radius: number;
  onLocationChange: (lat: number, lng: number) => void;
}

export function LocationPicker({ lat, lng, radius, onLocationChange }: LocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [googleMaps, setGoogleMaps] = useState<any>(null);
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  
  const mapInstance = useRef<any>(null);
  const markerInstance = useRef<any>(null);
  const circleInstance = useRef<any>(null);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setStatus('error');
      return;
    }

    const loader = new Loader({
      apiKey: apiKey,
      version: 'weekly',
    });

    loader.load().then((google) => {
      setGoogleMaps(google);
      setStatus('ready');
    }).catch(e => {
      console.error("Google Maps failed to load", e);
      setStatus('error');
    });
  }, []);

  useEffect(() => {
    if (!googleMaps || !mapRef.current || status !== 'ready') return;

    const initialPos = { 
      lat: lat || 25.1234, 
      lng: lng || 55.5678 
    };

    const map = new googleMaps.maps.Map(mapRef.current, {
      center: initialPos,
      zoom: 16,
      disableDefaultUI: false,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      styles: [
        { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
        {
          featureType: "administrative.locality",
          elementType: "labels.text.fill",
          stylers: [{ color: "#d59563" }],
        },
        {
          featureType: "poi",
          elementType: "labels.text.fill",
          stylers: [{ color: "#d59563" }],
        },
        {
          featureType: "poi.park",
          elementType: "geometry",
          stylers: [{ color: "#263c3f" }],
        },
        {
          featureType: "poi.park",
          elementType: "labels.text.fill",
          stylers: [{ color: "#6b9a76" }],
        },
        {
          featureType: "road",
          elementType: "geometry",
          stylers: [{ color: "#38414e" }],
        },
        {
          featureType: "road",
          elementType: "geometry.stroke",
          stylers: [{ color: "#212a37" }],
        },
        {
          featureType: "road",
          elementType: "labels.text.fill",
          stylers: [{ color: "#9ca5b3" }],
        },
        {
          featureType: "road.highway",
          elementType: "geometry",
          stylers: [{ color: "#746855" }],
        },
        {
          featureType: "road.highway",
          elementType: "geometry.stroke",
          stylers: [{ color: "#1f2835" }],
        },
        {
          featureType: "road.highway",
          elementType: "labels.text.fill",
          stylers: [{ color: "#f3d19c" }],
        },
        {
          featureType: "transit",
          elementType: "geometry",
          stylers: [{ color: "#2f3948" }],
        },
        {
          featureType: "transit.station",
          elementType: "labels.text.fill",
          stylers: [{ color: "#d59563" }],
        },
        {
          featureType: "water",
          elementType: "geometry",
          stylers: [{ color: "#17263c" }],
        },
        {
          featureType: "water",
          elementType: "labels.text.fill",
          stylers: [{ color: "#515c6d" }],
        },
        {
          featureType: "water",
          elementType: "labels.text.stroke",
          stylers: [{ color: "#17263c" }],
        },
      ],
    });
    mapInstance.current = map;

    const marker = new googleMaps.maps.Marker({
      position: initialPos,
      map: map,
      draggable: true,
    });
    markerInstance.current = marker;

    const circle = new googleMaps.maps.Circle({
      map: map,
      radius: radius,
      fillColor: '#38bdf8',
      fillOpacity: 0.15,
      strokeColor: '#38bdf8',
      strokeWeight: 1,
      center: initialPos,
      clickable: false,
    });
    circleInstance.current = circle;

    map.addListener('click', (e: any) => {
      const newLat = e.latLng.lat();
      const newLng = e.latLng.lng();
      onLocationChange(newLat, newLng);
    });

    marker.addListener('dragend', (e: any) => {
      const newLat = e.latLng.lat();
      const newLng = e.latLng.lng();
      onLocationChange(newLat, newLng);
    });

  }, [googleMaps, status]);

  useEffect(() => {
    if (mapInstance.current && markerInstance.current && circleInstance.current && lat && lng) {
      const pos = { lat, lng };
      markerInstance.current.setPosition(pos);
      circleInstance.current.setCenter(pos);
      circleInstance.current.setRadius(radius);
    }
  }, [lat, lng, radius]);

  if (status === 'loading') return <Skeleton className="w-full h-[300px] rounded-2xl bg-white/5" />;
  
  if (status === 'error') return (
    <div className="w-full h-[300px] rounded-2xl border border-white/10 bg-white/[0.02] flex flex-col items-center justify-center text-center p-6 gap-3">
        <MapPin className="h-10 w-10 text-zinc-700" />
        <p className="text-sm text-zinc-500 font-medium italic">Google Maps API Key missing or invalid.<br/>Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env</p>
    </div>
  );

  return <div ref={mapRef} className="w-full h-[300px] rounded-2xl border border-white/10 shadow-2xl" />;
}
