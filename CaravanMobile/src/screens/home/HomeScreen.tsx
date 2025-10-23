import React, { useEffect } from "react";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";
import MapView from "../../components/map/MapView";
import { useAuth } from "../../context/AuthContext";
import LocationService from "../../services/location/locationService";
import { theme } from "../../styles/theme";

export const HomeScreen: React.FC = () => {
  const { user } = useAuth();

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
  }, [user]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Logo/Header Space */}
      <View style={styles.headerSpace}>
        <Text style={styles.logoText}>CARAVAN</Text>
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
    paddingHorizontal: theme.spacing.sm,
    alignItems: "center",
  },
  logoText: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
    letterSpacing: 3,
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
