import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Card, Header, Screen } from '@/src/components/UI';
import { useTables } from '@/src/context/TableContext';
import { useRestaurant } from '@/src/context/RestaurantContext';
import { colors, radii, shadows } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';

type QrTabType = 'menu' | 'table' | 'starter_pack';

export default function UniversalQrHubScreen() {
  const { id, type } = useLocalSearchParams<{ id?: string; type?: string }>();
  const { currentRestaurant } = useRestaurant();
  const { tables } = useTables();

  const initialTab: QrTabType =
    type === 'starter_pack'
      ? 'starter_pack'
      : type === 'table' || id
      ? 'table'
      : 'menu';

  const [activeTab, setActiveTab] = useState<QrTabType>(initialTab);
  const [selectedTableId, setSelectedTableId] = useState<string>(id || tables[0]?.id || '');

  const activeTable = tables.find((t) => t.id === selectedTableId) || tables[0] || {
    id: 'tbl-1',
    restaurantId: currentRestaurant.id,
    code: '1',
    name: 'Table 1',
    active: true,
  };

  const origin =
    Platform.OS === 'web' && typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.hostname.includes('github.io') ? '/cafe-click-collect' : ''}`
      : 'https://rohitbodyzone-pixel.github.io/cafe-click-collect';

  const restaurantMenuQrUrl = `${origin}/r/${encodeURIComponent(currentRestaurant.slug)}/menu/`;
  const singleTableQrUrl = `${origin}/r/${encodeURIComponent(currentRestaurant.slug)}/table/${encodeURIComponent(activeTable?.code || '1')}/`;

  // Fallback 20 tables list if less than 20 loaded
  const displayTables =
    tables.length >= 20
      ? tables.slice(0, 20)
      : Array.from({ length: 20 }, (_, i) => {
          const num = i + 1;
          const found = tables.find((t) => t.code === String(num));
          return (
            found || {
              id: `tbl-${currentRestaurant.id}-${num}`,
              restaurantId: currentRestaurant.id,
              code: String(num),
              name: `Table ${num}`,
              active: true,
            }
          );
        });

  return (
    <Screen>
      <Header title="Tables & QR Codes" />

      {/* Mode Selector Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabScroll}>
        <Pressable
          style={[s.tabPill, activeTab === 'menu' && s.tabPillActive]}
          onPress={() => setActiveTab('menu')}
        >
          <Ionicons
            name="storefront-outline"
            size={15}
            color={activeTab === 'menu' ? colors.white : colors.espresso}
          />
          <Text style={[s.tabPillText, activeTab === 'menu' && s.tabPillTextActive]}>
            Section A: Restaurant Menu QR
          </Text>
        </Pressable>

        <Pressable
          style={[s.tabPill, activeTab === 'table' && s.tabPillActive]}
          onPress={() => setActiveTab('table')}
        >
          <Ionicons
            name="grid-outline"
            size={15}
            color={activeTab === 'table' ? colors.white : colors.espresso}
          />
          <Text style={[s.tabPillText, activeTab === 'table' && s.tabPillTextActive]}>
            Section B: Table QR Codes
          </Text>
        </Pressable>

        <Pressable
          style={[s.tabPill, activeTab === 'starter_pack' && s.tabPillActive]}
          onPress={() => setActiveTab('starter_pack')}
        >
          <Ionicons
            name="albums-outline"
            size={15}
            color={activeTab === 'starter_pack' ? colors.white : colors.espresso}
          />
          <Text style={[s.tabPillText, activeTab === 'starter_pack' && s.tabPillTextActive]}>
            📦 20-Table Starter Pack
          </Text>
        </Pressable>
      </ScrollView>

      {/* ======================================================== */}
      {/* SECTION A: RESTAURANT / COUNTER MENU QR                  */}
      {/* ======================================================== */}
      {activeTab === 'menu' && (
        <View style={s.sheetContainer}>
          <View style={s.printCard}>
            <Text style={s.printBrand}>{currentRestaurant.name.toUpperCase()}</Text>
            <Text style={s.printHeadline}>SCAN TO VIEW MENU</Text>
            <Text style={s.printSubText}>Skip the queue · Browse on your phone</Text>

            <View style={s.qrWrapper}>
              <QRCode
                value={restaurantMenuQrUrl}
                size={210}
                color={colors.espresso}
                backgroundColor="#FFFFFF"
              />
            </View>

            <View style={s.noTableBadge}>
              <Text style={s.noTableBadgeText}>RESTAURANT COUNTER QR (NO TABLE NUMBER)</Text>
            </View>
            <Text style={s.urlDisplay}>{restaurantMenuQrUrl}</Text>
          </View>
        </View>
      )}

      {/* ======================================================== */}
      {/* SECTION B: SINGLE TABLE QR PREVIEW & PRINT               */}
      {/* ======================================================== */}
      {activeTab === 'table' && (
        <View>
          {/* Table Selector Pills */}
          <Text style={s.selectorTitle}>CHOOSE TABLE TO PRINT:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tablePillScroll}>
            {displayTables.map((t) => (
              <Pressable
                key={t.id}
                style={[s.tablePill, selectedTableId === t.id && s.tablePillActive]}
                onPress={() => setSelectedTableId(t.id)}
              >
                <Text style={[s.tablePillText, selectedTableId === t.id && s.tablePillTextActive]}>
                  {t.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={s.sheetContainer}>
            <View style={s.printCard}>
              <Text style={s.printBrand}>{currentRestaurant.name.toUpperCase()}</Text>
              <Text style={s.printTableHeading}>{activeTable.name.toUpperCase()}</Text>
              <Text style={s.printHeadline}>SCAN TO ORDER</Text>
              <Text style={s.printSubText}>Food & beverages served to your seat</Text>

              <View style={s.qrWrapper}>
                <QRCode
                  value={singleTableQrUrl}
                  size={210}
                  color={colors.espresso}
                  backgroundColor="#FFFFFF"
                />
              </View>

              <View style={[s.noTableBadge, { backgroundColor: colors.cream }]}>
                <Text style={[s.noTableBadgeText, { color: colors.espresso }]}>
                  LOCKED TO {activeTable.name.toUpperCase()} · DINE-IN
                </Text>
              </View>
              <Text style={s.urlDisplay}>{singleTableQrUrl}</Text>
            </View>
          </View>
        </View>
      )}

      {/* ======================================================== */}
      {/* 📦 20-TABLE QR STARTER PACK (PRINT ALL 20 TABLES)        */}
      {/* ======================================================== */}
      {activeTab === 'starter_pack' && (
        <View style={s.starterPackContainer}>
          <View style={s.starterHeader}>
            <Text style={s.starterTitle}>20-Table QR Starter Pack</Text>
            <Text style={s.starterSub}>
              {currentRestaurant.name} · Ready-to-print tent cards for Tables 1 through 20.
            </Text>
          </View>

          <View style={s.starterCardsGrid}>
            {displayTables.map((t) => {
              const tableUrl = `${origin}/r/${encodeURIComponent(currentRestaurant.slug)}/table/${encodeURIComponent(t.code)}/`;
              return (
                <View key={t.id} style={s.starterCardItem}>
                  <Text style={s.starterCardBrand}>{currentRestaurant.name.toUpperCase()}</Text>
                  <Text style={s.starterCardTable}>{t.name.toUpperCase()}</Text>
                  <Text style={s.starterCardPrompt}>SCAN TO ORDER</Text>

                  <View style={s.starterCardQrBox}>
                    <QRCode
                      value={tableUrl}
                      size={115}
                      color={colors.espresso}
                      backgroundColor="#FFFFFF"
                    />
                  </View>

                  <Text style={s.starterCardCode}>Code: {t.code}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Universal Print Button */}
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
        <Text style={s.printBtnText}>
          {activeTab === 'starter_pack'
            ? 'Print All 20 Table Tent Cards'
            : activeTab === 'menu'
            ? 'Print Restaurant Menu Poster'
            : `Print ${activeTable.name} Card`}
        </Text>
      </Pressable>
    </Screen>
  );
}

const s = StyleSheet.create({
  tabScroll: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: colors.cream,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.line,
  },
  tabPillActive: {
    backgroundColor: colors.espresso,
    borderColor: colors.espresso,
  },
  tabPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.espresso,
  },
  tabPillTextActive: {
    color: colors.white,
  },
  selectorTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.caramel,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  tablePillScroll: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  tablePill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    marginRight: 6,
  },
  tablePillActive: {
    backgroundColor: colors.espresso,
    borderColor: colors.espresso,
  },
  tablePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.ink,
  },
  tablePillTextActive: {
    color: colors.white,
  },
  sheetContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  printCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.white,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#E6D7C3',
    padding: 28,
    alignItems: 'center',
    ...shadows.md,
  },
  printBrand: {
    color: colors.caramel,
    fontWeight: '900',
    letterSpacing: 1.5,
    fontSize: 12,
  },
  printTableHeading: {
    color: colors.espresso,
    fontWeight: '900',
    fontSize: 26,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  printHeadline: {
    color: colors.espresso,
    fontWeight: '900',
    fontSize: 20,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  printSubText: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
    marginBottom: 18,
    textAlign: 'center',
  },
  qrWrapper: {
    padding: 16,
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.line,
    ...shadows.sm,
  },
  noTableBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radii.full,
    marginTop: 18,
    marginBottom: 6,
  },
  noTableBadgeText: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  urlDisplay: {
    color: colors.muted,
    fontSize: 9,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textAlign: 'center',
  },
  starterPackContainer: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: colors.line,
  },
  starterHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  starterTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.espresso,
  },
  starterSub: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  starterCardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  starterCardItem: {
    width: '46%',
    minWidth: 150,
    backgroundColor: '#FFFDF9',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#EBD8B8',
    padding: 12,
    alignItems: 'center',
  },
  starterCardBrand: {
    fontSize: 8,
    fontWeight: '900',
    color: colors.caramel,
    letterSpacing: 1,
  },
  starterCardTable: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.espresso,
    marginTop: 2,
  },
  starterCardPrompt: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.muted,
    marginBottom: 8,
  },
  starterCardQrBox: {
    padding: 6,
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
  },
  starterCardCode: {
    fontSize: 9,
    color: colors.muted,
    fontWeight: '800',
    marginTop: 6,
  },
  printBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.espresso,
    borderRadius: 14,
    paddingVertical: 14,
    marginVertical: 14,
    ...shadows.sm,
  },
  printBtnText: {
    color: colors.white,
    fontWeight: '900',
    fontSize: 14,
  },
});
