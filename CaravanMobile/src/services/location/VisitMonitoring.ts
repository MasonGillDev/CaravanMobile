import { NativeModules, NativeEventEmitter, EmitterSubscription } from 'react-native';

interface VisitData {
  latitude: number;
  longitude: number;
  horizontalAccuracy: number;
  arrivalDate: string; // ISO 8601 string
  departureDate: string | null; // null if visit is ongoing
}

interface AuthorizationChangeEvent {
  status: 'notDetermined' | 'restricted' | 'denied' | 'authorizedAlways' | 'authorizedWhenInUse' | 'unknown';
}

interface ErrorEvent {
  error: string;
}

const { VisitMonitoringModule } = NativeModules;

if (!VisitMonitoringModule) {
  console.warn('VisitMonitoringModule is not available. Make sure you are running on iOS with the native module installed.');
}

const visitMonitoringEmitter = VisitMonitoringModule ? new NativeEventEmitter(VisitMonitoringModule) : null;

/**
 * Native iOS CLVisit monitoring service
 * Provides true visit detection using iOS CoreLocation
 */
class VisitMonitoring {
  private static instance: VisitMonitoring;
  private visitSubscription: EmitterSubscription | null = null;
  private authSubscription: EmitterSubscription | null = null;
  private errorSubscription: EmitterSubscription | null = null;

  private constructor() {}

  static getInstance(): VisitMonitoring {
    if (!VisitMonitoring.instance) {
      VisitMonitoring.instance = new VisitMonitoring();
    }
    return VisitMonitoring.instance;
  }

  /**
   * Check if visit monitoring is available
   */
  isAvailable(): boolean {
    return VisitMonitoringModule != null;
  }

  /**
   * Request "Always Allow" location permission (required for visit monitoring)
   */
  async requestAlwaysAuthorization(): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Visit monitoring not available');
    }

    try {
      await VisitMonitoringModule.requestAlwaysAuthorization();
      console.log('[VisitMonitoring] Requested always authorization');
    } catch (error) {
      console.error('[VisitMonitoring] Failed to request authorization:', error);
      throw error;
    }
  }

  /**
   * Start monitoring visits
   */
  async startMonitoring(): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Visit monitoring not available');
    }

    try {
      await VisitMonitoringModule.startMonitoringVisits();
      console.log('[VisitMonitoring] Started monitoring visits');
    } catch (error) {
      console.error('[VisitMonitoring] Failed to start monitoring:', error);
      throw error;
    }
  }

  /**
   * Stop monitoring visits
   */
  async stopMonitoring(): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Visit monitoring not available');
    }

    try {
      await VisitMonitoringModule.stopMonitoringVisits();
      console.log('[VisitMonitoring] Stopped monitoring visits');
    } catch (error) {
      console.error('[VisitMonitoring] Failed to stop monitoring:', error);
      throw error;
    }
  }

  /**
   * Add listener for visit detection events
   */
  addVisitListener(callback: (visit: VisitData) => void): EmitterSubscription | null {
    if (!visitMonitoringEmitter) {
      console.warn('Visit monitoring emitter not available');
      return null;
    }

    this.visitSubscription = visitMonitoringEmitter.addListener('onVisitDetected', callback);
    return this.visitSubscription;
  }

  /**
   * Add listener for authorization changes
   */
  addAuthorizationListener(callback: (event: AuthorizationChangeEvent) => void): EmitterSubscription | null {
    if (!visitMonitoringEmitter) {
      console.warn('Visit monitoring emitter not available');
      return null;
    }

    this.authSubscription = visitMonitoringEmitter.addListener('onAuthorizationChanged', callback);
    return this.authSubscription;
  }

  /**
   * Add listener for errors
   */
  addErrorListener(callback: (event: ErrorEvent) => void): EmitterSubscription | null {
    if (!visitMonitoringEmitter) {
      console.warn('Visit monitoring emitter not available');
      return null;
    }

    this.errorSubscription = visitMonitoringEmitter.addListener('onError', callback);
    return this.errorSubscription;
  }

  /**
   * Remove all listeners
   */
  removeAllListeners(): void {
    if (this.visitSubscription) {
      this.visitSubscription.remove();
      this.visitSubscription = null;
    }

    if (this.authSubscription) {
      this.authSubscription.remove();
      this.authSubscription = null;
    }

    if (this.errorSubscription) {
      this.errorSubscription.remove();
      this.errorSubscription = null;
    }
  }
}

export default VisitMonitoring;
export type { VisitData, AuthorizationChangeEvent, ErrorEvent };
