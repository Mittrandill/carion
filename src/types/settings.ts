// types/settings.ts

export interface SettingsState {
  stations: string[];
  brands: string[];
  suppliers: string[];
}

// Eylem türlerini tanımlamak için
export type SettingsActionType = 'stations' | 'brands' | 'taskTags';
