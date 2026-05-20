import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import ApiClient from '../api/apiClient';

export const VISIT_MONITORING_TASK = 'VISIT_MONITORING_TASK';

/**
 * Background task for processing CLVisit location updates
 * This runs even when the app is backgrounded or terminated
 */
TaskManager.defineTask(VISIT_MONITORING_TASK, async ({ data, error }: any) => {
  if (error) {
    console.error('[VisitTask] Error:', error);
    return;
  }

  if (!data) {
    console.log('[VisitTask] No data received');
    return;
  }

  const { locations } = data as { locations: Location.LocationObject[] };

  if (!locations || locations.length === 0) {
    console.log('[VisitTask] No locations in update');
    return;
  }

  console.log('[VisitTask] Processing', locations.length, 'location(s)');

  try {
    const apiClient = ApiClient.getInstance();

    // Process each location as a visit
    for (const location of locations) {
      // iOS provides these extra fields for visit monitoring
      const coords = location.coords;

      // Create visit data
      const visitData = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        horizontal_accuracy: coords.accuracy || 0,
        arrival_date: new Date(location.timestamp).toISOString(),
        departure_date: null, // Initial visit report - no departure yet
      };

      console.log('[VisitTask] Submitting visit:', {
        lat: visitData.latitude.toFixed(6),
        lng: visitData.longitude.toFixed(6),
        accuracy: visitData.horizontal_accuracy,
        time: visitData.arrival_date,
      });

      try {
        await apiClient.submitVisit(visitData);
        console.log('[VisitTask] Visit submitted successfully');
      } catch (error: any) {
        console.error('[VisitTask] Failed to submit visit:', error?.message || error);
        // Continue processing other visits even if one fails
      }
    }
  } catch (error) {
    console.error('[VisitTask] Task processing error:', error);
  }
});
