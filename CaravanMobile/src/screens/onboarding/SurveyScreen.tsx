import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import ApiClient from '../../services/api/apiClient';
import LocationService from '../../services/location/locationService';
import { theme } from '../../styles/theme';

interface SurveyData {
  music_preference: string;
  vibe_preference: string;
  go_out_time: string;
  stay_duration: string;
  crowd_preference: string;
  drink_preference: string;
  price_comfort: string;
  food_availability: string;
  activities: {
    outdoor_seating: boolean;
    live_music: boolean;
    dance_floor: boolean;
    sports_tvs: boolean;
    games: boolean;
  };
}

interface SingleSelectQuestion {
  question: string;
  key: string;
  options: { value: string; label: string }[];
}

interface MultiSelectQuestion {
  question: string;
  key: string;
  type: 'multiselect';
  options: { key: string; label: string }[];
}

type Question = SingleSelectQuestion | MultiSelectQuestion;

const surveyOptions = {
  music: [
    { value: 'house_edm', label: 'House/EDM' },
    { value: 'hip_hop', label: 'Hip-Hop' },
    { value: 'pop_top40', label: 'Pop/Top 40' },
    { value: 'rock_indie', label: 'Rock/Indie' },
    { value: 'latin', label: 'Latin' },
    { value: 'country', label: 'Country' },
    { value: 'mixed', label: 'Mixed/Varies' },
    { value: 'no_preference', label: 'No preference' },
  ],
  vibe: [
    { value: 'laid_back', label: 'Laid-back/lounge' },
    { value: 'trendy', label: 'Trendy/Instagrammable' },
    { value: 'dance_party', label: 'Dance/party' },
    { value: 'sports_bar', label: 'Sports/bar games' },
    { value: 'upscale', label: 'Upscale/cocktail bar' },
    { value: 'dive_local', label: 'Dive/local' },
    { value: 'rave', label: 'Rave' },
  ],
  goOutTime: [
    { value: 'early_evening', label: 'Early evening (6–9pm)' },
    { value: 'night', label: 'Night (9pm–midnight)' },
    { value: 'late_night', label: 'Late night (after midnight)' },
  ],
  stayDuration: [
    { value: 'quick_drink', label: 'Quick drink (<2h)' },
    { value: 'half_night', label: 'Half night (2–4h)' },
    { value: 'until_close', label: 'Until close' },
  ],
  crowdPreference: [
    { value: 'mega_club', label: 'Mega Club' },
    { value: 'big_energetic', label: 'Big/energetic' },
    { value: 'medium', label: 'Medium' },
    { value: 'small_intimate', label: 'Small/intimate' },
  ],
  drinkPreference: [
    { value: 'cocktails', label: 'Cocktails' },
    { value: 'beer', label: 'Beer' },
    { value: 'wine', label: 'Wine' },
    { value: 'shots', label: 'Shots' },
    { value: 'non_alcoholic', label: 'Non-alcoholic' },
    { value: 'no_preference', label: 'No preference' },
  ],
  priceComfort: [
    { value: 'budget', label: '$' },
    { value: 'moderate', label: '$$' },
    { value: 'upscale', label: '$$$' },
    { value: 'luxury', label: '$$$$' },
  ],
  foodAvailability: [
    { value: 'dinner_options', label: 'Yes — want dinner options' },
    { value: 'light_snacks', label: 'Yes — light snacks/apps' },
    { value: 'drinks_only', label: 'No — drinks only' },
  ],
};

