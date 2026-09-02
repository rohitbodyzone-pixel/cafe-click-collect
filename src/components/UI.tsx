import { PropsWithChildren, ReactNode, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, shadows, spacing, typography } from '@/src/theme';

/**
 * Safe Haptic Feedback Helper
 * Safely triggers vibration on Web (navigator.vibrate) and supported platforms without crashing.
 */
export function triggerHaptic(type: 'light' | 'medium' | 'success' | 'error' = 'light') {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
    try {
      if (type === 'light') navigator.vibrate(10);
      else if (type === 'medium') navigator.vibrate(25);
      else if (type === 'success') navigator.vibrate([15, 40, 25]);
      else if (type === 'error') navigator.vibrate([40, 60, 40]);
    } catch {
      // safe fallback
    }
  }
}

/**
 * Screen Container Component
 */
export function Screen({
  children,
  scroll = true,
  contentStyle,
  style,
}: PropsWithChildren<{
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
}>) {
  const content = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.content, contentStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.responsiveContainer}>{children}</View>
    </ScrollView>
  ) : (
    <View style={[styles.content, styles.contentNoScroll, contentStyle]}>
      <View style={styles.responsiveContainer}>{children}</View>
    </View>
  );

  return <SafeAreaView style={[styles.safe, style]}>{content}</SafeAreaView>;
}

/**
 * Header Component
 */
