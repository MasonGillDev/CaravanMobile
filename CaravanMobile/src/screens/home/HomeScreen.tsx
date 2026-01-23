import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MapView from "../../components/map/MapView";
import { useAuth } from "../../context/AuthContext";
import ApiClient from "../../services/api/apiClient";
import { PlaceRecommendation } from "../../services/api/placeService";
import LocationService from "../../services/location/locationService";
import { theme } from "../../styles/theme";

export const HomeScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedPlace, setSelectedPlace] = useState<PlaceRecommendation | null>(null);
  const apiClient = ApiClient.getInstance();

  useEffect(() => {
    // Only set up location if user is authenticated
    if (!user) {
      console.log("User not ready, skipping location setup");
      return;
    }

    // Check and request location permission when home screen loads
    const setupLocation = async () => {
      // Add a small delay to ensure user is fully created in database
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const locationService = LocationService.getInstance();

      // Start tracking (it handles permissions internally)
      const started = await locationService.startTracking();
      if (!started) {
        console.log("Location tracking could not be started");
      }
    };

    setupLocation();
    fetchUnreadCount();
  }, [user]);

  // Handle navigation params (selected place from Discover screen)
  useEffect(() => {
    const params = route.params as any;
    if (params?.selectedPlace) {
      setSelectedPlace(params.selectedPlace);
      // Clear the param after using it
      navigation.setParams({ selectedPlace: undefined } as never);
    }
  }, [route.params]);

  const fetchUnreadCount = async () => {
    try {
      const response = await apiClient.getUnreadCount();
      if (response.success) {
        setUnreadCount(response.count || 0);
      }
    } catch (error: any) {
      console.log("Failed to fetch unread count:", error);
    }
  };

  const handleNotificationPress = () => {
    navigation.navigate("Notifications" as never);
  };

  const handleClearSelectedPlace = () => {
    setSelectedPlace(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Logo/Header Space */}
      <View style={styles.headerSpace}>
        <Text style={styles.logoText}>CARAVAN</Text>
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={handleNotificationPress}
        >
          <Ionicons name="notifications" size={24} color={theme.colors.primary} />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Map Container with padding */}
      <View style={styles.mapWrapper}>
        <View style={styles.mapContainer}>
          <MapView
            selectedPlace={selectedPlace}
            onClearSelectedPlace={handleClearSelectedPlace}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.light,
  },
  headerSpace: {
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontSize: 28,
    fontWeight: '900' as any,
    color: theme.colors.primary,
    letterSpacing: 4,
    fontFamily: 'System',
    textTransform: 'uppercase' as any,
  },
  notificationButton: {
    position: "absolute",
    right: theme.spacing.lg,
    padding: theme.spacing.sm,
  },
  badge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: theme.colors.accent,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: theme.colors.white,
    fontSize: 10,
    fontWeight: theme.fontWeight.bold,
  },
  mapWrapper: {
    flex: 1,
    
    paddingTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 110, // Extra space for floating tab bar
    

  },
  mapContainer: {
    flex: 1,
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
});
