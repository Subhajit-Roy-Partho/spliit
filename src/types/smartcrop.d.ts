declare module 'smartcrop' {
  interface CropOptions {
    width: number
    height: number
    minScale?: number
    ruleOfThirds?: boolean
    debug?: boolean
  }

  interface CropResult {
    x: number
    y: number
    width: number
    height: number
    score: { total: number }
  }

  interface SmartCropResult {
    topCrop: CropResult
    crops: CropResult[]
  }

  function crop(
    image: HTMLImageElement | HTMLCanvasElement | ImageData,
    options: CropOptions,
  ): Promise<SmartCropResult>

  export { crop }
  export default { crop }
}
