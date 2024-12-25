export interface FuelRecord {
  id: string;
  vehicleId: string;
  currentKm: number;
  date: string;
  receiptNo: string;
  stationType: 'internal' | 'external';
  station: string;
  fuelType: string;
  amount: number;
  unitPrice: number;
  total: number;
  tankId?: string;
  counterType: 'withCounter' | 'withoutCounter';
  created_at: string;
  updated_at: string;
}

export type NewFuelRecord = Omit<FuelRecord, 'id' | 'created_at' | 'updated_at'>;

export type UpdateFuelRecord = Partial<NewFuelRecord>;

export enum FuelType {
  GASOLINE = 'Benzin',
  DIESEL = 'Dizel',
  LPG = 'LPG',
  ELECTRIC = 'Elektrik',
  HYBRID = 'Hibrit'
}

export enum StationType {
  INTERNAL = 'internal',
  EXTERNAL = 'external'
}

export enum CounterType {
  WITH_COUNTER = 'withCounter',
  WITHOUT_COUNTER = 'withoutCounter'
}