import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useRestaurant } from '@/src/context/RestaurantContext';
import { CafeTable, useTables } from '@/src/context/TableContext';
import { useOrders } from '@/src/context/OrderContext';
import { supabase } from '@/src/lib/supabase';
import { colors, radii, shadows } from '@/src/theme';
import { Button, Card, Screen } from '@/src/components/UI';
import { Ionicons } from '@expo/vector-icons';

type TableCheckState = 'loading' | 'valid' | 'disabled' | 'invalid';

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

  const [state, setState] = useState<TableCheckState>('loading');
  const [statusMessage, setStatusMessage] = useState('Connecting to café table…');
  const [restaurantName, setRestaurantName] = useState('');
  const [resolvedRestaurantSlug, setResolvedRestaurantSlug] = useState('');

  useEffect(() => {
    let active = true;

    async function resolveAndRedirect() {
      if (!restaurantSlug) {
        router.replace('/restaurants');
        return;
      }

      setStatusMessage('Connecting to café…');
      const targetRestaurant = await selectRestaurantBySlug(restaurantSlug);
      if (!targetRestaurant) {
        if (!active) return;
        setState('invalid');
        setStatusMessage(`Café "${restaurantSlug}" not found.`);
        return;
      }

      setRestaurantName(targetRestaurant.name);
      setResolvedRestaurantSlug(targetRestaurant.slug);

      if (!code || !code.trim()) {
        if (!active) return;
        setState('invalid');
        setStatusMessage('No table code specified in QR link.');
        return;
      }

      setStatusMessage(`Verifying Table ${code} for ${targetRestaurant.name}…`);

      // 1. Check in memory tables first
      let tableRecord: CafeTable | undefined = tables.find(
        (t) =>
          t.restaurantId === targetRestaurant.id &&
          t.code.toString().toLowerCase() === code.trim().toLowerCase(),
      );

      // 2. If not found in memory, query direct from Supabase
      if (!tableRecord && supabase) {
        try {
          const { data, error } = await supabase
            .from('cafe_tables')
            .select('*')
            .eq('restaurant_id', targetRestaurant.id)
            .ilike('code', code.trim())
            .maybeSingle();

          if (data && !error) {
            tableRecord = {
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

      // 3. Fallback table check: if numeric table between 1 and 20
      const numericCode = parseInt(code.trim(), 10);
      if (!tableRecord && !isNaN(numericCode) && numericCode >= 1 && numericCode <= 20) {
        tableRecord = {
          id: `tbl-${targetRestaurant.id}-${numericCode}`,
          restaurantId: targetRestaurant.id,
          code: String(numericCode),
          name: `Table ${numericCode}`,
          active: true,
        };
      }

      if (!active) return;

      // 4. Validate Table Record Existence
      if (!tableRecord) {
        setState('invalid');
        setStatusMessage(`Table "${code}" does not exist for ${targetRestaurant.name}.`);
        return;
      }

      // 5. Validate Active Status
      if (!tableRecord.active) {
        setState('disabled');
        setStatusMessage(`Table "${tableRecord.name}" is currently disabled by restaurant staff.`);
        return;
      }

      // 6. Valid & Active Table Found -> Lock Table Mode and redirect
      setState('valid');
      setOrderMode('table', tableRecord);
      setStatusMessage(`Table ${tableRecord.name} confirmed! Opening menu…`);

      router.replace({
        pathname: '/menu',
        params: {
          restaurant: targetRestaurant.slug,
          table: tableRecord.code,
          mode: 'table',
        },
      });
    }

    void resolveAndRedirect();

    return () => {
      active = false;
    };
  }, [restaurantSlug, code, selectRestaurantBySlug, tables, setOrderMode]);

  if (state === 'disabled') {
    return (
      <Screen>
        <View style={s.errorContainer}>
          <Card style={s.errorCard}>
            <View style={[s.iconCircle, { backgroundColor: '#FDF3D8' }]}>
              <Ionicons name="alert-circle" size={36} color="#D97706" />
            </View>
            <Text style={s.errorHeading}>Table Unavailable</Text>
            <Text style={s.errorDescription}>
              This table is currently unavailable.
            </Text>
            <Text style={s.errorSubText}>
              {restaurantName} · Table {code}{'\n'}
              Please order at the counter or ask our staff for assistance.
            </Text>

            <View style={s.btnStack}>
              <Button
                label="Browse Menu for Pickup"
                icon="bag-handle-outline"
                onPress={() => {
                  setOrderMode('pickup');
                  router.replace({
                    pathname: '/menu',
                    params: {
                      restaurant: resolvedRestaurantSlug || restaurantSlug,
                      mode: 'pickup',
                    },
                  });
                }}
              />
              <View style={{ height: 10 }} />
              <Button
                label="Browse All Cafés"
                secondary
                icon="storefront-outline"
                onPress={() => router.replace('/restaurants')}
              />
            </View>
          </Card>
        </View>
      </Screen>
    );
  }

  if (state === 'invalid') {
    return (
      <Screen>
        <View style={s.errorContainer}>
          <Card style={s.errorCard}>
            <View style={[s.iconCircle, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="close-circle" size={36} color={colors.danger} />
            </View>
            <Text style={s.errorHeading}>Invalid Table QR</Text>
            <Text style={s.errorDescription}>
              Invalid table QR.
            </Text>
            <Text style={s.errorSubText}>
              {statusMessage || `This QR code does not belong to a valid table for ${restaurantName || 'this café'}.`}
            </Text>

            <View style={s.btnStack}>
              <Button
                label="Browse Menu for Pickup"
                icon="bag-handle-outline"
                onPress={() => {
                  setOrderMode('pickup');
                  router.replace({
                    pathname: '/menu',
                    params: {
                      restaurant: resolvedRestaurantSlug || restaurantSlug,
                      mode: 'pickup',
                    },
                  });
                }}
              />
              <View style={{ height: 10 }} />
              <Button
                label="Browse All Cafés"
                secondary
                icon="storefront-outline"
                onPress={() => router.replace('/restaurants')}
              />
            </View>
          </Card>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.espresso} />
        <Text style={s.title}>QR Table Ordering</Text>
        <Text style={s.status}>{statusMessage}</Text>
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
  errorContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 450,
  },
  errorCard: {
    width: '100%',
    maxWidth: 420,
    padding: 28,
    alignItems: 'center',
    borderRadius: 24,
    ...shadows.md,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  errorHeading: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.espresso,
    textAlign: 'center',
    marginBottom: 6,
  },
  errorDescription: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.ink,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubText: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  btnStack: {
    width: '100%',
  },
});
