import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useOrders } from '@/src/context/OrderContext';
import { colors, radii, shadows } from '@/src/theme';
import { triggerHaptic } from '@/src/components/UI';

export type CustomerNavTab = 'home' | 'explore' | 'orders' | 'cart' | 'profile';

export interface CustomerBottomNavProps {
  activeTab: CustomerNavTab;
}

export function CustomerBottomNav({ activeTab }: CustomerBottomNavProps) {
  const { cart } = useOrders();
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleNav = (tab: CustomerNavTab, route: string) => {
    if (activeTab !== tab) {
      triggerHaptic('light');
      router.push(route as any);
    }
  };

  return (
    <View style={styles.bottomNavBar}>
      <View style={styles.navInner}>
        {/* 1. Home */}
        <Pressable
          style={({ pressed }) => [styles.navItem, pressed && styles.navItemPressed]}
          onPress={() => handleNav('home', '/')}
          accessibilityRole="tab"
          accessibilityLabel="Home"
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <View style={[styles.iconWrap, activeTab === 'home' && styles.iconWrapActive]}>
            <Ionicons
              name={activeTab === 'home' ? 'home' : 'home-outline'}
              size={21}
              color={activeTab === 'home' ? colors.espresso : colors.muted}
            />
          </View>
          <Text style={[styles.navLabel, activeTab === 'home' && styles.navLabelActive]}>
            Home
          </Text>
        </Pressable>

        {/* 2. Explore / Restaurants */}
        <Pressable
          style={({ pressed }) => [styles.navItem, pressed && styles.navItemPressed]}
          onPress={() => handleNav('explore', '/restaurants')}
          accessibilityRole="tab"
          accessibilityLabel="Explore Restaurants"
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <View style={[styles.iconWrap, activeTab === 'explore' && styles.iconWrapActive]}>
            <Ionicons
              name={activeTab === 'explore' ? 'compass' : 'compass-outline'}
              size={21}
              color={activeTab === 'explore' ? colors.espresso : colors.muted}
            />
          </View>
          <Text style={[styles.navLabel, activeTab === 'explore' && styles.navLabelActive]}>
            Explore
          </Text>
        </Pressable>

        {/* 3. Orders */}
        <Pressable
          style={({ pressed }) => [styles.navItem, pressed && styles.navItemPressed]}
          onPress={() => handleNav('orders', '/orders')}
          accessibilityRole="tab"
          accessibilityLabel="My Orders"
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <View style={[styles.iconWrap, activeTab === 'orders' && styles.iconWrapActive]}>
            <Ionicons
              name={activeTab === 'orders' ? 'receipt' : 'receipt-outline'}
              size={21}
              color={activeTab === 'orders' ? colors.espresso : colors.muted}
            />
          </View>
          <Text style={[styles.navLabel, activeTab === 'orders' && styles.navLabelActive]}>
            Orders
          </Text>
        </Pressable>

        {/* 4. Cart */}
        <Pressable
          style={({ pressed }) => [styles.navItem, pressed && styles.navItemPressed]}
          onPress={() => handleNav('cart', '/cart')}
          accessibilityRole="tab"
          accessibilityLabel={`Cart with ${cartCount} items`}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <View style={[styles.iconWrap, activeTab === 'cart' && styles.iconWrapActive]}>
            <Ionicons
              name={activeTab === 'cart' ? 'bag-handle' : 'bag-handle-outline'}
              size={21}
              color={activeTab === 'cart' ? colors.espresso : colors.muted}
            />
            {cartCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartCount > 99 ? '99+' : cartCount}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.navLabel, activeTab === 'cart' && styles.navLabelActive]}>
            Cart
          </Text>
        </Pressable>

        {/* 5. My Profile */}
        <Pressable
          style={({ pressed }) => [styles.navItem, pressed && styles.navItemPressed]}
          onPress={() => handleNav('profile', '/profile')}
          accessibilityRole="tab"
          accessibilityLabel="My Profile"
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <View style={[styles.iconWrap, activeTab === 'profile' && styles.iconWrapActive]}>
            <Ionicons
              name={activeTab === 'profile' ? 'person' : 'person-outline'}
              size={21}
              color={activeTab === 'profile' ? colors.espresso : colors.muted}
            />
          </View>
          <Text style={[styles.navLabel, activeTab === 'profile' && styles.navLabelActive]}>
            Profile
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNavBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 68,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 6,
    ...shadows.lg,
    zIndex: 999,
  },
  navInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    maxWidth: 540,
    paddingHorizontal: 8,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    minHeight: 48,
  },
  navItemPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.94 }],
  },
  iconWrap: {
    position: 'relative',
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: colors.cream,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.muted,
    marginTop: 2,
    letterSpacing: 0.2,
  },
  navLabelActive: {
    color: colors.espresso,
    fontWeight: '900',
  },
  cartBadge: {
    position: 'absolute',
    top: -2,
    right: 4,
    backgroundColor: colors.caramel,
    minWidth: 18,
    height: 18,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: colors.white,
    ...shadows.sm,
  },
  cartBadgeText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '900',
  },
});

