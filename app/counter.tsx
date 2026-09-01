import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Screen, Header, Card, Button } from '@/src/components/UI';
import { RoleGate } from '@/src/components/RoleGate';
import { useRestaurant } from '@/src/context/RestaurantContext';
import { useAdminAuth } from '@/src/context/AdminAuthContext';
import { useProducts } from '@/src/context/ProductContext';
import { useOrders } from '@/src/context/OrderContext';
import { supabase } from '@/src/lib/supabase';
import { colors } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';
import { money, Product } from '@/src/data/products';

export default function CounterPortalScreen() {
  return (
    <RoleGate
      allowedRoles={['counter', 'manager', 'owner', 'super_admin']}
      roleTitle="Cashier / Counter Portal"
    >
      <CounterPortalContent />
    </RoleGate>
  );
}

interface ActiveAttendance {
  id: string;
  staff_id: string;
  staff_name: string;
  clock_in_at: string;
  minutes_elapsed: number;
}

function CounterPortalContent() {
  const auth = useAdminAuth();
  const { currentRestaurant } = useRestaurant();
  const { products } = useProducts();
  const { orders, placeOrder, markOrderPaid } = useOrders();

  // Attendance state
  const [activeSession, setActiveSession] = useState<ActiveAttendance | null>(null);
  const [allActiveStaff, setAllActiveStaff] = useState<ActiveAttendance[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [clockingBusy, setClockingBusy] = useState(false);

  // Counter POS Cart state
  const [posCart, setPosCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'eftpos'>('eftpos');
  const [orderingBusy, setOrderingBusy] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState('');

  const loadAttendance = useCallback(async () => {
    if (!supabase || !currentRestaurant?.id) {
      setAttendanceLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('get_active_staff_attendance', {
        p_restaurant_id: currentRestaurant.id,
      });

      if (!error && Array.isArray(data)) {
        setAllActiveStaff(data);
        const myName = auth.staff?.displayName || auth.staff?.email || '';
        const mine = data.find(
          (a) => a.staff_id === auth.staff?.id || a.staff_name.toLowerCase() === myName.toLowerCase(),
        );
        setActiveSession(mine || null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAttendanceLoading(false);
    }
  }, [currentRestaurant?.id, auth.staff]);

  useEffect(() => {
    loadAttendance();
    const interval = setInterval(loadAttendance, 30000);
    return () => clearInterval(interval);
  }, [loadAttendance]);

  const handleClockIn = async () => {
    if (!supabase || !auth.staff) return;
    setClockingBusy(true);
    try {
      const staffName = auth.staff.displayName || auth.staff.email.split('@')[0];
      const { data, error } = await supabase.rpc('clock_in_staff', {
        p_restaurant_id: currentRestaurant.id,
        p_staff_id: auth.staff.id || null,
        p_staff_name: staffName,
        p_device_info: 'Counter POS Web Station',
      });

      if (error) throw error;
      await loadAttendance();
      alert(`✓ Clocked in successfully as ${staffName}!`);
    } catch (e: any) {
      alert(e.message || 'Could not clock in');
    } finally {
      setClockingBusy(false);
    }
  };

  const handleClockOut = async () => {
    if (!supabase || !activeSession) return;
    setClockingBusy(true);
    try {
      const { data, error } = await supabase.rpc('clock_out_staff', {
        p_attendance_id: activeSession.id,
        p_notes: 'Shift completed at counter terminal',
      });

      if (error) throw error;
      setActiveSession(null);
      await loadAttendance();
      alert(`✓ Clocked out! Total worked: ${data?.duration_minutes || 0} mins. Orders taken: ${data?.orders_taken_count || 0}`);
    } catch (e: any) {
      alert(e.message || 'Could not clock out');
    } finally {
      setClockingBusy(false);
    }
  };

  const handleAddToCart = (product: Product) => {
    setPosCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const handleRemoveFromCart = (productId: string) => {
    setPosCart((prev) =>
      prev
        .map((item) => (item.product.id === productId ? { ...item, quantity: item.quantity - 1 } : item))
        .filter((item) => item.quantity > 0),
    );
  };

  const posTotal = posCart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  const handleProcessCounterOrder = async () => {
    if (posCart.length === 0) return;
    if (!activeSession && auth.staff?.role !== 'owner' && auth.staff?.role !== 'super_admin') {
      alert('Please CLOCK IN first before creating counter orders.');
      return;
    }

    setOrderingBusy(true);
    setOrderSuccess('');
    try {
      const staffName = auth.staff?.displayName || auth.staff?.email || 'Counter Staff';
      const staffId = auth.staff?.id || null;
      const orderName = customerName.trim() || 'Counter Customer';
      const pickupCode = `C${Math.floor(100 + Math.random() * 900)}`;

      // Create order via Supabase
      if (supabase) {
        const orderId = `ORD-POS-${Math.floor(100000 + Math.random() * 900000)}`;
        const { data: newOrder, error: orderErr } = await supabase
          .from('orders')
          .insert({
            id: orderId,
            restaurant_id: currentRestaurant.id,
            customer_name: orderName,
            phone: 'In-Store Counter',
            pickup_time: 'Immediate',
            pickup_code: pickupCode,
            status: 'Preparing',
            payment_status: 'paid',
            payment_method: 'pay_at_counter',
            subtotal_cents: Math.round(posTotal * 100),
            discount_cents: 0,
            total_cents: Math.round(posTotal * 100),
            amount_paid_cents: Math.round(posTotal * 100),
            created_by_staff_id: staffId,
            created_by_staff_name: staffName,
          })
          .select()
          .single();

        if (orderErr) throw orderErr;

        // Insert order items
        const itemRows = posCart.map((item) => ({
          order_id: orderId,
          product_id: item.product.id,
          name: item.product.name,
          quantity: item.quantity,
          unit_price: item.product.price,
          total_price: item.product.price * item.quantity,
        }));
        await supabase.from('order_items').insert(itemRows);

        setOrderSuccess(`✓ Order ${orderId} placed! Attributed to: ${staffName} (${pickupCode})`);
        setPosCart([]);
        setCustomerName('');
        setTimeout(() => setOrderSuccess(''), 5000);
      }
    } catch (e: any) {
      alert(e.message || 'Could not place counter order');
    } finally {
      setOrderingBusy(false);
    }
  };

  const isClockedIn = !!activeSession;

  return (
    <Screen>
      <Header
        title="Counter Terminal"
        right={
          <Pressable onPress={() => void auth.signOut()}>
            <Text style={s.signOutText}>Sign out</Text>
          </Pressable>
        }
      />

      <ScrollView style={s.container} contentContainerStyle={s.content}>
        {/* Attendance Banner Card */}
        <Card style={[s.attendanceCard, isClockedIn ? s.attendanceCardIn : s.attendanceCardOut]}>
          <View style={s.attendanceHeader}>
            <View style={{ flex: 1 }}>
              <View style={s.staffIdentityRow}>
                <Ionicons
                  name={isClockedIn ? 'radio-button-on' : 'radio-button-off'}
                  size={16}
                  color={isClockedIn ? '#2D7D46' : colors.danger}
                />
                <Text style={s.staffName}>
                  {auth.staff?.displayName || auth.staff?.email}
                </Text>
                <View style={s.rolePill}>
                  <Text style={s.rolePillText}>{auth.staff?.role.toUpperCase()}</Text>
                </View>
              </View>

              <Text style={s.attendanceStatusText}>
                {isClockedIn
                  ? `Active Shift · Clocked in ${activeSession?.minutes_elapsed || 0}m ago (${new Date(activeSession?.clock_in_at || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`
                  : 'Not clocked in. Clock in to activate your shift and attribute counter orders.'}
              </Text>
            </View>

            <View style={s.clockBtnWrap}>
              {clockingBusy ? (
                <ActivityIndicator size="small" color={colors.espresso} />
              ) : isClockedIn ? (
                <Pressable style={s.clockOutBtn} onPress={handleClockOut}>
                  <Ionicons name="log-out-outline" size={14} color={colors.white} />
                  <Text style={s.clockOutBtnText}>CLOCK OUT</Text>
                </Pressable>
              ) : (
                <Pressable style={s.clockInBtn} onPress={handleClockIn}>
                  <Ionicons name="log-in-outline" size={14} color={colors.white} />
                  <Text style={s.clockInBtnText}>CLOCK IN</Text>
                </Pressable>
              )}
            </View>
          </View>

          {/* Active Team on Shift */}
          {allActiveStaff.length > 0 && (
            <View style={s.activeTeamBar}>
              <Text style={s.teamTitle}>Active on Shift ({allActiveStaff.length}):</Text>
              <View style={s.teamList}>
                {allActiveStaff.map((st) => (
                  <View key={st.id} style={s.teamMemberPill}>
                    <Text style={s.teamMemberText}>
                      {st.staff_name} ({st.minutes_elapsed}m)
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </Card>

        {/* Counter POS Order Taker */}
        <View style={s.posGrid}>
          {/* Left Column: Product Quick Catalog */}
          <View style={s.catalogCol}>
            <Text style={s.colHeader}>MENU ITEMS</Text>
            <View style={s.productGrid}>
              {products.map((p) => (
                <Pressable key={p.id} style={s.productItemCard} onPress={() => handleAddToCart(p)}>
                  <Text style={s.productEmoji}>{p.emoji || '☕'}</Text>
                  <Text style={s.productItemName} numberOfLines={1}>
                    {p.name}
                  </Text>
                  <Text style={s.productItemPrice}>{money(p.price)}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Right Column: POS Cart & Charge */}
          <View style={s.cartCol}>
            <Text style={s.colHeader}>CURRENT TICKET</Text>
            <Card style={s.posCartCard}>
              <TextInput
                style={s.customerInput}
                placeholder="Customer Name / Table # (Optional)"
                placeholderTextColor={colors.muted}
                value={customerName}
                onChangeText={setCustomerName}
              />

              {posCart.length === 0 ? (
                <View style={s.emptyCart}>
                  <Ionicons name="receipt-outline" size={32} color={colors.muted} />
                  <Text style={s.emptyCartText}>Tap items to add to ticket</Text>
                </View>
              ) : (
                <ScrollView style={s.cartItemList} showsVerticalScrollIndicator={false}>
                  {posCart.map((item) => (
                    <View key={item.product.id} style={s.cartItemRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.cartItemName}>{item.product.name}</Text>
                        <Text style={s.cartItemUnit}>{money(item.product.price)} each</Text>
                      </View>
                      <View style={s.qtyControl}>
                        <Pressable style={s.qtyBtn} onPress={() => handleRemoveFromCart(item.product.id)}>
                          <Ionicons name="remove" size={14} color={colors.espresso} />
                        </Pressable>
                        <Text style={s.qtyText}>{item.quantity}</Text>
                        <Pressable style={s.qtyBtn} onPress={() => handleAddToCart(item.product)}>
                          <Ionicons name="add" size={14} color={colors.espresso} />
                        </Pressable>
                      </View>
                      <Text style={s.cartItemTotal}>{money(item.product.price * item.quantity)}</Text>
                    </View>
                  ))}
                </ScrollView>
              )}

              {/* Total & Payment Method Selector */}
              <View style={s.cartTotalRow}>
                <Text style={s.cartTotalLabel}>Total:</Text>
                <Text style={s.cartTotalAmount}>{money(posTotal)}</Text>
              </View>

              <View style={s.paymentMethodRow}>
                {(['eftpos', 'card', 'cash'] as const).map((method) => (
                  <Pressable
                    key={method}
                    style={[s.payMethodBtn, paymentMethod === method && s.payMethodBtnActive]}
                    onPress={() => setPaymentMethod(method)}
                  >
                    <Text
                      style={[
                        s.payMethodText,
                        paymentMethod === method && s.payMethodTextActive,
                      ]}
                    >
                      {method.toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {!!orderSuccess && <Text style={s.successText}>{orderSuccess}</Text>}

              <Button
                label={orderingBusy ? 'Processing…' : `Charge ${money(posTotal)}`}
                disabled={orderingBusy || posCart.length === 0}
                onPress={handleProcessCounterOrder}
              />
            </Card>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 14, paddingBottom: 60 },
  signOutText: { color: colors.caramel, fontWeight: '800', fontSize: 13 },
  attendanceCard: { borderRadius: 16, padding: 14, marginBottom: 14, borderWidth: 1 },
  attendanceCardIn: { backgroundColor: '#F2F9F4', borderColor: '#C3E6CD' },
  attendanceCardOut: { backgroundColor: '#FDF7E7', borderColor: '#F5DEB3' },
  attendanceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  staffIdentityRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  staffName: { fontSize: 16, fontWeight: '800', color: colors.espresso },
  rolePill: { backgroundColor: colors.cream, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  rolePillText: { fontSize: 9, fontWeight: '800', color: colors.caramel },
  attendanceStatusText: { fontSize: 12, color: colors.muted, marginTop: 4 },
  clockBtnWrap: { marginLeft: 10 },
  clockInBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#2D7D46', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  clockInBtnText: { color: colors.white, fontWeight: '900', fontSize: 11 },
  clockOutBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.danger, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  clockOutBtnText: { color: colors.white, fontWeight: '900', fontSize: 11 },
  activeTeamBar: { marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)' },
  teamTitle: { fontSize: 11, fontWeight: '800', color: colors.espresso, marginBottom: 4 },
  teamList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  teamMemberPill: { backgroundColor: colors.white, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, borderWidth: 1, borderColor: colors.line },
  teamMemberText: { fontSize: 10, fontWeight: '700', color: colors.ink },
  posGrid: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  catalogCol: { flex: 1, minWidth: 300 },
  cartCol: { width: 340 },
  colHeader: { fontSize: 12, fontWeight: '800', color: colors.caramel, letterSpacing: 1, marginBottom: 8 },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  productItemCard: { width: '31%', backgroundColor: colors.white, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.line, alignItems: 'center' },
  productEmoji: { fontSize: 24, marginBottom: 4 },
  productItemName: { fontSize: 12, fontWeight: '700', color: colors.ink, textAlign: 'center' },
  productItemPrice: { fontSize: 12, fontWeight: '800', color: colors.espresso, marginTop: 2 },
  posCartCard: { backgroundColor: colors.white, padding: 14, borderRadius: 16 },
  customerInput: { height: 42, borderWidth: 1, borderColor: colors.line, borderRadius: 10, paddingHorizontal: 10, fontSize: 13, marginBottom: 10, color: colors.ink },
  emptyCart: { paddingVertical: 30, alignItems: 'center' },
  emptyCartText: { color: colors.muted, fontSize: 12, marginTop: 6 },
  cartItemList: { maxHeight: 180, marginBottom: 10 },
  cartItemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.line },
  cartItemName: { fontSize: 12, fontWeight: '700', color: colors.ink },
  cartItemUnit: { fontSize: 10, color: colors.muted },
  qtyControl: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 8 },
  qtyBtn: { width: 22, height: 22, backgroundColor: colors.cream, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  qtyText: { fontSize: 12, fontWeight: '800', color: colors.ink },
  cartItemTotal: { fontSize: 12, fontWeight: '800', color: colors.espresso, minWidth: 44, textAlign: 'right' },
  cartTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.line },
  cartTotalLabel: { fontSize: 14, fontWeight: '800', color: colors.espresso },
  cartTotalAmount: { fontSize: 18, fontWeight: '900', color: colors.caramel },
  paymentMethodRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  payMethodBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: colors.cream, borderRadius: 8 },
  payMethodBtnActive: { backgroundColor: colors.espresso },
  payMethodText: { fontSize: 10, fontWeight: '800', color: colors.espresso },
  payMethodTextActive: { color: colors.white },
  successText: { color: '#2D7D46', fontSize: 11, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
});
