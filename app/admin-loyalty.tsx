import { useEffect, useState } from 'react';
import { StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Button, Card, Header, Screen } from '@/src/components/UI';
import { PromoCode, useLoyalty } from '@/src/context/LoyaltyContext';
import { useRestaurant } from '@/src/context/RestaurantContext';
import { colors } from '@/src/theme';

function Promo({ promo }: { promo: PromoCode }) {
  const { savePromo, togglePromo } = useLoyalty();
  const [code, setCode] = useState(promo.code);
  const [desc, setDesc] = useState(promo.description);
  const [value, setValue] = useState(String(promo.discountValue));
  const [min, setMin] = useState(String(promo.minimumSpend));
  const [expiry, setExpiry] = useState(promo.expiresAt?.slice(0, 10) || '');

  useEffect(() => {
    setCode(promo.code);
    setDesc(promo.description);
    setValue(String(promo.discountValue));
    setMin(String(promo.minimumSpend));
    setExpiry(promo.expiresAt?.slice(0, 10) || '');
  }, [promo]);

  return (
    <Card style={s.card}>
      <View style={s.row}>
        <TextInput
          style={[s.input, { flex: 1, fontWeight: '800' }]}
          value={code}
          onChangeText={setCode}
          autoCapitalize="characters"
        />
        <Switch
          value={promo.enabled}
          onValueChange={(enabled) => void togglePromo(promo.id, enabled)}
          trackColor={{ false: '#D8CBC1', true: '#A9C7AF' }}
          thumbColor={promo.enabled ? colors.green : colors.muted}
        />
      </View>
      <TextInput
        style={s.input}
        value={desc}
        onChangeText={setDesc}
        placeholder="Promo description"
      />
      <View style={s.row}>
        <TextInput
          style={[s.input, s.half]}
          value={value}
          onChangeText={setValue}
          placeholder="Discount value"
          keyboardType="numeric"
        />
        <TextInput
          style={[s.input, s.half]}
          value={min}
          onChangeText={setMin}
          placeholder="Min spend ($)"
          keyboardType="numeric"
        />
      </View>
      <TextInput
        style={s.input}
        value={expiry}
        onChangeText={setExpiry}
        placeholder="Expiry (YYYY-MM-DD, optional)"
      />
      <Button
        label="Save Promo Code"
        onPress={() =>
          void savePromo({
            ...promo,
            code,
            description: desc,
            discountValue: Number(value) || 0,
            minimumSpend: Number(min) || 0,
            expiresAt: expiry ? `${expiry}T23:59:59Z` : undefined,
          })
        }
      />
    </Card>
  );
}

export default function AdminLoyalty() {
  const { currentRestaurant } = useRestaurant();
  const { settings, promos, saveSettings, savePromo } = useLoyalty();
  const [points, setPoints] = useState('');
  const [goal, setGoal] = useState('');
  const [max, setMax] = useState('');
  const [code, setCode] = useState('');

  useEffect(() => {
    setPoints(String(settings.pointsPerDollar));
    setGoal(String(settings.coffeeGoal));
    setMax(String(settings.freeCoffeeMaxCents / 100));
  }, [settings]);

  return (
    <Screen>
      <Header title="Loyalty & Promotions" />

      <View style={s.banner}>
        <Text style={s.bannerText}>
          Loyalty rules for <Text style={s.bold}>{currentRestaurant.name}</Text>
        </Text>
      </View>

      <Text style={s.heading}>Loyalty Points & Coffee Rewards</Text>
      <Card>
        <Text style={s.label}>Points per $1 spend</Text>
        <TextInput
          style={s.input}
          value={points}
          onChangeText={setPoints}
          keyboardType="numeric"
        />
        <Text style={s.label}>Coffees required for a free coffee</Text>
        <TextInput
          style={s.input}
          value={goal}
          onChangeText={setGoal}
          keyboardType="numeric"
        />
        <Text style={s.label}>Maximum free coffee value ($)</Text>
        <TextInput
          style={s.input}
          value={max}
          onChangeText={setMax}
          keyboardType="numeric"
        />
        <Button
          label="Save Loyalty Rules"
          onPress={() =>
            void saveSettings({
              ...settings,
              pointsPerDollar: Number(points) || 0,
              coffeeGoal: Number(goal) || 4,
              freeCoffeeMaxCents: Math.round((Number(max) || 0) * 100),
            })
          }
        />
      </Card>

      <Text style={s.heading}>Active Promo Codes ({promos.length})</Text>
      {promos.map((p) => (
        <Promo key={p.id} promo={p} />
      ))}

      <Card>
        <Text style={s.label}>Create new promo code</Text>
        <TextInput
          style={s.input}
          value={code}
          onChangeText={setCode}
          placeholder="e.g. WELCOME10, LUNCH5"
          autoCapitalize="characters"
        />
        <Button
          label="Create Promo Code"
          disabled={!code.trim()}
          onPress={() =>
            void savePromo({
              code,
              description: 'Special promotion',
              discountType: 'percent',
              discountValue: 10,
              minimumSpend: 0,
              enabled: true,
            }).then(() => setCode(''))
          }
        />
      </Card>
    </Screen>
  );
}

const s = StyleSheet.create({
  banner: {
    backgroundColor: colors.cream,
    padding: 10,
    borderRadius: 12,
    marginBottom: 10,
  },
  bannerText: {
    color: colors.ink,
    fontSize: 13,
  },
  bold: {
    fontWeight: '800',
    color: colors.espresso,
  },
  heading: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.ink,
    marginVertical: 14,
  },
  label: {
    color: colors.ink,
    fontWeight: '700',
    fontSize: 13,
    marginTop: 6,
  },
  card: { marginBottom: 12 },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginVertical: 6,
    color: colors.ink,
    backgroundColor: colors.white,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  half: { flex: 1 },
});