export function Header({
  title,
  subtitle,
  back = true,
  onBack,
  right,
  style,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  onBack?: () => void;
  right?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const handleBack = () => {
    triggerHaptic('light');
    if (onBack) onBack();
    else router.back();
  };

  return (
    <View style={[styles.header, style]}>
      <View style={styles.headerSide}>
        {back && (
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-back" size={20} color={colors.espresso} />
          </Pressable>
        )}
      </View>
      <View style={styles.headerTitleWrap}>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        {!!subtitle && (
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      <View style={[styles.headerSide, { alignItems: 'flex-end' }]}>{right}</View>
    </View>
  );
}

/**
 * Button Component with Micro-interaction Press Scaling & Haptics
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

export function Button({
  label,
  onPress,
  secondary = false,
  variant,
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  iconRight,
  style,
  textStyle,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconRight?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  const effectiveVariant: ButtonVariant = variant || (secondary ? 'secondary' : 'primary');
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled || loading) return;
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 30,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 25,
      bounciness: 6,
    }).start();
  };

  const handlePress = () => {
    if (disabled || loading) return;
    triggerHaptic(effectiveVariant === 'destructive' ? 'medium' : 'light');
    onPress();
  };

  const getVariantContainerStyle = () => {
    switch (effectiveVariant) {
      case 'secondary':
        return styles.btnSecondary;
      case 'ghost':
        return styles.btnGhost;
      case 'destructive':
        return styles.btnDestructive;
      case 'outline':
        return styles.btnOutline;
      case 'primary':
      default:
        return styles.btnPrimary;
    }
  };

  const getVariantTextStyle = () => {
    switch (effectiveVariant) {
      case 'secondary':
        return styles.btnTextSecondary;
      case 'ghost':
        return styles.btnTextGhost;
      case 'destructive':
        return styles.btnTextDestructive;
      case 'outline':
        return styles.btnTextOutline;
      case 'primary':
      default:
        return styles.btnTextPrimary;
    }
  };

  const getSizeContainerStyle = () => {
    switch (size) {
      case 'sm':
        return styles.btnSm;
      case 'lg':
        return styles.btnLg;
      case 'md':
      default:
        return styles.btnMd;
    }
  };

  const getIconColor = () => {
    switch (effectiveVariant) {
      case 'secondary':
      case 'ghost':
      case 'outline':
        return colors.espresso;
      case 'destructive':
      case 'primary':
      default:
        return colors.white;
    }
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={[
          styles.buttonBase,
          getVariantContainerStyle(),
          getSizeContainerStyle(),
          disabled && styles.btnDisabled,
          style,
        ]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        {loading ? (
          <ActivityIndicator size="small" color={getIconColor()} />
        ) : (
          <>
            {icon && (
              <Ionicons
                name={icon}
                size={size === 'sm' ? 15 : size === 'lg' ? 20 : 18}
                color={getIconColor()}
                style={{ marginRight: 6 }}
              />
            )}
            <Text style={[styles.btnTextBase, getVariantTextStyle(), textStyle]}>{label}</Text>
            {iconRight && (
              <Ionicons
                name={iconRight}
                size={size === 'sm' ? 15 : size === 'lg' ? 20 : 18}
                color={getIconColor()}
                style={{ marginLeft: 6 }}
              />
            )}
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

/**
 * Card Component with Ambient Elevation & Spring Press
 */
export function Card({
  children,
  style,
  elevation = 'sm',
  interactive = false,
  onPress,
}: PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  elevation?: 'none' | 'sm' | 'md' | 'lg' | 'floating';
  interactive?: boolean;
  onPress?: () => void;
}>) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const cardStyle = [
    styles.card,
    elevation === 'none'
      ? shadows.none
      : elevation === 'md'
        ? shadows.md
        : elevation === 'lg'
          ? shadows.lg
          : elevation === 'floating'
            ? shadows.floating
            : shadows.sm,
    style,
  ];

  if (interactive && onPress) {
    const handlePressIn = () => {
      Animated.spring(scaleAnim, {
        toValue: 0.985,
        useNativeDriver: true,
        speed: 30,
        bounciness: 4,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 25,
        bounciness: 6,
      }).start();
    };

    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Pressable
          onPress={() => {
            triggerHaptic('light');
            onPress();
          }}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={cardStyle}
        >
          {children}
        </Pressable>
      </Animated.View>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

/**
 * Input Component
 */
export function Input({
  value,
  onChangeText,
  placeholder,
  label,
  error,
  icon,
  rightIcon,
  onRightIconPress,
  multiline,
  secureTextEntry,
  keyboardType,
  autoCapitalize = 'none',
  style,
  containerStyle,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  multiline?: boolean;
  secureTextEntry?: boolean;
  keyboardType?: any;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.inputContainer, containerStyle]}>
      {!!label && <Text style={styles.inputLabel}>{label}</Text>}
      <View style={[styles.inputWrapper, !!error && styles.inputWrapperError, multiline && styles.inputWrapperMultiline]}>
        {icon && <Ionicons name={icon} size={18} color={colors.muted} style={styles.inputIconLeft} />}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedLight}
          multiline={multiline}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          style={[styles.inputField, multiline && styles.inputFieldMultiline, style]}
        />
        {rightIcon && (
          <Pressable onPress={onRightIconPress} style={styles.inputIconRight}>
            <Ionicons name={rightIcon} size={18} color={colors.muted} />
          </Pressable>
        )}
      </View>
      {!!error && <Text style={styles.inputErrorText}>{error}</Text>}
    </View>
  );
}

/**
 * Search Bar Component
 */
export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search…',
  onClear,
  style,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onClear?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.searchBarWrap, style]}>
      <Ionicons name="search-outline" size={18} color={colors.muted} style={{ marginRight: 8 }} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        style={styles.searchInputField}
        returnKeyType="search"
      />
      {value.length > 0 && (
        <Pressable
          onPress={() => {
            triggerHaptic('light');
            if (onClear) onClear();
            else onChangeText('');
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close-circle" size={16} color={colors.muted} />
        </Pressable>
      )}
    </View>
  );
}

/**
 * Status Pill & Badge Components
 */
