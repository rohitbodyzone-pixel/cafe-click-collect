import { Stack, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { OrderProvider } from '@/src/context/OrderContext';
import { ProductProvider } from '@/src/context/ProductContext';
import { PickupSettingsProvider } from '@/src/context/PickupSettingsContext';
import { TableProvider } from '@/src/context/TableContext';
import { CustomisationProvider } from '@/src/context/CustomisationContext';
import { LoyaltyProvider } from '@/src/context/LoyaltyContext';
import { PaymentSettingsProvider } from '@/src/context/PaymentSettingsContext';
import { AdminAuthProvider } from '@/src/context/AdminAuthContext';
import { AdminGate } from '@/src/components/AdminGate';

function AppNavigator() {
  const segments = useSegments();
  const navigator = <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />;
  const firstSegment = String(segments[0] || '');
  const isProtectedAdminRoute = firstSegment.startsWith('admin') && firstSegment !== 'admin-reset-password';
  return isProtectedAdminRoute ? <AdminGate>{navigator}</AdminGate> : navigator;
}

export default function RootLayout() {
  return <AdminAuthProvider><CustomisationProvider><ProductProvider><PickupSettingsProvider><TableProvider><LoyaltyProvider><PaymentSettingsProvider><OrderProvider><StatusBar style="dark" /><AppNavigator /></OrderProvider></PaymentSettingsProvider></LoyaltyProvider></TableProvider></PickupSettingsProvider></ProductProvider></CustomisationProvider></AdminAuthProvider>;
}
