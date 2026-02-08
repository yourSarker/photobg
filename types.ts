
export interface ImageState {
  originalUrl: string;
  originalBase64: string;
  resultUrl: string | null;
  mimeType: string;
}

export interface ProcessingStatus {
  isLoading: boolean;
  message: string;
  error: string | null;
}

export enum RemovalPresets {
  TRANSPARENT_BG = "Remove the entire background and make it 100% transparent. The output must be a PNG image with a proper alpha channel transparency, leaving only the main subject. Do not use a solid white or black background.",
  OBJECTS = "Identify and remove distracting background objects or people while keeping the main subject and maintaining the background context.",
  TEXT = "Detect and remove all text, captions, or watermarks from this image, healing the background behind them seamlessly.",
  CLEANUP = "Perform professional image retouching: remove blemishes, dust, and distracting small details to make the photo look studio-quality.",
  ENHANCE = "Enhance this image: improve the resolution, sharpness, lighting, and overall color balance. Make it look professional, vibrant, and clear while maintaining its original content."
}
