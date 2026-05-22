
'use client';

import React, { useEffect, useRef, useState } from 'react';
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
  const mapInstance = useRef<any>(null);
  const markerInstance = useRef<any>(null);
  const circleInstance = useRef<any>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || !mapRef.current) return;

    const initMap = async () => {
      // Dynamic import to avoid SSR issues with Leaflet
      const L = (await import('leaflet')).default;

      // Fix for default marker icons in Next.js/Webpack
      // @ts-ignore
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const initialPos: [number, number] = [lat || 25.1234, lng || 55.5678];

      if (!mapInstance.current && mapRef.current) {
        const map = L.map(mapRef.current, {
            zoomControl: false,
            attributionControl: true,
        }).setView(initialPos, 16);

        // Using CartoDB Dark Matter tiles - FREE and looks premium with dark mode
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: 'abcd',
          maxZoom: 20
        }).addTo(map);

        L.control.zoom({ position: 'bottomright' }).addTo(map);

        const marker = L.marker(initialPos, { draggable: true }).addTo(map);
        
        const circle = L.circle(initialPos, {
          radius: radius || 100,
          color: '#38bdf8',
          weight: 1,
          fillColor: '#38bdf8',
          fillOpacity: 0.15,
        }).addTo(map);

        mapInstance.current = map;
        markerInstance.current = marker;
        circleInstance.current = circle;

        map.on('click', (e: any) => {
          const { lat, lng } = e.latlng;
          marker.setLatLng([lat, lng]);
          circle.setLatLng([lat, lng]);
          onLocationChange(lat, lng);
        });

        marker.on('dragend', (e: any) => {
          const { lat, lng } = e.target.getLatLng();
          circle.setLatLng([lat, lng]);
          onLocationChange(lat, lng);
        });
      }
    };

    initMap();

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [isMounted]);

  // Update map visual state when props change (manual input or slider)
  useEffect(() => {
    if (mapInstance.current && markerInstance.current && circleInstance.current && lat && lng) {
      const pos: [number, number] = [lat, lng];
      markerInstance.current.setLatLng(pos);
      circleInstance.current.setLatLng(pos);
      circleInstance.current.setRadius(radius);
      
      // Only pan if coordinates were explicitly updated (prevents jumpiness)
      // mapInstance.current.panTo(pos);
    }
  }, [lat, lng, radius]);

  if (!isMounted) return <Skeleton className="w-full h-[300px] rounded-[2rem] bg-white/5" />;

  return (
    <div className="relative group">
        <div 
            ref={mapRef} 
            className="w-full h-[300px] rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden z-0" 
        />
        <div className="absolute top-4 left-4 z-10 pointer-events-none">
            <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
                <MapPin className="h-3 w-3 text-sky-400" />
                <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Attendance Zone</span>
            </div>
        </div>
    </div>
  );
}
