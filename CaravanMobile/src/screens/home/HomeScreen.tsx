import React, { useEffect, useState } from "react";
import { SafeAreaView, StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import MapView from "../../components/map/MapView";
import { useAuth } from "../../context/AuthContext";
import LocationService from "../../services/location/locationService";
import ApiClient from "../../services/api/apiClient";
import { theme } from "../../styles/theme";

export const HomeScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [unreadCount, setUnreadCount] = useState(0);
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
          <MapView selectedPlace={null} />
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
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
    letterSpacing: 3,
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
    backgroundColor: theme.colors.danger,
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
  },
});
