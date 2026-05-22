'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from 'use-debounce';

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
  const previewMap = useRef<any>(null);
  const previewMarker = useRef<any>(null);
  const previewCircle = useRef<any>(null);

  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

  const defaultLat = lat || 11.2588;
  const defaultLng = lng || 75.7804;

  const initializeMap = async (element: HTMLDivElement) => {
    const L = (await import('leaflet')).default;

    // Fix for Default Marker Icons
    // @ts-ignore
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    const map = L.map(element, {
      zoomControl: true,
      attributionControl: false,
    }).setView([defaultLat, defaultLng], 16);

    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png',
      { maxZoom: 20 }
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

    previewMap.current = map;
    previewMarker.current = marker;
    previewCircle.current = circle;

    setTimeout(() => {
      map.invalidateSize();
    }, 400);
  };

  useEffect(() => {
    if (mounted && previewRef.current && !previewMap.current) {
      initializeMap(previewRef.current);
    }
  }, [mounted]);

  // Sync state changes from parent
  useEffect(() => {
    if (!lat || !lng || !previewMap.current) return;
    const pos: [number, number] = [lat, lng];
    previewMarker.current.setLatLng(pos);
    previewCircle.current.setLatLng(pos);
    previewCircle.current.setRadius(radius);
    previewMap.current.setView(pos);
  }, [lat, lng, radius]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const result = data[0];
        const newLat = parseFloat(result.lat);
        const newLng = parseFloat(result.lon);
        
        onLocationChange(newLat, newLng);
        toast({ title: "Location Found", description: result.display_name });
      } else {
        toast({ title: "Not Found", description: "Could not find that location.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Search Error", description: "An error occurred while searching.", variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  if (!mounted) {
    return <Skeleton className="w-full h-[240px] rounded-2xl bg-white/5" />;
  }

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Search address or landmark..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 pl-10 bg-white/5 border-white/10 text-white rounded-xl focus-visible:ring-sky-500/50"
          />
        </div>
        <Button 
          type="submit" 
          disabled={isSearching || !searchQuery.trim()}
          className="h-10 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white border border-white/5"
        >
          {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
        </Button>
      </form>

      {/* Map Container */}
      <div className="relative group overflow-hidden rounded-[2rem] border border-white/10 shadow-2xl bg-black/20">
        <div ref={previewRef} className="w-full h-[200px] z-0" />
        
        <div className="absolute top-3 left-3 z-30 pointer-events-none">
          <div className="bg-black/70 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-2 border border-white/10">
            <MapPin className="h-3 w-3 text-sky-400" />
            <span className="text-[9px] font-black uppercase tracking-widest text-white">
              Drag Marker to Pick
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
