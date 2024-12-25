// types/visaInspectionRecord.ts
export interface VisaInspectionRecord {
  id: string;
  vehicleId: string;
  type: 'visa' | 'inspection';
  date: string;
  expirationDate: string;
  cost: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type NewVisaInspectionRecord = Omit<VisaInspectionRecord, 'id' | 'created_at' | 'updated_at'>;
export type UpdateVisaInspectionRecord = Partial<NewVisaInspectionRecord>;