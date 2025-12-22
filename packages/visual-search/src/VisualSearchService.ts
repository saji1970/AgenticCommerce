import { IVisualSearchProvider, VisualSearchResult } from './interfaces/IVisualSearch';
import { GoogleVisionProvider, GoogleVisionConfig } from './providers/GoogleVisionProvider';
import { ClarifaiProvider, ClarifaiConfig } from './providers/ClarifaiProvider';

export type VisualSearchProvider = 'google-vision' | 'clarifai' | 'mock';

export interface VisualSearchServiceConfig {
  provider: VisualSearchProvider;
  config: GoogleVisionConfig | ClarifaiConfig | { apiKey?: string };
}

// Mock provider for development/testing when no API key is available
class MockVisualSearchProvider implements IVisualSearchProvider {
  readonly name = 'mock';

  async analyzeImage(imageBuffer: Buffer | string): Promise<VisualSearchResult> {
    console.warn('MockVisualSearchProvider: No API key configured, returning empty results');
    return {
      labels: [],
      dominantColors: [],
      suggestedQuery: '',
      detectedObjects: [],
      confidence: 0,
    };
  }
}

export class VisualSearchService {
  private provider: IVisualSearchProvider;

  constructor(serviceConfig: VisualSearchServiceConfig) {
    // Check if API key is provided
    const hasApiKey = serviceConfig.config && 'apiKey' in serviceConfig.config && serviceConfig.config.apiKey;

    switch (serviceConfig.provider) {
      case 'google-vision':
        if (!hasApiKey) {
          console.warn('Google Vision API key not provided, using mock provider');
          this.provider = new MockVisualSearchProvider();
        } else {
          this.provider = new GoogleVisionProvider(serviceConfig.config as GoogleVisionConfig);
        }
        break;

      case 'clarifai':
        if (!hasApiKey) {
          console.warn('Clarifai API key not provided, using mock provider');
          this.provider = new MockVisualSearchProvider();
        } else {
          this.provider = new ClarifaiProvider(serviceConfig.config as ClarifaiConfig);
        }
        break;

      case 'mock':
        this.provider = new MockVisualSearchProvider();
        break;

      default:
        throw new Error(`Unsupported visual search provider: ${serviceConfig.provider}`);
    }
  }

  async analyzeImage(imageBuffer: Buffer | string): Promise<VisualSearchResult> {
    return await this.provider.analyzeImage(imageBuffer);
  }

  getProviderName(): string {
    return this.provider.name;
  }
}

export default VisualSearchService;
