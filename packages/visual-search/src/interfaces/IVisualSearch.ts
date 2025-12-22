export interface VisualSearchResult {
  labels: string[];
  dominantColors: string[];
  suggestedQuery: string;
  detectedObjects: DetectedObject[];
  confidence: number;
}

export interface DetectedObject {
  name: string;
  confidence: number;
  boundingBox?: BoundingBox;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface IVisualSearchProvider {
  readonly name: string;
  analyzeImage(imageBuffer: Buffer | string): Promise<VisualSearchResult>;
}
