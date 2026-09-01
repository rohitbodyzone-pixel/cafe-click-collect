import { PropsWithChildren, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Linking from 'expo-linking';
import { Button, Screen } from '@/src/components/UI';
import { useAdminAuth } from '@/src/context/AdminAuthContext';
import { supabase } from '@/src/lib/supabase';
import { colors } from '@/src/theme';

export function AdminGate({ children }: PropsWithChildren) {
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
      setMessage(cause instanceof Error ? cause.message : 'Could not continue.');
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async () => {
    if (!supabase || !email.includes('@')) {
      setMessage('Enter your staff email first.');
      return;
    }
    setBusy(true);
    setMessage('');
    const redirectTo =
      Platform.OS === 'web' && typeof window !== 'undefined'
        ? `${window.location.origin}/admin-reset-password`
        : Linking.createURL('/admin-reset-password');
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo },
    );
    setMessage(
      error
        ? error.message
        : 'Password reset email sent. Open it on this device to choose a new password.',
    );
    setBusy(false);
  };

  const claimSuper = async () => {
    setBusy(true);
    setMessage('');
    try {
      await auth.claimSuperAdmin();
      setMessage('Super admin claimed successfully!');
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Could not claim super admin.');
    } finally {
      setBusy(false);
    }
  };

  let gate: React.ReactNode = null;
  if (auth.loading) {
    gate = (
      <Screen>
        <View style={s.center}>
          <ActivityIndicator color={colors.espresso} />
          <Text style={s.help}>Checking staff access…</Text>
        </View>
      </Screen>
    );
  } else if (auth.session && !auth.staff) {
    gate = (
      <Screen>
        <View style={s.panel}>
          <Text style={s.eyebrow}>SECURE MULTI-RESTAURANT PLATFORM</Text>
          <Text style={s.title}>Staff access required</Text>
          <Text style={s.help}>
            This signed-in account ({auth.session.user.email}) is not yet authorized for a restaurant or as Super Admin.
          </Text>
          <Button
            label={busy ? 'Claiming…' : 'Claim Initial Super Admin'}
            disabled={busy}
            onPress={() => void claimSuper()}
          />
          {!!message && <Text style={s.message}>{message}</Text>}
          <View style={{ height: 12 }} />
          <Pressable onPress={() => void auth.signOut()}>
            <Text style={s.link}>Sign out</Text>
          </Pressable>
        </View>
      </Screen>
    );
  } else if (!auth.staff) {
    gate = (
      <Screen>
        <View style={s.panel}>
          <Text style={s.eyebrow}>SECURE RESTAURANT & PLATFORM ADMIN</Text>
          <Text style={s.title}>Staff sign in</Text>
          <Text style={s.help}>
            Customer ordering is open. Restaurant dashboard, kitchen screen, and menu management require an authorized staff account.
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
            label={busy ? 'Please wait…' : 'Sign in'}
            disabled={busy || !email.includes('@') || password.length < 8}
            onPress={() => void submit()}
          />
          <Pressable disabled={busy} onPress={() => void resetPassword()}>
            <Text style={s.link}>Forgot password?</Text>
          </Pressable>
          {!!message && <Text style={s.message}>{message}</Text>}
          <Text style={s.accountHelp}>
            Accounts are managed by your restaurant owner or platform super admin.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <View style={s.root}>
      <View
        style={[s.content, !auth.staff && s.hidden]}
        pointerEvents={auth.staff ? 'auto' : 'none'}
      >
        {children}
      </View>
      {gate && <View style={s.gate}>{gate}</View>}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1 },
  hidden: { opacity: 0 },
  gate: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.cream },
  center: {
    flex: 1,
    minHeight: 420,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panel: {
    maxWidth: 460,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 22,
    marginTop: 35,
  },
  eyebrow: {
    color: colors.caramel,
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 1.4,
  },
  title: {
    color: colors.espresso,
    fontWeight: '800',
    fontSize: 27,
    marginTop: 8,
  },
  help: { color: colors.muted, lineHeight: 21, marginVertical: 14 },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
    color: colors.ink,
  },
  message: { color: colors.coffee, marginTop: 12, lineHeight: 19 },
  link: {
    color: colors.coffee,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 18,
  },
  accountHelp: {
    color: colors.muted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
  },
});
