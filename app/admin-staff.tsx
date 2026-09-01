import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Card, Header, Screen } from '@/src/components/UI';
import { StaffMember, StaffRole, useAdminAuth } from '@/src/context/AdminAuthContext';
import { useRestaurant } from '@/src/context/RestaurantContext';
import { supabase } from '@/src/lib/supabase';
import { colors } from '@/src/theme';

const availableRoles: Array<{ key: StaffRole; label: string }> = [
  { key: 'staff', label: 'General' },
  { key: 'kitchen', label: 'Kitchen' },
  { key: 'counter', label: 'Counter' },
  { key: 'manager', label: 'Manager' },
  { key: 'owner', label: 'Owner' },
];

export default function AdminStaff() {
  const { currentRestaurant } = useRestaurant();
  const auth = useAdminAuth();
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<StaffRole>('staff');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const targetRestaurantId = auth.staff?.restaurantId || currentRestaurant.id;

  const load = useCallback(async () => {
    if (!supabase) return;
    const result = await supabase
      .from('restaurant_staff')
      .select('*')
      .eq('restaurant_id', targetRestaurantId)
      .order('email');

    if (result.error) {
      // Fallback to cafe_staff if relation not migrated yet
      const fallback = await supabase.from('cafe_staff').select('*').order('email');
      if (fallback.data) {
        setMembers(
          fallback.data.map((row) => ({
            userId: row.user_id,
            email: row.email,
            displayName: row.display_name,
            role: row.role === 'admin' ? 'owner' : 'staff',
            restaurantId: targetRestaurantId,
          })),
        );
      } else {
        setError(result.error.message);
      }
    } else {
      setMembers(
        result.data.map((row) => ({
          id: row.id,
          userId: row.user_id,
          email: row.email,
          displayName: row.display_name,
          role: row.role as StaffRole,
          restaurantId: row.restaurant_id,
        })),
      );
    }
  }, [targetRestaurantId]);

  useEffect(() => {
    void load();
  }, [load]);

  const add = async () => {
    if (!supabase) return;
    setBusy(true);
    setError('');
    const result = await supabase.rpc('authorize_restaurant_staff', {
      target_restaurant_id: targetRestaurantId,
      staff_email: email.trim().toLowerCase(),
      staff_display_name: name.trim(),
      staff_role: role,
    });
    if (result.error) {
      setError(result.error.message);
    } else {
      setEmail('');
      setName('');
      await load();
    }
    setBusy(false);
  };

  const remove = async (member: StaffMember) => {
    if (!supabase) return;
    setBusy(true);
    const result = await supabase
      .from('restaurant_staff')
      .delete()
      .eq('email', member.email)
      .eq('restaurant_id', targetRestaurantId);

    if (result.error) setError(result.error.message);
    else await load();
    setBusy(false);
  };

  const canManageStaff = auth.isSuperAdmin || auth.isOwnerOrManager;

  return (
    <Screen>
      <Header title="Staff & Roles" />
      <View style={s.banner}>
        <Text style={s.bannerText}>
          Managing staff for <Text style={s.bold}>{currentRestaurant.name}</Text>
        </Text>
      </View>
      <Text style={s.help}>
        Authorize team members to manage the kitchen queue, counter, or menu for {currentRestaurant.name}.
      </Text>

      {canManageStaff && (
        <Card>
          <Text style={s.label}>Staff Email</Text>
          <TextInput
            style={s.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="staff@cafe.co.nz"
          />
          <Text style={s.label}>Display Name</Text>
          <TextInput
            style={s.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Alex"
          />

          <Text style={s.label}>Role</Text>
          <View style={s.roles}>
            {availableRoles.map((r) => (
              <Pressable
                key={r.key}
                style={[s.role, role === r.key && s.roleActive]}
                onPress={() => setRole(r.key)}
              >
                <Text
                  style={[
                    s.roleText,
                    role === r.key && { color: colors.white },
                  ]}
                >
                  {r.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Button
            label={busy ? 'Saving…' : 'Authorize Staff Member'}
            disabled={busy || !email.includes('@')}
            onPress={() => void add()}
          />
        </Card>
      )}

      {!!error && <Text style={s.error}>{error}</Text>}

      <Text style={s.heading}>
        Team Members ({members.length})
      </Text>

      {members.map((member) => (
        <Card key={member.email} style={s.member}>
          <View style={{ flex: 1 }}>
            <Text style={s.name}>
              {member.displayName || member.email.split('@')[0]}
            </Text>
            <Text style={s.email}>
              {member.email} ·{' '}
              <Text style={s.roleBadge}>{member.role.toUpperCase()}</Text>
            </Text>
          </View>
          {canManageStaff && member.email !== auth.staff?.email && (
            <Pressable onPress={() => void remove(member)} disabled={busy}>
              <Text style={s.remove}>Remove</Text>
            </Pressable>
          )}
        </Card>
      ))}
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
  help: {
    color: colors.muted,
    lineHeight: 20,
    marginBottom: 14,
    fontSize: 13,
  },
  label: {
    color: colors.ink,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 8,
    fontSize: 13,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 13,
    paddingHorizontal: 13,
    marginBottom: 7,
    backgroundColor: colors.white,
    color: colors.ink,
  },
  roles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 10,
  },
  role: {
    flex: 1,
    minWidth: 60,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: colors.cream,
  },
  roleActive: {
    backgroundColor: colors.espresso,
  },
  roleText: {
    fontWeight: '800',
    color: colors.espresso,
    fontSize: 12,
  },
  error: {
    color: colors.danger,
    marginVertical: 10,
    fontSize: 13,
  },
  heading: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '800',
    marginVertical: 15,
  },
  member: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 9,
  },
  name: {
    fontWeight: '800',
    color: colors.ink,
    fontSize: 15,
  },
  email: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 3,
  },
  roleBadge: {
    color: colors.caramel,
    fontWeight: '800',
  },
  remove: {
    color: colors.danger,
    fontWeight: '800',
    fontSize: 13,
  },
});
