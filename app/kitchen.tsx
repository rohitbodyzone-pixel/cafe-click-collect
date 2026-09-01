import React from 'react';
import { RoleGate } from '@/src/components/RoleGate';
import KitchenAdminScreen from './admin-kitchen';

export default function KitchenStationScreen() {
  return (
    <RoleGate
      allowedRoles={['kitchen', 'manager', 'owner', 'super_admin']}
      roleTitle="Kitchen Display System"
    >
      <KitchenAdminScreen />
    </RoleGate>
  );
}
