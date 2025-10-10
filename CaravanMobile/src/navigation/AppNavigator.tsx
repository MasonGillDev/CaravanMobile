import React, { useEffect, useRef } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { HomeScreen } from '../screens/home/HomeScreen';
import ProfileSetupScreen from '../screens/onboarding/ProfileSetupScreen';
import SurveyScreen from '../screens/onboarding/SurveyScreen';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { theme } from '../styles/theme';
import NotificationService from '../services/notification/notificationService';
import * as Notifications from 'expo-notifications';

const Stack = createNativeStackNavigator();

export const AppNavigator: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const navigationRef = useRef<NavigationContainerRef<any>>(null);
  const notificationService = NotificationService.getInstance();
  
  // Check if user needs profile setup
  const needsProfileSetup = isAuthenticated && user && (
    !user.email || !user.dob || !user.country_code || !user.profile_completed
  );
  
  // Check if user needs survey (profile completed but survey not)
  const needsSurvey = isAuthenticated && user && 
    user.profile_completed && !user.survey_completed;

  useEffect(() => {
    // Request notification permissions
    notificationService.requestPermissions();
    notificationService.setupNotificationCategories();

    // Register notification listeners
    notificationService.registerNotificationListeners(
      (notification: Notifications.Notification) => {
        // Handle notification received while app is foregrounded
        console.log('Notification received:', notification);
      },
      (response: Notifications.NotificationResponse) => {
        // Handle notification tap
        console.log('Notification tapped:', response);
      }
    );

    return () => {
      notificationService.unregisterNotificationListeners();
    };
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : needsProfileSetup ? (
          <>
            <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
            <Stack.Screen name="Survey" component={SurveyScreen} />
          </>
        ) : needsSurvey ? (
          <>
            <Stack.Screen name="Survey" component={SurveyScreen} />
            <Stack.Screen name="Home" component={HomeScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Survey" component={SurveyScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
  },
});