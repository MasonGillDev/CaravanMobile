import * as Location from 'expo-location';
import { AppState, AppStateStatus, EmitterSubscription } from 'react-native';
import ApiClient from '../api/apiClient';
import VisitMonitoring, { VisitData } from './VisitMonitoring';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

/**
 * Hybrid location tracking service using CLVisit architecture
 * - Background: Visit monitoring via CLVisit (low power, arrival/departure events)
 * - Foreground: Precise location tracking when app is focused
 * - Smart queuing for offline scenarios
 */
class LocationService {
  private static instance: LocationService;
  private apiClient: ApiClient;
  private visitMonitoring: VisitMonitoring;
  private locationSubscription: Location.LocationSubscription | null = null;
  private visitEventSubscription: EmitterSubscription | null = null;
  private isVisitMonitoringActive: boolean = false;
  private isForegroundTrackingActive: boolean = false;
  private lastSentLocation: LocationData | null = null;
  private updateQueue: LocationData[] = [];
  private isFlushing: boolean = false;
  private appStateSubscription: any = null;

  // Configuration for foreground precise tracking
  private readonly FOREGROUND_MIN_DISTANCE_METERS = 10; // Increased precision when app is focused
  private readonly FOREGROUND_UPDATE_INTERVAL_MS = 10000; // Check every 10 seconds in foreground
  private readonly FOREGROUND_ACCURACY_THRESHOLD = 10; // 10m accuracy threshold for foreground

  private constructor() {
    this.apiClient = ApiClient.getInstance();
    this.visitMonitoring = VisitMonitoring.getInstance();
  }

