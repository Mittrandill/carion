export interface ServiceRecord {
    id: string;
    vehicleId: string;
    date: string;
    serviceType: string;
    description: string;
    cost: number;
    mileage: number;
    nextServiceDate: string | null;
    nextServiceMileage: number | null;
    created_at: string;
    updated_at: string;
  }
  
  export type NewServiceRecord = Omit<ServiceRecord, 'id' | 'created_at' | 'updated_at'>;
  
  export type UpdateServiceRecord = Partial<NewServiceRecord>;
  
  export enum ServiceType {
    OIL_CHANGE = 'Yağ Değişimi',
    TIRE_ROTATION = 'Lastik Rotasyonu',
    BRAKE_SERVICE = 'Fren Servisi',
    ENGINE_TUNE_UP = 'Motor Ayarı',
    TRANSMISSION_SERVICE = 'Şanzıman Servisi',
    BATTERY_REPLACEMENT = 'Akü Değişimi',
    AIR_FILTER_REPLACEMENT = 'Hava Filtresi Değişimi',
    COOLANT_FLUSH = 'Soğutma Sıvısı Değişimi',
    WHEEL_ALIGNMENT = 'Rot Ayarı',
    GENERAL_INSPECTION = 'Genel Kontrol',
    OTHER = 'Diğer'
  }