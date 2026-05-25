export async function compressImage(
  file: File,
  aggressive: boolean,
): Promise<string> {
  let workingFile = file
  if (aggressive) {
    const { default: imageCompression } = await import(
      'browser-image-compression'
    )
    workingFile = await imageCompression(file, {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 1200,
      useWebWorker: true,
    })
  }
  return compressImageToBase64(workingFile)
}

export type ReceiptResult = {
  title: string | null
  date: string | null
  categoryId: string | null
  total: number | null
  items: { name: string; amount: number }[]
}

export async function compressImageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      const MAX = 1920
      let { width, height } = img
      if (width > MAX || height > MAX) {
        if (width >= height) {
          height = Math.round((height * MAX) / width)
          width = MAX
        } else {
          width = Math.round((width * MAX) / height)
          height = MAX
        }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas not available'))
        return
      }
      ctx.drawImage(img, 0, 0, width, height)
      URL.revokeObjectURL(objectUrl)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to load image'))
    }
    img.src = objectUrl
  })
}

export async function scanReceipt(
  imageBase64: string,
  model: 'fast' | 'accurate',
): Promise<ReceiptResult> {
  const res = await fetch('/api/receipt-parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64, model }),
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as Record<string, unknown>
    throw new Error((err.error as string) || 'Scan failed')
  }
  return res.json() as Promise<ReceiptResult>
}
