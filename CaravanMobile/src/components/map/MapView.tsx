import { MaterialCommunityIcons } from "@expo/vector-icons";
import MapboxGL from "@rnmapbox/maps";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  DEFAULT_MAP_CONFIG,
  MAPBOX_ACCESS_TOKEN,
  MAPBOX_STYLE_URLS,
} from "../../config/mapbox";
import ApiClient from "../../services/api/apiClient";
import { PlaceRecommendation } from "../../services/api/placeService";
import LocationService from "../../services/location/locationService";
import { theme } from "../../styles/theme";
import { PlaceInfoPin } from "../place/PlaceInfoPin";

// Set the access token
MapboxGL.setAccessToken(MAPBOX_ACCESS_TOKEN);

const { width: screenWidth } = Dimensions.get("window");

interface MapViewProps {
  selectedPlace?: PlaceRecommendation | null;
  onLocationUpdate?: (location: {
    latitude: number;
    longitude: number;
  }) => void;
  onClearSelectedPlace?: () => void;
}

export const MapView: React.FC<MapViewProps> = ({
  selectedPlace,
  onLocationUpdate,
  onClearSelectedPlace,
}) => {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null
  );
  const [isMapReady, setIsMapReady] = useState(false);
  const [showPlaceDetails, setShowPlaceDetails] = useState(false);
  const [heatmapData, setHeatmapData] = useState<any>(null);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [similarityThreshold, setSimilarityThreshold] = useState(0); // 0 = show all, 1 = only very similar
  const cameraRef = useRef<MapboxGL.Camera>(null);
  const mapRef = useRef<MapboxGL.MapView>(null);
  const sliderHeight = 120; // Height of the slider bar
  const sliderStartThreshold = useRef(0); // Track threshold when drag starts
  const apiClient = ApiClient.getInstance();

  const recenterOnUser = () => {
    // Clear selected place when recentering
    if (onClearSelectedPlace) {
      onClearSelectedPlace();
    }

    if (userLocation) {
      cameraRef.current?.setCamera({
        centerCoordinate: userLocation,
        zoomLevel: DEFAULT_MAP_CONFIG.zoomLevel,
        animationDuration: DEFAULT_MAP_CONFIG.animationDuration,
      });
    }
  };

  // Pan responder for draggable slider
  const sliderPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        // Save the starting threshold when user touches slider
        sliderStartThreshold.current = similarityThreshold;
      },
      onPanResponderMove: (_, gestureState) => {
        // Calculate new threshold based on vertical drag distance
        // Negative dy = dragging up = increase threshold
        // Positive dy = dragging down = decrease threshold
        const offsetRatio = -gestureState.dy / sliderHeight;
        const newThreshold = Math.max(0, Math.min(1, sliderStartThreshold.current + offsetRatio));
        setSimilarityThreshold(newThreshold);
      },
      onPanResponderRelease: () => {
        // User released the slider - threshold is already set
      },
    })
  ).current;

  const fetchHeatmapData = async () => {
    try {
      const data = await apiClient.getHeatmapData();
      setHeatmapData(data);
      console.log('Heatmap data updated:', data.features?.length || 0, 'users');
    } catch (error: any) {
      // Silently fail - user might not have embedding yet
      if (error.response?.status !== 400) {
        console.log('Failed to fetch heatmap data:', error.message);
      }
    }
  };

  // Filter heatmap data based on similarity threshold
  const filteredHeatmapData = React.useMemo(() => {
    if (!heatmapData || !heatmapData.features) {
      return heatmapData;
    }

    // Filter features based on similarity threshold
    const filteredFeatures = heatmapData.features.filter((feature: any) => {
      const similarity = feature.properties?.similarity;
      // If no similarity score, show it when threshold is 0
      if (similarity === undefined || similarity === null) {
        return similarityThreshold === 0;
      }
      // Filter based on threshold
      return similarity >= similarityThreshold;
    });

    console.log(`Filtered heatmap: ${filteredFeatures.length}/${heatmapData.features.length} users (threshold: ${(similarityThreshold * 100).toFixed(1)}%)`);

    return {
      ...heatmapData,
      features: filteredFeatures,
    };
  }, [heatmapData, similarityThreshold]);

  useEffect(() => {
    // Get initial location
    const setupLocation = async () => {
      const locationService = LocationService.getInstance();
      const location = await locationService.getCurrentLocation();

      if (location) {
        const coords: [number, number] = [
          location.longitude,
          location.latitude,
        ];
        setUserLocation(coords);

        // Center map on user location
        cameraRef.current?.setCamera({
          centerCoordinate: coords,
          zoomLevel: DEFAULT_MAP_CONFIG.zoomLevel,
          animationDuration: DEFAULT_MAP_CONFIG.animationDuration,
        });

        if (onLocationUpdate) {
          onLocationUpdate({
            latitude: location.latitude,
            longitude: location.longitude,
          });
        }
      }
    };

    setupLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Handle selected place changes
  useEffect(() => {
    if (selectedPlace) {
      const placeCoords: [number, number] = [
        selectedPlace.long,
        selectedPlace.lat,
      ];

      // Show place details immediately
      setShowPlaceDetails(true);

      // Center map on selected place with closer zoom
      // Add small delay to ensure map is ready
      setTimeout(() => {
        cameraRef.current?.setCamera({
          centerCoordinate: placeCoords,
          zoomLevel: 15,
          animationDuration: 1000,
        });
      }, 100);
    } else {
      // Hide place details
      setShowPlaceDetails(false);
    }
  }, [selectedPlace]);

  // Fetch heatmap data periodically
  useEffect(() => {
    // Fetch immediately on mount
    fetchHeatmapData();

    // Set up polling every 30 seconds
    const interval = setInterval(() => {
      fetchHeatmapData();
    }, 30000);

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, []);

  const handleUserLocationUpdate = (location: MapboxGL.Location) => {
    const coords: [number, number] = [
      location.coords.longitude,
      location.coords.latitude,
    ];
    setUserLocation(coords);

    if (onLocationUpdate) {
      onLocationUpdate({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    }
  };

  return (
    <View style={styles.container}>
      <MapboxGL.MapView
        ref={mapRef}
        style={styles.map}
        styleURL={MAPBOX_STYLE_URLS.streets}
        onDidFinishLoadingMap={() => {
          console.log('Map finished loading!');
          setIsMapReady(true);
        }}
        onMapLoadingError={() => {
          console.error('Map loading error - Mapbox failed to initialize');
        }}
        compassEnabled={DEFAULT_MAP_CONFIG.compassEnabled}
        pitchEnabled={DEFAULT_MAP_CONFIG.pitchEnabled}
        rotateEnabled={DEFAULT_MAP_CONFIG.rotateEnabled}
        logoEnabled={false}
        attributionEnabled={false}
      >
        <MapboxGL.Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: userLocation || [-81.851675, 41.481933], // Default to user's approximate location
            zoomLevel: DEFAULT_MAP_CONFIG.zoomLevel,
          }}
        />

        <MapboxGL.UserLocation
          visible={true}
          onUpdate={handleUserLocationUpdate}
          showsUserHeadingIndicator={true}
        />

        {/* Heatmap Layer - shows other users with similarity-based intensity */}
        {showHeatmap && filteredHeatmapData && filteredHeatmapData.features && filteredHeatmapData.features.length > 0 && (
          <MapboxGL.ShapeSource
            id="heatmapSource"
            shape={filteredHeatmapData}
          >
            <MapboxGL.HeatmapLayer
              id="heatmapLayer"
              sourceID="heatmapSource"
              style={{
                heatmapRadius: [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  0, 6,
                  9, 25,
                  15, 50,
                ],
                heatmapWeight: [
                  'interpolate',
                  ['linear'],
                  ['get', 'similarity'],
                  0, 0.3,
                  0.5, 0.6,
                  1, 1,
                ],
                heatmapIntensity: [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  0, 0.8,
                  9, 1.2,
                  15, 1.8,
                ],
                heatmapColor: [
                  'interpolate',
                  ['linear'],
                  ['heatmap-density'],
                  0, 'rgba(33,102,172,0)',
                  0.2, 'rgb(103,169,207)',
                  0.4, 'rgb(209,229,240)',
                  0.6, 'rgb(253,219,199)',
                  0.8, 'rgb(239,138,98)',
                  1, 'rgb(178,24,43)',
                ],
                heatmapOpacity: 0.6,
              }}
            />
          </MapboxGL.ShapeSource>
        )}

        {/* Selected Place Marker with Info Pin */}
        {showPlaceDetails && selectedPlace && (
          <MapboxGL.MarkerView
            id="selectedPlace"
            coordinate={[selectedPlace.long, selectedPlace.lat]}
            anchor={{ x: 0.5, y: 1 }}
          >
            <PlaceInfoPin place={selectedPlace} heatmapData={heatmapData} />
          </MapboxGL.MarkerView>
        )}
      </MapboxGL.MapView>

      {/* Heatmap Controls - Integrated Slider with Toggle */}
      <View style={styles.heatmapControlsContainer}>
        {/* Recenter button - positioned above heatmap toggle */}
        <TouchableOpacity style={styles.recenterButton} onPress={recenterOnUser}>
          <MaterialCommunityIcons
            name="crosshairs-gps"
            size={28}
            color={theme.colors.primary}
          />
        </TouchableOpacity>
        {/* Heatmap toggle button */}
        <TouchableOpacity
          style={[styles.heatmapToggleButton, !showHeatmap && styles.heatmapToggleButtonOff]}
          onPress={() => setShowHeatmap(!showHeatmap)}
        >
          <Text style={[styles.heatmapToggleText, !showHeatmap && styles.heatmapToggleTextOff]}>
            {showHeatmap ? 'HEAT' : 'OFF'}
          </Text>
        </TouchableOpacity>

        {/* Similarity Filter Slider */}
        {showHeatmap && (
          <View style={styles.similarityFilterContainer}>
            {/* Vertical bar - Draggable (wider touch area) */}
            <View
              style={styles.verticalSliderBar}
              {...sliderPanResponder.panHandlers}
            >
              <View style={styles.verticalSliderBarInner}>
                <View
                  style={[
                    styles.verticalSliderFill,
                    {
                      height: `${similarityThreshold * 100}%`,
                      // Interpolate between accent (0, 78, 137) and primary (255, 107, 53)
                      backgroundColor: `rgb(${Math.round(0 + 255 * similarityThreshold)}, ${Math.round(78 + 29 * similarityThreshold)}, ${Math.round(137 - 84 * similarityThreshold)})`,
                    },
                  ]}
                />
              </View>
              <View
                style={[
                  styles.verticalSliderThumb,
                  {
                    top: `${(1 - similarityThreshold) * 100}%`,
                    // Interpolate between accent (0, 78, 137) and primary (255, 107, 53)
                    borderColor: `rgb(${Math.round(0 + 255 * similarityThreshold)}, ${Math.round(78 + 29 * similarityThreshold)}, ${Math.round(137 - 84 * similarityThreshold)})`,
                  },
                ]}
              />
            </View>
          </View>
        )}
      </View>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
  
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.dark,
  },
  loadingText: {
    marginTop: 16,
    color: theme.colors.white,
    fontSize: 16,
  },
  heatmapControlsContainer: {
    position: "absolute",
    left: 16,
    top: "50%",
    marginTop: -120,
    alignItems: "center",
  },
  recenterButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.white,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    marginBottom: 16,
  },
  heatmapToggleButton: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
    
  },
  heatmapToggleButtonOff: {
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderColor: theme.colors.gray[400],
  },
  heatmapToggleText: {
    fontSize: 11,
    fontWeight: "800",
    color: theme.colors.primary,
    letterSpacing: 0.5,
  },
  heatmapToggleTextOff: {
    color: theme.colors.gray[500],
  },
  similarityFilterContainer: {
    alignItems: "center",
  },
  verticalSliderBar: {
    width: 28,
    height: 120,
    backgroundColor: "transparent",
    borderRadius: 4,
    position: "relative",
    overflow: "visible",
    justifyContent: "center",
    alignItems: "center",
  },
  verticalSliderBarInner: {
    width: 8,
    height: "100%",
    backgroundColor: theme.colors.gray[300],
    borderRadius: 4,
    position: "relative",
  },
  verticalSliderFill: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    borderRadius: 4,
    // backgroundColor applied dynamically based on threshold
  },
  verticalSliderThumb: {
    position: "absolute",
    left: "50%",
    marginLeft: -12,
    marginTop: -12, // Center the thumb vertically on the track
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.white,
    borderWidth: 3,
    borderColor: theme.colors.primary, // Will be overridden dynamically
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
});

export default MapView;