export default function SurveyScreen({ navigation }: any) {
  const { refreshUser } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [surveyData, setSurveyData] = useState<SurveyData>({
    music_preference: '',
    vibe_preference: '',
    go_out_time: '',
    stay_duration: '',
    crowd_preference: '',
    drink_preference: '',
    price_comfort: '',
    food_availability: '',
    activities: {
      outdoor_seating: false,
      live_music: false,
      dance_floor: false,
      sports_tvs: false,
      games: false,
    },
  });

  const steps: Array<{
    title: string;
    questions: Question[];
  }> = [
    {
      title: 'Music & Vibe',
      questions: [
        {
          question: 'What type of music do you prefer when you go out?',
          key: 'music_preference',
          options: surveyOptions.music,
        },
        {
          question: 'What kind of vibe do you look for in a spot?',
          key: 'vibe_preference',
          options: surveyOptions.vibe,
        },
      ],
    },
    {
      title: 'Social Habits',
      questions: [
        {
          question: 'When do you usually go out?',
          key: 'go_out_time',
          options: surveyOptions.goOutTime,
        },
        {
          question: 'How long do you like to stay out?',
          key: 'stay_duration',
          options: surveyOptions.stayDuration,
        },
        {
          question: 'Do you prefer larger crowds or smaller settings?',
          key: 'crowd_preference',
          options: surveyOptions.crowdPreference,
        },
      ],
    },
    {
      title: 'Food & Drinks',
      questions: [
        {
          question: "What's your go-to drink preference?",
          key: 'drink_preference',
          options: surveyOptions.drinkPreference,
        },
        {
          question: "What's your typical price comfort for a drink?",
          key: 'price_comfort',
          options: surveyOptions.priceComfort,
        },
        {
          question: 'Do you care about food availability when going out?',
          key: 'food_availability',
          options: surveyOptions.foodAvailability,
        },
      ],
    },
    {
      title: 'Atmosphere & Activities',
      questions: [
        {
          question: 'Do you enjoy places with... (select all that apply)',
          key: 'activities',
          type: 'multiselect' as const,
          options: [
            { key: 'outdoor_seating', label: 'Outdoor seating/patios' },
            { key: 'live_music', label: 'Live music/DJs' },
            { key: 'dance_floor', label: 'Dance floor' },
            { key: 'sports_tvs', label: 'Sports TVs' },
            { key: 'games', label: 'Games (pool, darts, arcade)' },
          ],
        },
      ],
    },
  ];

  const currentStepData = steps[currentStep];

  const handleSelection = (key: string, value: string) => {
    setSurveyData(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleActivityToggle = (activity: string) => {
    setSurveyData(prev => ({
      ...prev,
      activities: {
        ...prev.activities,
        [activity]: !prev.activities[activity as keyof typeof prev.activities],
      },
    }));
  };

  const handleNext = () => {
    // Validate current step
    const currentQuestions = currentStepData.questions;
    for (const question of currentQuestions) {
      if (!('type' in question) || question.type !== 'multiselect') {
        if (!surveyData[question.key as keyof SurveyData]) {
          Alert.alert('Please complete all questions', 'Select an option for all questions before continuing.');
          return;
        }
      }
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const apiClient = ApiClient.getInstance();
      await apiClient.submitSurvey(surveyData);
      await refreshUser();
      
      // Request location permission after survey
      const locationService = LocationService.getInstance();
      await locationService.requestPermissions();
      // Start tracking if permission granted
      locationService.startTracking().catch(err => 
        console.log('Location tracking not started:', err)
      );
      
      // Navigate to home after survey completion
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    } catch (error) {
      console.error('Survey submission error:', error);
      Alert.alert('Error', 'Failed to submit survey. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderQuestion = (question: Question) => {
    if ('type' in question && question.type === 'multiselect') {
      return (
        <View key={question.key}>
          <Text style={styles.questionText}>{question.question}</Text>
          {question.options.map((option: any) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.option,
                surveyData.activities[option.key as keyof typeof surveyData.activities] && styles.optionSelected,
              ]}
              onPress={() => handleActivityToggle(option.key)}
            >
              <Text
                style={[
                  styles.optionText,
                  surveyData.activities[option.key as keyof typeof surveyData.activities] && styles.optionTextSelected,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      );
    }

    return (
      <View key={question.key}>
        <Text style={styles.questionText}>{question.question}</Text>
        {question.options.map((option: any) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.option,
              surveyData[question.key as keyof SurveyData] === option.value && styles.optionSelected,
            ]}
            onPress={() => handleSelection(question.key, option.value)}
          >
            <Text
              style={[
                styles.optionText,
                surveyData[question.key as keyof SurveyData] === option.value && styles.optionTextSelected,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Submitting your preferences...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.stepIndicator}>
          Step {currentStep + 1} of {steps.length}
        </Text>
        <Text style={styles.title}>{currentStepData.title}</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {currentStepData.questions.map(renderQuestion)}
      </ScrollView>

      <View style={styles.footer}>
        {currentStep > 0 && (
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity 
          style={[styles.nextButton, currentStep === 0 && styles.fullWidthButton]} 
          onPress={handleNext}
        >
          <Text style={styles.nextButtonText}>
            {currentStep === steps.length - 1 ? 'Complete' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.gray[500],
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  stepIndicator: {
    fontSize: 14,
    color: theme.colors.gray[500],
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.dark,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.dark,
    marginTop: 24,
    marginBottom: 16,
  },
  option: {
    backgroundColor: theme.colors.gray[100],
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionSelected: {
    backgroundColor: theme.colors.primary + '10',
    borderColor: theme.colors.primary,
  },
  optionText: {
    fontSize: 16,
    color: theme.colors.dark,
  },
  optionTextSelected: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: theme.colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  backButton: {
    flex: 1,
    paddingVertical: 16,
    marginRight: 8,
    borderRadius: 12,
    backgroundColor: theme.colors.gray[200],
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  nextButton: {
    flex: 1,
    paddingVertical: 16,
    marginLeft: 8,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
  },
  fullWidthButton: {
    marginLeft: 0,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.white,
  },
});