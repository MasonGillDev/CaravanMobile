import * as Location from 'expo-location';
import ApiClient from '../api/apiClient';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

/**
 * Clean, simple location tracking service
 * - Single tracking mechanism using watchPositionAsync
 * - Handles both foreground and background updates
 * - Smart queuing for offline scenarios
 */
class LocationService {
  private static instance: LocationService;
  private apiClient: ApiClient;
  private locationSubscription: Location.LocationSubscription | null = null;
  private isTracking: boolean = false;
  private lastSentLocation: LocationData | null = null;
  private updateQueue: LocationData[] = [];
  private isFlushing: boolean = false;
  
  // Configuration
  private readonly MIN_DISTANCE_METERS = 30; // Only update if moved 30+ meters
  private readonly UPDATE_INTERVAL_MS = 300000; // Check every 30 seconds
  private readonly ACCURACY_THRESHOLD = 5; // Only use locations with accuracy better than 50m

  private constructor() {
    this.apiClient = ApiClient.getInstance();
  }

  static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  /**
   * Request location permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      // Request foreground permission first
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        console.log('Foreground location permission denied');
        return false;
      }

      // Optionally request background permission (iOS will show additional prompt)
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      console.log('Background permission status:', backgroundStatus);
      
      return true;
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return false;
    }
  }

  /**
   * Check current permission status
   */
  async hasPermission(): Promise<boolean> {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status === 'granted';
  }

  /**
   * Start tracking location
   */
  async startTracking(): Promise<boolean> {
    // Don't start if already tracking
    if (this.isTracking) {
      console.log('Location tracking already active');
      return true;
    }

    // Check permissions
    const hasPermission = await this.hasPermission();
    if (!hasPermission) {
      const granted = await this.requestPermissions();
      if (!granted) {
        console.log('Location permission not granted');
        return false;
      }
    }

    try {
      console.log('Starting location tracking...');
      
      // Get and send current location immediately
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      const locationData: LocationData = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        accuracy: currentLocation.coords.accuracy,
      };
      
      await this.processLocation(locationData);

      // Start watching for location changes
      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: this.UPDATE_INTERVAL_MS,
          distanceInterval: this.MIN_DISTANCE_METERS,
        },
        (location) => {
          this.handleLocationUpdate(location);
        }
      );

      this.isTracking = true;
      console.log('Location tracking started successfully');
      return true;
    } catch (error) {
      console.error('Failed to start location tracking:', error);
      return false;
    }
  }

  /**
   * Stop tracking location
   */
  async stopTracking(): Promise<void> {
    if (!this.isTracking) {
      return;
    }

    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
    }

    this.isTracking = false;
    console.log('Location tracking stopped');
  }

  /**
   * Handle location updates from the watcher
   */
  private async handleLocationUpdate(location: Location.LocationObject): Promise<void> {
    // Ignore if accuracy is too poor
    if (location.coords.accuracy && location.coords.accuracy > this.ACCURACY_THRESHOLD) {
      console.log(`Skipping location update - poor accuracy: ${location.coords.accuracy}m`);
      return;
    }

    const locationData: LocationData = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
    };

    await this.processLocation(locationData);
  }

  /**
   * Process and send location update
   */
  private async processLocation(location: LocationData): Promise<void> {
    // Check if location has changed significantly
    if (this.lastSentLocation && !this.hasLocationChangedSignificantly(location)) {
      console.log('Location hasn\'t changed significantly, skipping update');
      return;
    }

    // Add to queue
    this.updateQueue.push(location);
    
    // Try to send all queued locations
    await this.flushQueue();
  }

  /**
   * Send all queued location updates
   */
  private async flushQueue(): Promise<void> {
    // Prevent concurrent flushing
    if (this.isFlushing) {
      console.log('Queue flush already in progress, skipping');
      return;
    }
    
    this.isFlushing = true;
    
    try {
      while (this.updateQueue.length > 0) {
      const location = this.updateQueue[0];
      
      try {
        await this.apiClient.updateLocation({
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy || 0,
        });
        
        console.log('Location sent successfully:', {
          lat: location.latitude.toFixed(6),
          lng: location.longitude.toFixed(6),
          accuracy: location.accuracy?.toFixed(0),
        });
        
        // Update last sent location and remove from queue
        this.lastSentLocation = location;
        this.updateQueue.shift();
      } catch (error: any) {
        // If it's a 404 (user not found), remove from queue and skip
        if (error?.response?.status === 404) {
          console.error('User not found (404), removing from queue');
          this.updateQueue.shift(); // Remove the failed location
          continue; // Try next location in queue
        }
        
        // For other errors, log and stop trying
        console.error('Failed to send location:', error?.message || error);
        
        // Keep in queue for retry, but prevent queue from growing too large
        if (this.updateQueue.length > 10) {
          this.updateQueue = this.updateQueue.slice(-5); // Keep last 5
        }
        break; // Stop trying to send more if it's a network/server error
      }
    }
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * Check if location has changed enough to warrant an update
   */
  private hasLocationChangedSignificantly(newLocation: LocationData): boolean {
    if (!this.lastSentLocation) {
      return true;
    }

    const distance = this.calculateDistance(
      this.lastSentLocation.latitude,
      this.lastSentLocation.longitude,
      newLocation.latitude,
      newLocation.longitude
    );

    return distance >= this.MIN_DISTANCE_METERS;
  }

  /**
   * Calculate distance between two coordinates in meters
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Get current tracking status
   */
  isActive(): boolean {
    return this.isTracking;
  }

  /**
   * Get queue size (for debugging)
   */
  getQueueSize(): number {
    return this.updateQueue.length;
  }

  /**
   * Get current location once
   */
  async getCurrentLocation(): Promise<LocationData | null> {
    try {
      const hasPermission = await this.hasPermission();
      if (!hasPermission) {
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
      };
    } catch (error) {
      console.error('Failed to get current location:', error);
      return null;
    }
  }

  /**
   * Force send location immediately (used when app comes to foreground)
   * Bypasses distance checking and sends location right away
   */
  async sendLocationNow(location: LocationData): Promise<void> {
    console.log('Force sending location update (foreground)');
    
    // Update last sent location
    this.lastSentLocation = location;
    
    // Add to front of queue for immediate processing
    this.updateQueue.unshift(location);
    
    // Flush the queue immediately
    await this.flushQueue();
  }
}

export default LocationService;