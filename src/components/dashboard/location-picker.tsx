'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

import 'leaflet/dist/leaflet.css';

interface LocationPickerProps {
  lat: number | null;
  lng: number | null;
  radius: number;
  onLocationChange: (lat: number, lng: number) => void;
}

export function LocationPicker({
  lat,
  lng,
  radius,
  onLocationChange,
}: LocationPickerProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const fullscreenRef = useRef<HTMLDivElement>(null);

  const previewMap = useRef<any>(null);
  const fullscreenMap = useRef<any>(null);

  const previewMarker = useRef<any>(null);
  const fullscreenMarker = useRef<any>(null);

  const previewCircle = useRef<any>(null);
  const fullscreenCircle = useRef<any>(null);

  const [mounted, setMounted] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const defaultLat = lat || 11.2588;
  const defaultLng = lng || 75.7804;

  const initializeMap = async (
    element: HTMLDivElement,
    type: 'preview' | 'fullscreen'
  ) => {
    const L = (await import('leaflet')).default;

    // FIX ICONS
    // @ts-ignore
    delete L.Icon.Default.prototype._getIconUrl;

    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    const map = L.map(element, {
      zoomControl: type === 'fullscreen',
      attributionControl: false,
    }).setView([defaultLat, defaultLng], type === 'fullscreen' ? 18 : 15);

    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png',
      {
        maxZoom: 20,
      }
    ).addTo(map);

    const marker = L.marker([defaultLat, defaultLng], {
      draggable: true,
    }).addTo(map);

    const circle = L.circle([defaultLat, defaultLng], {
      radius: radius || 100,
      color: '#38bdf8',
      fillColor: '#38bdf8',
      fillOpacity: 0.15,
      weight: 2,
    }).addTo(map);

    map.on('click', (e: any) => {
      const newLat = e.latlng.lat;
      const newLng = e.latlng.lng;
      marker.setLatLng([newLat, newLng]);
      circle.setLatLng([newLat, newLng]);
      onLocationChange(newLat, newLng);
    });

    marker.on('dragend', (e: any) => {
      const pos = e.target.getLatLng();
      marker.setLatLng(pos);
      circle.setLatLng(pos);
      onLocationChange(pos.lat, pos.lng);
    });

    // Handle resize
    setTimeout(() => {
      map.invalidateSize();
    }, 400);

    if (type === 'preview') {
      previewMap.current = map;
      previewMarker.current = marker;
      previewCircle.current = circle;
    } else {
      fullscreenMap.current = map;
      fullscreenMarker.current = marker;
      fullscreenCircle.current = circle;
    }
  };

  useEffect(() => {
    if (mounted && previewRef.current && !previewMap.current) {
      initializeMap(previewRef.current, 'preview');
    }
  }, [mounted]);

  useEffect(() => {
    if (expanded && fullscreenRef.current && !fullscreenMap.current) {
      initializeMap(fullscreenRef.current, 'fullscreen');
    }
    
    if (expanded && fullscreenMap.current) {
      setTimeout(() => {
        fullscreenMap.current.invalidateSize();
      }, 500);
    }
  }, [expanded]);

  useEffect(() => {
    if (!lat || !lng) return;
    const pos: [number, number] = [lat, lng];

    const sync = (map: any, marker: any, circle: any) => {
      if (!map || !marker || !circle) return;
      marker.setLatLng(pos);
      circle.setLatLng(pos);
      circle.setRadius(radius);
      map.setView(pos);
    };

    sync(previewMap.current, previewMarker.current, previewCircle.current);
    sync(fullscreenMap.current, fullscreenMarker.current, fullscreenCircle.current);
  }, [lat, lng, radius]);

  useEffect(() => {
    return () => {
      previewMap.current?.remove();
      fullscreenMap.current?.remove();
    };
  }, []);

  if (!mounted) {
    return <Skeleton className="w-full h-[160px] rounded-2xl bg-white/5" />;
  }

  return (
    <>
      <div className="relative group overflow-hidden rounded-[2rem] border border-white/10 shadow-2xl">
        <div ref={previewRef} className="w-full h-[160px] z-0" />
        
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="absolute inset-0 z-20"
        />

        <div className="absolute top-3 left-3 z-30 pointer-events-none">
          <div className="bg-black/70 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-2 border border-white/10">
            <MapPin className="h-3 w-3 text-sky-400" />
            <span className="text-[9px] font-bold uppercase tracking-widest text-white">
              Site Preview
            </span>
          </div>
        </div>

        <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-all duration-300 z-10 flex items-center justify-center pointer-events-none">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-sky-500 text-white px-4 py-2 rounded-full flex items-center gap-2 font-bold text-[10px] uppercase tracking-widest shadow-2xl scale-90 group-hover:scale-100 transition-transform">
            <Maximize2 className="h-3 w-3" />
            Expanded Map
          </div>
        </div>
      </div>

      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent
          className="w-[95vw] max-w-6xl h-[85vh] p-0 overflow-hidden rounded-[2.5rem] border-white/10 bg-zinc-950 flex flex-col shadow-2xl"
        >
          <DialogHeader className="px-6 py-5 border-b border-white/5 shrink-0">
            <DialogTitle className="text-white font-black text-xl uppercase tracking-tighter flex items-center gap-3">
              <MapPin className="h-5 w-5 text-sky-400" />
              Precision GPS Boundary
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 relative">
            <div ref={fullscreenRef} className="absolute inset-0" />
          </div>

          <DialogFooter className="shrink-0 border-t border-white/5 p-6 bg-black/40 backdrop-blur-xl">
            <Button
              onClick={() => setExpanded(false)}
              className="h-12 px-10 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-black uppercase tracking-widest text-xs shadow-2xl"
            >
              Apply Location Coordinates
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}