import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Header, Screen } from '@/src/components/UI';
import { PickupSettings, usePickupSettings } from '@/src/context/PickupSettingsContext';
import { colors } from '@/src/theme';

export default function AdminPickupSettings() {
  const { settings, loading, error: loadError, saveSettings } = usePickupSettings();
  const [form, setForm] = useState({ openingTime: '07:00', closingTime: '16:00', averagePrepMinutes: '15', slotIntervalMinutes: '5', maxOrdersPerSlot: '5' });
  const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  useEffect(() => { if (settings) setForm({ openingTime: settings.openingTime, closingTime: settings.closingTime, averagePrepMinutes: String(settings.averagePrepMinutes), slotIntervalMinutes: String(settings.slotIntervalMinutes), maxOrdersPerSlot: String(settings.maxOrdersPerSlot) }); }, [settings]);
  const field = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const validTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  const valid = validTime(form.openingTime) && validTime(form.closingTime) && form.closingTime > form.openingTime && Number(form.averagePrepMinutes) > 0 && Number(form.slotIntervalMinutes) > 0 && Number(form.maxOrdersPerSlot) > 0;
  const save = async () => {
    if (!settings) return; setSaving(true); setError('');
    const next: PickupSettings = { openingTime: form.openingTime, closingTime: form.closingTime, averagePrepMinutes: Number(form.averagePrepMinutes), slotIntervalMinutes: Number(form.slotIntervalMinutes), maxOrdersPerSlot: Number(form.maxOrdersPerSlot), timezone: settings.timezone };
    try { await saveSettings(next); setSaving(false); if (router.canGoBack()) router.back(); else router.replace('/admin'); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save settings.'); setSaving(false); }
  };
  return <Screen><Header title="Pickup Settings" /><Text style={styles.title}>Pickup capacity</Text><Text style={styles.helper}>Control when customers can collect and how many orders each time can accept.</Text>
    {!!loadError && <Text style={styles.error}>{loadError}</Text>}{loading ? <Text style={styles.helper}>Loading settings…</Text> : <>
      <View style={styles.row}><View style={styles.half}><Text style={styles.label}>Opening time</Text><TextInput style={styles.input} value={form.openingTime} onChangeText={(value) => field('openingTime', value)} placeholder="07:00" /></View><View style={styles.half}><Text style={styles.label}>Closing time</Text><TextInput style={styles.input} value={form.closingTime} onChangeText={(value) => field('closingTime', value)} placeholder="16:00" /></View></View>
      <Text style={styles.hint}>Use 24-hour time, for example 07:00 or 16:30.</Text>
      <Text style={styles.label}>Average preparation time</Text><View style={styles.numberRow}><TextInput style={styles.numberInput} value={form.averagePrepMinutes} onChangeText={(value) => field('averagePrepMinutes', value)} keyboardType="number-pad" /><Text style={styles.unit}>minutes</Text></View>
      <Text style={styles.label}>Pickup slot interval</Text><View style={styles.numberRow}><TextInput style={styles.numberInput} value={form.slotIntervalMinutes} onChangeText={(value) => field('slotIntervalMinutes', value)} keyboardType="number-pad" /><Text style={styles.unit}>minutes</Text></View>
      <Text style={styles.label}>Maximum orders per pickup slot</Text><View style={styles.numberRow}><TextInput style={styles.numberInput} value={form.maxOrdersPerSlot} onChangeText={(value) => field('maxOrdersPerSlot', value)} keyboardType="number-pad" /><Text style={styles.unit}>orders</Text></View>
      {!!error && <Text style={styles.error}>{error}</Text>}<View style={{ flex: 1, minHeight: 30 }} /><Button label={saving ? 'Saving…' : 'Save pickup settings'} disabled={!valid || saving} onPress={() => void save()} />
    </>}
  </Screen>;
}
const styles = StyleSheet.create({ title: { color: colors.ink, fontSize: 25, fontWeight: '800' }, helper: { color: colors.muted, lineHeight: 20, marginTop: 6, marginBottom: 14 }, row: { flexDirection: 'row', gap: 12 }, half: { flex: 1 }, label: { color: colors.ink, fontWeight: '700', marginTop: 13, marginBottom: 8 }, input: { height: 52, borderRadius: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, color: colors.ink }, hint: { color: colors.muted, fontSize: 11, marginTop: 7 }, numberRow: { flexDirection: 'row', alignItems: 'center', gap: 12 }, numberInput: { width: 90, height: 52, borderRadius: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, color: colors.ink, fontSize: 17, fontWeight: '700' }, unit: { color: colors.muted }, error: { color: colors.danger, backgroundColor: '#FBE8E5', padding: 12, borderRadius: 12, marginTop: 12 } });
