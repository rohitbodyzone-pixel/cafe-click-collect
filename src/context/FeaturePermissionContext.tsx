import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRestaurant } from './RestaurantContext';
import { FeatureManager } from '../services/features/featureManager';
import { FeatureCategory, PLATFORM_FEATURES } from '../services/features/types';

interface FeaturePermissionContextType {
  permissions: Record<string, boolean>;
  isFeatureEnabled: (featureKey: string, fallback?: boolean) => boolean;
  toggleFeature: (restaurantId: string, featureKey: string, isEnabled: boolean) => Promise<void>;
  bulkToggleCategory: (restaurantId: string, category: FeatureCategory, isEnabled: boolean) => Promise<void>;
  loading: boolean;
  refresh: () => Promise<void>;
}

const FeaturePermissionContext = createContext<FeaturePermissionContextType | undefined>(undefined);

export function FeaturePermissionProvider({ children }: { children: React.ReactNode }) {
  const { currentRestaurant } = useRestaurant();
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const loadPermissions = useCallback(async () => {
    try {
      const perms = await FeatureManager.getPermissions(currentRestaurant.id);
      setPermissions(perms);
    } catch (e) {
      console.warn('Error loading permissions:', e);
    } finally {
      setLoading(false);
    }
  }, [currentRestaurant.id]);

  useEffect(() => {
    void loadPermissions();
  }, [loadPermissions]);

  /**
   * Master formula:
   * Effective Availability = Super Admin Allowed && Restaurant Setting Allowed && Operational Conditions
   */
  const isFeatureEnabled = useCallback(
    (featureKey: string, fallback: boolean = true): boolean => {
      // 1. Super Admin master permission check
      if (permissions[featureKey] === false) {
        return false;
      }

      // 2. Restaurant setting operational check
      if (featureKey === 'click_and_collect') {
        return currentRestaurant.clickAndCollectEnabled !== false;
      }
      if (featureKey === 'table_ordering') {
        return currentRestaurant.tableOrderingEnabled !== false;
      }
      if (featureKey === 'pay_at_counter') {
        return currentRestaurant.payAtCounterEnabled !== false;
      }

      return permissions[featureKey] !== undefined ? permissions[featureKey] : fallback;
    },
    [permissions, currentRestaurant],
  );

  const toggleFeature = async (restaurantId: string, featureKey: string, isEnabled: boolean) => {
    await FeatureManager.toggleFeature(restaurantId, featureKey, isEnabled);
    if (restaurantId === currentRestaurant.id) {
      setPermissions((prev) => ({ ...prev, [featureKey]: isEnabled }));
    }
  };

  const bulkToggleCategory = async (restaurantId: string, category: FeatureCategory, isEnabled: boolean) => {
    await FeatureManager.bulkToggleCategory(restaurantId, category, isEnabled);
    if (restaurantId === currentRestaurant.id) {
      const updated = { ...permissions };
      PLATFORM_FEATURES.filter((f) => f.category === category).forEach((f) => {
        updated[f.key] = isEnabled;
      });
      setPermissions(updated);
    }
  };

  return (
    <FeaturePermissionContext.Provider
      value={{
        permissions,
        isFeatureEnabled,
        toggleFeature,
        bulkToggleCategory,
        loading,
        refresh: loadPermissions,
      }}
    >
      {children}
    </FeaturePermissionContext.Provider>
  );
}

export function useFeaturePermission() {
  const context = useContext(FeaturePermissionContext);
  if (!context) {
    throw new Error('useFeaturePermission must be used within a FeaturePermissionProvider');
  }
  return context;
}
