import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Header, Screen } from '@/src/components/UI';
import { useOrders } from '@/src/context/OrderContext';
import { usePickupSettings } from '@/src/context/PickupSettingsContext';
import { colors } from '@/src/theme';

type Slot = { key: string; label: string; asap?: boolean };
const minutesFromTime = (value: string) => { const [hours, minutes] = value.split(':').map(Number); return hours * 60 + minutes; };
const timeFromMinutes = (value: number) => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
const displayTime = (value: number) => { const hours = Math.floor(value / 60); const minutes = value % 60; return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${hours < 12 ? 'AM' : 'PM'}`; };
function cafeNow(timezone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  return { date: `${get('year')}-${get('month')}-${get('day')}`, minutes: Number(get('hour')) * 60 + Number(get('minute')) };
}

export default function PickupTime() {
  const { pickupTime, pickupSlot, setPickupTime, orders } = useOrders();
  const { settings, loading, error } = usePickupSettings();
  const slots = useMemo(() => {
    if (!settings) return [] as Slot[];
    const now = cafeNow(settings.timezone); const opening = minutesFromTime(settings.openingTime); const closing = minutesFromTime(settings.closingTime);
    const readyBase = Math.max(now.minutes, opening) + settings.averagePrepMinutes;
    const ready = Math.ceil(readyBase / settings.slotIntervalMinutes) * settings.slotIntervalMinutes;
    const counts = new Map<string, number>();
    orders.forEach((order) => { if (order.pickupSlot) counts.set(order.pickupSlot, (counts.get(order.pickupSlot) ?? 0) + 1); });
    const available = (minute: number) => (counts.get(`${now.date}T${timeFromMinutes(minute)}`) ?? 0) < settings.maxOrdersPerSlot;
    const result: Slot[] = [];
    if (ready <= closing && available(ready)) result.push({ key: `${now.date}T${timeFromMinutes(ready)}`, label: `ASAP · Ready around ${displayTime(ready)}`, asap: true });
    for (let minute = ready + settings.slotIntervalMinutes; minute <= closing; minute += settings.slotIntervalMinutes) {
      if (minute >= opening && available(minute)) result.push({ key: `${now.date}T${timeFromMinutes(minute)}`, label: displayTime(minute) });
    }
    return result;
  }, [settings, orders]);

  useEffect(() => {
    if (!slots.length) { setPickupTime('', undefined); return; }
    if (!pickupSlot || !slots.some((slot) => slot.key === pickupSlot)) setPickupTime(slots[0].label, slots[0].key);
  }, [slots, pickupSlot]);

  return <Screen><Header title="Pickup time" /><Text style={styles.title}>When should we have it ready?</Text><Text style={styles.subtitle}>Today · Common Ground Café</Text>
    {loading && <Text style={styles.message}>Loading available times…</Text>}{!!error && <Text style={styles.error}>{error}</Text>}
    {!loading && !slots.length && <View style={styles.empty}><Text style={styles.emptyTitle}>No pickup times available today</Text><Text style={styles.message}>The café may be closed or today’s remaining slots are full.</Text></View>}
    <View style={styles.list}>{slots.map((slot) => <Pressable key={`${slot.asap ? 'asap-' : ''}${slot.key}`} style={[styles.option, pickupSlot === slot.key && pickupTime === slot.label && styles.selected]} onPress={() => setPickupTime(slot.label, slot.key)}><View><Text style={[styles.time, pickupSlot === slot.key && pickupTime === slot.label && { color: colors.espresso }]}>{slot.label}</Text>{slot.asap && <Text style={styles.recommended}>RECOMMENDED</Text>}</View><View style={[styles.radio, pickupSlot === slot.key && pickupTime === slot.label && styles.radioSelected]}>{pickupSlot === slot.key && pickupTime === slot.label && <View style={styles.dot} />}</View></Pressable>)}</View>
    <View style={{ flex: 1, minHeight: 28 }} /><Button label="Continue to checkout" disabled={!pickupSlot} onPress={() => router.push('/checkout')} />
  </Screen>;
}
const styles = StyleSheet.create({ title: { color: colors.ink, fontSize: 25, fontWeight: '800', marginTop: 8 }, subtitle: { color: colors.muted, marginTop: 7, marginBottom: 22 }, list: { gap: 10 }, option: { padding: 17, borderRadius: 17, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, selected: { borderColor: colors.caramel, backgroundColor: '#FCF6EF' }, time: { color: colors.ink, fontSize: 16, fontWeight: '700' }, recommended: { color: colors.green, fontSize: 9, fontWeight: '800', letterSpacing: 1, marginTop: 5 }, radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }, radioSelected: { borderColor: colors.caramel }, dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.caramel }, message: { color: colors.muted, lineHeight: 20 }, error: { color: colors.danger, backgroundColor: '#FBE8E5', padding: 12, borderRadius: 12 }, empty: { padding: 20, borderRadius: 17, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line }, emptyTitle: { color: colors.ink, fontWeight: '800', marginBottom: 5 } });
