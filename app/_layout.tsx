import { Stack, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { RestaurantProvider } from '@/src/context/RestaurantContext';
import { AdminAuthProvider } from '@/src/context/AdminAuthContext';
import { CustomisationProvider } from '@/src/context/CustomisationContext';
import { ProductProvider } from '@/src/context/ProductContext';
import { PickupSettingsProvider } from '@/src/context/PickupSettingsContext';
import { TableProvider } from '@/src/context/TableContext';
import { LoyaltyProvider } from '@/src/context/LoyaltyContext';
import { PaymentSettingsProvider } from '@/src/context/PaymentSettingsContext';
import { OrderProvider } from '@/src/context/OrderContext';
import { ServiceRequestProvider } from '@/src/context/ServiceRequestContext';
import { CustomerExperienceProvider } from '@/src/context/CustomerExperienceContext';
import { RestaurantOperationsProvider } from '@/src/context/RestaurantOperationsContext';
import { RestaurantAIProvider } from '@/src/context/RestaurantAIContext';
import { GrowthConciergeProvider } from '@/src/context/GrowthConciergeContext';
import { AdminGate } from '@/src/components/AdminGate';

function AppNavigator() {
  const segments = useSegments();
  const navigator = (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
  );
  const firstSegment = String(segments[0] || '');
  const isProtectedAdminRoute =
    (firstSegment.startsWith('admin') || firstSegment.startsWith('super-admin')) &&
    firstSegment !== 'admin-reset-password';

  return isProtectedAdminRoute ? <AdminGate>{navigator}</AdminGate> : navigator;
}

export default function RootLayout() {
  return (
    <RestaurantProvider>
      <AdminAuthProvider>
        <CustomisationProvider>
          <ProductProvider>
            <PickupSettingsProvider>
              <TableProvider>
                <LoyaltyProvider>
                  <PaymentSettingsProvider>
                    <OrderProvider>
                      <ServiceRequestProvider>
                        <CustomerExperienceProvider>
                          <RestaurantOperationsProvider>
                            <RestaurantAIProvider>
                              <GrowthConciergeProvider>
                                <StatusBar style="dark" />
                                <AppNavigator />
                              </GrowthConciergeProvider>
                            </RestaurantAIProvider>
                          </RestaurantOperationsProvider>
                        </CustomerExperienceProvider>
                      </ServiceRequestProvider>
                    </OrderProvider>
                  </PaymentSettingsProvider>
                </LoyaltyProvider>
              </TableProvider>
            </PickupSettingsProvider>
          </ProductProvider>
        </CustomisationProvider>
      </AdminAuthProvider>
    </RestaurantProvider>
  );
}
