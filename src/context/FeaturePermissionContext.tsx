import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useRestaurant } from './RestaurantContext';
import { FeatureCategory, FeatureDefinition, FeatureState, PLATFORM_FEATURES } from '@/src/services/features/types';
import {
  fetchRestaurantFeatureStates,
  toggleFeaturePermission,
  bulkToggleFeatureCategory,
} from '@/src/services/features/featureManager';
import { supabase } from '@/src/lib/supabase';

interface FeaturePermissionContextType {
  features: Record<string, FeatureState>;
  catalog: FeatureDefinition[];
  loading: boolean;
  isFeatureEnabled: (featureKey: string) => boolean;
  getFeatureState: (featureKey: string) => FeatureState;
  toggleSuperAdminFeature: (restaurantId: string, featureKey: string, enabled: boolean) => Promise<void>;
  toggleOwnerFeature: (restaurantId: string, featureKey: string, enabled: boolean) => Promise<void>;
  bulkToggleCategory: (
    restaurantId: string,
    category: FeatureCategory,
    enabled: boolean,
    level: 'super_admin' | 'owner',
  ) => Promise<void>;
  refresh: () => Promise<void>;
}

const FeaturePermissionContext = createContext<FeaturePermissionContextType | undefined>(undefined);

export function FeaturePermissionProvider({ children }: { children: React.ReactNode }) {
  const { currentRestaurant } = useRestaurant();
  const [features, setFeatures] = useState<Record<string, FeatureState>>({});
  const [loading, setLoading] = useState<boolean>(true);

  const loadPermissions = useCallback(async () => {
    if (!currentRestaurant?.id) {
      const defaults: Record<string, FeatureState> = {};
      for (const f of PLATFORM_FEATURES) {
        defaults[f.key] = { superAdmin: f.defaultEnabled, owner: f.defaultEnabled, effective: f.defaultEnabled };
      }
      setFeatures(defaults);
      setLoading(false);
      return;
    }

    try {
      const states = await fetchRestaurantFeatureStates(currentRestaurant.id);
      setFeatures(states);
    } catch (e) {
      console.error('Error in FeaturePermissionProvider:', e);
    } finally {
      setLoading(false);
    }
  }, [currentRestaurant?.id]);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  // Realtime subscription for instant updates across devices
  useEffect(() => {
    if (!supabase || !currentRestaurant?.id) return;

    const channel = supabase
      .channel(`features-${currentRestaurant.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'restaurant_feature_permissions',
          filter: `restaurant_id=eq.${currentRestaurant.id}`,
        },
        () => {
          loadPermissions();
        },
      )
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  }, [currentRestaurant?.id, loadPermissions]);

  const isFeatureEnabled = useCallback(
    (featureKey: string): boolean => {
      const state = features[featureKey];
      if (!state) {
        const def = PLATFORM_FEATURES.find((f) => f.key === featureKey);
        return def ? def.defaultEnabled : true;
      }
      return state.effective;
    },
    [features],
  );

  const getFeatureState = useCallback(
    (featureKey: string): FeatureState => {
      const state = features[featureKey];
      if (!state) {
        const def = PLATFORM_FEATURES.find((f) => f.key === featureKey);
        const defVal = def ? def.defaultEnabled : true;
        return { superAdmin: defVal, owner: defVal, effective: defVal };
      }
      return state;
    },
    [features],
  );

  const toggleSuperAdminFeature = useCallback(
    async (restaurantId: string, featureKey: string, enabled: boolean) => {
      await toggleFeaturePermission(restaurantId, featureKey, enabled, 'super_admin');
      if (restaurantId === currentRestaurant?.id) {
        setFeatures((prev) => {
          const current = prev[featureKey] || { superAdmin: true, owner: true, effective: true };
          const newSuper = enabled;
          return {
            ...prev,
            [featureKey]: {
              superAdmin: newSuper,
              owner: current.owner,
              effective: newSuper && current.owner,
            },
          };
        });
      }
    },
    [currentRestaurant?.id],
  );

  const toggleOwnerFeature = useCallback(
    async (restaurantId: string, featureKey: string, enabled: boolean) => {
      await toggleFeaturePermission(restaurantId, featureKey, enabled, 'owner');
      if (restaurantId === currentRestaurant?.id) {
        setFeatures((prev) => {
          const current = prev[featureKey] || { superAdmin: true, owner: true, effective: true };
          const newOwner = enabled;
          return {
            ...prev,
            [featureKey]: {
              superAdmin: current.superAdmin,
              owner: newOwner,
              effective: current.superAdmin && newOwner,
            },
          };
        });
      }
    },
    [currentRestaurant?.id],
  );

  const bulkToggleCategory = useCallback(
    async (restaurantId: string, category: FeatureCategory, enabled: boolean, level: 'super_admin' | 'owner') => {
      await bulkToggleFeatureCategory(restaurantId, category, enabled, level);
      await loadPermissions();
    },
    [loadPermissions],
  );

  const value = useMemo(
    () => ({
      features,
      catalog: PLATFORM_FEATURES,
      loading,
      isFeatureEnabled,
      getFeatureState,
      toggleSuperAdminFeature,
      toggleOwnerFeature,
      bulkToggleCategory,
      refresh: loadPermissions,
    }),
    [
      features,
      loading,
      isFeatureEnabled,
      getFeatureState,
      toggleSuperAdminFeature,
      toggleOwnerFeature,
      bulkToggleCategory,
      loadPermissions,
    ],
  );

  return <FeaturePermissionContext.Provider value={value}>{children}</FeaturePermissionContext.Provider>;
}

export function useFeaturePermission() {
  const context = useContext(FeaturePermissionContext);
  if (!context) {
    throw new Error('useFeaturePermission must be used within a FeaturePermissionProvider');
  }
  return context;
}
