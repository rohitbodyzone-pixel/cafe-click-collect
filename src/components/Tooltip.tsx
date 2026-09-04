import React, { ReactNode, useState, useRef, useEffect, useCallback } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, shadows } from '@/src/theme';

function triggerHaptic(type: 'light' | 'medium' | 'success' | 'error' = 'light') {
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

export type TooltipPosition = 'top' | 'bottom';

export type TooltipProps = {
  text: string;
  children: ReactNode;
  position?: TooltipPosition;
  delayMs?: number;
  autoHideMs?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  tooltipStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

/**
 * Premium Tooltip Wrapper Component
 * - Displays a small popup label above buttons on desktop hover.
 * - Displays briefly on touch/press for mobile/tablet.
 * - Smooth fade & scale transition (150-200ms).
 * - Non-blocking (pointerEvents='none').
 */
export function Tooltip({
  text,
  children,
  position = 'top',
  delayMs = 80,
  autoHideMs = 1800,
  disabled = false,
  style,
  tooltipStyle,
  textStyle,
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const translateYAnim = useRef(new Animated.Value(position === 'top' ? 4 : -4)).current;
  const timerRef = useRef<any>(null);
  const hideTimerRef = useRef<any>(null);

  const showTooltip = useCallback(() => {
    if (disabled || !text) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);

    timerRef.current = setTimeout(() => {
      setVisible(true);
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.timing(translateYAnim, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start();
    }, delayMs);
  }, [disabled, text, delayMs, opacityAnim, scaleAnim, translateYAnim]);

  const hideTooltip = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);

    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.88,
        duration: 140,
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: position === 'top' ? 4 : -4,
        duration: 140,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
    });
  }, [opacityAnim, scaleAnim, translateYAnim, position]);

  const handleTouchBriefly = useCallback(() => {
    showTooltip();
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      hideTooltip();
    }, autoHideMs);
  }, [showTooltip, hideTooltip, autoHideMs]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  const webHoverProps =
    Platform.OS === 'web'
      ? {
          onMouseEnter: showTooltip,
          onMouseLeave: hideTooltip,
        }
      : {};

  return (
    <View
      style={[styles.container, style]}
      {...webHoverProps}
      onTouchStart={Platform.OS !== 'web' ? handleTouchBriefly : undefined}
      accessibilityRole="button"
      accessibilityLabel={text}
      accessibilityHint={`Action: ${text}`}
    >
      {children}

      {visible && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.tooltipBubble,
            position === 'top' ? styles.bubbleTop : styles.bubbleBottom,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }, { translateY: translateYAnim }],
            },
            tooltipStyle,
          ]}
        >
          <Text style={[styles.tooltipText, textStyle]} numberOfLines={1}>
            {text}
          </Text>
          <View
            style={[
              styles.caret,
              position === 'top' ? styles.caretBottom : styles.caretTop,
            ]}
          />
        </Animated.View>
      )}
    </View>
  );
}

export type IconButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  tooltip: string;
  onPress: () => void;
  size?: number;
  iconSize?: number;
  iconColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  badge?: string | number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Compact Icon Button with Integrated Micro-Tooltip & Press Scaling
 */
export function IconButton({
  icon,
  tooltip,
  onPress,
  size = 36,
  iconSize = 18,
  iconColor = colors.espresso,
  backgroundColor = colors.white,
  borderColor = colors.line,
  badge,
  disabled = false,
  style,
}: IconButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled) return;
    Animated.spring(scaleAnim, {
      toValue: 0.92,
      useNativeDriver: true,
      speed: 35,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
    }).start();
  };

  const handlePress = () => {
    if (disabled) return;
    triggerHaptic('light');
    onPress();
  };

  return (
    <Tooltip text={tooltip} disabled={disabled}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Pressable
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled}
          accessibilityLabel={tooltip}
          accessibilityRole="button"
          style={[
            styles.iconBtnBase,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor,
              borderColor,
              borderWidth: borderColor ? 1 : 0,
            },
            disabled && styles.btnDisabled,
            style,
          ]}
        >
          <Ionicons name={icon} size={iconSize} color={iconColor} />
          {badge !== undefined && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          )}
        </Pressable>
      </Animated.View>
    </Tooltip>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tooltipBubble: {
    position: 'absolute',
    backgroundColor: '#1E140C',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    zIndex: 99999,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
    ...Platform.select({
      web: {
        whiteSpace: 'nowrap',
        userSelect: 'none',
      },
    }),
  },
  bubbleTop: {
    bottom: '100%',
    marginBottom: 7,
  },
  bubbleBottom: {
    top: '100%',
    marginTop: 7,
  },
  tooltipText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  caret: {
    position: 'absolute',
    width: 6,
    height: 6,
    backgroundColor: '#1E140C',
    transform: [{ rotate: '45deg' }],
  },
  caretBottom: {
    bottom: -3,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  caretTop: {
    top: -3,
    borderLeftWidth: 1,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  iconBtnBase: {
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: colors.danger,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  badgeText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '900',
  },
});