export type StatusType = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export function StatusPill({
  label,
  status = 'neutral',
  icon,
  style,
}: {
  label: string;
  status?: StatusType;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
}) {
  const getStatusStyles = () => {
    switch (status) {
      case 'success':
        return { bg: colors.greenSoft, text: colors.greenDark, border: '#CDE0D1', defaultIcon: 'checkmark-circle' as const };
      case 'warning':
        return { bg: colors.amberSoft, text: colors.amber, border: '#F5DEB3', defaultIcon: 'time' as const };
      case 'danger':
        return { bg: colors.dangerSoft, text: colors.dangerDark, border: '#F5C6CB', defaultIcon: 'alert-circle' as const };
      case 'info':
        return { bg: colors.infoSoft, text: colors.info, border: '#BFDBFE', defaultIcon: 'information-circle' as const };
      case 'neutral':
      default:
        return { bg: colors.cream, text: colors.espresso, border: colors.line, defaultIcon: 'ellipse' as const };
    }
  };

  const st = getStatusStyles();
  const activeIcon = icon || st.defaultIcon;

  return (
    <View style={[styles.statusPillWrap, { backgroundColor: st.bg, borderColor: st.border }, style]}>
      <Ionicons name={activeIcon} size={11} color={st.text} />
      <Text style={[styles.statusPillText, { color: st.text }]}>{label}</Text>
    </View>
  );
}

/**
 * Chip Component
 */
export function Chip({
  label,
  selected = false,
  onPress,
  icon,
  badge,
  style,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  badge?: number | string;
  style?: StyleProp<ViewStyle>;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 30,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 25,
      bounciness: 6,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={() => {
          triggerHaptic('light');
          onPress();
        }}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.chip,
          selected && styles.chipSelected,
          style,
        ]}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={14}
            color={selected ? colors.white : colors.caramel}
            style={{ marginRight: 5 }}
          />
        )}
        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
        {badge !== undefined && (
          <View style={[styles.chipBadge, selected && styles.chipBadgeSelected]}>
            <Text style={[styles.chipBadgeText, selected && styles.chipBadgeTextSelected]}>
              {badge}
            </Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

/**
 * Section Header Component
 */
export function SectionHeader({
  title,
  eyebrow,
  actionLabel,
  onAction,
  right,
  style,
}: {
  title: string;
  eyebrow?: string;
  actionLabel?: string;
  onAction?: () => void;
  right?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.sectionHeaderWrap, style]}>
      <View style={{ flex: 1 }}>
        {!!eyebrow && <Text style={styles.sectionEyebrow}>{eyebrow}</Text>}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {actionLabel && onAction && (
        <Pressable
          onPress={() => {
            triggerHaptic('light');
            onAction();
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.sectionActionText}>{actionLabel}</Text>
        </Pressable>
      )}
      {right}
    </View>
  );
}

/**
 * Skeleton Loader Component with Shimmer Effect
 */
export function Skeleton({
  width = '100%',
  height = 20,
  borderRadius = radii.sm,
  style,
}: {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const opacityAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.85,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.4,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacityAnim]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: width as any,
          height,
          borderRadius,
          opacity: opacityAnim,
        },
        style,
      ]}
    />
  );
}

/**
 * Empty State Component
 */
export function EmptyState({
  icon = 'storefront-outline',
  title,
  description,
  actionLabel,
  onAction,
  style,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.stateContainer, style]}>
      <View style={styles.stateIconCircle}>
        <Ionicons name={icon} size={36} color={colors.caramel} />
      </View>
      <Text style={styles.stateTitle}>{title}</Text>
      {!!description && <Text style={styles.stateDescription}>{description}</Text>}
      {actionLabel && onAction && (
        <Button label={actionLabel} onPress={onAction} style={{ marginTop: 14 }} />
      )}
    </View>
  );
}

/**
 * Error State Component
 */
export function ErrorState({
  title = 'Something went wrong',
  description,
  onRetry,
  style,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.stateContainer, style]}>
      <View style={[styles.stateIconCircle, { backgroundColor: colors.dangerSoft }]}>
        <Ionicons name="alert-circle" size={36} color={colors.danger} />
      </View>
      <Text style={styles.stateTitle}>{title}</Text>
      {!!description && <Text style={styles.stateDescription}>{description}</Text>}
      {onRetry && (
        <Button
          label="Try Again"
          icon="refresh"
          onPress={onRetry}
          variant="secondary"
          style={{ marginTop: 14 }}
        />
      )}
    </View>
  );
}

