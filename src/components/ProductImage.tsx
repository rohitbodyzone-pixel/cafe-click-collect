import React, { useEffect, useState } from 'react';
import {
  Image,
  ImageResizeMode,
  ImageStyle,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme';

export interface ProductImageProps {
  uri?: string | null;
  category?: string;
  name?: string;
  style?: StyleProp<ImageStyle>;
  placeholderStyle?: StyleProp<ViewStyle>;
  resizeMode?: ImageResizeMode;
  iconSize?: number;
}

function getCategoryVisual(category?: string): {
  icon: keyof typeof Ionicons.glyphMap;
  bgColor: string;
  iconColor: string;
} {
  const cat = (category || '').toLowerCase();
  if (cat.includes('coffee')) {
    return { icon: 'cafe', bgColor: '#F4ECE4', iconColor: colors.espresso };
  }
  if (cat.includes('drink') || cat.includes('beverage') || cat.includes('tea') || cat.includes('juice')) {
    return { icon: 'wine', bgColor: '#EBF3F8', iconColor: '#2B6E94' };
  }
  if (cat.includes('pizza') || cat.includes('italian')) {
    return { icon: 'pizza', bgColor: '#FDF0E7', iconColor: '#C85A17' };
  }
  if (cat.includes('burger')) {
    return { icon: 'fast-food', bgColor: '#FBF0E4', iconColor: '#9C5B28' };
  }
  if (cat.includes('bakery') || cat.includes('pastr') || cat.includes('croissant') || cat.includes('bread')) {
    return { icon: 'nutrition', bgColor: '#FBF4EB', iconColor: colors.caramel };
  }
  if (cat.includes('dessert') || cat.includes('sweet') || cat.includes('cake') || cat.includes('ice cream')) {
    return { icon: 'ice-cream', bgColor: '#FDF0F3', iconColor: '#C44D6C' };
  }
  if (cat.includes('healthy') || cat.includes('salad') || cat.includes('bowl')) {
    return { icon: 'leaf', bgColor: '#EDF6F0', iconColor: colors.green };
  }
  if (cat.includes('breakfast') || cat.includes('brunch') || cat.includes('egg')) {
    return { icon: 'sunny', bgColor: '#FDF7E7', iconColor: '#D48806' };
  }
  if (cat.includes('asian') || cat.includes('noodle') || cat.includes('rice')) {
    return { icon: 'restaurant', bgColor: '#FBF1EB', iconColor: '#B84A39' };
  }
  return { icon: 'restaurant', bgColor: '#F3E8DB', iconColor: colors.caramel };
}

export function ProductImage({
  uri,
  category,
  name,
  style,
  placeholderStyle,
  resizeMode = 'cover',
  iconSize = 28,
}: ProductImageProps) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setFailed(false);
    setLoaded(false);
  }, [uri]);

  const { icon, bgColor, iconColor } = getCategoryVisual(category);

  if (uri && !failed) {
    return (
      <View style={[styles.wrapper, style]}>
        <Image
          source={{ uri }}
          style={[StyleSheet.absoluteFillObject, style]}
          resizeMode={resizeMode}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          accessibilityLabel={name ? `${name} photo` : 'Product photo'}
        />
        {!loaded && (
          <View style={[styles.skeleton, { backgroundColor: bgColor }, placeholderStyle]}>
            <Ionicons name={icon} size={iconSize} color={iconColor} style={{ opacity: 0.6 }} />
          </View>
        )}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.placeholder,
        { backgroundColor: bgColor },
        style,
        placeholderStyle,
      ]}
      accessibilityLabel={name ? `${name} placeholder` : 'Product placeholder'}
    >
      <Ionicons name={icon} size={iconSize} color={iconColor} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#F3E8DB',
  },
  skeleton: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
