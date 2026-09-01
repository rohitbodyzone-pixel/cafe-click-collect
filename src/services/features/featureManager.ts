import { supabase } from '@/src/lib/supabase';
import { PLATFORM_FEATURES, RestaurantFeaturePermission, FeatureCategory } from './types';

export class FeatureManager {
  /**
   * Loads all feature permissions for a restaurant from Supabase
   */
  static async getPermissions(restaurantId: string): Promise<Record<string, boolean>> {
    if (!supabase) {
      // Return defaults if offline
      const defaults: Record<string, boolean> = {};
      PLATFORM_FEATURES.forEach((f) => {
        defaults[f.key] = f.defaultEnabled;
      });
      return defaults;
    }

    try {
      const { data, error } = await supabase
        .from('restaurant_feature_permissions')
        .select('feature_key, is_enabled')
        .eq('restaurant_id', restaurantId);

      if (error) throw error;

      const perms: Record<string, boolean> = {};
      // Seed with platform defaults first
      PLATFORM_FEATURES.forEach((f) => {
        perms[f.key] = f.defaultEnabled;
      });

      if (data) {
        data.forEach((row) => {
          perms[row.feature_key] = row.is_enabled;
        });
      }
      return perms;
    } catch (e) {
      console.warn('Error loading feature permissions:', e);
      const defaults: Record<string, boolean> = {};
      PLATFORM_FEATURES.forEach((f) => {
        defaults[f.key] = f.defaultEnabled;
      });
      return defaults;
    }
  }

  /**
   * Toggles a single feature permission for a restaurant (Super Admin)
   */
  static async toggleFeature(
    restaurantId: string,
    featureKey: string,
    isEnabled: boolean,
  ): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase.rpc('toggle_restaurant_feature_permission', {
      p_restaurant_id: restaurantId,
      p_feature_key: featureKey,
      p_enabled: isEnabled,
    });
    if (error) throw error;
  }

  /**
   * Bulk toggles all features in a category for a restaurant (Super Admin)
   */
  static async bulkToggleCategory(
    restaurantId: string,
    category: FeatureCategory,
    isEnabled: boolean,
  ): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase.rpc('bulk_toggle_restaurant_features', {
      p_restaurant_id: restaurantId,
      p_category: category,
      p_enabled: isEnabled,
    });
    if (error) throw error;
  }
}
