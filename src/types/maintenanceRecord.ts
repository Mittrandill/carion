// types/maintenanceRecord.ts
export interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  date: string;
  description: string;
  cost: number;
  created_at: string;
  updated_at: string;
}

export type NewMaintenanceRecord = Omit<MaintenanceRecord, 'id' | 'created_at' | 'updated_at'>;
export type UpdateMaintenanceRecord = Partial<NewMaintenanceRecord>;