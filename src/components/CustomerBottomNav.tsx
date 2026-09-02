import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useOrders } from '@/src/context/OrderContext';
import { colors } from '@/src/theme';

export type CustomerNavTab = 'home' | 'explore' | 'orders' | 'cart' | 'profile';

export interface CustomerBottomNavProps {
  activeTab: CustomerNavTab;
}

export function CustomerBottomNav({ activeTab }: CustomerBottomNavProps) {
  const { cart } = useOrders();
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <View style={styles.bottomNavBar}>
      {/* 1. Home */}
      <Pressable
        style={styles.navItem}
        onPress={() => router.push('/')}
        accessibilityRole="tab"
        accessibilityLabel="Home"
      >
        <Ionicons
          name={activeTab === 'home' ? 'home' : 'home-outline'}
          size={22}
          color={activeTab === 'home' ? colors.espresso : colors.muted}
        />
        <Text style={[styles.navLabel, activeTab === 'home' && styles.navLabelActive]}>
          Home
        </Text>
      </Pressable>

      {/* 2. Explore / Restaurants */}
      <Pressable
        style={styles.navItem}
        onPress={() => router.push('/restaurants')}
        accessibilityRole="tab"
        accessibilityLabel="Explore Restaurants"
      >
        <Ionicons
          name={activeTab === 'explore' ? 'compass' : 'compass-outline'}
          size={22}
          color={activeTab === 'explore' ? colors.espresso : colors.muted}
        />
        <Text style={[styles.navLabel, activeTab === 'explore' && styles.navLabelActive]}>
          Explore
        </Text>
      </Pressable>

      {/* 3. Orders */}
      <Pressable
        style={styles.navItem}
        onPress={() => router.push('/orders')}
        accessibilityRole="tab"
        accessibilityLabel="My Orders"
      >
        <Ionicons
          name={activeTab === 'orders' ? 'receipt' : 'receipt-outline'}
          size={22}
          color={activeTab === 'orders' ? colors.espresso : colors.muted}
        />
        <Text style={[styles.navLabel, activeTab === 'orders' && styles.navLabelActive]}>
          Orders
        </Text>
      </Pressable>

      {/* 4. Cart */}
      <Pressable
        style={styles.navItem}
        onPress={() => router.push('/cart')}
        accessibilityRole="tab"
        accessibilityLabel={`Cart with ${cartCount} items`}
      >
        <View style={styles.iconWrap}>
          <Ionicons
            name={activeTab === 'cart' ? 'bag-handle' : 'bag-handle-outline'}
            size={22}
            color={activeTab === 'cart' ? colors.espresso : colors.muted}
          />
          {cartCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartCount}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.navLabel, activeTab === 'cart' && styles.navLabelActive]}>
          Cart
        </Text>
      </Pressable>

      {/* 5. My Profile */}
      <Pressable
        style={styles.navItem}
        onPress={() => router.push('/profile')}
        accessibilityRole="tab"
        accessibilityLabel="My Profile"
      >
        <Ionicons
          name={activeTab === 'profile' ? 'person' : 'person-outline'}
          size={22}
          color={activeTab === 'profile' ? colors.espresso : colors.muted}
        />
        <Text style={[styles.navLabel, activeTab === 'profile' && styles.navLabelActive]}>
          Profile
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNavBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 64,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 4,
    elevation: 8,
    shadowColor: colors.espresso,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    zIndex: 999,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  iconWrap: {
    position: 'relative',
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.muted,
    marginTop: 2,
  },
  navLabelActive: {
    color: colors.espresso,
    fontWeight: '800',
  },
  cartBadge: {
    position: 'absolute',
    top: -3,
    right: -7,
    backgroundColor: colors.caramel,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  cartBadgeText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '900',
  },
});
