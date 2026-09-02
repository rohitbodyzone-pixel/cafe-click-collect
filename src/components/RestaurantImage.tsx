import React, { useEffect, useState } from 'react';
import {
  Image,
  ImageResizeMode,
  ImageStyle,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme';

export interface RestaurantCoverProps {
  uri?: string | null;
  name?: string;
  style?: StyleProp<ImageStyle>;
  placeholderStyle?: StyleProp<ViewStyle>;
  resizeMode?: ImageResizeMode;
}

export function RestaurantCoverImage({
  uri,
  name = 'Café',
  style,
  placeholderStyle,
  resizeMode = 'cover',
}: RestaurantCoverProps) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setFailed(false);
    setLoaded(false);
  }, [uri]);

  if (uri && !failed) {
    return (
      <View style={[styles.coverWrap, style]}>
        <Image
          source={{ uri }}
          style={[StyleSheet.absoluteFillObject, style]}
          resizeMode={resizeMode}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          accessibilityLabel={`${name} cover photo`}
        />
        {!loaded && (
          <View style={[styles.coverSkeleton, StyleSheet.absoluteFillObject]} />
        )}
      </View>
    );
  }

  return (
    <View style={[styles.coverWrap, styles.coverPlaceholder, placeholderStyle || style]}>
      <Ionicons name="cafe-outline" size={32} color={colors.caramel} />
      <Text style={styles.coverPlaceholderText} numberOfLines={1}>
        {name}
      </Text>
    </View>
  );
}

export interface RestaurantLogoProps {
  uri?: string | null;
  name?: string;
  size?: number;
  style?: StyleProp<ImageStyle>;
  placeholderStyle?: StyleProp<ViewStyle>;
}

export function RestaurantLogoImage({
  uri,
  name = 'Café',
  size = 40,
  style,
  placeholderStyle,
}: RestaurantLogoProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [uri]);

  const initials = (name || 'C')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  const containerStyle: ViewStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  if (uri && !failed) {
    return (
      <View style={[styles.logoWrap, containerStyle, style]}>
        <Image
          source={{ uri }}
          style={[StyleSheet.absoluteFillObject, { borderRadius: size / 2 }, style]}
          resizeMode="cover"
          onError={() => setFailed(true)}
          accessibilityLabel={`${name} logo`}
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.logoPlaceholder,
        containerStyle,
        style,
        placeholderStyle,
      ]}
      accessibilityLabel={`${name} logo avatar`}
    >
      <Text style={[styles.logoInitials, { fontSize: Math.max(11, Math.floor(size * 0.38)) }]}>
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  coverWrap: {
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#3E2723',
  },
  coverSkeleton: {
    backgroundColor: '#3E2723',
  },
  coverPlaceholder: {
    backgroundColor: '#2D1E18',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  coverPlaceholderText: {
    color: colors.cream,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 6,
    letterSpacing: 0.5,
  },
  logoWrap: {
    overflow: 'hidden',
    backgroundColor: colors.cream,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  logoPlaceholder: {
    backgroundColor: colors.espresso,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  logoInitials: {
    color: colors.white,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
