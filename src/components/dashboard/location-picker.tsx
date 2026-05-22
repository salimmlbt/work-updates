'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Maximize2, Check, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface LocationPickerProps {
  lat: number | null;
  lng: number | null;
  radius: number;
  onLocationChange: (lat: number, lng: number) => void;
}

export function LocationPicker({ lat, lng, radius, onLocationChange }: LocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const largeMapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const largeMapInstance = useRef<any>(null);
  const markerInstance = useRef<any>(null);
  const largeMarkerInstance = useRef<any>(null);
  const circleInstance = useRef<any>(null);
  const largeCircleInstance = useRef<any>(null);
  
  const [isMounted, setIsMounted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const initMap = async (element: HTMLDivElement, isLarge: boolean) => {
    const L = (await import('leaflet')).default;

    // Explicitly set icon paths to avoid broken assets in build
    // @ts-ignore
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    const initialPos: [number, number] = [lat || 25.1234, lng || 55.5678];

    const map = L.map(element, {
      zoomControl: isLarge,
      attributionControl: isLarge,
    }).setView(initialPos, isLarge ? 18 : 16);

    // Using CartoDB Voyager labels under for better contrast and landmark visibility
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    // Force a size invalidation to fix the "black screen" issue
    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    const marker = L.marker(initialPos, { draggable: true }).addTo(map);
    const circle = L.circle(initialPos, {
      radius: radius || 100,
      color: '#38bdf8',
      weight: 2,
      fillColor: '#38bdf8',
      fillOpacity: 0.15,
    }).addTo(map);

    map.on('click', (e: any) => {
      const { lat: newLat, lng: newLng } = e.latlng;
      marker.setLatLng([newLat, newLng]);
      circle.setLatLng([newLat, newLng]);
      onLocationChange(newLat, newLng);
    });

    marker.on('dragend', (e: any) => {
      const { lat: newLat, lng: newLng } = e.target.getLatLng();
      circle.setLatLng([newLat, newLng]);
      onLocationChange(newLat, newLng);
    });

    if (isLarge) {
      largeMapInstance.current = map;
      largeMarkerInstance.current = marker;
      largeCircleInstance.current = circle;
    } else {
      mapInstance.current = map;
      markerInstance.current = marker;
      circleInstance.current = circle;
    }
  };

  useEffect(() => {
    if (isMounted && mapRef.current && !mapInstance.current) {
      initMap(mapRef.current, false);
    }
  }, [isMounted]);

  useEffect(() => {
    if (isExpanded && largeMapRef.current) {
      setTimeout(() => {
         if (largeMapRef.current) initMap(largeMapRef.current, true);
      }, 50);
    }
  }, [isExpanded]);

  // Sync state between instances
  useEffect(() => {
    if (lat && lng) {
      const pos: [number, number] = [lat, lng];
      
      if (mapInstance.current && markerInstance.current && circleInstance.current) {
        markerInstance.current.setLatLng(pos);
        circleInstance.current.setLatLng(pos);
        circleInstance.current.setRadius(radius);
        mapInstance.current.setView(pos);
      }
      
      if (largeMapInstance.current && largeMarkerInstance.current && largeCircleInstance.current) {
        largeMarkerInstance.current.setLatLng(pos);
        largeCircleInstance.current.setLatLng(pos);
        largeCircleInstance.current.setRadius(radius);
        largeMapInstance.current.setView(pos);
      }
    }
  }, [lat, lng, radius]);

  if (!isMounted) return <Skeleton className="w-full h-[200px] rounded-[2rem] bg-white/5" />;

  return (
    <div className="space-y-4">
      <div className="relative group overflow-hidden rounded-[2.5rem] border border-white/10 shadow-2xl">
        <div 
          ref={mapRef} 
          className="w-full h-[200px] z-0 bg-[#0f0f0f]" 
        />
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none z-10">
             <div className="bg-sky-600/90 text-white px-6 py-3 rounded-full font-black uppercase tracking-widest text-xs shadow-2xl flex items-center gap-2 scale-90 group-hover:scale-100 transition-transform">
                <Maximize2 className="h-4 w-4" />
                Choose Location
             </div>
        </div>
        <button 
            type="button"
            onClick={() => setIsExpanded(true)}
            className="absolute inset-0 w-full h-full z-20 opacity-0"
            aria-label="Expand map"
        />
        <div className="absolute top-4 left-4 z-10 pointer-events-none">
          <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
            <MapPin className="h-3 w-3 text-sky-400" />
            <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Site Preview</span>
          </div>
        </div>
      </div>

      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogContent className="max-w-[95vw] w-[1200px] h-[85vh] p-0 rounded-[3rem] bg-zinc-950 border-white/10 overflow-hidden flex flex-col shadow-[0_0_100px_rgba(0,0,0,1)]">
          <DialogHeader className="p-8 pb-4">
            <DialogTitle className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-4">
               <div className="h-10 w-10 rounded-2xl bg-sky-500/10 flex items-center justify-center">
                  <MapPin className="h-6 w-6 text-sky-400" />
               </div>
               Precision GPS Boundary
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 relative bg-[#0f0f0f]">
            <div ref={largeMapRef} className="w-full h-full" />
            <div className="absolute top-6 left-6 z-[1000] pointer-events-none space-y-2">
               <div className="bg-black/80 backdrop-blur-md p-4 rounded-3xl border border-white/10 shadow-2xl">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Instructions</p>
                  <p className="text-sm text-zinc-200 font-medium">Click anywhere on the map or drag the pin to set the user's check-in point.</p>
               </div>
            </div>
          </div>

          <DialogFooter className="p-8 bg-zinc-950 border-t border-white/10 flex justify-between items-center">
            <div className="flex items-center gap-6">
               <div className="space-y-1">
                  <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em]">Coordinates</p>
                  <p className="text-sm font-mono text-sky-400 font-bold">{lat?.toFixed(6)}, {lng?.toFixed(6)}</p>
               </div>
               <div className="h-8 w-px bg-white/5" />
               <div className="space-y-1">
                  <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em]">Radius</p>
                  <p className="text-sm text-white font-black">{radius} Meters</p>
               </div>
            </div>
            <div className="flex gap-4">
               <Button variant="ghost" onClick={() => setIsExpanded(false)} className="rounded-2xl h-14 px-8 text-zinc-400 hover:text-white font-bold uppercase tracking-widest text-[10px]">
                  Cancel
               </Button>
               <Button onClick={() => setIsExpanded(false)} className="rounded-2xl h-14 px-10 bg-sky-600 hover:bg-sky-500 text-white font-black uppercase tracking-widest text-xs shadow-2xl shadow-sky-900/40">
                  <Check className="h-5 w-5 mr-2" />
                  Apply Location
               </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
