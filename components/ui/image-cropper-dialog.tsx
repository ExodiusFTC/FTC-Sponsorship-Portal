'use client'

import { useState, useCallback, useEffect } from 'react'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'

export interface ImageCropperDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  file: File | null
  aspect: number
  onConfirm: (blob: Blob) => void
}

export function ImageCropperDialog({ open, onOpenChange, file, aspect, onConfirm }: ImageCropperDialogProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    if (!file) return
    const url = URL.createObjectURL(file)
    setImageSrc(url)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels)
  }, [])

  const handleConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels) return
    setIsProcessing(true)
    try {
      const blob = await getCroppedBlob(imageSrc, croppedAreaPixels)
      onConfirm(blob)
      onOpenChange(false)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Crop Image</DialogTitle></DialogHeader>
        <div className="relative h-72 w-full overflow-hidden rounded-xl bg-muted">
          {imageSrc && <Cropper image={imageSrc} crop={crop} zoom={zoom} aspect={aspect} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete} />}
        </div>
        <div className="flex items-center gap-3 px-1">
          <span className="text-xs text-muted-foreground w-10">Zoom</span>
          <Slider min={1} max={3} step={0.05} value={[zoom]} onValueChange={(v) => setZoom(Array.isArray(v) ? v[0] : v as number)} className="flex-1" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={isProcessing}>{isProcessing ? 'Processing…' : 'Crop & Upload'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.addEventListener('load', () => resolve(img))
    img.addEventListener('error', reject)
    img.setAttribute('crossOrigin', 'anonymous')
    img.src = url
  })
}

export async function getCroppedBlob(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height)
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Canvas is empty'))), 'image/webp', 0.92)
  })
}

export function computeCenterCrop(imageWidth: number, imageHeight: number, aspect: number): Area {
  let cropWidth: number, cropHeight: number
  if (imageWidth / imageHeight > aspect) {
    cropHeight = imageHeight; cropWidth = cropHeight * aspect
  } else {
    cropWidth = imageWidth; cropHeight = cropWidth / aspect
  }
  return { x: (imageWidth - cropWidth) / 2, y: (imageHeight - cropHeight) / 2, width: cropWidth, height: cropHeight }
}
