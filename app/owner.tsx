import React from 'react';
import { RoleGate } from '@/src/components/RoleGate';
import AdminScreen from './admin';

export default function OwnerScreen() {
  return (
    <RoleGate
      allowedRoles={['owner', 'super_admin', 'admin']}
      roleTitle="Restaurant Owner"
    >
      <AdminScreen />
    </RoleGate>
  );
}
