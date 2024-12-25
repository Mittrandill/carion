// Define strict types for all database entities
export interface Vehicle {
  id: string  // Changed to string for UUID
  plate: string
}

export interface Tire {
  id: string  // Changed to string for UUID
  vehicle_id: string  // Changed to string for UUID
  position: string
  brand: string
  type: string
  size: string
  last_km?: number
  condition?: string
  current_km?: number
  last_change_date?: string
}

export interface TireStock {
  id: string  // Changed to string for UUID
  brand: string
  type: string
  pattern: string
  size: string
  condition: string
  quantity: number
}

export interface TireRecord {
  id?: string  // Changed to string for UUID
  date: string
  vehicle_plate: string
  vehicle_id: string  // Changed to string for UUID
  tire_position: string
  change_km: number
  removed_tire_id: string | null  // Changed to string for UUID
  installed_tire_id: string | null  // Changed to string for UUID
  removed_tire_km: number
  installed_tire_km: number
  user_id: string
}

// Add validation functions
export function validateTireRecord(data: Partial<TireRecord>): { isValid: boolean; error?: string } {
  if (!data.vehicle_id) {
    return { isValid: false, error: 'Geçersiz araç ID' }
  }

  if (!data.tire_position) {
    return { isValid: false, error: 'Lastik pozisyonu gerekli' }
  }

  if (!data.change_km || typeof data.change_km !== 'number') {
    return { isValid: false, error: 'Geçersiz kilometre değeri' }
  }

  return { isValid: true }
}

// Add UUID validation function
export function isValidUUID(uuid: string) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

