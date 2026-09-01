import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Header, Screen } from '@/src/components/UI';
import { useTables } from '@/src/context/TableContext';
import { useRestaurant } from '@/src/context/RestaurantContext';
import { colors } from '@/src/theme';

export default function AdminTables() {
  const { currentRestaurant } = useRestaurant();
  const { tables, loading, error, addTable, updateTable, removeTable } =
    useTables();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const add = async () => {
    setBusy(true);
    setMessage('');
    try {
      await addTable(code, name);
      setCode('');
      setName('');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not add table.');
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = (id: string, tableName: string) => {
    if (Platform.OS === 'web') {
      if (confirm(`Remove table "${tableName}"?`)) {
        void removeTable(id);
      }
    } else {
      Alert.alert('Remove table?', tableName, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => void removeTable(id),
        },
      ]);
    }
  };

  return (
    <Screen>
      <Header title="Table Management" />
      <View style={styles.banner}>
        <Ionicons name="storefront-outline" size={16} color={colors.caramel} />
        <Text style={styles.bannerText}>
          Managing tables for <Text style={styles.bold}>{currentRestaurant.name}</Text>
        </Text>
      </View>
      <Text style={styles.help}>
        Create tables for your restaurant, then view or print their dedicated QR codes.
      </Text>

      <Card style={styles.form}>
        <Text style={styles.label}>Table Code / Identifier</Text>
        <TextInput
          style={styles.input}
          value={code}
          onChangeText={setCode}
          placeholder="e.g. 1, T2, patio-3"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
        />
        <Text style={styles.label}>Display Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Table 1 (Window)"
          placeholderTextColor={colors.muted}
        />
        <Button
          label={busy ? 'Adding…' : 'Add Table'}
          disabled={busy || !code.trim() || !name.trim()}
          onPress={add}
        />
      </Card>

      {!!message && <Text style={styles.error}>{message}</Text>}
      {!!error && <Text style={styles.error}>{error}</Text>}

      <Text style={styles.heading}>
        {loading ? 'Loading…' : `${tables.length} tables for ${currentRestaurant.name}`}
      </Text>

      {tables.map((table) => (
        <Card key={table.id} style={styles.table}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{table.name}</Text>
            <Text style={styles.link}>
              /r/{currentRestaurant.slug}/table/{table.code}
            </Text>
          </View>
          <Pressable
            style={styles.icon}
            onPress={() => void updateTable(table.id, { active: !table.active })}
            accessibilityLabel={table.active ? 'Disable table' : 'Enable table'}
          >
            <Ionicons
              name={table.active ? 'checkmark-circle' : 'close-circle-outline'}
              size={23}
              color={table.active ? colors.green : colors.muted}
            />
          </Pressable>
          <Pressable
            style={styles.icon}
            onPress={() =>
              router.push({ pathname: '/admin-table-qr', params: { id: table.id } })
            }
            accessibilityLabel="View QR code"
          >
            <Ionicons
              name="qr-code-outline"
              size={22}
              color={colors.espresso}
            />
          </Pressable>
          <Pressable
            style={styles.icon}
            onPress={() => handleRemove(table.id, table.name)}
            accessibilityLabel="Delete table"
          >
            <Ionicons
              name="trash-outline"
              size={21}
              color={colors.danger}
            />
          </Pressable>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.cream,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 10,
  },
  bannerText: {
    color: colors.ink,
    fontSize: 12,
  },
  bold: {
    fontWeight: '800',
    color: colors.espresso,
  },
  help: {
    color: colors.muted,
    marginBottom: 14,
    fontSize: 13,
  },
  form: {
    marginBottom: 16,
  },
  label: {
    color: colors.ink,
    fontWeight: '700',
    marginBottom: 7,
    fontSize: 13,
  },
  input: {
    height: 50,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 13,
    color: colors.ink,
  },
  heading: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '800',
    marginVertical: 12,
  },
  table: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  name: {
    color: colors.ink,
    fontWeight: '800',
    fontSize: 16,
  },
  link: {
    color: colors.muted,
    marginTop: 4,
    fontSize: 11,
  },
  icon: {
    padding: 9,
  },
  error: {
    color: colors.danger,
    marginBottom: 10,
    fontSize: 13,
  },
});
