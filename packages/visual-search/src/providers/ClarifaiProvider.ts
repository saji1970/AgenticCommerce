import axios from 'axios';
import { IVisualSearchProvider, VisualSearchResult, DetectedObject } from '../interfaces/IVisualSearch';

export interface ClarifaiConfig {
  apiKey: string;
}

/**
 * Clarifai Visual Search Provider
 * Free tier: 1,000 operations/month
 */
export class ClarifaiProvider implements IVisualSearchProvider {
  readonly name = 'clarifai';
  private apiKey: string;

  constructor(config: ClarifaiConfig) {
    this.apiKey = config.apiKey;
  }

  async analyzeImage(imageBuffer: Buffer | string): Promise<VisualSearchResult> {
    const base64Image = typeof imageBuffer === 'string' ? imageBuffer : imageBuffer.toString('base64');

    try {
      const response = await axios.post(
        'https://api.clarifai.com/v2/models/general-image-recognition/outputs',
        {
          inputs: [
            {
              data: {
                image: {
                  base64: base64Image,
                },
              },
            },
          ],
        },
        {
          headers: {
            Authorization: `Key ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const concepts = response.data.outputs[0].data.concepts || [];

      const labels = concepts.map((c: any) => c.name);
      const detectedObjects: DetectedObject[] = concepts.slice(0, 5).map((c: any) => ({
        name: c.name,
        confidence: c.value,
      }));

      const suggestedQuery = labels.slice(0, 3).join(' ');
      const confidence = concepts.reduce((sum: number, c: any) => sum + c.value, 0) / concepts.length;

      return {
        labels,
        dominantColors: [],
        suggestedQuery,
        detectedObjects,
        confidence,
      };
    } catch (error: any) {
      console.error('Clarifai API error:', error.message);
      throw new Error('Visual search failed');
    }
  }
}
