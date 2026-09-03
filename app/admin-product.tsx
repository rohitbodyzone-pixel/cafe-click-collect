import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState, useMemo } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Button, Card, Header, Screen, triggerHaptic } from '@/src/components/UI';
import { RoleGate } from '@/src/components/RoleGate';
import { Product } from '@/src/data/products';
import { useProducts } from '@/src/context/ProductContext';
import { colors, radii, shadows } from '@/src/theme';
import { useCustomisations } from '@/src/context/CustomisationContext';
import { ProductImage } from '@/src/components/ProductImage';

export default function AdminProductScreen() {
  return (
    <RoleGate
      allowedRoles={['owner', 'manager', 'super_admin', 'admin']}
      roleTitle="Product & Pricing Editor"
    >
      <AdminProductContent />
    </RoleGate>
  );
}

function AdminProductContent() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const {
    products,
    addProduct,
    updateProduct,
    uploadProductImage,
    removeProductImage,
  } = useProducts();
  const { groups } = useCustomisations();

  const existing = products.find((product) => product.id === id);

  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>('Coffee');
  const [customCatInput, setCustomCatInput] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [emoji, setEmoji] = useState('☕');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [customisationGroupIds, setCustomisationGroupIds] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<ImagePicker.ImagePickerAsset>();

  const availableCategories = useMemo(() => {
    const fromProducts = Array.from(new Set(products.map((p) => p.category)));
    return Array.from(new Set(['Coffee', 'Drinks', 'Food', ...fromProducts]));
  }, [products]);

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setCategory(existing.category);
      setPrice(existing.price.toFixed(2));
      setDescription(existing.description);
      setEmoji(existing.emoji);
      setCustomisationGroupIds(existing.customisationGroupIds || []);
    }
  }, [existing]);

  const numericPrice = Number(price);
  const valid =
    name.trim().length > 0 &&
    Number.isFinite(numericPrice) &&
    numericPrice >= 0;

  const save = async () => {
    triggerHaptic('medium');
    setSaving(true);
    setError('');

    try {
      const chosenCat = customCatInput.trim() || category || 'General';
      const input = {
        name: name.trim(),
        category: chosenCat,
        price: numericPrice,
        description: description.trim(),
        emoji: emoji.trim() || '☕',
        customisationGroupIds,
      };

      const productId = existing ? existing.id : await addProduct(input);
      if (existing) {
        await updateProduct(existing.id, input);
      }

      if (selectedImage) {
        await uploadProductImage(productId, {
          uri: selectedImage.uri,
          mimeType: selectedImage.mimeType,
          file: selectedImage.file,
        });
      }

      triggerHaptic('success');
      if (router.canGoBack()) router.back();
      else router.replace('/admin-menu');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save item.');
      setSaving(false);
    }
  };

  const chooseImage = async () => {
    setError('');
    triggerHaptic('light');
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo library permission is required to choose an image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0]);
    }
  };

  const deleteImage = async () => {
    setError('');
    triggerHaptic('light');
    if (selectedImage) {
      setSelectedImage(undefined);
      return;
    }
    if (!existing?.imagePath) return;

    setSaving(true);
    try {
      await removeProductImage(existing.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not remove image.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <Header title={existing ? 'Edit Menu Item' : 'Add Menu Item'} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        {/* Item Name */}
        <Text style={s.label}>Item Name</Text>
        <TextInput
          style={s.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Signature Flat White, Eggs Benedict"
          placeholderTextColor={colors.muted}
        />

        {/* Category Choice */}
        <Text style={s.label}>Category</Text>
        <View style={s.categoriesWrap}>
          {availableCategories.map((item) => (
            <Pressable
              key={item}
              onPress={() => {
                triggerHaptic('light');
                setCategory(item);
                setCustomCatInput('');
              }}
              style={[
                s.categoryPill,
                category === item && !customCatInput && s.categoryPillActive,
              ]}
            >
              <Text
                style={[
                  s.categoryText,
                  category === item && !customCatInput && s.categoryTextActive,
                ]}
              >
                {item}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Custom Category Input */}
        <TextInput
          style={[s.input, { marginTop: 8 }]}
          value={customCatInput}
          onChangeText={setCustomCatInput}
          placeholder="Or type new custom category (e.g. Daily Specials)"
          placeholderTextColor={colors.muted}
        />

        {/* Price and Emoji */}
        <View style={s.twoColumns}>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Price ($ NZD)</Text>
            <TextInput
              style={s.input}
              value={price}
              onChangeText={setPrice}
              placeholder="0.00"
              placeholderTextColor={colors.muted}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={s.emojiColumn}>
            <Text style={s.label}>Emoji Icon</Text>
            <TextInput
              style={[s.input, { textAlign: 'center', fontSize: 20 }]}
              value={emoji}
              onChangeText={setEmoji}
              maxLength={4}
            />
          </View>
        </View>

        {/* Description */}
        <Text style={s.label}>Description</Text>
        <TextInput
          style={[s.input, s.description]}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe ingredients, origins, and flavor notes"
          placeholderTextColor={colors.muted}
          multiline
        />

        {/* Product Image Section */}
        <Card style={s.imageCard}>
          <View style={s.imageHeader}>
            <View style={{ flex: 1 }}>
              <Text style={s.imageCardTitle}>PRODUCT IMAGE (4:3)</Text>
              <Text style={s.imageHelp}>
                Upload JPG, PNG, WebP or GIF up to 5 MB. Live preview shown below.
              </Text>
            </View>
            <Ionicons name="image-outline" size={20} color={colors.caramel} />
          </View>

          <ProductImage
            uri={selectedImage?.uri || existing?.imageUrl}
            category={category}
            name={name}
            style={s.preview}
            placeholderStyle={s.preview}
            iconSize={40}
          />

          <View style={s.imageActions}>
            <Pressable
              style={s.imageButton}
              onPress={() => void chooseImage()}
              disabled={saving}
            >
              <Ionicons name="cloud-upload-outline" size={16} color={colors.white} />
              <Text style={s.imageButtonText}>
                {selectedImage || existing?.imagePath ? 'Replace Image' : 'Upload Image'}
              </Text>
            </Pressable>

            {(selectedImage || existing?.imagePath) && (
              <Pressable
                style={[s.imageButton, s.removeImage]}
                onPress={() => void deleteImage()}
                disabled={saving}
              >
                <Ionicons name="trash-outline" size={16} color={colors.danger} />
                <Text style={[s.imageButtonText, { color: colors.danger }]}>
                  Remove
                </Text>
              </Pressable>
            )}
          </View>
        </Card>

        {/* Customisation Groups */}
        <Text style={s.label}>Customisation Groups</Text>
        <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 8 }}>
          Choose what modifiers customers can select for this product.
        </Text>
        <View style={s.categoriesWrap}>
          {groups.map((group) => {
            const active = customisationGroupIds.includes(group.id);
            return (
              <Pressable
                key={group.id}
                onPress={() => {
                  triggerHaptic('light');
                  setCustomisationGroupIds((current) =>
                    active
                      ? current.filter((id) => id !== group.id)
                      : [...current, group.id],
                  );
                }}
                style={[s.categoryPill, active && s.categoryPillActive]}
              >
                <Ionicons
                  name={active ? 'checkmark-circle' : 'add-circle-outline'}
                  size={14}
                  color={active ? colors.white : colors.espresso}
                />
                <Text style={[s.categoryText, active && s.categoryTextActive]}>
                  {group.name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {!!error && <Text style={s.error}>{error}</Text>}

        {/* Save CTA */}
        <View style={{ marginTop: 24 }}>
          <Button
            label={saving ? 'Saving…' : existing ? 'Save Changes' : 'Add to Menu'}
            disabled={!valid || saving}
            onPress={() => void save()}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 60,
  },
  label: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 14,
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    fontSize: 14,
    color: colors.ink,
  },
  categoriesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.md,
    backgroundColor: colors.creamSoft,
    borderWidth: 1,
    borderColor: colors.line,
  },
  categoryPillActive: {
    backgroundColor: colors.espresso,
    borderColor: colors.espresso,
    ...shadows.sm,
  },
  categoryText: {
    color: colors.espresso,
    fontWeight: '700',
    fontSize: 12,
  },
  categoryTextActive: {
    color: colors.white,
    fontWeight: '800',
  },
  twoColumns: {
    flexDirection: 'row',
    gap: 12,
  },
  emojiColumn: {
    width: 90,
  },
  description: {
    height: 90,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  imageCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.sm,
  },
  imageHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  imageCardTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.caramel,
    letterSpacing: 0.8,
  },
  imageHelp: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  preview: {
    width: '100%',
    height: 180,
    borderRadius: 16,
  },
  imageActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  imageButton: {
    flex: 1,
    height: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    backgroundColor: colors.espresso,
    ...shadows.sm,
  },
  removeImage: {
    backgroundColor: '#FBE8E5',
    borderWidth: 1,
    borderColor: '#E8C4BE',
  },
  imageButtonText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 12,
  },
  error: {
    color: colors.danger,
    marginTop: 14,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
  },
});
