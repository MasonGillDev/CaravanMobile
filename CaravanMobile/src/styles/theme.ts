// Caravan Design System - "Journey Together"
// A warm, inviting color palette inspired by desert caravans and sunsets

export const theme = {
  colors: {
    // Brand Colors
    primary: '#FF6B35',        // Caravan Orange - main brand color
    secondary: '#F7931E',      // Desert Sunset - vibrant accent
    accent: '#004E89',         // Oasis Blue - depth and trust

    // Semantic Colors
    success: '#10B981',        // Journey Green
    danger: '#EF4444',         // Alert Red
    warning: '#F59E0B',        // Caution Amber
    info: '#3B82F6',           // Info Blue

    // Neutral Colors
    dark: '#1F2937',           // Almost black for text
    light: '#FFF8F3',          // Warm off-white background
    white: '#FFFFFF',          // Pure white
    black: '#000000',          // Pure black

    // Extended Palette
    sand: '#F4E4C1',           // Sandy tone
    terracotta: '#E07A5F',     // Warm earth tone

    // UI Colors
    background: '#FFFFFF',     // Background
    surface: '#F9FAFB',        // Surface
    border: '#E5E7EB',         // Border
    text: '#1F2937',           // Text
    textSecondary: '#6B7280',  // Secondary text

    // Gray Scale (with warmer tones)
    gray: {
      100: '#F7F3EF',          // Warm light gray
      200: '#E8DFD6',          // Light sand
      300: '#D1C7BD',          // Medium sand
      400: '#A89F94',          // Warm mid gray
      500: '#6B6660',          // Dark warm gray
      600: '#4B4842',          // Charcoal
      700: '#38352F',          // Deep charcoal
      800: '#252320',          // Almost black
      900: '#1A1816',          // Rich black
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 24,
    xxl: 32,
    xxxl: 48,
  },
  fontWeight: {
    light: '300' as const,
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 8,
    },
  },
};