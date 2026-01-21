import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { theme } from '../../styles/theme';
import postService from '../../services/api/postService';

export const CreatePostScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { location } = route.params as { location: { latitude: number; longitude: number } };

  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const maxLength = 500;
  const remainingChars = maxLength - content.length;

  /**
   * Handle post creation
   */
  const handleCreatePost = async () => {
    if (content.trim().length === 0) {
      Alert.alert('Error', 'Post content cannot be empty');
      return;
    }

    if (content.length > maxLength) {
      Alert.alert('Error', `Post cannot exceed ${maxLength} characters`);
      return;
    }

    setLoading(true);
    try {
      await postService.createPost(content.trim(), location.latitude, location.longitude);
      Alert.alert('Success', 'Post created successfully!');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Post</Text>
          <TouchableOpacity
            onPress={handleCreatePost}
            disabled={loading || content.trim().length === 0}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.primary} />
            ) : (
              <Text
                style={[
                  styles.postButton,
                  content.trim().length === 0 && styles.postButtonDisabled,
                ]}
              >
                Post
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <TextInput
            style={styles.input}
            multiline
            placeholder="What's happening nearby?"
            placeholderTextColor={theme.colors.textSecondary}
            value={content}
            onChangeText={setContent}
            maxLength={maxLength}
            autoFocus
            textAlignVertical="top"
          />

          <View style={styles.footer}>
            <Text
              style={[
                styles.charCount,
                remainingChars < 50 && styles.charCountWarning,
                remainingChars === 0 && styles.charCountError,
              ]}
            >
              {remainingChars} characters remaining
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  cancelButton: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  postButton: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  postButtonDisabled: {
    color: theme.colors.textSecondary,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
    padding: 0,
  },
  footer: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  charCount: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'right',
  },
  charCountWarning: {
    color: theme.colors.warning || '#ff9800',
  },
  charCountError: {
    color: theme.colors.error || '#f44336',
  },
});
