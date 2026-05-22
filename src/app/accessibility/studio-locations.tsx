'use client'

import { useState, useTransition } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Plus, Trash2, Loader2, MapPin, Navigation } from 'lucide-react'
import type { OfficeLocation } from '@/lib/types'
import { addOfficeLocation, deleteOfficeLocation } from '../actions'
import { LocationPicker } from '@/components/dashboard/location-picker'

export default function StudioLocations({ initialLocations }: { initialLocations: OfficeLocation[] }) {
  const [locations, setLocations] = useState(initialLocations)
  const [isAddDialogOpen, setAddDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [currentLocation, setCurrentLocation] = useState<OfficeLocation | null>(null)
  
  const [newName, setNewName] = useState('')
  const [newLat, setNewLat] = useState('')
  const [newLng, setNewLng] = useState('')
  const [newRadius, setNewRadius] = useState('100')
  
  const [isLocating, setIsLocating] = useState(false)
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  const handleCaptureLocation = () => {
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setNewLat(position.coords.latitude.toString());
        setNewLng(position.coords.longitude.toString());
        setIsLocating(false);
        toast({ title: "Position Captured" });
      },
      (error) => {
        setIsLocating(false);
        toast({ title: "Failed to get location", description: error.message, variant: "destructive" });
      },
      { enableHighAccuracy: true }
    );
  };

  const handleAdd = () => {
    if (!newName.trim() || !newLat || !newLng) return;
    startTransition(async () => {
      const { data, error } = await addOfficeLocation(
        newName.trim(), 
        parseFloat(newLat), 
        parseFloat(newLng), 
        parseInt(newRadius) || 100
      );
      if (error) {
        toast({ title: "Error adding location", description: error, variant: "destructive" });
      } else if (data) {
        setLocations(prev => [...prev, data]);
        toast({ title: "Studio zone added" });
        setAddDialogOpen(false);
        resetForm();
      }
    });
  }

  const resetForm = () => {
    setNewName('');
    setNewLat('');
    setNewLng('');
    setNewRadius('100');
  }
  
  const handleDelete = () => {
    if (!currentLocation) return;
    startTransition(async () => {
        const { error } = await deleteOfficeLocation(currentLocation.id);
        if (error) {
            toast({ title: "Error deleting location", description: error, variant: "destructive" });
        } else {
            setLocations(prev => prev.filter(l => l.id !== currentLocation.id));
            toast({ title: "Studio zone removed" });
        }
        setDeleteDialogOpen(false);
        setCurrentLocation(null);
    });
  }


  return (
    <>
      <Card className="border border-white/10 bg-white/[0.03] backdrop-blur-xl rounded-[2.5rem] shadow-2xl p-10">
        <CardHeader className="p-0 mb-10">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl font-black text-white tracking-tight">Studio Office Zones</CardTitle>
              <CardDescription className="text-zinc-500 font-medium">
                Define the physical boundaries for default office locations.
              </CardDescription>
            </div>
            <Button onClick={() => { resetForm(); setAddDialogOpen(true); }} className="rounded-full bg-sky-600 hover:bg-sky-500">
              <Plus className="mr-2 h-4 w-4" /> Add Studio Zone
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="border border-white/10 rounded-[2rem] overflow-hidden bg-black/20">
            <Table>
              <TableHeader className="bg-white/5">
                <TableRow className="hover:bg-transparent border-white/10">
                  <TableHead className="text-[10px] font-black uppercase text-zinc-500">Location Name</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-zinc-500">Coordinates</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-zinc-500">Radius</TableHead>
                  <TableHead className="w-20 text-right pr-6"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.map(location => (
                  <TableRow key={location.id} className="border-white/5 hover:bg-white/[0.02]">
                    <TableCell className="font-bold text-white">{location.name}</TableCell>
                    <TableCell className="font-mono text-xs text-sky-400">{location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</TableCell>
                    <TableCell className="text-zinc-400 font-bold">{location.radius}m</TableCell>
                    <TableCell className="text-right pr-6">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:text-rose-400 hover:bg-rose-500/10" onClick={() => {setCurrentLocation(location); setDeleteDialogOpen(true)}}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {locations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-zinc-600 italic text-sm">No office locations defined yet.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-3xl rounded-[3rem] bg-zinc-950 border-white/10 p-0 overflow-hidden flex flex-col max-h-[90vh]">
          <DialogHeader className="p-8 pb-4">
            <DialogTitle className="text-2xl font-black text-white uppercase tracking-tight">Add Studio Zone</DialogTitle>
            <DialogDescription className="text-zinc-500 font-medium">Set coordinates and radius for a default workspace.</DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-8 py-4 space-y-8 custom-scrollbar">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="loc-name" className="text-[10px] font-black uppercase text-zinc-500">Zone Name</Label>
                <Input id="loc-name" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Main Office" className="h-12 bg-white/5 border-white/10 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="loc-radius" className="text-[10px] font-black uppercase text-zinc-500">Radius (Meters)</Label>
                <Input id="loc-radius" type="number" value={newRadius} onChange={e => setNewRadius(e.target.value)} className="h-12 bg-white/5 border-white/10 rounded-xl" />
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-[10px] font-black uppercase text-zinc-500">Positioning</Label>
              <div className="grid grid-cols-2 gap-4">
                <Input value={newLat} onChange={e => setNewLat(e.target.value)} placeholder="Latitude" className="h-12 bg-white/5 border-white/10 rounded-xl font-mono text-sky-400" />
                <Input value={newLng} onChange={e => setNewLng(e.target.value)} placeholder="Longitude" className="h-12 bg-white/5 border-white/10 rounded-xl font-mono text-sky-400" />
              </div>
              
              <LocationPicker 
                lat={parseFloat(newLat) || null} 
                lng={parseFloat(newLng) || null} 
                radius={parseInt(newRadius) || 100}
                onLocationChange={(lat, lng) => { setNewLat(lat.toString()); setNewLng(lng.toString()); }}
              />

              <Button variant="outline" className="w-full h-12 rounded-xl border-sky-500/20 text-sky-400 hover:bg-sky-500/10" onClick={handleCaptureLocation} disabled={isLocating}>
                {isLocating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Navigation className="h-4 w-4 mr-2" />}
                Capture Current Position
              </Button>
            </div>
          </div>

          <DialogFooter className="p-8 bg-zinc-950 border-t border-white/5">
            <Button variant="ghost" onClick={() => setAddDialogOpen(false)} className="rounded-xl h-12">Cancel</Button>
            <Button onClick={handleAdd} disabled={isPending || !newName.trim() || !newLat} className="rounded-xl h-12 px-8 bg-sky-600 hover:bg-sky-500 font-bold">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Studio Zone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
       {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-[2.5rem] bg-zinc-950 border-white/10 text-white shadow-2xl">
            <AlertDialogHeader>
                <AlertDialogTitle className="text-2xl font-black uppercase tracking-tight">Remove studio zone?</AlertDialogTitle>
                <AlertDialogDescription className="text-zinc-500 font-medium">
                    This will delete "{currentLocation?.name}" from the global office locations. It will not automatically remove it from users who were assigned this zone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-3">
                <AlertDialogCancel onClick={() => setCurrentLocation(null)} className="rounded-xl bg-zinc-800 border-zinc-700">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="rounded-xl bg-rose-600 hover:bg-rose-700" disabled={isPending}>
                    {isPending ? 'Removing...' : 'Confirm Remove'}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
