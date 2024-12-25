export interface Vehicle {
  id: string;
  plate: string;
  make: string;
  model: string;
  year: number;
  visaValidUntil: string;
  status: boolean;
  type: string;
  ticariad: string;
  isVehicleSubjectToVisa: boolean;
  currentKm?: number;
  nextServiceDue?: number;
  fuelType?: string;
  color?: string;
  created_at: string;
  updated_at: string;
}

export type NewVehicle = Omit<Vehicle, 'id' | 'created_at' | 'updated_at'>;
export type UpdateVehicle = Partial<NewVehicle>;