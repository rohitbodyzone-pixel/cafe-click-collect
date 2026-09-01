import { useLocalSearchParams } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Header, Screen } from '@/src/components/UI';
import { useTables } from '@/src/context/TableContext';
import { useRestaurant } from '@/src/context/RestaurantContext';
import { useAdminAuth } from '@/src/context/AdminAuthContext';
import { colors } from '@/src/theme';

export default function TableQr() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentRestaurant } = useRestaurant();
  const { staff } = useAdminAuth();
  const { tables } = useTables();

  const table = tables.find((item) => item.id === id);
  const restaurantName = currentRestaurant.name;
  const restaurantSlug = currentRestaurant.slug;

  const origin =
    Platform.OS === 'web' && typeof window !== 'undefined'
      ? window.location.origin
      : 'https://app.cafecollect.co.nz';

  // Support both clean deep link and query params
  const qrUrl = `${origin}/r/${encodeURIComponent(restaurantSlug)}/table/${encodeURIComponent(table?.code || '')}`;

  return (
    <Screen>
      <Header title="Printable Table QR" />
      <View style={styles.sheet}>
        <Text style={styles.brand}>{restaurantName.toUpperCase()}</Text>
        <Text style={styles.table}>{table?.name || 'Table'}</Text>
        <Text style={styles.tableCode}>Table Code: {table?.code}</Text>
        <Text style={styles.prompt}>Scan with your camera to view menu & order</Text>
        <View style={styles.qr}>
          <QRCode
            value={qrUrl}
            size={220}
            color={colors.espresso}
            backgroundColor="#FFFFFF"
          />
        </View>
        <Text style={styles.url}>{qrUrl}</Text>
      </View>
      {Platform.OS === 'web' && (
        <Pressable
          style={styles.print}
          onPress={() => {
            if (typeof window !== 'undefined') window.print();
          }}
        >
          <Text style={styles.printText}>Print QR Table Sign</Text>
        </Pressable>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  sheet: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 30,
  },
  brand: {
    color: colors.caramel,
    fontWeight: '800',
    letterSpacing: 2,
    fontSize: 12,
  },
  table: {
    color: colors.espresso,
    fontWeight: '900',
    fontSize: 32,
    marginTop: 10,
  },
  tableCode: {
    color: colors.muted,
    fontWeight: '700',
    fontSize: 12,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  prompt: {
    color: colors.muted,
    marginTop: 6,
    marginBottom: 20,
    fontSize: 13,
  },
  qr: {
    padding: 16,
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
  },
  url: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 18,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  print: {
    backgroundColor: colors.espresso,
    borderRadius: 16,
    padding: 17,
    alignItems: 'center',
    marginTop: 18,
  },
  printText: {
    color: colors.white,
    fontWeight: '800',
  },
});
