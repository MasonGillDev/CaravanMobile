import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  AppStateStatus,
  Dimensions,
  PanResponder,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView from "../../components/map/MapView";
import { useAuth } from "../../context/AuthContext";
import ApiClient from "../../services/api/apiClient";
import { PlaceRecommendation } from "../../services/api/placeService";
import LocationService from "../../services/location/locationService";
import { theme } from "../../styles/theme";

const { height: screenHeight } = Dimensions.get("window");

// Define the collapsed and expanded positions
const COLLAPSED_HEIGHT = 180; // Height when collapsed - adjust this value
const EXPANDED_HEIGHT = screenHeight * 0.6; // Takes up 65% of screen when expanded

export const HomeScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const [recommendations, setRecommendations] = useState<PlaceRecommendation[]>(
    []
  );
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedPlace, setSelectedPlace] =
    useState<PlaceRecommendation | null>(null);
  const apiClient = ApiClient.getInstance();

  // Animation values
  const translateY = useRef(new Animated.Value(0)).current;

  // Pan responder for swipe gestures
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Activate when user swipes vertically
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        // Update position while dragging
        if (isExpanded && gestureState.dy > 0) {
          // Dragging down when expanded
          translateY.setValue(gestureState.dy);
        } else if (!isExpanded && gestureState.dy < 0) {
          // Dragging up when collapsed
          translateY.setValue(
            EXPANDED_HEIGHT - COLLAPSED_HEIGHT + gestureState.dy
          );
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        // Determine if we should expand or collapse based on gesture
        if (isExpanded) {
          if (gestureState.dy > 50 || gestureState.vy > 0.5) {
            // Collapse if dragged down enough or with velocity
            collapseContent();
          } else {
            // Spring back to expanded
            expandContent();
          }
        } else {
          if (gestureState.dy < -50 || gestureState.vy < -0.5) {
            // Expand if dragged up enough or with velocity
            expandContent();
          } else {
            // Spring back to collapsed
            collapseContent();
          }
        }
      },
    })
  ).current;

  const expandContent = () => {
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 50,
      friction: 10,
    }).start();
    setIsExpanded(true);
  };

  const collapseContent = () => {
    Animated.spring(translateY, {
      toValue: EXPANDED_HEIGHT - COLLAPSED_HEIGHT,
      useNativeDriver: true,
      tension: 50,
      friction: 10,
    }).start();
    setIsExpanded(false);
  };

  const handlePlaceSelect = (place: PlaceRecommendation) => {
    setSelectedPlace(place);
    // Collapse the content panel to show more of the map
    collapseContent();
  };

  useEffect(() => {
    // Only set up location and fetch data if user is authenticated
    if (!user) {
      console.log("User not ready, skipping location setup");
      return;
    }

    // Check and request location permission when home screen loads
    const setupLocation = async () => {
      // Add a small delay to ensure user is fully created in database
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const locationService = LocationService.getInstance();
      
      // Start tracking (it handles permissions internally)
      const started = await locationService.startTracking();
      if (!started) {
        console.log("Location tracking could not be started");
      }
    };

    setupLocation();
    fetchRecommendations();
  }, [user]);

  // Listen for app state changes to update location when coming to foreground
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && user) {
        console.log('App came to foreground, sending location update');
        
        const locationService = LocationService.getInstance();
        
        // Only send if tracking is active
        if (locationService.isActive()) {
          try {
            // Force an immediate location update
            const location = await locationService.getCurrentLocation();
            if (location) {
              await locationService.sendLocationNow(location);
            }
          } catch (error) {
            console.log('Failed to send foreground location update:', error);
          }
        }
      }
    };

    // Subscribe to app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Cleanup
    return () => {
      subscription.remove();
    };
  }, [user]);

  const fetchRecommendations = async () => {
    setLoadingRecommendations(true);
    try {
      const response = await apiClient.getPlaceRecommendations(10);
      if (response.success && response.recommendations) {
        setRecommendations(response.recommendations);
      }
    } catch (error: any) {
      console.log("Error fetching recommendations:", error);
      // Check if it's a 400 error (user needs to complete survey)
      if (
        error.response?.status === 400 ||
        error.response?.data?.message?.includes("survey")
      ) {
        // Don't show alert - just show empty state
        console.log("User needs to complete survey for recommendations");
      } else if (error.response?.status !== 401) {
        // Don't show alert for auth errors - they'll be handled by auth context
        Alert.alert("Error", "Failed to load recommendations");
      }
    } finally {
      setLoadingRecommendations(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Map Section */}
      <View style={styles.mapContainer}>
        {/* Logout Button - Top Left */}
        <TouchableOpacity style={styles.logoutIcon} onPress={logout}>
          <Text style={styles.logoutIconText}>⎋</Text>
        </TouchableOpacity>

        <MapView selectedPlace={selectedPlace} />
      </View>

      {/* Content Section - Animated and Collapsible */}
      <Animated.View
        style={[
          styles.contentSection,
          {
            height: EXPANDED_HEIGHT,
            transform: [{ translateY }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        {/* Swipe Handle - Tap to expand when collapsed */}
        <TouchableOpacity
          style={styles.swipeHandle}
          onPress={() => {
            if (!isExpanded) {
              expandContent();
            }
          }}
          activeOpacity={0.8}
        >
          <View style={styles.swipeHandleBar} />
        </TouchableOpacity>

        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.content}
          scrollEnabled={isExpanded}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Get Moving</Text>
          </View>

          {/* Recommendations Section */}
          <View style={styles.recommendationsCard}>
            <Text style={styles.cardTitle}>Recommended Places</Text>

            {loadingRecommendations ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : recommendations.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.recommendationsScroll}
              >
                {recommendations.slice(0, 10).map((place) => (
                  <TouchableOpacity
                    key={place.place_id}
                    style={[
                      styles.placeCard,
                      selectedPlace?.place_id === place.place_id &&
                        styles.placeCardSelected,
                    ]}
                    onPress={() => handlePlaceSelect(place)}
                  >
                    <Text style={styles.placeName} numberOfLines={1}>
                      {place.name}
                    </Text>
                    <Text style={styles.placeAddress} numberOfLines={1}>
                      {place.address}
                    </Text>
                    <View style={styles.placeDetails}>
                      {place.rating && (
                        <Text style={styles.placeRating}>
                          ⭐ {place.rating}
                        </Text>
                      )}
                      {place.price && (
                        <Text style={styles.placePrice}>{place.price}</Text>
                      )}
                    </View>
                    <Text style={styles.placeSimilarity}>
                      {Math.round(place.similarity * 100)}% match
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.noRecommendations}>
                Complete your survey to get personalized recommendations
              </Text>
            )}
          </View>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.gray[800],
  },
  mapContainer: {
    height: 670, // Full screen for map
    width: 350,
    position: "absolute",
    top: 60,
    left: 20,
    right: 20,
    borderRadius: 20, // Adds rounded corners
    overflow: "hidden", // Ensures map content stays within rounded corners
  },
  contentSection: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.gray[500],
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  swipeHandle: {
    alignItems: "center",
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xs,
  },
  swipeHandleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.gray[300],
  },
  scrollContent: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.lg,
    paddingTop: 0,
  },
  header: {
    marginBottom: theme.spacing.xl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
    textAlign: "center",
  },
  email: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray[600],
  },
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    ...theme.shadows.md,
  },
  cardTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.dark,
    marginBottom: theme.spacing.md,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[100],
  },
  detailLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[600],
    fontWeight: theme.fontWeight.medium,
  },
  detailValue: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.dark,
  },
  logoutIcon: {
    position: "absolute",
    top: theme.spacing.md,
    left: theme.spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    ...theme.shadows.md,
  },
  logoutIconText: {
    fontSize: 20,
    color: theme.colors.danger,
    fontWeight: theme.fontWeight.bold,
  },
  recommendationsCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.gray[200],
  },
  recommendationsScroll: {
    marginTop: theme.spacing.md,
  },
  placeCard: {
    backgroundColor: theme.colors.gray[100],
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginRight: theme.spacing.md,
    width: 200,
    borderWidth: 1,
    borderColor: theme.colors.gray[200],
  },
  placeCardSelected: {
    backgroundColor: theme.colors.primary + "20",
    borderColor: theme.colors.primary,
    borderWidth: 2,
  },
  placeName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
  },
  placeAddress: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[600],
    marginBottom: theme.spacing.sm,
  },
  placeDetails: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.xs,
    gap: theme.spacing.sm,
  },
  placeRating: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.dark,
    fontWeight: theme.fontWeight.medium,
  },
  placePrice: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.medium,
  },
  placeSimilarity: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.secondary,
    fontWeight: theme.fontWeight.semibold,
    marginTop: theme.spacing.xs,
  },
  noRecommendations: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[500],
    fontStyle: "italic",
    textAlign: "center",
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  ratingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  ratingButtonText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  badge: {
    backgroundColor: theme.colors.white,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
});
