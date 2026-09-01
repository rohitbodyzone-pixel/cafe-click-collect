import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Header, Screen } from '@/src/components/UI';
import { Product } from '@/src/data/products';
import { useProducts } from '@/src/context/ProductContext';
import { colors } from '@/src/theme';
import { useCustomisations } from '@/src/context/CustomisationContext';
import * as ImagePicker from 'expo-image-picker';
import { ProductImage } from '@/src/components/ProductImage';

const categories: Product['category'][] = ['Coffee', 'Drinks', 'Food'];
export default function AdminProduct() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { products, addProduct, updateProduct, uploadProductImage, removeProductImage } = useProducts();
  const { groups } = useCustomisations();
  const existing = products.find((product) => product.id === id);
  const [name, setName] = useState(''); const [category, setCategory] = useState<Product['category']>('Coffee');
  const [price, setPrice] = useState(''); const [description, setDescription] = useState(''); const [emoji, setEmoji] = useState('☕');
  const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  const [customisationGroupIds, setCustomisationGroupIds] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<ImagePicker.ImagePickerAsset>();

  useEffect(() => { if (existing) { setName(existing.name); setCategory(existing.category); setPrice(existing.price.toFixed(2)); setDescription(existing.description); setEmoji(existing.emoji); setCustomisationGroupIds(existing.customisationGroupIds); } }, [existing]);
  const numericPrice = Number(price);
  const valid = name.trim() && description.trim() && Number.isFinite(numericPrice) && numericPrice >= 0;
  const save = async () => {
    setSaving(true); setError('');
    try {
      const input = { name: name.trim(), category, price: numericPrice, description: description.trim(), emoji: emoji.trim() || '☕', customisationGroupIds };
      const productId = existing ? existing.id : await addProduct(input);
      if (existing) await updateProduct(existing.id, input);
      if (selectedImage) await uploadProductImage(productId, { uri: selectedImage.uri, mimeType: selectedImage.mimeType, file: selectedImage.file });
      if (router.canGoBack()) router.back(); else router.replace('/admin-menu');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save item.'); setSaving(false); }
  };
  const chooseImage = async () => {
    setError('');
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { setError('Photo library permission is required to choose an image.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.85 });
    if (!result.canceled) setSelectedImage(result.assets[0]);
  };
  const deleteImage = async () => {
    setError('');
    if (selectedImage) { setSelectedImage(undefined); return; }
    if (!existing?.imagePath) return;
    setSaving(true);
    try { await removeProductImage(existing.id); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not remove image.'); } finally { setSaving(false); }
  };

  return <Screen><Header title={existing ? 'Edit item' : 'Add item'} />
    <Text style={styles.label}>Item name</Text><TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Long Black" placeholderTextColor={colors.muted} />
    <Text style={styles.label}>Category</Text><View style={styles.categories}>{categories.map((item) => <Pressable key={item} onPress={() => setCategory(item)} style={[styles.category, category === item && styles.categoryActive]}><Text style={[styles.categoryText, category === item && { color: colors.white }]}>{item}</Text></Pressable>)}</View>
    <View style={styles.twoColumns}><View style={{ flex: 1 }}><Text style={styles.label}>Price ($)</Text><TextInput style={styles.input} value={price} onChangeText={setPrice} placeholder="0.00" placeholderTextColor={colors.muted} keyboardType="decimal-pad" /></View><View style={styles.emojiColumn}><Text style={styles.label}>Icon</Text><TextInput style={[styles.input, { textAlign: 'center', fontSize: 21 }]} value={emoji} onChangeText={setEmoji} maxLength={4} /></View></View>
    <Text style={styles.label}>Description</Text><TextInput style={[styles.input, styles.description]} value={description} onChangeText={setDescription} placeholder="Describe this menu item" placeholderTextColor={colors.muted} multiline />
    <Text style={styles.label}>Product image</Text><Text style={styles.imageHelp}>Upload a JPG, PNG, WebP or GIF up to 5 MB. This image appears automatically on the customer menu.</Text>
    <ProductImage uri={selectedImage?.uri || existing?.imageUrl} style={styles.preview} placeholderStyle={styles.preview} />
    <View style={styles.imageActions}><Pressable style={styles.imageButton} onPress={() => void chooseImage()} disabled={saving}><Text style={styles.imageButtonText}>{selectedImage || existing?.imagePath ? 'Replace image' : 'Upload image'}</Text></Pressable>{(selectedImage || existing?.imagePath) && <Pressable style={[styles.imageButton, styles.removeImage]} onPress={() => void deleteImage()} disabled={saving}><Text style={[styles.imageButtonText, { color: colors.danger }]}>Delete image</Text></Pressable>}</View>
    <Text style={styles.label}>Customisation groups</Text><Text style={{ color: colors.muted, marginBottom: 8 }}>Choose what customers can customise for this item.</Text><View style={styles.categories}>{groups.map(group => { const active=customisationGroupIds.includes(group.id); return <Pressable key={group.id} onPress={()=>setCustomisationGroupIds(current=>active?current.filter(id=>id!==group.id):[...current,group.id])} style={[styles.category,active&&styles.categoryActive]}><Text style={[styles.categoryText,active&&{color:colors.white}]}>{group.name}</Text></Pressable>; })}</View>
    {!!error && <Text style={styles.error}>{error}</Text>}<View style={{ flex: 1, minHeight: 32 }} /><Button label={saving ? 'Saving…' : existing ? 'Save changes' : 'Add to menu'} disabled={!valid || saving} onPress={() => void save()} />
  </Screen>;
}
const styles = StyleSheet.create({ label: { color: colors.ink, fontWeight: '700', marginTop: 12, marginBottom: 8 }, input: { height: 52, borderRadius: 15, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, paddingHorizontal: 15, color: colors.ink }, categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, category: { flexGrow: 1, paddingHorizontal: 12, paddingVertical: 13, borderRadius: 13, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, alignItems: 'center' }, categoryActive: { backgroundColor: colors.espresso, borderColor: colors.espresso }, categoryText: { color: colors.ink, fontWeight: '700' }, twoColumns: { flexDirection: 'row', gap: 12 }, emojiColumn: { width: 82 }, description: { height: 112, paddingTop: 14, textAlignVertical: 'top' }, imageHelp: { color: colors.muted, fontSize: 12, lineHeight: 18, marginBottom: 10 }, preview: { width: '100%', height: 210, borderRadius: 18 }, imageActions: { flexDirection: 'row', gap: 10, marginTop: 10 }, imageButton: { flex: 1, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.espresso }, removeImage: { backgroundColor: '#FBE8E5', borderWidth: 1, borderColor: '#E8C4BE' }, imageButtonText: { color: colors.white, fontWeight: '800' }, error: { color: colors.danger, marginTop: 14, textAlign: 'center' } });
