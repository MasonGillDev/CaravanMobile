import ApiClient from './apiClient';

export interface PlaceRecommendation {
  place_id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  lat: number;
  long: number;
  rating?: number;
  price?: string;
  hours?: string;
  similarity: number;
}

export interface PlaceRecommendationsResponse {
  success: boolean;
  recommendations: PlaceRecommendation[];
  message?: string;
}

class PlaceService {
  private apiClient: ApiClient;

  constructor() {
    this.apiClient = ApiClient.getInstance();
  }

  async getRecommendations(limit: number = 10): Promise<PlaceRecommendation[]> {
    try {
      const response = await this.apiClient.getPlaceRecommendations(limit) as PlaceRecommendationsResponse;
      
      if (response.success) {
        return response.recommendations;
      } else {
        throw new Error(response.message || 'Failed to get recommendations');
      }
    } catch (error: any) {
      console.error('Error fetching place recommendations:', error);
      
      // Check if it's a 400 error (user needs to complete survey)
      if (error.response?.status === 400) {
        throw new Error('Please complete the survey to get personalized recommendations');
      }
      
      throw error;
    }
  }
}

export default new PlaceService();