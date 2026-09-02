import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useRestaurant } from '@/src/context/RestaurantContext';
import { CafeTable, useTables } from '@/src/context/TableContext';
import { useOrders } from '@/src/context/OrderContext';
import { supabase } from '@/src/lib/supabase';
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
  const { selectRestaurantBySlug } = useRestaurant();
  const { tables } = useTables();
  const { setOrderMode } = useOrders();
  const [status, setStatus] = useState('Setting up your table order…');

  useEffect(() => {
    let active = true;

    async function resolveAndRedirect() {
      if (!restaurantSlug) {
        router.replace('/');
        return;
      }

      setStatus(`Connecting to café…`);
      const targetRestaurant = await selectRestaurantBySlug(restaurantSlug);
      if (!targetRestaurant) {
        if (!active) return;
        setStatus(`Café "${restaurantSlug}" not found. Redirecting to all cafés…`);
        setTimeout(() => router.replace('/restaurants'), 1200);
        return;
      }

      if (!code) {
        if (!active) return;
        setStatus(`Opening ${targetRestaurant.name} menu…`);
        router.replace({
          pathname: '/menu',
          params: { restaurant: targetRestaurant.slug, mode: 'table' },
        });
        return;
      }

      setStatus(`Loading table ${code} for ${targetRestaurant.name}…`);

      // 1. Check in loaded tables first
      let matchedTable: CafeTable | undefined = tables.find(
        (t) =>
          t.restaurantId === targetRestaurant.id &&
          t.code.toLowerCase() === code.toLowerCase() &&
          t.active,
      );

      // 2. Query direct from Supabase if not in memory
      if (!matchedTable && supabase) {
        try {
          const { data, error } = await supabase
            .from('cafe_tables')
            .select('*')
            .eq('restaurant_id', targetRestaurant.id)
            .ilike('code', code.trim())
            .eq('active', true)
            .maybeSingle();

          if (data && !error) {
            matchedTable = {
              id: data.id,
              restaurantId: data.restaurant_id,
              code: data.code,
              name: data.display_name,
              active: data.active,
            };
          }
        } catch {
          // fallback
        }
      }

      // 3. Fallback table object if table code exists
      if (!matchedTable) {
        matchedTable = {
          id: `tbl-${code.toLowerCase()}`,
          restaurantId: targetRestaurant.id,
          code: code.toUpperCase(),
          name: `Table ${code.toUpperCase()}`,
          active: true,
        };
      }

      if (!active) return;

      // Set orderMode to table with matched table
      setOrderMode('table', matchedTable);
      setStatus(`Table ${matchedTable.name} confirmed! Opening menu…`);

      // Navigate directly to /menu with restaurant and table params
      router.replace({
        pathname: '/menu',
        params: {
          restaurant: targetRestaurant.slug,
          table: matchedTable.code,
          mode: 'table',
        },
      });
    }

    void resolveAndRedirect();

    return () => {
      active = false;
    };
  }, [restaurantSlug, code, selectRestaurantBySlug, tables, setOrderMode]);

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
