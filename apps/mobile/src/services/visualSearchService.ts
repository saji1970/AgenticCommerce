import { apiService } from './api';

export interface VisualSearchResult {
  labels: string[];
  dominantColors: string[];
  suggestedQuery: string;
  detectedObjects: Array<{
    name: string;
    confidence: number;
  }>;
  confidence: number;
}

class VisualSearchService {
  async analyzeImage(base64Image: string): Promise<VisualSearchResult> {
    return await apiService.post<VisualSearchResult>('/products/visual-search', {
      image: base64Image,
    });
  }

  async searchByImage(base64Image: string, filters?: any): Promise<any> {
    return await apiService.post('/products/search-by-image', {
      image: base64Image,
      filters,
    });
  }
}

export const visualSearchService = new VisualSearchService();
