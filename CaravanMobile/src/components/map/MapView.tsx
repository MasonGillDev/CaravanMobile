import MapboxGL from "@rnmapbox/maps";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  ScrollView,
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
import { PlaceRecommendation } from "../../services/api/placeService";
import LocationService from "../../services/location/locationService";
import { theme } from "../../styles/theme";

// Set the access token
MapboxGL.setAccessToken(MAPBOX_ACCESS_TOKEN);

const { width: screenWidth } = Dimensions.get("window");

interface MapViewProps {
  selectedPlace?: PlaceRecommendation | null;
  onLocationUpdate?: (location: {
    latitude: number;
    longitude: number;
  }) => void;
}

export const MapView: React.FC<MapViewProps> = ({
  selectedPlace,
  onLocationUpdate,
}) => {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null
  );
  const [isMapReady, setIsMapReady] = useState(false);
  const [showPlaceDetails, setShowPlaceDetails] = useState(false);
  const cameraRef = useRef<MapboxGL.Camera>(null);
  const mapRef = useRef<MapboxGL.MapView>(null);
  const detailsCardOpacity = useRef(new Animated.Value(0)).current;

  const dismissPlaceDetails = () => {
    Animated.timing(detailsCardOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowPlaceDetails(false);
      // Also clear the selected place to remove the marker
      // This will be handled by the parent component
    });
  };

  const recenterOnUser = () => {
    if (userLocation) {
      cameraRef.current?.setCamera({
        centerCoordinate: userLocation,
        zoomLevel: DEFAULT_MAP_CONFIG.zoomLevel,
        animationDuration: DEFAULT_MAP_CONFIG.animationDuration,
      });
    }
  };

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
  }, []);

  // Handle selected place changes
  useEffect(() => {
    if (selectedPlace) {
      const placeCoords: [number, number] = [
        selectedPlace.long,
        selectedPlace.lat,
      ];

      // Center map on selected place with closer zoom
      cameraRef.current?.setCamera({
        centerCoordinate: placeCoords,
        zoomLevel: 15,
        animationDuration: 1000,
      });

      // Show place details with animation
      setShowPlaceDetails(true);
      Animated.timing(detailsCardOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // Hide place details
      Animated.timing(detailsCardOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => setShowPlaceDetails(false));
    }
  }, [selectedPlace]);

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

  if (!isMapReady && !userLocation) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapboxGL.MapView
        ref={mapRef}
        style={styles.map}
        styleURL={MAPBOX_STYLE_URLS.dark}
        onDidFinishLoadingMap={() => setIsMapReady(true)}
        compassEnabled={DEFAULT_MAP_CONFIG.compassEnabled}
        pitchEnabled={DEFAULT_MAP_CONFIG.pitchEnabled}
        rotateEnabled={DEFAULT_MAP_CONFIG.rotateEnabled}
        logoEnabled={false}
        attributionEnabled={false}
      >
        <MapboxGL.Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: userLocation || [-118.2437, 34.0522], // LA default
            zoomLevel: DEFAULT_MAP_CONFIG.zoomLevel,
          }}
        />

        <MapboxGL.UserLocation
          visible={true}
          onUpdate={handleUserLocationUpdate}
          showsUserHeadingIndicator={true}
        />

        {/* Selected Place Marker - only shows when place details are visible */}
        {showPlaceDetails && selectedPlace && (
          <MapboxGL.MarkerView
            id="selectedPlace"
            coordinate={[selectedPlace.long, selectedPlace.lat]}
          >
            <View style={styles.markerContainer}>
              <View style={styles.marker}>
                <Text style={styles.markerEmoji}>📍</Text>
              </View>
              <View style={styles.markerPulse} />
            </View>
          </MapboxGL.MarkerView>
        )}
      </MapboxGL.MapView>

      {/* Recenter button */}
      <TouchableOpacity style={styles.recenterButton} onPress={recenterOnUser}>
        <Text style={styles.recenterIcon}>📍</Text>
      </TouchableOpacity>

      {/* Place Details Card with Dismissible Overlay */}
      {showPlaceDetails && selectedPlace && (
        <>
          {/* Invisible overlay to dismiss card when tapped */}
          <TouchableOpacity
            style={styles.dismissOverlay}
            activeOpacity={1}
            onPress={dismissPlaceDetails}
          />

          <Animated.View
            style={[
              styles.placeDetailsCard,
              {
                opacity: detailsCardOpacity,
                transform: [
                  {
                    translateY: detailsCardOpacity.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.detailsScroll}
              contentContainerStyle={styles.detailsContent}
            >
              <Text style={styles.placeName}>{selectedPlace.name}</Text>
              <Text style={styles.placeAddress}>{selectedPlace.address}</Text>
              <Text style={styles.placeCity}>
                {selectedPlace.city}, {selectedPlace.state}
              </Text>

              <View style={styles.placeInfo}>
                {selectedPlace.rating && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Rating</Text>
                    <Text style={styles.infoValue}>
                      ⭐ {selectedPlace.rating}
                    </Text>
                  </View>
                )}

                {selectedPlace.price && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Price</Text>
                    <Text style={styles.infoValue}>{selectedPlace.price}</Text>
                  </View>
                )}

                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Match</Text>
                  <Text style={styles.infoValue}>
                    {Math.round(selectedPlace.similarity * 100)}%
                  </Text>
                </View>
              </View>

              {selectedPlace.hours && (
                <View style={styles.hoursSection}>
                  <Text style={styles.hoursLabel}>Hours</Text>
                  <Text style={styles.hoursText}>{selectedPlace.hours}</Text>
                </View>
              )}

              <TouchableOpacity style={styles.directionsButton}>
                <Text style={styles.directionsButtonText}>Get Directions</Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </>
      )}
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
  recenterButton: {
    position: "absolute",
    bottom: 150,
    right: 20,
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
  },
  recenterIcon: {
    fontSize: 24,
  },
  markerContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 60,
    height: 60,
  },
  marker: {
    backgroundColor: theme.colors.white,
    borderRadius: 25,
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  markerEmoji: {
    fontSize: 28,
  },
  markerPulse: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primary,
    opacity: 0.3,
  },
  dismissOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
  },
  placeDetailsCard: {
    position: "absolute",
    bottom: 400,
    left: 20,
    right: 20,
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    maxHeight: 250,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  detailsScroll: {
    maxHeight: 280,
  },
  detailsContent: {
    paddingBottom: theme.spacing.sm,
  },
  placeName: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
  },
  placeAddress: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray[600],
    marginBottom: theme.spacing.xs,
  },
  placeCity: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[500],
    marginBottom: theme.spacing.md,
  },
  placeInfo: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: theme.spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.gray[200],
    marginBottom: theme.spacing.md,
  },
  infoItem: {
    alignItems: "center",
  },
  infoLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray[500],
    marginBottom: theme.spacing.xs,
    textTransform: "uppercase",
  },
  infoValue: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.dark,
  },
  hoursSection: {
    marginBottom: theme.spacing.md,
  },
  hoursLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
  },
  hoursText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[600],
    lineHeight: 20,
  },
  directionsButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: "center",
    marginTop: theme.spacing.sm,
  },
  directionsButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
  },
});

export default MapView;