/**
 * Success State Component
 */
export function SuccessState({
  title = 'Success!',
  description,
  actionLabel,
  onAction,
  style,
}: {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.stateContainer, style]}>
      <View style={[styles.stateIconCircle, { backgroundColor: colors.greenSoft }]}>
        <Ionicons name="checkmark-circle" size={40} color={colors.green} />
      </View>
      <Text style={styles.stateTitle}>{title}</Text>
      {!!description && <Text style={styles.stateDescription}>{description}</Text>}
      {actionLabel && onAction && (
        <Button label={actionLabel} onPress={onAction} style={{ marginTop: 14 }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  content: {
    padding: spacing.md,
    paddingBottom: 48,
    flexGrow: 1,
  },
  contentNoScroll: {
    flex: 1,
  },
  responsiveContainer: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
  },
  header: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: 2,
  },
  headerSide: {
    width: 48,
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.ink,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: '600',
    marginTop: 1,
  },
  iconButton: {
    width: 40,
    height: 40,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.sm,
  },
  iconButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  buttonBase: {
    borderRadius: radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  btnSm: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: radii.sm,
  },
  btnMd: {
    minHeight: 50,
    paddingHorizontal: 18,
    borderRadius: radii.md,
  },
  btnLg: {
    minHeight: 56,
    paddingHorizontal: 24,
    borderRadius: radii.lg,
  },
  btnPrimary: {
    backgroundColor: colors.espresso,
    ...shadows.md,
  },
  btnSecondary: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
  },
  btnGhost: {
    backgroundColor: 'transparent',
  },
  btnDestructive: {
    backgroundColor: colors.danger,
    ...shadows.md,
  },
  btnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.espresso,
  },
  btnDisabled: {
    opacity: 0.45,
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  btnTextBase: {
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  btnTextPrimary: {
    color: colors.white,
  },
  btnTextSecondary: {
    color: colors.espresso,
  },
  btnTextGhost: {
    color: colors.espresso,
  },
  btnTextDestructive: {
    color: colors.white,
  },
  btnTextOutline: {
    color: colors.espresso,
  },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  cardPressed: {
    opacity: 0.95,
  },
  inputContainer: {
    marginBottom: spacing.sm,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 12,
    height: 48,
  },
  inputWrapperMultiline: {
    height: 84,
    alignItems: 'flex-start',
    paddingVertical: 10,
  },
  inputWrapperError: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerSoft,
  },
  inputField: {
    flex: 1,
    fontSize: 14,
    color: colors.ink,
    height: '100%',
  },
  inputFieldMultiline: {
    textAlignVertical: 'top',
    height: '100%',
  },
  inputIconLeft: {
    marginRight: 8,
  },
  inputIconRight: {
    padding: 4,
  },
  inputErrorText: {
    fontSize: 11,
    color: colors.danger,
    fontWeight: '600',
    marginTop: 4,
    marginLeft: 4,
  },
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radii.full,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.sm,
  },
  searchInputField: {
    flex: 1,
    fontSize: 14,
    color: colors.ink,
  },
  statusPillWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipSelected: {
    backgroundColor: colors.espresso,
    borderColor: colors.espresso,
  },
  chipPressed: {
    transform: [{ scale: 0.96 }],
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.espresso,
  },
  chipTextSelected: {
    color: colors.white,
  },
  chipBadge: {
    marginLeft: 6,
    backgroundColor: colors.cream,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  chipBadgeSelected: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  chipBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.espresso,
  },
  chipBadgeTextSelected: {
    color: colors.white,
  },
  sectionHeaderWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
    marginTop: spacing.xs,
  },
  sectionEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.caramel,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.espresso,
  },
  sectionActionText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.caramel,
  },
  skeleton: {
    backgroundColor: colors.creamDark,
  },
  stateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  stateIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.ink,
    textAlign: 'center',
    marginBottom: 4,
  },
  stateDescription: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 320,
  },
});

