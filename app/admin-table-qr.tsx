import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Card, Header, Screen } from '@/src/components/UI';
import { useTables } from '@/src/context/TableContext';
import { useRestaurant } from '@/src/context/RestaurantContext';
import { colors } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';

type QrType = 'table' | 'menu' | 'pickup' | 'starter_pack';

export default function UniversalQrHubScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { currentRestaurant } = useRestaurant();
  const { tables } = useTables();

  const [qrType, setQrType] = useState<QrType>(id ? 'table' : 'menu');
  const [selectedTableId, setSelectedTableId] = useState<string>(id || tables[0]?.id || '');

  const activeTable = tables.find((t) => t.id === selectedTableId) || tables[0];
  const origin =
    Platform.OS === 'web' && typeof window !== 'undefined'
      ? window.location.origin
      : 'https://rohitbodyzone-pixel.github.io/cafe-click-collect';

  const getTargetUrl = () => {
    switch (qrType) {
      case 'table':
        return `${origin}/r/${encodeURIComponent(currentRestaurant.slug)}/table/${encodeURIComponent(activeTable?.code || '1')}`;
      case 'menu':
        return `${origin}/menu?restaurant=${encodeURIComponent(currentRestaurant.slug)}`;
      case 'pickup':
        return `${origin}/order-status`;
      default:
        return `${origin}/menu?restaurant=${encodeURIComponent(currentRestaurant.slug)}`;
    }
  };

  const qrUrl = getTargetUrl();

  return (
    <Screen>
      <Header title="Universal QR Hub" />

      {/* QR Type Selector Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.typeScroll}>
        <Pressable
          style={[s.typePill, qrType === 'menu' && s.typePillActive]}
          onPress={() => setQrType('menu')}
        >
          <Ionicons
            name="restaurant-outline"
            size={14}
            color={qrType === 'menu' ? colors.white : colors.espresso}
          />
          <Text style={[s.typePillText, qrType === 'menu' && s.typePillTextActive]}>
            Menu & Counter QR
          </Text>
        </Pressable>

        <Pressable
          style={[s.typePill, qrType === 'table' && s.typePillActive]}
          onPress={() => setQrType('table')}
        >
          <Ionicons
            name="grid-outline"
            size={14}
            color={qrType === 'table' ? colors.white : colors.espresso}
          />
          <Text style={[s.typePillText, qrType === 'table' && s.typePillTextActive]}>
            Table Service QR
          </Text>
        </Pressable>

        <Pressable
          style={[s.typePill, qrType === 'pickup' && s.typePillActive]}
          onPress={() => setQrType('pickup')}
        >
          <Ionicons
            name="bag-handle-outline"
            size={14}
            color={qrType === 'pickup' ? colors.white : colors.espresso}
          />
          <Text style={[s.typePillText, qrType === 'pickup' && s.typePillTextActive]}>
            Pickup Bay QR
          </Text>
        </Pressable>

        <Pressable
          style={[s.typePill, qrType === 'starter_pack' && s.typePillActive]}
          onPress={() => setQrType('starter_pack')}
        >
          <Ionicons
            name="albums-outline"
            size={14}
            color={qrType === 'starter_pack' ? colors.white : colors.espresso}
          />
          <Text style={[s.typePillText, qrType === 'starter_pack' && s.typePillTextActive]}>
            📦 20-Table Starter Pack
          </Text>
        </Pressable>
      </ScrollView>

      {/* Table Selector Dropdown (if table mode) */}
      {qrType === 'table' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tableScroll}>
          {tables.map((t) => (
            <Pressable
              key={t.id}
              style={[s.tablePill, selectedTableId === t.id && s.tablePillActive]}
              onPress={() => setSelectedTableId(t.id)}
            >
              <Text style={[s.tablePillText, selectedTableId === t.id && s.tablePillTextActive]}>
                {t.name} (Code: {t.code})
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* 20-Table Starter Pack Grid */}
      {qrType === 'starter_pack' ? (
        <View style={s.starterGrid}>
          <Text style={s.starterHeading}>
            20-Table QR Starter Pack ({currentRestaurant.name})
          </Text>
          <Text style={s.starterSub}>
            Print all 20 tables on A4 / tent cards for your dining room.
          </Text>

          <View style={s.starterCardsContainer}>
            {tables.slice(0, 20).map((t) => {
              const tableUrl = `${origin}/r/${encodeURIComponent(currentRestaurant.slug)}/table/${encodeURIComponent(t.code)}`;
              return (
                <View key={t.id} style={s.starterCard}>
                  <Text style={s.starterBrand}>{currentRestaurant.name.toUpperCase()}</Text>
                  <Text style={s.starterTableNum}>{t.name.toUpperCase()}</Text>
                  <Text style={s.starterScanPrompt}>Scan to Order & Pay</Text>
                  <View style={s.starterQrBox}>
                    <QRCode
                      value={tableUrl}
                      size={110}
                      color={colors.espresso}
                      backgroundColor="#FFFFFF"
                    />
                  </View>
                  <Text style={s.starterCodeBadge}>Code: {t.code}</Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : (
        /* Single Printable Poster Sheet */
        <View style={s.sheet}>
          <Text style={s.brand}>{currentRestaurant.name.toUpperCase()}</Text>
          <Text style={s.heading}>
            {qrType === 'table'
              ? activeTable?.name || 'Table QR'
              : qrType === 'menu'
              ? 'Scan to View Menu'
              : 'Click & Collect Check-in'}
          </Text>
          <Text style={s.subheading}>
            {qrType === 'table'
              ? 'Order food & drinks right to your seat'
              : 'Skip the counter queue and order directly on your mobile'}
          </Text>

          <View style={s.qrBox}>
            <QRCode
              value={qrUrl}
              size={200}
              color={colors.espresso}
              backgroundColor="#FFFFFF"
            />
          </View>

          <Text style={s.urlText}>{qrUrl}</Text>
        </View>
      )}

      {/* Print CTA */}
      <Pressable
        style={s.printBtn}
        onPress={() => {
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            window.print();
          } else {
            alert('Printing is enabled on desktop browser.');
          }
        }}
      >
        <Ionicons name="print-outline" size={18} color={colors.white} />
        <Text style={s.printBtnText}>Print QR Poster / Sign</Text>
      </Pressable>
    </Screen>
  );
}

const s = StyleSheet.create({
  typeScroll: { flexDirection: 'row', marginBottom: 12 },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.cream,
    marginRight: 8,
  },
  typePillActive: { backgroundColor: colors.espresso },
  typePillText: { fontSize: 12, fontWeight: '800', color: colors.espresso },
  typePillTextActive: { color: colors.white },
  tableScroll: { flexDirection: 'row', marginBottom: 12 },
  tablePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    marginRight: 6,
  },
  tablePillActive: { backgroundColor: colors.espresso, borderColor: colors.espresso },
  tablePillText: { fontSize: 11, fontWeight: '700', color: colors.ink },
  tablePillTextActive: { color: colors.white },
  sheet: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 24,
    marginVertical: 6,
  },
  brand: { color: colors.caramel, fontWeight: '900', letterSpacing: 1.5, fontSize: 11 },
  heading: { color: colors.espresso, fontWeight: '900', fontSize: 24, marginVertical: 6 },
  subheading: { color: colors.muted, fontSize: 12, textAlign: 'center', marginBottom: 18 },
  qrBox: {
    padding: 14,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
  },
  urlText: {
    color: colors.muted,
    fontSize: 9,
    marginTop: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textAlign: 'center',
  },
  printBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.espresso,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 14,
  },
  printBtnText: { color: colors.white, fontWeight: '900', fontSize: 14 },

  // Starter Pack Grid Styles
  starterGrid: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: colors.line,
  },
  starterHeading: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.espresso,
    textAlign: 'center',
    marginBottom: 4,
  },
  starterSub: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 16,
  },
  starterCardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  starterCard: {
    width: '46%',
    minWidth: 150,
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#EBD8B8',
    padding: 12,
    alignItems: 'center',
    marginVertical: 4,
  },
  starterBrand: {
    fontSize: 9,
    fontWeight: '900',
    color: colors.caramel,
    letterSpacing: 0.8,
  },
  starterTableNum: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.espresso,
    marginVertical: 2,
  },
  starterScanPrompt: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.muted,
    marginBottom: 8,
  },
  starterQrBox: {
    padding: 6,
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
  },
  starterCodeBadge: {
    fontSize: 9,
    color: colors.muted,
    fontWeight: '700',
    marginTop: 6,
  },
});