  static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  /**
   * Request location permissions
   * NOTE: Native CLVisit module handles permission requests
   * We only check here, don't request to avoid downgrading "Always" to "When In Use"
   */
  async requestPermissions(): Promise<boolean> {
    try {
      // Just check status, don't request
      // Native module already requested "Always" permission
      const { status } = await Location.getForegroundPermissionsAsync();

      if (status === 'granted') {
        console.log('Location permission already granted');
        return true;
      }

      console.log('Location permission not granted - native module will handle');
      return true; // Return true anyway, native module handles it
    } catch (error) {
      console.error('Error checking location permissions:', error);
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
   * Start tracking location (both visit monitoring and app state handling)
   */
  async startTracking(): Promise<boolean> {
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
      // Clean up old Expo background task if it exists (migration cleanup)
      await this.cleanupOldBackgroundTask();

      // Start visit monitoring (always running in background)
      await this.startVisitMonitoring();

      // Set up app state listener for foreground tracking
      this.setupAppStateListener();

      // If app is currently active, start foreground tracking
      if (AppState.currentState === 'active') {
        await this.startForegroundTracking();
      }

      console.log('Location tracking initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to start location tracking:', error);
      return false;
    }
  }

  /**
   * Clean up old Expo background task (migration from old implementation)
   */
  private async cleanupOldBackgroundTask(): Promise<void> {
    try {
      const TaskManager = require('expo-task-manager');
      const VISIT_MONITORING_TASK = 'VISIT_MONITORING_TASK';

      const isRegistered = await TaskManager.isTaskRegisteredAsync(VISIT_MONITORING_TASK);
      if (isRegistered) {
        console.log('Cleaning up old Expo background task...');
        await Location.stopLocationUpdatesAsync(VISIT_MONITORING_TASK);
        console.log('Old background task removed');
      }
    } catch (error) {
      // Ignore errors - task might not exist
      console.log('No old background task to clean up');
    }
  }

  /**
   * Start background visit monitoring using native CLVisit
   */
  private async startVisitMonitoring(): Promise<void> {
    if (this.isVisitMonitoringActive) {
      console.log('Visit monitoring already active');
      return;
    }

    try {
      // Check if native visit monitoring is available (iOS only)
      if (!this.visitMonitoring.isAvailable()) {
        console.warn('Native visit monitoring not available (iOS only)');
        return;
      }

      // Set up visit event listener
      this.visitEventSubscription = this.visitMonitoring.addVisitListener((visit: VisitData) => {
        this.handleVisitDetected(visit);
      });

      // Listen for authorization changes to know when to start monitoring
      this.visitMonitoring.addAuthorizationListener((event) => {
        console.log('[LocationService] Auth status changed to:', event.status);

        if (event.status === 'authorizedAlways' && !this.isVisitMonitoringActive) {
          // Permission granted! Now we can start monitoring
          this.visitMonitoring.startMonitoring()
            .then(() => {
              this.isVisitMonitoringActive = true;
              console.log('✅ Native CLVisit monitoring started after permission granted');
            })
            .catch((error) => {
              console.error('Failed to start visit monitoring after permission granted:', error);
            });
        }
      });

      // Request always authorization
      await this.visitMonitoring.requestAlwaysAuthorization();

      // Small delay to let permission status propagate, then check if already granted
      setTimeout(async () => {
        // Check current permission via expo-location (native module status may not be immediately available)
        const { status } = await Location.getBackgroundPermissionsAsync();
        console.log('[LocationService] Checking permission after request, background status:', status);

        if (status === 'granted' && !this.isVisitMonitoringActive) {
          // Permission already granted (e.g., from previous install)
          console.log('[LocationService] Permission already granted, starting monitoring now');
          try {
            await this.visitMonitoring.startMonitoring();
            this.isVisitMonitoringActive = true;
            console.log('✅ Native CLVisit monitoring started with existing permission');
          } catch (error) {
            console.error('Failed to start visit monitoring with existing permission:', error);
          }
        }
      }, 500);

      console.log('Visit monitoring setup complete');
    } catch (error) {
      console.error('Failed to start visit monitoring:', error);
      throw error;
    }
  }

  /**
   * Handle visit detection from native module
   */
  private async handleVisitDetected(visit: VisitData): Promise<void> {
    console.log('[VisitDetected]', {
      lat: visit.latitude.toFixed(6),
      lng: visit.longitude.toFixed(6),
      accuracy: visit.horizontalAccuracy,
      arrival: visit.arrivalDate,
      departure: visit.departureDate,
    });

    try {
      const visitData = {
        latitude: visit.latitude,
        longitude: visit.longitude,
        horizontal_accuracy: visit.horizontalAccuracy,
        arrival_date: visit.arrivalDate,
        departure_date: visit.departureDate,
      };

      const response = await this.apiClient.submitVisit(visitData);
      console.log('[VisitDetected] Submitted successfully:', response);
    } catch (error: any) {
      console.error('[VisitDetected] Failed to submit visit:', error?.message || error);
    }
  }

  /**
   * Start precise foreground location tracking
   */
  private async startForegroundTracking(): Promise<void> {
    if (this.isForegroundTrackingActive) {
      console.log('Foreground tracking already active');
      return;
    }

    try {
      console.log('Starting foreground location tracking...');

      // Check if we have location permission (granted by native module)
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Waiting for location permission from native module...');
        // Permission will be granted by native module, skip foreground tracking for now
        return;
      }

      // Get and send current location immediately
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const locationData: LocationData = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        accuracy: currentLocation.coords.accuracy,
      };

      await this.processLocation(locationData);

      // Start watching for location changes with increased precision
      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: this.FOREGROUND_UPDATE_INTERVAL_MS,
          distanceInterval: this.FOREGROUND_MIN_DISTANCE_METERS,
        },
        (location) => {
          this.handleLocationUpdate(location);
        }
      );

      this.isForegroundTrackingActive = true;
      console.log('Foreground tracking started');
    } catch (error) {
      console.error('Failed to start foreground tracking:', error);
    }
  }

  /**
   * Stop precise foreground location tracking
   */
  private async stopForegroundTracking(): Promise<void> {
    if (!this.isForegroundTrackingActive) {
      return;
    }

    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
    }

    this.isForegroundTrackingActive = false;
    console.log('Foreground tracking stopped');
  }

  /**
   * Set up app state listener to start/stop foreground tracking
   */
  private setupAppStateListener(): void {
    if (this.appStateSubscription) {
      return; // Already set up
    }

    this.appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      console.log('App state changed to:', nextAppState);

      if (nextAppState === 'active') {
        // App came to foreground - start precise tracking
        console.log('App foregrounded - starting precise location tracking');
        this.startForegroundTracking();
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        // App went to background - stop precise tracking (visit monitoring continues)
        console.log('App backgrounded - stopping precise location tracking');
        this.stopForegroundTracking();
      }
    });

    console.log('App state listener registered');
  }

  /**
   * Stop all location tracking
   */
  async stopTracking(): Promise<void> {
    // Stop foreground tracking
    await this.stopForegroundTracking();

    // Stop visit monitoring
    if (this.isVisitMonitoringActive) {
      try {
        await this.visitMonitoring.stopMonitoring();

        if (this.visitEventSubscription) {
          this.visitEventSubscription.remove();
          this.visitEventSubscription = null;
        }

        this.isVisitMonitoringActive = false;
        console.log('Native visit monitoring stopped');
      } catch (error) {
        console.error('Error stopping visit monitoring:', error);
      }
    }

    // Remove app state listener
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    console.log('All location tracking stopped');
  }

  /**
   * Handle location updates from the foreground watcher
   */
  private async handleLocationUpdate(location: Location.LocationObject): Promise<void> {
    // Ignore if accuracy is too poor for foreground tracking
    if (location.coords.accuracy && location.coords.accuracy > this.FOREGROUND_ACCURACY_THRESHOLD) {
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

    return distance >= this.FOREGROUND_MIN_DISTANCE_METERS;
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
    return this.isVisitMonitoringActive || this.isForegroundTrackingActive;
  }

  /**
   * Check if visit monitoring is active
   */
  isVisitTrackingActive(): boolean {
    return this.isVisitMonitoringActive;
  }

  /**
   * Check if foreground tracking is active
   */
  isForegroundActive(): boolean {
    return this.isForegroundTrackingActive;
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