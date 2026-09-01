import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useRestaurant } from '@/src/context/RestaurantContext';
import { useTables } from '@/src/context/TableContext';
import { useOrders } from '@/src/context/OrderContext';
import { colors } from '@/src/theme';
import { Screen } from '@/src/components/UI';

export default function TableLandingRoute() {
  const { restaurant: restaurantSlug, tableCode, table: tableParam } =
    useLocalSearchParams<{
      restaurant?: string;
      tableCode?: string;
      table?: string;
    }>();

  const code = tableCode || tableParam || '';
  const { currentRestaurant, selectRestaurantBySlug, loading: loadingRestaurants } =
    useRestaurant();
  const { tables, loading: loadingTables } = useTables();
  const { setOrderMode } = useOrders();
  const [status, setStatus] = useState('Setting up your table order…');

  useEffect(() => {
    async function initTable() {
      if (!restaurantSlug) {
        router.replace('/');
        return;
      }

      setStatus(`Connecting to ${restaurantSlug}…`);
      const targetRestaurant = await selectRestaurantBySlug(restaurantSlug);
      if (!targetRestaurant) {
        setStatus(`Café "${restaurantSlug}" not found. Redirecting to all cafés…`);
        setTimeout(() => router.replace('/restaurants'), 1500);
        return;
      }

      setStatus(`Loading table ${code} for ${targetRestaurant.name}…`);
    }

    void initTable();
  }, [restaurantSlug, selectRestaurantBySlug, code]);

  useEffect(() => {
    if (loadingTables || !code) return;
    const found = tables.find(
      (item) => item.code.toLowerCase() === code.toLowerCase() && item.active,
    );

    if (found) {
      setOrderMode('table', found);
      router.replace({
        pathname: '/',
        params: {
          restaurant: currentRestaurant.slug,
          table: found.code,
        },
      });
    } else if (tables.length > 0) {
      setStatus(`Table "${code}" is not active. Redirecting to menu…`);
      setTimeout(() => {
        router.replace({
          pathname: '/',
          params: { restaurant: currentRestaurant.slug },
        });
      }, 1500);
    }
  }, [tables, loadingTables, code, currentRestaurant.slug, setOrderMode]);

  return (
    <Screen>
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.espresso} />
        <Text style={s.title}>QR Table Ordering</Text>
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
