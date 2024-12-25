export interface FuelTank {
  id: string;
  name: string;
  currentAmount: number;
  counterInfo: CounterStatus;
  capacity: number;
  fuelType: string;
  location: string;
  created_at: string;
  updated_at: string;
}

export type NewFuelTank = Omit<FuelTank, 'id' | 'created_at' | 'updated_at'>;

export type UpdateFuelTank = Partial<NewFuelTank>;

export enum CounterStatus {
  WORKING = 'Çalışıyor',
  NOT_WORKING = 'Çalışmıyor',
  NEEDS_CALIBRATION = 'Kalibrasyon Gerekiyor',
  NOT_AVAILABLE = 'Mevcut Değil'
}

export enum FuelType {
  GASOLINE = 'Benzin',
  DIESEL = 'Dizel',
  LPG = 'LPG',
  BIODIESEL = 'Biyodizel',
  ETHANOL = 'Etanol'
}