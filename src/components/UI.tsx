import { PropsWithChildren, ReactNode } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadow } from '@/src/theme';

export function Screen({ children, scroll = true }: PropsWithChildren<{ scroll?: boolean }>) {
  const content = scroll ? <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>{children}</ScrollView> : <View style={styles.content}>{children}</View>;
  return <SafeAreaView style={styles.safe}>{content}</SafeAreaView>;
}

export function Header({ title, back = true, right }: { title: string; back?: boolean; right?: ReactNode }) {
  return <View style={styles.header}>
    <View style={styles.headerSide}>{back && <Pressable onPress={() => router.back()} style={styles.iconButton}><Ionicons name="chevron-back" size={22} color={colors.ink} /></Pressable>}</View>
    <Text style={styles.headerTitle}>{title}</Text><View style={[styles.headerSide, { alignItems: 'flex-end' }]}>{right}</View>
  </View>;
}

export function Button({ label, onPress, secondary = false, disabled = false, icon }: { label: string; onPress: () => void; secondary?: boolean; disabled?: boolean; icon?: keyof typeof Ionicons.glyphMap }) {
  return <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.button, secondary && styles.buttonSecondary, disabled && { opacity: .45 }, pressed && { opacity: .8 }]}>
    {icon && <Ionicons name={icon} size={18} color={secondary ? colors.espresso : colors.white} />}<Text style={[styles.buttonText, secondary && { color: colors.espresso }]}>{label}</Text>
  </Pressable>;
}

export function Card({ children, style }: PropsWithChildren<{ style?: ViewStyle }>) { return <View style={[styles.card, style]}>{children}</View>; }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  content: { padding: 20, paddingBottom: 42, flexGrow: 1 },
  header: { height: 52, flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  headerSide: { width: 48 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: colors.ink },
  iconButton: { width: 42, height: 42, backgroundColor: colors.white, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  button: { minHeight: 54, borderRadius: 16, paddingHorizontal: 20, backgroundColor: colors.espresso, flexDirection: 'row', gap: 9, alignItems: 'center', justifyContent: 'center', ...shadow },
  buttonSecondary: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, shadowOpacity: 0 },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  card: { backgroundColor: colors.paper, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: colors.line, ...shadow },
});
