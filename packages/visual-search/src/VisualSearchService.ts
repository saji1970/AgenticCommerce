import { IVisualSearchProvider, VisualSearchResult } from './interfaces/IVisualSearch';
import { GoogleVisionProvider, GoogleVisionConfig } from './providers/GoogleVisionProvider';
import { ClarifaiProvider, ClarifaiConfig } from './providers/ClarifaiProvider';

export type VisualSearchProvider = 'google-vision' | 'clarifai';

export interface VisualSearchServiceConfig {
  provider: VisualSearchProvider;
  config: GoogleVisionConfig | ClarifaiConfig;
}

export class VisualSearchService {
  private provider: IVisualSearchProvider;

  constructor(serviceConfig: VisualSearchServiceConfig) {
    switch (serviceConfig.provider) {
      case 'google-vision':
        this.provider = new GoogleVisionProvider(serviceConfig.config as GoogleVisionConfig);
        break;

      case 'clarifai':
        this.provider = new ClarifaiProvider(serviceConfig.config as ClarifaiConfig);
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
