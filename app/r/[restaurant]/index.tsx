import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useRestaurant } from '@/src/context/RestaurantContext';
import { useOrders } from '@/src/context/OrderContext';
import { colors } from '@/src/theme';
import { Screen } from '@/src/components/UI';

export default function RestaurantDirectLandingRoute() {
  const { restaurant: restaurantSlug } = useLocalSearchParams<{ restaurant?: string }>();
  const { selectRestaurantBySlug } = useRestaurant();
  const { setOrderMode } = useOrders();
  const [status, setStatus] = useState('Connecting to café…');

  useEffect(() => {
    let active = true;

    async function resolveAndRedirect() {
      if (!restaurantSlug) {
        router.replace('/restaurants');
        return;
      }

      setStatus(`Loading café…`);
      const targetRestaurant = await selectRestaurantBySlug(restaurantSlug);
      if (!targetRestaurant) {
        if (!active) return;
        setStatus(`Café "${restaurantSlug}" not found. Redirecting to all cafés…`);
        setTimeout(() => router.replace('/restaurants'), 1200);
        return;
      }

      if (!active) return;

      // Ensure normal pickup ordering context
      setOrderMode('pickup');
      setStatus(`Opening ${targetRestaurant.name}…`);

      router.replace({
        pathname: '/menu',
        params: {
          restaurant: targetRestaurant.slug,
          mode: 'pickup',
        },
      });
    }

    void resolveAndRedirect();

    return () => {
      active = false;
    };
  }, [restaurantSlug, selectRestaurantBySlug, setOrderMode]);

  return (
    <Screen>
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.espresso} />
        <Text style={s.title}>Café Menu</Text>
        <Text style={s.status}>{status}</Text>
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  center: {
    flex: 1,
    minHeight: 400,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.espresso,
    marginTop: 18,
  },
  status: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
});
