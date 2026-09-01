import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Button, Card, Header, Screen } from '@/src/components/UI';
import { useProducts } from '@/src/context/ProductContext';
import { useRestaurant } from '@/src/context/RestaurantContext';
import { money } from '@/src/data/products';
import { colors } from '@/src/theme';
import { ProductImage } from '@/src/components/ProductImage';

export default function AdminMenu() {
  const { currentRestaurant } = useRestaurant();
  const { products, loading, error, toggleSoldOut, deleteProduct } =
    useProducts();
  const [pendingDelete, setPendingDelete] =
    useState<{ id: string; name: string }>();

  const remove = async () => {
    if (!pendingDelete) return;
    await deleteProduct(pendingDelete.id);
    setPendingDelete(undefined);
  };

  return (
    <Screen>
      <Header title="Menu Management" />

      <View style={styles.banner}>
        <Text style={styles.bannerText}>
          Menu for <Text style={styles.bold}>{currentRestaurant.name}</Text>
        </Text>
      </View>

      <View style={styles.intro}>
        <View>
          <Text style={styles.title}>Menu items</Text>
          <Text style={styles.subtitle}>
            {loading ? 'Loading…' : `${products.length} items`}
          </Text>
        </View>
        <Pressable
          style={styles.addIcon}
          onPress={() => router.push('/admin-product')}
          accessibilityLabel="Add menu item"
        >
          <Ionicons name="add" size={25} color={colors.white} />
        </Pressable>
      </View>

      {!!error && (
        <View style={styles.errorBox}>
          <Text style={styles.error}>{error}</Text>
        </View>
      )}

      {products.map((product) => (
        <Card key={product.id} style={styles.card}>
          <ProductImage
            uri={product.imageUrl}
            style={styles.thumbnail}
            placeholderStyle={styles.thumbnail}
          />
          <View style={styles.copy}>
            <Text style={styles.name}>{product.name}</Text>
            <Text style={styles.meta}>
              {product.category} · {money(product.price)}
            </Text>
            <View style={styles.availability}>
              <Switch
                value={!product.soldOut}
                onValueChange={(available) =>
                  void toggleSoldOut(product.id, !available)
                }
                trackColor={{ false: '#D8CBC1', true: '#A9C7AF' }}
                thumbColor={!product.soldOut ? colors.green : colors.muted}
              />
              <Text
                style={[
                  styles.status,
                  { color: product.soldOut ? colors.danger : colors.green },
                ]}
              >
                {product.soldOut ? 'Sold out' : 'Available'}
              </Text>
            </View>
          </View>
          <View style={styles.actions}>
            <Pressable
              style={styles.action}
              onPress={() =>
                router.push({
                  pathname: '/admin-product',
                  params: { id: product.id },
                })
              }
              accessibilityLabel="Edit item"
            >
              <Ionicons
                name="pencil-outline"
                size={19}
                color={colors.espresso}
              />
            </Pressable>
            <Pressable
              style={styles.action}
              onPress={() =>
                setPendingDelete({ id: product.id, name: product.name })
              }
              accessibilityLabel="Delete item"
            >
              <Ionicons
                name="trash-outline"
                size={19}
                color={colors.danger}
              />
            </Pressable>
          </View>
        </Card>
      ))}

      {!!pendingDelete && (
        <View style={styles.confirm}>
          <Text style={styles.confirmTitle}>
            Delete {pendingDelete.name}?
          </Text>
          <Text style={styles.confirmText}>
            This removes it from {currentRestaurant.name} menu.
          </Text>
          <View style={styles.confirmActions}>
            <Pressable
              style={styles.cancel}
              onPress={() => setPendingDelete(undefined)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.delete} onPress={() => void remove()}>
              <Text style={styles.deleteText}>Delete item</Text>
            </Pressable>
          </View>
        </View>
      )}

      {!loading && products.length === 0 && !error && (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No menu items yet</Text>
          <Text style={styles.subtitle}>
            Add your first item to {currentRestaurant.name}.
          </Text>
        </View>
      )}

      <View style={{ height: 12 }} />
      <Button
        label="Add new item"
        icon="add"
        onPress={() => router.push('/admin-product')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.cream,
    padding: 10,
    borderRadius: 12,
    marginBottom: 14,
  },
  bannerText: {
    color: colors.ink,
    fontSize: 13,
  },
  bold: {
    fontWeight: '800',
    color: colors.espresso,
  },
  intro: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 24, fontWeight: '800', color: colors.ink },
  subtitle: { color: colors.muted, marginTop: 3 },
  addIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.espresso,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBox: {
    padding: 13,
    borderRadius: 13,
    backgroundColor: '#FBE8E5',
    marginBottom: 14,
  },
  error: { color: colors.danger },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    padding: 13,
  },
  thumbnail: { width: 56, height: 56, borderRadius: 15, marginRight: 12 },
  copy: { flex: 1 },
  name: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  meta: { color: colors.muted, fontSize: 12, marginTop: 4 },
  availability: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 7,
    marginLeft: -7,
  },
  status: { fontSize: 12, fontWeight: '700', marginLeft: 4 },
  actions: { gap: 8 },
  action: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirm: {
    backgroundColor: '#FBE8E5',
    borderRadius: 17,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E8C4BE',
  },
  confirmTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  confirmText: { color: colors.muted, fontSize: 12, marginTop: 4 },
  confirmActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  cancel: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { color: colors.ink, fontWeight: '700' },
  delete: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: { color: colors.white, fontWeight: '800' },
  empty: { alignItems: 'center', paddingVertical: 50 },
  emptyTitle: { color: colors.ink, fontSize: 18, fontWeight: '800' },
});
