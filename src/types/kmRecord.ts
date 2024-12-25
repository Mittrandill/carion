// types/kmRecord.ts
export interface KmRecord {
  id: string;
  vehicleId: string;
  km: number;
  date: string;
  created_at: string;
  updated_at: string;
}

export type NewKmRecord = Omit<KmRecord, 'id' | 'created_at' | 'updated_at'>;
export type UpdateKmRecord = Partial<NewKmRecord>;
