import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  rightComponent?: React.ReactNode;
}

/**
 * ScreenHeader - Standardized header component for all screens
 * Provides consistent styling across the app
 */
export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  subtitle,
  rightComponent,
}) => {
  return (
    <View style={styles.header}>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {rightComponent && <View style={styles.rightContainer}>{rightComponent}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    backgroundColor: theme.colors.light,
  },
  titleContainer: {
    flex: 1,
    paddingBottom: theme.spacing.sm,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '900' as any,
    color: theme.colors.primary,
    letterSpacing: 4,
    fontFamily: 'System',
    textTransform: 'uppercase' as any,
    textAlign: 'center' as any,
  },
  subtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[600],
    marginTop: theme.spacing.xs,
    textAlign: 'center' as any,
  },
  rightContainer: {
    marginLeft: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
});
