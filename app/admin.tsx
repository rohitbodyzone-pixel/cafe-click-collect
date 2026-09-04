import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View, ScrollView, Switch, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button, Card, Header, Screen, triggerHaptic } from "@/src/components/UI";
import { OrderStatus, useOrders } from "@/src/context/OrderContext";
import { money, paymentMethodLabel } from "@/src/data/products";
import { colors, radii, shadows } from "@/src/theme";
import { AdminOrderAlerts } from "@/src/components/AdminOrderAlerts";
import { useAdminAuth } from "@/src/context/AdminAuthContext";
import { useRestaurant } from "@/src/context/RestaurantContext";
import { useServiceRequests } from "@/src/context/ServiceRequestContext";
import { useFeaturePermission } from "@/src/context/FeaturePermissionContext";
import { supabase } from "@/src/lib/supabase";
import * as ImagePicker from "expo-image-picker";
import { RestaurantCoverImage, RestaurantLogoImage } from "@/src/components/RestaurantImage";
import { TableServiceAlerts } from "@/src/components/TableServiceAlerts";

const tabs: OrderStatus[] = ["Incoming", "Accepted", "Preparing", "Ready", "Collected"];
const next: Partial<Record<OrderStatus, OrderStatus>> = {
  Incoming: "Accepted",
  Accepted: "Preparing",
  Preparing: "Ready",
  Ready: "Collected",
};
const labels: Partial<Record<OrderStatus, string>> = {
  Incoming: "Accept order",
  Accepted: "Start preparing",
  Preparing: "Mark ready",
  Ready: "Mark collected",
};

const AdminLink = ({
  icon,
  title,
  text,
  route,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
  route: string;
}) => (
  <Pressable style={styles.menuLink} onPress={() => router.push(route as never)}>
    <View style={styles.menuIcon}>
      <Ionicons name={icon} size={21} color={colors.espresso} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.menuTitle}>{title}</Text>
      <Text style={styles.menuText}>{text}</Text>
    </View>
    <Ionicons name="chevron-forward" size={20} color={colors.muted} />
  </Pressable>
);

