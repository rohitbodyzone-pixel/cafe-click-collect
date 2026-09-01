import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Image, ImageStyle, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { colors } from '@/src/theme';

export function ProductImage({ uri, style, placeholderStyle }: { uri?: string; style?: StyleProp<ImageStyle>; placeholderStyle?: StyleProp<ViewStyle> }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);
  if (uri && !failed) return <Image source={{ uri }} style={style} resizeMode="cover" onError={() => setFailed(true)} accessibilityLabel="Product photo" />;
  return <View style={[styles.placeholder, placeholderStyle]} accessibilityLabel="No product photo"><Ionicons name="cafe-outline" size={34} color={colors.caramel} /></View>;
}

const styles = StyleSheet.create({
  placeholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3E8DB' },
});
