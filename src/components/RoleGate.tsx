import React, { PropsWithChildren, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Button, Screen } from '@/src/components/UI';
import { StaffRole, useAdminAuth } from '@/src/context/AdminAuthContext';
import { colors } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';

interface RoleGateProps extends PropsWithChildren {
  allowedRoles: StaffRole[];
  roleTitle: string;
  defaultRedirect?: string;
}

export function RoleGate({ children, allowedRoles, roleTitle, defaultRedirect = '/' }: RoleGateProps) {
  const auth = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const submit = async () => {
    setBusy(true);
    setMessage('');
    try {
      await auth.signIn(email, password);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  };

  // 1. Loading State
  if (auth.loading) {
    return (
      <Screen>
        <View style={s.center}>
          <ActivityIndicator color={colors.espresso} size="large" />
          <Text style={s.help}>Verifying role permissions…</Text>
        </View>
      </Screen>
    );
  }

  // 2. Unauthenticated State (Prompt Login)
  if (!auth.session || !auth.staff) {
    return (
      <Screen>
        <View style={s.panel}>
          <View style={s.badge}>
            <Ionicons name="shield-checkmark" size={14} color={colors.caramel} />
            <Text style={s.badgeText}>{roleTitle.toUpperCase()} PORTAL</Text>
          </View>
          <Text style={s.title}>Sign in to {roleTitle}</Text>
          <Text style={s.help}>
            This station is restricted. Enter your authorized staff credentials to continue.
          </Text>

          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Staff email"
            autoCapitalize="none"
            keyboardType="email-address"
            style={s.input}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password (8+ characters)"
            secureTextEntry
            style={s.input}
          />
          <Button
            label={busy ? 'Signing in…' : 'Sign in'}
            disabled={busy || !email.includes('@') || password.length < 6}
            onPress={() => void submit()}
          />
          {!!message && <Text style={s.errorMessage}>{message}</Text>}

          <View style={{ height: 16 }} />
          <Pressable onPress={() => router.replace('/')}>
            <Text style={s.backLink}>← Return to Customer Marketplace</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  // 3. Authenticated but Unauthorized Role State (Access Denied)
  const isAllowed = allowedRoles.includes(auth.staff.role);
  if (!isAllowed) {
    const roleNavMap: Record<StaffRole, string> = {
      super_admin: '/super-admin',
      owner: '/owner',
      manager: '/manager',
      kitchen: '/kitchen',
      counter: '/counter',
      staff: '/manager',
      admin: '/owner',
    };
    const targetRoute = roleNavMap[auth.staff.role] || '/';

    return (
      <Screen>
        <View style={s.panel}>
          <View style={[s.badge, { backgroundColor: '#FDE8E8' }]}>
            <Ionicons name="lock-closed" size={14} color={colors.danger} />
            <Text style={[s.badgeText, { color: colors.danger }]}>ACCESS RESTRICTED</Text>
          </View>
          <Text style={s.title}>Unauthorized Role</Text>
          <Text style={s.help}>
            This portal is restricted to <Text style={s.bold}>{roleTitle}</Text> accounts.{'\n\n'}
            You are currently signed in as <Text style={s.bold}>{auth.staff.displayName || auth.staff.email}</Text> with role:{' '}
            <Text style={[s.bold, { color: colors.caramel }]}>[{auth.staff.role.toUpperCase()}]</Text>.
          </Text>

          <Button
            label={`Go to ${auth.staff.role.toUpperCase()} Console`}
            onPress={() => router.replace(targetRoute as any)}
          />

          <View style={{ height: 12 }} />
          <Pressable onPress={() => void auth.signOut()}>
            <Text style={s.signOutLink}>Sign out of this account</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  // 4. Authorized -> Render Screen
  return <View style={s.root}>{children}</View>;
}

const s = StyleSheet.create({
  root: { flex: 1 },
  center: {
    flex: 1,
    minHeight: 400,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panel: {
    maxWidth: 460,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 24,
    marginTop: 40,
    borderWidth: 1,
    borderColor: colors.line,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.cream,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.espresso,
    letterSpacing: 0.8,
  },
  title: {
    color: colors.espresso,
    fontWeight: '800',
    fontSize: 26,
    marginBottom: 6,
  },
  help: {
    color: colors.muted,
    lineHeight: 20,
    fontSize: 13,
    marginBottom: 18,
  },
  bold: {
    fontWeight: '800',
    color: colors.ink,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    color: colors.ink,
    backgroundColor: colors.white,
  },
  errorMessage: {
    color: colors.danger,
    marginTop: 10,
    fontSize: 12,
    textAlign: 'center',
  },
  backLink: {
    color: colors.caramel,
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
  },
  signOutLink: {
    color: colors.muted,
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
  },
});
