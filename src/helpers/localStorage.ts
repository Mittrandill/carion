import { supabase } from '../lib/supabaseClient';
import { FuelTank } from '../types/fuelTank';
import { FuelRecord } from '../types/fuelRecord';
import { Task } from '../types/task';
import { User } from '../types/user';
import { VisaInspectionRecord, MaintenanceRecord, KmRecord } from '../types';

// User-related functions
export const getUser = async (): Promise<User | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    if (error) throw error;
    return data;
  }
  return null;
};

export const updateUser = async (updates: Partial<User>): Promise<User> => {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', updates.id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const getUserPreferences = async (): Promise<Partial<User> | null> => {
  const user = await getUser();
  if (user) {
    const { id, username, email, ...preferences } = user;
    return preferences;
  }
  return null;
};

// FuelTank-related functions
export const getFuelTanks = async (): Promise<FuelTank[]> => {
  const { data, error } = await supabase
    .from('fuel_tanks')
    .select('*');
  if (error) throw error;
  return data || [];
};

export const saveFuelTank = async (fuelTank: FuelTank): Promise<FuelTank> => {
  const { data, error } = await supabase
    .from('fuel_tanks')
    .upsert(fuelTank)
    .select()
    .single();
  if (error) throw error;
  return data;
};

// FuelRecord-related functions
export const getFuelRecords = async (): Promise<FuelRecord[]> => {
  const { data, error } = await supabase
    .from('fuel_records')
    .select('*');
  if (error) throw error;
  return data || [];
};

export const saveFuelRecord = async (fuelRecord: FuelRecord): Promise<FuelRecord> => {
  const { data, error } = await supabase
    .from('fuel_records')
    .upsert(fuelRecord)
    .select()
    .single();
  if (error) throw error;
  return data;
};

// Task-related functions
export const getTasks = async (): Promise<Task[]> => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*');
  if (error) throw error;
  return data || [];
};

export const saveTask = async (task: Task): Promise<Task> => {
  const { data, error } = await supabase
    .from('tasks')
    .upsert(task)
    .select()
    .single();
  if (error) throw error;
  return data;
};

// MaintenanceRecord-related functions
export const getMaintenanceRecords = async (): Promise<MaintenanceRecord[]> => {
  const { data, error } = await supabase
    .from('maintenance_records')
    .select('*');
  if (error) throw error;
  return data || [];
};

export const saveMaintenanceRecord = async (record: MaintenanceRecord): Promise<MaintenanceRecord> => {
  const { data, error } = await supabase
    .from('maintenance_records')
    .upsert(record)
    .select()
    .single();
  if (error) throw error;
  return data;
};

// KmRecord-related functions
export const getKmRecords = async (): Promise<KmRecord[]> => {
  const { data, error } = await supabase
    .from('km_records')
    .select('*');
  if (error) throw error;
  return data || [];
};

export const saveKmRecord = async (record: KmRecord): Promise<KmRecord> => {
  const { data, error } = await supabase
    .from('km_records')
    .upsert(record)
    .select()
    .single();
  if (error) throw error;
  return data;
};

// VisaInspectionRecord-related functions
export const getVisaInspectionRecords = async (): Promise<VisaInspectionRecord[]> => {
  const { data, error } = await supabase
    .from('visa_inspection_records')
    .select('*');
  if (error) throw error;
  return data || [];
};

export const saveVisaInspectionRecord = async (record: VisaInspectionRecord): Promise<VisaInspectionRecord> => {
  const { data, error } = await supabase
    .from('visa_inspection_records')
    .upsert(record)
    .select()
    .single();
  if (error) throw error;
  return data;
};

// ServiceRecord-related functions
export const getServiceRecords = async (): Promise<ServiceRecord[]> => {
  const { data, error } = await supabase
    .from('service_records')
    .select('*');
  if (error) throw error;
  return data || [];
};

export const saveServiceRecord = async (record: ServiceRecord): Promise<ServiceRecord> => {
  const { data, error } = await supabase
    .from('service_records')
    .upsert(record)
    .select()
    .single();
  if (error) throw error;
  return data;
};