import axios, { AxiosInstance } from 'axios';
import { Auth0Service } from '../auth/auth0Service';
import { config } from '../../utils/config';

class ApiClient {
  private static instance: ApiClient;
  private axiosInstance: AxiosInstance;
  private auth0Service: Auth0Service;

  private constructor() {
    this.auth0Service = Auth0Service.getInstance();
    
    this.axiosInstance = axios.create({
      baseURL: config.api.baseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        const token = await this.auth0Service.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          await this.auth0Service.clearTokens();
          // You could trigger a re-login here
        }
        return Promise.reject(error);
      }
    );
  }

  static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  // User endpoints
  async getUserProfile() {
    const response = await this.axiosInstance.get('/api/user');
    return response.data;
  }

  async updateUserProfile(data: any) {
    const response = await this.axiosInstance.put('/api/user', data);
    return response.data;
  }

  async updateProfile(data: {
    username: string;
    email: string;
    dob: string;
    country_code: string;
  }) {
    const response = await this.axiosInstance.put('/api/user/profile', data);
    return response.data;
  }

  async updateSurveyStatus(completed: boolean) {
    const response = await this.axiosInstance.put('/api/user/survey', { completed });
    return response.data;
  }

  // Survey endpoints
  async submitSurvey(data: {
    music_preference: string;
    vibe_preference: string;
    go_out_time: string;
    stay_duration: string;
    crowd_preference: string;
    drink_preference: string;
    price_comfort: string;
    food_availability: string;
    activities: {
      outdoor_seating: boolean;
      live_music: boolean;
      dance_floor: boolean;
      sports_tvs: boolean;
      games: boolean;
    };
  }) {
    const response = await this.axiosInstance.post('/api/survey', data);
    return response.data;
  }

  async getSurvey() {
    const response = await this.axiosInstance.get('/api/survey');
    return response.data;
  }

  async getSurveyOptions() {
    const response = await this.axiosInstance.get('/api/survey/options');
    return response.data;
  }

  // Location endpoints
  async updateLocation(data: {
    latitude: number;
    longitude: number;
    accuracy: number;
  }) {
    const response = await this.axiosInstance.post('/api/location/update', data);
    return response.data;
  }

  // Health check
  async healthCheck() {
    const response = await this.axiosInstance.get('/health');
    return response.data;
  }

  // Place endpoints
  async getPlaceRecommendations(limit: number = 10) {
    const response = await this.axiosInstance.get(`/api/place/recommendations?limit=${limit}`);
    return response.data;
  }

  // Concert endpoints
  async getConcertRecommendations(limit: number = 10) {
    const response = await this.axiosInstance.get(`/api/concert/recommendations?limit=${limit}`);
    return response.data;
  }

  async fetchConcerts(latitude: number, longitude: number, radiusMiles: number = 25) {
    const response = await this.axiosInstance.post('/api/concert/fetch', {
      latitude,
      longitude,
      radius_miles: radiusMiles,
    });
    return response.data;
  }

  // Heatmap endpoints
  async getHeatmapData() {
    const response = await this.axiosInstance.get('/api/location/heatmap');
    return response.data;
  }

  // Friend endpoints
  async sendFriendRequest(username: string) {
    const response = await this.axiosInstance.post('/api/friends/request', {
      username: username,
    });
    return response.data;
  }

  async acceptFriendRequest(friendshipId: number) {
    const response = await this.axiosInstance.post(`/api/friends/${friendshipId}/accept`);
    return response.data;
  }

  async declineFriendRequest(friendshipId: number) {
    const response = await this.axiosInstance.post(`/api/friends/${friendshipId}/decline`);
    return response.data;
  }

  async getFriendsList() {
    const response = await this.axiosInstance.get('/api/friends');
    return response.data;
  }

  async getPendingRequests() {
    const response = await this.axiosInstance.get('/api/friends/pending');
    return response.data;
  }

  async getSentRequests() {
    const response = await this.axiosInstance.get('/api/friends/sent');
    return response.data;
  }

  async removeFriend(friendshipId: number) {
    const response = await this.axiosInstance.delete(`/api/friends/${friendshipId}`);
    return response.data;
  }

  // User search endpoints
  async searchUsers(query: string) {
    const response = await this.axiosInstance.get(`/api/users/search?q=${encodeURIComponent(query)}`);
    return response.data;
  }

  // Post endpoints (Social Feed)
  async createPost(data: {
    content: string;
    latitude: number;
    longitude: number;
  }) {
    const response = await this.axiosInstance.post('/api/posts', data);
    return response.data;
  }

  async getFeed(params: {
    latitude: number;
    longitude: number;
    radius?: number;
    limit?: number;
    offset?: number;
  }) {
    const queryParams = new URLSearchParams({
      latitude: params.latitude.toString(),
      longitude: params.longitude.toString(),
      ...(params.radius && { radius: params.radius.toString() }),
      ...(params.limit && { limit: params.limit.toString() }),
      ...(params.offset && { offset: params.offset.toString() }),
    });
    const response = await this.axiosInstance.get(`/api/posts/feed?${queryParams.toString()}`);
    return response.data;
  }

  async getPost(postId: string) {
    const response = await this.axiosInstance.get(`/api/posts/${postId}`);
    return response.data;
  }

  async deletePost(postId: string) {
    const response = await this.axiosInstance.delete(`/api/posts/${postId}`);
    return response.data;
  }

  async voteOnPost(postId: string, voteType: number) {
    const response = await this.axiosInstance.post(`/api/posts/${postId}/vote`, {
      vote_type: voteType,
    });
    return response.data;
  }

  async createReply(postId: string, content: string) {
    const response = await this.axiosInstance.post(`/api/posts/${postId}/replies`, {
      content,
    });
    return response.data;
  }

  async deleteReply(replyId: string) {
    const response = await this.axiosInstance.delete(`/api/posts/replies/${replyId}`);
    return response.data;
  }

  // Visit endpoints
  async getUserVisits() {
    const response = await this.axiosInstance.get('/api/visits');
    return response.data;
  }

  // Rating endpoints
  async submitRating(data: {
    session_id: string;
    place_id: string;
    rating: number;
  }) {
    const response = await this.axiosInstance.post('/api/rating', data);
    return response.data;
  }

  // Notification endpoints
  async getNotifications(limit: number = 50) {
    const response = await this.axiosInstance.get(`/api/notifications?limit=${limit}`);
    return response.data;
  }

  async getUnreadCount() {
    const response = await this.axiosInstance.get('/api/notifications/unread/count');
    return response.data;
  }

  async markNotificationAsRead(notificationId: string) {
    const response = await this.axiosInstance.post('/api/notifications/read', {
      notification_id: notificationId,
    });
    return response.data;
  }

  async markAllNotificationsAsRead() {
    const response = await this.axiosInstance.post('/api/notifications/read/all');
    return response.data;
  }

  async deleteNotification(notificationId: string) {
    const response = await this.axiosInstance.post('/api/notifications/delete', {
      notification_id: notificationId,
    });
    return response.data;
  }

}

export default ApiClient;