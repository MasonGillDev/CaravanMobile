import React from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';

interface MentionTextProps {
  children: string;
  style?: TextStyle;
  mentionColor?: string;
}

/**
 * A component that renders text with highlighted mentions (words starting with @)
 * The @ symbol and the following word are both colored
 */
export const MentionText: React.FC<MentionTextProps> = ({
  children,
  style,
  mentionColor = '#FF8C00' // Default orange color
}) => {
  // Regular expression to match @ followed by alphanumeric characters and underscores
  const mentionRegex = /(@\w+)/g;

  // Split the text by mentions
  const parts = children.split(mentionRegex);

  return (
    <Text style={style}>
      {parts.map((part, index) => {
        // Check if this part is a mention (starts with @)
        if (part.match(mentionRegex)) {
          return (
            <Text key={index} style={{ color: mentionColor }}>
              {part}
            </Text>
          );
        }
        return part;
      })}
    </Text>
  );
};
