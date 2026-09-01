import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Header, Screen } from '@/src/components/UI';
import { supabase } from '@/src/lib/supabase';
import { colors } from '@/src/theme';

export default function AdminResetPasswordScreen() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Checking your secure reset link…');
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    if (!supabase) { setMessage('Supabase is not configured.'); return; }
    const client = supabase;
    let mounted = true;
    const check = async () => {
      const { data, error } = await client.auth.getSession();
      if (!mounted) return;
      if (error || !data.session) setMessage('This reset link is invalid or has expired. Request a new password reset email.');
      else { setReady(true); setMessage('Enter a new password for your staff account.'); }
    };
    const { data } = client.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session) {
        setReady(true);
        setMessage('Enter a new password for your staff account.');
      }
    });
    void check();
    return () => { mounted = false; data.subscription.unsubscribe(); };
  }, []);

  const updatePassword = async () => {
    if (!supabase || password.length < 12 || password !== confirmPassword) return;
    setBusy(true);
    setMessage('Saving your new password…');
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setMessage(error.message);
    else { setComplete(true); setMessage('Password updated. You can now open the secure admin dashboard.'); }
    setBusy(false);
  };

  return <Screen>
    <Header title="Reset staff password" back={false} />
    <View style={styles.wrap}><Card>
      <Text style={styles.eyebrow}>SECURE CAFE ADMIN</Text>
      <Text style={styles.title}>{complete ? 'Password updated' : 'Choose a new password'}</Text>
      <Text style={styles.help}>{message}</Text>
      {!ready && !complete && <ActivityIndicator color={colors.espresso} />}
      {ready && !complete && <>
        <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry placeholder="New password (12+ characters)" />
        <TextInput style={styles.input} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry placeholder="Confirm new password" />
        {confirmPassword.length > 0 && password !== confirmPassword && <Text style={styles.error}>Passwords do not match.</Text>}
        <Button label={busy ? 'Saving…' : 'Update password'} disabled={busy || password.length < 12 || password !== confirmPassword} onPress={() => void updatePassword()} />
      </>}
      {complete && <Button label="Open admin dashboard" onPress={() => router.replace('/admin')} />}
    </Card></View>
  </Screen>;
}

const styles = StyleSheet.create({
  wrap: { width: '100%', maxWidth: 480, alignSelf: 'center', marginTop: 40 },
  eyebrow: { color: colors.caramel, fontWeight: '800', fontSize: 11, letterSpacing: 1.4 },
  title: { color: colors.espresso, fontWeight: '800', fontSize: 27, marginTop: 8 },
  help: { color: colors.muted, lineHeight: 21, marginVertical: 16 },
  input: { height: 52, borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingHorizontal: 14, marginBottom: 10, color: colors.ink, backgroundColor: colors.white },
  error: { color: colors.danger, marginBottom: 10 },
});