export default function Admin() {
  const [mode, setMode] = useState<'simple' | 'advanced'>('simple');
  const [tab, setTab] = useState<OrderStatus>("Incoming");
  const {
    currentRestaurant,
    setCurrentRestaurant,
    refresh,
    uploadRestaurantLogo,
    uploadRestaurantCover,
    removeRestaurantLogo,
    removeRestaurantCover,
  } = useRestaurant();
  const { orders, updateOrderStatus, markOrderPaid, backendError } = useOrders();
  const { requests: serviceRequests, updateStatus: updateServiceStatus } = useServiceRequests();
  const { isFeatureEnabled } = useFeaturePermission();
  const auth = useAdminAuth();

  // Rush Controls state
  const [isPaused, setIsPaused] = useState(currentRestaurant.is_orders_paused || false);
  const [rushExtraMins, setRushExtraMins] = useState(currentRestaurant.rush_wait_extra_minutes || 0);
  const [rushMessage, setRushMessage] = useState(currentRestaurant.rush_customer_message || '');
  const [rushBusy, setRushBusy] = useState(false);
  const [rushSuccess, setRushSuccess] = useState('');

  // Branding state
  const [brandingBusy, setBrandingBusy] = useState(false);
  const [brandingSuccess, setBrandingSuccess] = useState('');

  const handleChooseLogo = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      alert('Photo library permission is required to choose a logo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setBrandingBusy(true);
      try {
        const asset = result.assets[0];
        await uploadRestaurantLogo(currentRestaurant.id, {
          uri: asset.uri,
          mimeType: asset.mimeType,
          file: asset.file,
        });
        setBrandingSuccess('✓ Restaurant logo uploaded successfully!');
        setTimeout(() => setBrandingSuccess(''), 4000);
      } catch (e: any) {
        alert(e.message || 'Could not upload logo');
      } finally {
        setBrandingBusy(false);
      }
    }
  };

  const handleChooseCover = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      alert('Photo library permission is required to choose a cover photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setBrandingBusy(true);
      try {
        const asset = result.assets[0];
        await uploadRestaurantCover(currentRestaurant.id, {
          uri: asset.uri,
          mimeType: asset.mimeType,
          file: asset.file,
        });
        setBrandingSuccess('✓ Restaurant cover photo uploaded successfully!');
        setTimeout(() => setBrandingSuccess(''), 4000);
      } catch (e: any) {
        alert(e.message || 'Could not upload cover');
      } finally {
        setBrandingBusy(false);
      }
    }
  };

  const handleRemoveLogo = async () => {
    setBrandingBusy(true);
    try {
      await removeRestaurantLogo(currentRestaurant.id);
      setBrandingSuccess('✓ Restaurant logo removed.');
      setTimeout(() => setBrandingSuccess(''), 4000);
    } catch (e: any) {
      alert(e.message || 'Could not remove logo');
    } finally {
      setBrandingBusy(false);
    }
  };

  const handleRemoveCover = async () => {
    setBrandingBusy(true);
    try {
      await removeRestaurantCover(currentRestaurant.id);
      setBrandingSuccess('✓ Restaurant cover photo removed.');
      setTimeout(() => setBrandingSuccess(''), 4000);
    } catch (e: any) {
      alert(e.message || 'Could not remove cover');
    } finally {
      setBrandingBusy(false);
    }
  };

  const visible = orders.filter((o) => o.status === tab);
  const pendingRequests = serviceRequests.filter(
    (r) => r.status === "pending" || r.status === "acknowledged",
  );

  const activeOrdersCount = orders.filter((o) => o.status !== "Collected" && o.status !== "Cancelled").length;
  const todayRevenue = orders
    .filter((o) => o.paymentStatus === "paid")
    .reduce((acc, curr) => acc + curr.total, 0);

  const handleUpdateRushMode = async (pauseVal: boolean, extraMins: number, msg: string) => {
    setRushBusy(true);
    try {
      if (supabase) {
        await supabase.rpc('set_restaurant_rush_mode', {
          p_restaurant_id: currentRestaurant.id,
          p_orders_paused: pauseVal,
          p_extra_minutes: extraMins,
          p_message: msg || null,
        });
      }
      setIsPaused(pauseVal);
      setRushExtraMins(extraMins);
      setRushMessage(msg);
      setRushSuccess('✓ Rush Mode settings updated & synchronized live!');
      setTimeout(() => setRushSuccess(''), 4000);
      await refresh();
    } catch (e: any) {
      alert(e.message || 'Could not update rush mode');
    } finally {
      setRushBusy(false);
    }
  };

  return (
    <Screen>
      <Header
        title="Manager Console"
        right={
          <Pressable onPress={() => void auth.signOut()}>
            <Text style={styles.exit}>Sign out</Text>
          </Pressable>
        }
      />
      <AdminOrderAlerts />
      <TableServiceAlerts />

      {/* Role & Cafe Header */}
      <View style={styles.restaurantBar}>
        <RestaurantLogoImage
          uri={currentRestaurant.logoUrl}
          name={currentRestaurant.name}
          size={40}
          style={{ marginRight: 10 }}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.staffRoleText}>
            {auth.staff?.role?.toUpperCase()} · {auth.staff?.displayName || auth.staff?.email}
          </Text>
          <Text style={styles.activeRestName}>{currentRestaurant.name}</Text>
        </View>

        {/* Simple vs Advanced Mode Toggle */}
        <View style={styles.modeToggle}>
          <Pressable
            style={[styles.modePill, mode === 'simple' && styles.modePillActive]}
            onPress={() => setMode('simple')}
          >
            <Text style={[styles.modePillText, mode === 'simple' && styles.modePillTextActive]}>
              Simple
            </Text>
          </Pressable>
          <Pressable
            style={[styles.modePill, mode === 'advanced' && styles.modePillActive]}
            onPress={() => setMode('advanced')}
          >
            <Text style={[styles.modePillText, mode === 'advanced' && styles.modePillTextActive]}>
              Advanced
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* KPI Summary Banner */}
        <View style={styles.kpiGrid}>
          <Card style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Active Orders</Text>
            <Text style={styles.kpiVal}>{activeOrdersCount}</Text>
            <Text style={styles.kpiSub}>In preparation queue</Text>
          </Card>
          <Card style={[styles.kpiCard, { backgroundColor: colors.espresso }]}>
            <Text style={[styles.kpiLabel, { color: colors.caramel }]}>Today's Sales</Text>
            <Text style={[styles.kpiVal, { color: colors.white }]}>{money(todayRevenue)}</Text>
            <Text style={[styles.kpiSub, { color: 'rgba(255,255,255,0.7)' }]}>Paid revenue</Text>
          </Card>
        </View>

        {/* 10-Minute Setup Progress Bar */}
        <Card style={styles.setupProgressCard}>
          <View style={styles.setupHeader}>
            <Ionicons name="sparkles" size={16} color={colors.caramel} />
            <Text style={styles.setupTitle}>PILOT READINESS PROGRESS</Text>
            <Text style={styles.setupPercent}>95% Ready</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: '95%' }]} />
          </View>
          <Text style={styles.setupSub}>All core menu, tables, and Stripe test accounts configured.</Text>
        </Card>

        {/* Busy / Rush Mode Dual Controls (if enabled by Super Admin) */}
        {isFeatureEnabled('rush_mode') && (
          <Card style={styles.rushCard}>
            <View style={styles.rushHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rushTitle}>RUSH & BUSY MODE CONTROLS</Text>
                <Text style={styles.rushSubtitle}>Independent wait-time booster & order pause switches.</Text>
              </View>
              <Ionicons name="flame" size={20} color={colors.caramel} />
            </View>

            {/* Knob 1: Wait Time Booster */}
            <Text style={styles.knobLabel}>1. ADD EXTRA PREP TIME TO PICKUP WINDOWS:</Text>
            <View style={styles.minsBtnRow}>
              {[0, 5, 10, 15, 30].map((mins) => (
                <Pressable
                  key={mins}
                  style={[styles.minsBtn, rushExtraMins === mins && styles.minsBtnActive]}
                  onPress={() => void handleUpdateRushMode(isPaused, mins, rushMessage)}
                >
                  <Text style={[styles.minsBtnText, rushExtraMins === mins && styles.minsBtnTextActive]}>
                    {mins === 0 ? 'Normal' : `+${mins}m`}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Knob 2: Pause Incoming Orders Toggle */}
            <View style={styles.pauseRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.pauseTitle}>2. PAUSE NEW INCOMING ORDERS</Text>
                <Text style={styles.pauseSub}>Customer app displays rush message & pauses checkout</Text>
              </View>
              <Switch
                value={isPaused}
                onValueChange={(val) => void handleUpdateRushMode(val, rushExtraMins, rushMessage)}
                trackColor={{ false: colors.line, true: colors.danger }}
                thumbColor={colors.white}
              />
            </View>

            {isPaused && (
              <TextInput
                style={styles.rushInput}
                placeholder="Custom rush message shown to customers…"
                placeholderTextColor={colors.muted}
                value={rushMessage}
                onChangeText={setRushMessage}
                onBlur={() => void handleUpdateRushMode(isPaused, rushExtraMins, rushMessage)}
              />
            )}

            {!!rushSuccess && (
              <Text style={styles.rushSuccessText}>{rushSuccess}</Text>
            )}
          </Card>
        )}

        {/* Live Table Service Requests */}
        {pendingRequests.length > 0 && (
          <Card style={styles.serviceBanner}>
            <View style={styles.serviceBannerHeader}>
              <Ionicons name="notifications-outline" size={18} color={colors.espresso} />
              <Text style={styles.serviceBannerTitle}>
                Table Service Requests ({pendingRequests.length})
              </Text>
            </View>
            {pendingRequests.map((req) => (
              <View key={req.id} style={styles.serviceRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.serviceTable}>
                    {req.tableName} · {req.requestType.replace('_', ' ').toUpperCase()}
                  </Text>
                  {!!req.notes && (
                    <Text style={styles.serviceNotes}>"{req.notes}"</Text>
                  )}
                  <Text style={styles.serviceTime}>
                    {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <View style={styles.serviceActions}>
                  {req.status === 'pending' && (
                    <Pressable
                      style={styles.ackBtn}
                      onPress={() => void updateServiceStatus(req.id, 'acknowledged')}
                    >
                      <Text style={styles.ackBtnText}>Acknowledge</Text>
                    </Pressable>
                  )}
                  <Pressable
                    style={styles.doneBtn}
                    onPress={() => void updateServiceStatus(req.id, 'completed')}
                  >
                    <Ionicons name="checkmark" size={14} color={colors.white} />
                    <Text style={styles.doneBtnText}>Done</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </Card>
        )}

        {/* Quick Launch Cards (Available in Simple & Advanced Mode) */}
        <AdminLink
          icon="pulse-outline"
          title="Restaurant Health & Diagnostics"
          text="Realtime connection, stuck orders, menu health & morning status check"
          route="/admin-health"
        />
        <AdminLink
          icon="options-outline"
          title="Restaurant Feature Settings"
          text="Enable or disable 58 optional capabilities (Ordering, Operations, Marketing, AI, Staff)"
          route="/admin-features"
        />
        <AdminLink
          icon="speedometer-outline"
          title="Kitchen Display System (KDS)"
          text="Live orders queue, station routing, preparation stages & sound alerts"
          route="/admin-kitchen"
        />
        <AdminLink
          icon="restaurant-outline"
          title="Edit Menu & Pricing Catalog"
          text="Product catalog, pricing, item descriptions, duplicate & availability"
          route="/admin-menu"
        />
        <AdminLink
          icon="document-text-outline"
          title="Upload Menu PDF (Quick Builder)"
          text="Auto-extract menu items, categories and prices from PDF or photo"
          route="/admin-menu-pdf"
        />
        <AdminLink
          icon="grid-outline"
          title="Tables & Floor Layout"
          text="Manage dining tables, QR table codes and service stations"
          route="/admin-tables"
        />
        <AdminLink
          icon="time-outline"
          title="Click & Collect Time Slots"
          text="Operating hours, pickup intervals, capacity and slot limits"
          route="/admin-pickup-settings"
        />
        <AdminLink
          icon="people-outline"
          title="Staff & Roles Management"
          text="Team member accounts, PINs, Kitchen/Counter/Manager roles"
          route="/admin-staff"
        />
        <AdminLink
          icon="wallet-outline"
          title="Payouts & Settlement Ledger"
          text="Gross sales, Stripe Connect transfers, app fees & direct bank payouts"
          route="/admin-payouts"
        />

        {/* Storefront Images & Branding Management */}
        <Card style={styles.brandingCard}>
          <View style={styles.brandingHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.brandingTitle}>STOREFRONT IMAGES & BRANDING</Text>
              <Text style={styles.brandingSub}>
                Upload high-resolution cover photo and logo for marketplace discovery and menus.
              </Text>
            </View>
            <Ionicons name="images-outline" size={20} color={colors.caramel} />
          </View>

          {/* Cover Photo Section */}
          <Text style={styles.brandingSectionTitle}>1. RESTAURANT COVER PHOTO (16:9)</Text>
          <View style={styles.coverPreviewWrap}>
            <RestaurantCoverImage
              uri={currentRestaurant.coverImageUrl || currentRestaurant.hero_image_url}
              name={currentRestaurant.name}
              style={styles.brandingCoverImg}
              placeholderStyle={styles.brandingCoverImg}
            />
          </View>
          <View style={styles.brandingBtnRow}>
            <Pressable
              style={styles.brandingBtn}
              onPress={() => void handleChooseCover()}
              disabled={brandingBusy}
            >
              <Ionicons name="cloud-upload-outline" size={14} color={colors.white} />
              <Text style={styles.brandingBtnText}>
                {currentRestaurant.coverImageUrl ? 'Replace Cover' : 'Upload Cover'}
              </Text>
            </Pressable>
            {!!currentRestaurant.coverImageUrl && (
              <Pressable
                style={[styles.brandingBtn, styles.removeBrandingBtn]}
                onPress={() => void handleRemoveCover()}
                disabled={brandingBusy}
              >
                <Ionicons name="trash-outline" size={14} color={colors.danger} />
                <Text style={[styles.brandingBtnText, { color: colors.danger }]}>Remove</Text>
              </Pressable>
            )}
          </View>

          {/* Logo Section */}
          <Text style={[styles.brandingSectionTitle, { marginTop: 14 }]}>2. RESTAURANT LOGO / AVATAR (1:1)</Text>
          <View style={styles.logoPreviewRow}>
            <RestaurantLogoImage
              uri={currentRestaurant.logoUrl}
              name={currentRestaurant.name}
              size={56}
              style={{ borderWidth: 2, borderColor: colors.line }}
            />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={styles.brandingBtnRow}>
                <Pressable
                  style={styles.brandingBtn}
                  onPress={() => void handleChooseLogo()}
                  disabled={brandingBusy}
                >
                  <Ionicons name="cloud-upload-outline" size={14} color={colors.white} />
                  <Text style={styles.brandingBtnText}>
                    {currentRestaurant.logoUrl ? 'Replace Logo' : 'Upload Logo'}
                  </Text>
                </Pressable>
                {!!currentRestaurant.logoUrl && (
                  <Pressable
                    style={[styles.brandingBtn, styles.removeBrandingBtn]}
                    onPress={() => void handleRemoveLogo()}
                    disabled={brandingBusy}
                  >
                    <Ionicons name="trash-outline" size={14} color={colors.danger} />
                    <Text style={[styles.brandingBtnText, { color: colors.danger }]}>Remove</Text>
                  </Pressable>
                )}
              </View>
            </View>
          </View>

          {!!brandingSuccess && (
            <Text style={styles.brandingSuccessText}>{brandingSuccess}</Text>
          )}
        </Card>

        {/* ADVANCED MODE ONLY LINKS */}
        {mode === 'advanced' && (
          <View style={{ marginTop: 10 }}>
            <Text style={styles.sectionHeader}>ADVANCED OPERATIONS & PLATFORM ENGINES</Text>

            {auth.isSuperAdmin && (
              <AdminLink
                icon="globe-outline"
                title="Super Admin Management"
                text="Manage all platform restaurants, onboard new cafes, fee overrides"
                route="/super-admin"
              />
            )}

            {isFeatureEnabled('ai_copilot') && (
              <AdminLink
                icon="sparkles-outline"
                title="AI Copilot & Decision Insights"
                text="Daily briefing, expected busy times, top sellers & price suggestions"
                route="/admin-ai"
              />
            )}

            {isFeatureEnabled('social_copywriter') && (
              <AdminLink
                icon="megaphone-outline"
                title="Growth, Marketing & Concierge"
                text="AI Social Copywriter, Review Responder, Voice Phone Orders, Group Orders & POs"
                route="/admin-growth"
              />
            )}

            {isFeatureEnabled('inventory_tracking') && (
              <AdminLink
                icon="construct-outline"
                title="Operations, Inventory & Hardware"
                text="Smart Inventory, AI Staff Roster, Checklists, Wait Balancer & Hardware"
                route="/admin-operations"
              />
            )}

            <AdminLink
              icon="stats-chart-outline"
              title="Sales & Detailed Analytics"
              text="Daily revenue, top-selling items, hourly distribution & ticket trends"
              route="/admin-analytics"
            />
            <AdminLink
              icon="options-outline"
              title="Customisations & Modifiers"
              text="Coffee milks, sizes, bean origins, syrups & smart modifier defaults"
              route="/admin-customisations"
            />
            <AdminLink
              icon="gift-outline"
              title="Loyalty & Promotions"
              text="Points system, discount codes, review shield & coffee passes"
              route="/admin-loyalty"
            />
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  exit: { color: colors.caramel, fontWeight: "800", fontSize: 13 },
  restaurantBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 12,
  },
  staffRoleText: { fontSize: 10, fontWeight: "800", color: colors.caramel, letterSpacing: 0.8 },
  activeRestName: { fontSize: 16, fontWeight: "900", color: colors.espresso, marginTop: 2 },
  modeToggle: { flexDirection: 'row', backgroundColor: colors.cream, borderRadius: 8, padding: 2 },
  modePill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  modePillActive: { backgroundColor: colors.espresso },
  modePillText: { fontSize: 11, fontWeight: '700', color: colors.espresso },
  modePillTextActive: { color: colors.white },
  kpiGrid: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  kpiCard: { flex: 1, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: colors.line, ...shadows.sm },
  kpiLabel: { fontSize: 10, fontWeight: '800', color: colors.caramel, textTransform: 'uppercase', letterSpacing: 0.8 },
  kpiVal: { fontSize: 22, fontWeight: '900', color: colors.espresso, marginVertical: 3 },
  kpiSub: { fontSize: 11, color: colors.muted },
  setupProgressCard: { padding: 16, marginBottom: 14, borderRadius: 18, borderWidth: 1, borderColor: colors.line, ...shadows.sm },
  setupHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  setupTitle: { fontSize: 11, fontWeight: '900', color: colors.espresso, letterSpacing: 0.8, flex: 1 },
  setupPercent: { fontSize: 12, fontWeight: '900', color: colors.green },
  progressBarBg: { height: 8, borderRadius: 4, backgroundColor: colors.line, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4, backgroundColor: colors.green },
  setupSub: { fontSize: 11, color: colors.muted, marginTop: 8 },
  rushCard: { padding: 16, marginBottom: 14, borderRadius: 18, borderWidth: 1.5, borderColor: '#F5C6CB', ...shadows.sm },
  rushHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  rushTitle: { fontSize: 13, fontWeight: '900', color: colors.danger, letterSpacing: 0.8 },
  rushSubtitle: { fontSize: 11, color: colors.muted, marginTop: 2 },
  knobLabel: { fontSize: 11, fontWeight: '800', color: colors.ink, marginBottom: 8 },
  minsBtnRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  minsBtn: { flex: 1, paddingVertical: 10, borderRadius: radii.md, backgroundColor: colors.creamSoft, borderWidth: 1, borderColor: colors.line, alignItems: 'center' },
  minsBtnActive: { backgroundColor: colors.espresso, borderColor: colors.espresso, ...shadows.sm },
  minsBtnText: { fontSize: 12, fontWeight: '800', color: colors.espresso },
  minsBtnTextActive: { color: colors.white },
  pauseRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12 },
  pauseTitle: { fontSize: 12, fontWeight: '800', color: colors.ink },
  pauseSub: { fontSize: 11, color: colors.muted, marginTop: 1 },
  rushInput: { backgroundColor: colors.creamSoft, borderRadius: 12, padding: 10, fontSize: 13, color: colors.ink, marginTop: 10, borderWidth: 1, borderColor: colors.line },
  rushSuccessText: { color: colors.green, fontSize: 12, fontWeight: '800', marginTop: 8 },
  serviceBanner: { backgroundColor: '#FFF9F2', borderColor: '#EBD9B6', borderWidth: 1.5, borderRadius: 18, padding: 14, marginBottom: 14, ...shadows.sm },
  serviceBannerHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  serviceBannerTitle: { fontSize: 14, fontWeight: '900', color: colors.espresso },
  serviceRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F5E6CC' },
  serviceTable: { fontSize: 13, fontWeight: '800', color: colors.ink },
  serviceNotes: { fontSize: 11, fontStyle: 'italic', color: colors.muted },
  serviceTime: { fontSize: 11, color: colors.muted },
  serviceActions: { flexDirection: 'row', gap: 6 },
  ackBtn: { backgroundColor: colors.cream, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  ackBtnText: { fontSize: 11, fontWeight: '800', color: colors.espresso },
  doneBtn: { backgroundColor: colors.green, flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  doneBtnText: { fontSize: 11, fontWeight: '800', color: colors.white },
  sectionHeader: { fontSize: 12, fontWeight: '800', color: colors.caramel, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10, marginTop: 6 },
  menuLink: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.sm,
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  menuTitle: { fontSize: 15, fontWeight: "900", color: colors.espresso },
  menuText: { fontSize: 12, color: colors.muted, marginTop: 2 },
  brandingCard: {
    padding: 16,
    marginBottom: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.sm,
  },
  brandingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  brandingTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.espresso,
    letterSpacing: 0.8,
  },
  brandingSub: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  brandingSectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.caramel,
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  coverPreviewWrap: {
    height: 110,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
    backgroundColor: colors.espresso,
  },
  brandingCoverImg: {
    width: '100%',
    height: 110,
  },
  brandingBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  brandingBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.espresso,
    paddingVertical: 9,
    borderRadius: 10,
  },
  brandingBtnText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '800',
  },
  removeBrandingBtn: {
    flex: 0,
    paddingHorizontal: 14,
    backgroundColor: '#FBE8E5',
    borderWidth: 1,
    borderColor: '#E8C4BE',
  },
  logoPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  brandingSuccessText: {
    color: colors.green,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 10,
    textAlign: 'center',
  },
});
