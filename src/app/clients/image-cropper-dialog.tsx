'use client'

import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Slider } from '@/components/ui/slider'
import { Minus, Plus } from 'lucide-react'
import getCroppedImg from '@/lib/crop-image'

interface ImageCropperDialogProps {
  isOpen: boolean
  image: string | null
  onClose: () => void
  onCropComplete: (croppedImage: File) => void
}

export function ImageCropperDialog({
  isOpen,
  image,
  onClose,
  onCropComplete,
}: ImageCropperDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)

  const onCropPixelsComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleCrop = async () => {
    if (image && croppedAreaPixels) {
      const croppedImageFile = await getCroppedImg(image, croppedAreaPixels, 0)
      if (croppedImageFile) {
        onCropComplete(croppedImageFile)
      }
    }
  }

  if (!image) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md w-full p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-center">Does it look good?</DialogTitle>
        </DialogHeader>
        <div className="relative h-80 w-full bg-gray-100 dark:bg-gray-800 rounded-md overflow-hidden">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropPixelsComplete}
          />
        </div>
        <div className="cropper-controls">
           <div className="slider-container">
              <Minus className="text-muted-foreground" />
              <Slider
                min={1}
                max={3}
                step={0.1}
                value={[zoom]}
                onValueChange={(value) => setZoom(value[0])}
              />
              <Plus className="text-muted-foreground" />
          </div>
        </div>
        <DialogFooter className="sm:justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={handleCrop}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
