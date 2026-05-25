'use client'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { compressImage } from '@/lib/receipt'
import { Loader2, ScanSearch } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import Cropper from 'react-cropper'
import 'cropperjs/dist/cropper.css'

interface CropData {
  x: number
  y: number
  width: number
  height: number
}

interface ReceiptCropperProps {
  imageSrc: string
  /** imageSrc is an object URL; caller should provide the original File for compression */
  originalFile?: File
  onConfirm: (croppedBase64: string) => void
  onCancel: () => void
}

export function ReceiptCropper({
  imageSrc,
  originalFile,
  onConfirm,
  onCancel,
}: ReceiptCropperProps) {
  const cropperRef = useRef<HTMLImageElement & { cropper?: Cropper }>(null)
  const [smartCropData, setSmartCropData] = useState<CropData | null>(null)
  const [loadingSmartCrop, setLoadingSmartCrop] = useState(true)
  const [aggressiveCompress, setAggressiveCompress] = useState(false)
  const [compressing, setCompressing] = useState(false)

  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = async () => {
      try {
        const smartcrop = (await import('smartcrop')).default
        // Ask smartcrop for the most content-rich area using a portrait aspect
        // ratio that matches a typical receipt (roughly 1:2 width:height)
        const targetW = Math.round(img.naturalWidth * 0.9)
        const targetH = Math.round(img.naturalHeight * 0.9)
        const result = await smartcrop.crop(img, {
          width: targetW,
          height: targetH,
          minScale: 0.5,
        })
        setSmartCropData(result.topCrop)
      } catch (e) {
        console.warn('[smartcrop]', e)
      } finally {
        setLoadingSmartCrop(false)
      }
    }
    img.onerror = () => setLoadingSmartCrop(false)
    img.src = imageSrc
  }, [imageSrc])

  const onCropperReady = () => {
    const cropper = (cropperRef.current as any)?.cropper as Cropper | undefined
    if (cropper && smartCropData) {
      cropper.setData(smartCropData)
    }
  }

  const handleConfirm = async () => {
    const cropper = (cropperRef.current as any)?.cropper as Cropper | undefined
    if (!cropper) return
    setCompressing(true)
    try {
      if (aggressiveCompress && originalFile) {
        const { default: imageCompression } = await import(
          'browser-image-compression'
        )
        const compressed = await imageCompression(originalFile, {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1200,
          useWebWorker: true,
        })
        const url = URL.createObjectURL(compressed)
        const img = new Image()
        await new Promise<void>((res) => { img.onload = () => res(); img.src = url })
        const c2 = document.createElement('canvas')
        c2.width = img.naturalWidth; c2.height = img.naturalHeight
        c2.getContext('2d')!.drawImage(img, 0, 0)
        URL.revokeObjectURL(url)
        onConfirm(c2.toDataURL('image/jpeg', 0.8))
      } else {
        const canvas = cropper.getCroppedCanvas({ maxWidth: 1920, maxHeight: 1920 })
        onConfirm(canvas.toDataURL('image/jpeg', 0.85))
      }
    } finally {
      setCompressing(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onCancel() }}>
      <DialogContent className="max-w-lg p-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanSearch className="w-4 h-4" />
            Crop Receipt
          </DialogTitle>
        </DialogHeader>

        {loadingSmartCrop ? (
          <div className="flex items-center justify-center h-64 gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Detecting receipt area…</span>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground -mt-2 mb-1">
              Smart crop has pre-selected the receipt area. Drag to adjust, then
              confirm.
            </p>
            <Cropper
              src={imageSrc}
              style={{ maxHeight: '60vh', width: '100%' }}
              guides
              viewMode={1}
              dragMode="move"
              autoCropArea={0.85}
              responsive
              ready={onCropperReady}
              ref={cropperRef}
            />
            <div className="flex items-center justify-between mt-3">
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                <Checkbox
                  checked={aggressiveCompress}
                  onCheckedChange={(v) => setAggressiveCompress(!!v)}
                />
                Reduce image size (faster, lower quality)
              </label>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onCancel} disabled={compressing}>
                  Cancel
                </Button>
                <Button onClick={handleConfirm} disabled={compressing}>
                  {compressing ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />Processing…</>
                  ) : (
                    'Crop & Scan'
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
