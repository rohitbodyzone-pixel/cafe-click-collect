import { supabase } from '@/src/lib/supabase';
import { FeatureCategory, FeatureState, PLATFORM_FEATURES } from './types';

export async function fetchRestaurantFeatureStates(
  restaurantId: string,
): Promise<Record<string, FeatureState>> {
  if (!supabase) {
    const defaults: Record<string, FeatureState> = {};
    for (const f of PLATFORM_FEATURES) {
      defaults[f.key] = { superAdmin: f.defaultEnabled, owner: f.defaultEnabled, effective: f.defaultEnabled };
    }
    return defaults;
  }

  try {
    const { data, error } = await supabase.rpc('get_restaurant_effective_features', {
      p_restaurant_id: restaurantId,
    });

    if (error) {
      console.warn('Error loading effective features RPC:', error.message);
      return fallbackFeatures();
    }

    const result: Record<string, FeatureState> = {};
    for (const f of PLATFORM_FEATURES) {
      const raw = data?.[f.key];
      if (raw) {
        result[f.key] = {
          superAdmin: raw.super_admin ?? true,
          owner: raw.owner ?? true,
          effective: (raw.super_admin ?? true) && (raw.owner ?? true),
        };
      } else {
        result[f.key] = {
          superAdmin: f.defaultEnabled,
          owner: f.defaultEnabled,
          effective: f.defaultEnabled,
        };
      }
    }
    return result;
  } catch (err) {
    console.error('Failed to fetch restaurant feature permissions:', err);
    return fallbackFeatures();
  }
}

export async function toggleFeaturePermission(
  restaurantId: string,
  featureKey: string,
  enabled: boolean,
  level: 'super_admin' | 'owner' = 'super_admin',
): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase.rpc('toggle_restaurant_feature_permission', {
    p_restaurant_id: restaurantId,
    p_feature_key: featureKey,
    p_enabled: enabled,
    p_level: level,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function bulkToggleFeatureCategory(
  restaurantId: string,
  category: FeatureCategory,
  enabled: boolean,
  level: 'super_admin' | 'owner' = 'super_admin',
): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase.rpc('bulk_toggle_restaurant_features', {
    p_restaurant_id: restaurantId,
    p_category: category,
    p_enabled: enabled,
    p_level: level,
  });

  if (error) {
    throw new Error(error.message);
  }
}

function fallbackFeatures(): Record<string, FeatureState> {
  const fallback: Record<string, FeatureState> = {};
  for (const f of PLATFORM_FEATURES) {
    fallback[f.key] = { superAdmin: f.defaultEnabled, owner: f.defaultEnabled, effective: f.defaultEnabled };
  }
  return fallback;
}
