import { IVisualSearchProvider, VisualSearchResult, DetectedObject } from '../interfaces/IVisualSearch';

export interface GoogleVisionConfig {
  keyFilePath?: string;
  credentials?: any;
}

export class GoogleVisionProvider implements IVisualSearchProvider {
  readonly name = 'google-vision';
  private client: any;

  constructor(config: GoogleVisionConfig) {
    // Lazy load Google Vision SDK
    this.initClient(config);
  }

  private async initClient(config: GoogleVisionConfig) {
    const vision = await import('@google-cloud/vision');
    this.client = new vision.ImageAnnotatorClient(config);
  }

  async analyzeImage(imageBuffer: Buffer | string): Promise<VisualSearchResult> {
    const [result] = await this.client.annotateImage({
      image: {
        content: typeof imageBuffer === 'string' ? imageBuffer : imageBuffer.toString('base64'),
      },
      features: [
        { type: 'LABEL_DETECTION', maxResults: 10 },
        { type: 'OBJECT_LOCALIZATION', maxResults: 10 },
        { type: 'IMAGE_PROPERTIES', maxResults: 5 },
        { type: 'WEB_DETECTION', maxResults: 10 },
      ],
    });

    const labels = result.labelAnnotations?.map((label: any) => label.description) || [];

    const detectedObjects: DetectedObject[] =
      result.localizedObjectAnnotations?.map((obj: any) => ({
        name: obj.name,
        confidence: obj.score,
        boundingBox: obj.boundingPoly ? this.extractBoundingBox(obj.boundingPoly) : undefined,
      })) || [];

    const dominantColors =
      result.imagePropertiesAnnotation?.dominantColors?.colors
        ?.slice(0, 3)
        .map((color: any) => this.rgbToHex(color.color)) || [];

    // Generate suggested search query from labels and objects
    const suggestedQuery = this.generateSearchQuery(labels, detectedObjects);

    // Calculate overall confidence
    const confidence = this.calculateConfidence(result);

    return {
      labels,
      dominantColors,
      suggestedQuery,
      detectedObjects,
      confidence,
    };
  }

  private extractBoundingBox(boundingPoly: any): any {
    const vertices = boundingPoly.normalizedVertices || boundingPoly.vertices;
    if (!vertices || vertices.length < 2) return undefined;

    return {
      x: vertices[0].x || 0,
      y: vertices[0].y || 0,
      width: (vertices[2]?.x || 1) - (vertices[0]?.x || 0),
      height: (vertices[2]?.y || 1) - (vertices[0]?.y || 0),
    };
  }

  private rgbToHex(color: any): string {
    const r = Math.round(color.red || 0);
    const g = Math.round(color.green || 0);
    const b = Math.round(color.blue || 0);
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }

  private generateSearchQuery(labels: string[], objects: DetectedObject[]): string {
    // Prioritize objects over labels
    if (objects.length > 0) {
      const topObject = objects[0];
      const additionalLabels = labels.slice(0, 2).filter(l => !l.includes(topObject.name));
      return [topObject.name, ...additionalLabels].join(' ');
    }

    // Fall back to top labels
    return labels.slice(0, 3).join(' ');
  }

  private calculateConfidence(result: any): number {
    const labelConfidence =
      result.labelAnnotations?.reduce((sum: number, label: any) => sum + label.score, 0) /
        (result.labelAnnotations?.length || 1) || 0;

    const objectConfidence =
      result.localizedObjectAnnotations?.reduce((sum: number, obj: any) => sum + obj.score, 0) /
        (result.localizedObjectAnnotations?.length || 1) || 0;

    return (labelConfidence + objectConfidence) / 2;
  }
}
