import { useMemo } from 'react';

export type BusinessLevel = 'quiet' | 'moderate' | 'busy' | 'very busy' | 'unknown';

export interface BusinessInfo {
  level: BusinessLevel;
  userCount: number;
  description: string;
  color: string;
}

/**
 * Hook to calculate how busy a place is based on heatmap data
 * Counts how many users from the heatmap are currently near the place location
 * @param heatmapData - GeoJSON heatmap data with user locations
 * @param placeLat - Latitude of the place
 * @param placeLong - Longitude of the place
 * @param radiusMeters - Radius to check for nearby users (default 100m)
 * @returns BusinessInfo with level, user count, and description
 */
export const useBusinessLevel = (
  heatmapData: any,
  placeLat: number,
  placeLong: number,
  radiusMeters: number = 100
): BusinessInfo => {
  return useMemo(() => {
    if (!heatmapData || !heatmapData.features || heatmapData.features.length === 0) {
      return {
        level: 'unknown',
        userCount: 0,
        description: 'No activity data',
        color: '#9CA3AF', // gray
      };
    }

    // Calculate distance between two coordinates using Haversine formula
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const R = 6371e3; // Earth's radius in meters
      const φ1 = (lat1 * Math.PI) / 180;
      const φ2 = (lat2 * Math.PI) / 180;
      const Δφ = ((lat2 - lat1) * Math.PI) / 180;
      const Δλ = ((lon2 - lon1) * Math.PI) / 180;

      const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      return R * c; // Distance in meters
    };

    // Count users within radius of the place
    let nearbyUsers = 0;

    for (const feature of heatmapData.features) {
      if (feature.geometry && feature.geometry.coordinates) {
        const [userLon, userLat] = feature.geometry.coordinates;
        const distance = calculateDistance(placeLat, placeLong, userLat, userLon);

        if (distance <= radiusMeters) {
          nearbyUsers++;
        }
      }
    }

    // Determine business level based on nearby user count
    let level: BusinessLevel;
    let description: string;
    let color: string;

    if (nearbyUsers === 0) {
      level = 'quiet';
      description = 'Very quiet';
      color = '#10B981'; // green
    } else if (nearbyUsers <= 3) {
      level = 'quiet';
      description = 'Quiet';
      color = '#10B981'; // green
    } else if (nearbyUsers <= 7) {
      level = 'moderate';
      description = 'Moderate';
      color = '#F59E0B'; // amber
    } else if (nearbyUsers <= 12) {
      level = 'busy';
      description = 'Busy';
      color = '#F97316'; // orange
    } else {
      level = 'very busy';
      description = 'Very busy';
      color = '#EF4444'; // red
    }

    return {
      level,
      userCount: nearbyUsers,
      description,
      color,
    };
  }, [heatmapData, placeLat, placeLong, radiusMeters]);
};
