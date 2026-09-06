import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Header, Screen, Tooltip } from '@/src/components/UI';
import { useTables } from '@/src/context/TableContext';
import { useRestaurant } from '@/src/context/RestaurantContext';
import { colors, radii, shadows } from '@/src/theme';

export default function AdminTablesScreen() {
  const { currentRestaurant } = useRestaurant();
  const { tables, loading, error, addTable, updateTable, removeTable } =
    useTables();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const origin =
    Platform.OS === 'web' && typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.hostname.includes('github.io') ? '/cafe-click-collect' : ''}`
      : 'https://rohitbodyzone-pixel.github.io/cafe-click-collect';

  const restaurantMenuQrUrl = `${origin}/r/${encodeURIComponent(currentRestaurant.slug)}/menu/`;

  const add = async () => {
    setBusy(true);
    setMessage('');
    try {
      await addTable(code, name);
      setCode('');
      setName('');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not add table.');
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = (id: string, tableName: string) => {
    if (Platform.OS === 'web') {
      if (confirm(`Remove table "${tableName}"?`)) {
        void removeTable(id);
      }
    } else {
      Alert.alert('Remove table?', tableName, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => void removeTable(id),
        },
      ]);
    }
  };

  return (
    <Screen>
      <Header title="Tables & QR Codes" />

      {/* Top Banner */}
      <View style={s.banner}>
        <Ionicons name="storefront-outline" size={16} color={colors.caramel} />
        <Text style={s.bannerText}>
          Managing QR Codes & Tables for <Text style={s.bold}>{currentRestaurant.name}</Text>
        </Text>
      </View>

      {/* ====================================================== */}
      {/* SECTION A: RESTAURANT / COUNTER MENU QR                */}
      {/* ====================================================== */}
      <View style={s.sectionWrap}>
        <View style={s.sectionHeaderRow}>
          <View style={s.sectionBadgeA}>
            <Text style={s.sectionBadgeText}>SECTION A</Text>
          </View>
          <Text style={s.sectionTitle}>RESTAURANT MENU QR (NO TABLE NUMBER)</Text>
        </View>
        <Text style={s.sectionHelp}>
          Place this QR at your counter, entrance or pickup bay for normal Click & Collect mobile ordering.
        </Text>

        <Card style={s.counterQrCard}>
          <View style={s.counterQrContent}>
            <View style={s.counterQrBox}>
              <QRCode
                value={restaurantMenuQrUrl}
                size={110}
                color={colors.espresso}
                backgroundColor="#FFFFFF"
              />
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={s.counterCardBrand}>{currentRestaurant.name.toUpperCase()}</Text>
              <Text style={s.counterCardHeading}>SCAN TO VIEW MENU</Text>
              <Text style={s.counterCardSub}>
                • Direct access to full menu{'\n'}
                • No table number attached{'\n'}
                • Normal Click & Collect flow
              </Text>
              <Text style={s.counterCardUrl}>{restaurantMenuQrUrl}</Text>
            </View>
          </View>

          <View style={s.counterBtnRow}>
            <Tooltip text="Open Printable Sign">
              <Pressable
                style={s.counterPrintBtn}
                onPress={() =>
                  router.push({
                    pathname: '/admin-table-qr',
                    params: { type: 'menu' },
                  })
                }
              >
                <Ionicons name="print-outline" size={15} color={colors.white} />
                <Text style={s.counterPrintBtnText}>Print Counter Menu Sign</Text>
              </Pressable>
            </Tooltip>
          </View>
        </Card>
      </View>

      {/* ====================================================== */}
      {/* SECTION B: TABLE QR CODES                              */}
      {/* ====================================================== */}
      <View style={[s.sectionWrap, { marginTop: 24 }]}>
        <View style={s.sectionHeaderRow}>
          <View style={s.sectionBadgeB}>
            <Text style={s.sectionBadgeText}>SECTION B</Text>
          </View>
          <Text style={s.sectionTitle}>TABLE QR CODES ({tables.length} TABLES)</Text>
        </View>
        <Text style={s.sectionHelp}>
          Every table has its own unique QR code. When scanned, it automatically locks the exact table number throughout the order journey.
        </Text>

        {/* 20-Table Starter Pack CTA */}
        <View style={s.starterPackBanner}>
          <View style={{ flex: 1 }}>
            <Text style={s.starterPackTitle}>📦 20-Table QR Starter Pack</Text>
            <Text style={s.starterPackDesc}>
              Generate & print ready-to-use table tent cards for Tables 1 through 20.
            </Text>
          </View>
          <Tooltip text="Generate 20-Table QR Starter Pack">
            <Pressable
              style={s.starterPackBtn}
              onPress={() =>
                router.push({
                  pathname: '/admin-table-qr',
                  params: { type: 'starter_pack' },
                })
              }
            >
              <Ionicons name="albums-outline" size={15} color={colors.white} />
              <Text style={s.starterPackBtnText}>Print All 20 QRs</Text>
            </Pressable>
          </Tooltip>
        </View>

        {/* Add Table Form */}
        <Card style={s.form}>
          <Text style={s.formHeading}>ADD CUSTOM TABLE</Text>
          <View style={s.formRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Table Code</Text>
              <TextInput
                style={s.input}
                value={code}
                onChangeText={setCode}
                placeholder="e.g. 21, Patio 1"
                placeholderTextColor={colors.muted}
                autoCapitalize="none"
              />
            </View>
            <View style={{ flex: 1.5, marginLeft: 10 }}>
              <Text style={s.label}>Display Name</Text>
              <TextInput
                style={s.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Table 21 (Window)"
                placeholderTextColor={colors.muted}
              />
            </View>
          </View>
          <Button
            label={busy ? 'Adding…' : '+ Add Table'}
            disabled={busy || !code.trim() || !name.trim()}
            onPress={add}
          />
        </Card>

        {!!message && <Text style={s.error}>{message}</Text>}
        {!!error && <Text style={s.error}>{error}</Text>}

        {/* Table List */}
        <Text style={s.listHeading}>
          {loading ? 'Loading tables…' : `Active Dining Tables (${tables.length})`}
        </Text>

        {tables.map((table) => {
          const tableQrUrl = `${origin}/r/${encodeURIComponent(currentRestaurant.slug)}/table/${encodeURIComponent(table.code)}/`;

          return (
            <Card key={table.id} style={[s.tableCard, !table.active && s.tableCardDisabled]}>
              <View style={s.tableCardHeader}>
                <View style={s.tableMiniQrBox}>
                  <QRCode
                    value={tableQrUrl}
                    size={48}
                    color={table.active ? colors.espresso : colors.muted}
                    backgroundColor="#FFFFFF"
                  />
                </View>

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={s.tableTitleRow}>
                    <Text style={[s.tableName, !table.active && { color: colors.muted }]}>
                      {table.name}
                    </Text>
                    <View style={[s.tableStatusBadge, table.active ? s.badgeActive : s.badgeDisabled]}>
                      <Text style={[s.tableStatusText, table.active ? s.textActive : s.textDisabled]}>
                        {table.active ? 'ACTIVE' : 'DISABLED'}
                      </Text>
                    </View>
                  </View>
                  <Text style={s.tableLink}>{tableQrUrl}</Text>
                </View>
              </View>

              {/* Card Actions */}
              <View style={s.tableActionRow}>
                <Tooltip text={table.active ? 'Deactivate Table' : 'Activate Table'}>
                  <Pressable
                    style={[s.actionPill, table.active ? s.actionPillActive : s.actionPillDisabled]}
                    onPress={() => void updateTable(table.id, { active: !table.active })}
                  >
                    <Ionicons
                      name={table.active ? 'checkmark-circle' : 'close-circle-outline'}
                      size={15}
                      color={table.active ? colors.green : colors.muted}
                    />
                    <Text style={[s.actionPillText, table.active ? { color: colors.green } : { color: colors.muted }]}>
                      {table.active ? 'Active' : 'Disabled'}
                    </Text>
                  </Pressable>
                </Tooltip>

                <Tooltip text="View & Print Single Table QR Card">
                  <Pressable
                    style={s.actionPill}
                    onPress={() =>
                      router.push({
                        pathname: '/admin-table-qr',
                        params: { id: table.id, type: 'table' },
                      })
                    }
                  >
                    <Ionicons name="qr-code-outline" size={15} color={colors.espresso} />
                    <Text style={s.actionPillText}>Print Card</Text>
                  </Pressable>
                </Tooltip>

                <Tooltip text="Delete Table">
                  <Pressable
                    style={[s.actionPill, s.actionPillDanger]}
                    onPress={() => handleRemove(table.id, table.name)}
                  >
                    <Ionicons name="trash-outline" size={15} color={colors.danger} />
                    <Text style={[s.actionPillText, { color: colors.danger }]}>Delete</Text>
                  </Pressable>
                </Tooltip>
              </View>
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.cream,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 14,
  },
  bannerText: {
    color: colors.ink,
    fontSize: 12,
  },
  bold: {
    fontWeight: '800',
    color: colors.espresso,
  },
  sectionWrap: {
    marginBottom: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionBadgeA: {
    backgroundColor: colors.espresso,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sectionBadgeB: {
    backgroundColor: colors.caramel,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sectionBadgeText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '900',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.espresso,
    letterSpacing: 0.5,
  },
  sectionHelp: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: 10,
    lineHeight: 16,
  },
  counterQrCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#E6D7C3',
    backgroundColor: '#FFFDF9',
    ...shadows.sm,
  },
  counterQrContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  counterQrBox: {
    padding: 8,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  counterCardBrand: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.caramel,
    letterSpacing: 1,
  },
  counterCardHeading: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.espresso,
    marginTop: 2,
    marginBottom: 4,
  },
  counterCardSub: {
    fontSize: 11,
    color: colors.ink,
    lineHeight: 16,
    marginBottom: 6,
  },
  counterCardUrl: {
    fontSize: 9,
    color: colors.muted,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  counterBtnRow: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0E6D8',
    paddingTop: 10,
  },
  counterPrintBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.espresso,
    paddingVertical: 10,
    borderRadius: 10,
  },
  counterPrintBtnText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '800',
  },
  starterPackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8EB',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EBD9B6',
    marginBottom: 14,
    gap: 12,
  },
  starterPackTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.espresso,
  },
  starterPackDesc: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  starterPackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.espresso,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  starterPackBtnText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '800',
  },
  form: {
    padding: 14,
    marginBottom: 14,
    backgroundColor: colors.white,
    borderRadius: 16,
  },
  formHeading: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.caramel,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  formRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 4,
  },
  input: {
    height: 40,
    backgroundColor: colors.cream,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 12,
    color: colors.ink,
    marginBottom: 8,
  },
  listHeading: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.espresso,
    marginBottom: 8,
    marginTop: 6,
  },
  tableCard: {
    padding: 12,
    marginBottom: 10,
    borderRadius: 14,
    backgroundColor: colors.white,
  },
  tableCardDisabled: {
    opacity: 0.6,
    backgroundColor: '#FAFAFA',
  },
  tableCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tableMiniQrBox: {
    padding: 4,
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
  },
  tableTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tableName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.espresso,
  },
  tableStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeActive: {
    backgroundColor: '#E6F4EA',
  },
  badgeDisabled: {
    backgroundColor: '#F3F4F6',
  },
  tableStatusText: {
    fontSize: 9,
    fontWeight: '800',
  },
  textActive: {
    color: colors.green,
  },
  textDisabled: {
    color: colors.muted,
  },
  tableLink: {
    fontSize: 10,
    color: colors.muted,
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  tableActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 8,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.cream,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionPillActive: {
    backgroundColor: '#E6F4EA',
  },
  actionPillDisabled: {
    backgroundColor: '#F3F4F6',
  },
  actionPillDanger: {
    backgroundColor: '#FEE2E2',
  },
  actionPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.espresso,
  },
  error: {
    color: colors.danger,
    fontSize: 12,
    marginBottom: 8,
  },
});
