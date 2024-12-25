import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Vehicle } from '../types/vehicle';
import { supabase } from '../lib/supabaseClient';

// Araçları Supabase'den Fetch Etme
export const fetchVehicles = createAsyncThunk('vehicles/fetchVehicles', async () => {
  const { data, error } = await supabase.from('vehicles').select('*');
  if (error) {
    throw new Error(error.message);
  }
  return data || [];
});

// Belirli Bir Aracı Supabase'den Getir
export const fetchVehicleById = createAsyncThunk(
  'vehicles/fetchVehicleById',
  async (id: number) => {
    const { data, error } = await supabase.from('vehicles').select('*').eq('id', id).single();
    if (error || !data) {
      throw new Error('Vehicle not found');
    }
    return data;
  }
);

// Yeni Araç Ekleme
export const addVehicle = createAsyncThunk(
  'vehicles/addVehicle',
  async (vehicle: Omit<Vehicle, 'id'>) => {
    const { data, error } = await supabase.from('vehicles').insert([vehicle]).select().single();
    if (error) {
      throw new Error(error.message);
    }
    return data;
  }
);

// Araç Güncelleme
export const updateVehicle = createAsyncThunk(
  'vehicles/updateVehicle',
  async (vehicle: Vehicle) => {
    const { data, error } = await supabase.from('vehicles').update(vehicle).eq('id', vehicle.id).select().single();
    if (error) {
      throw new Error(error.message);
    }
    return data;
  }
);

// Araç Silme
export const deleteVehicle = createAsyncThunk(
  'vehicles/deleteVehicle',
  async (id: number) => {
    const { error } = await supabase.from('vehicles').delete().eq('id', id);
    if (error) {
      throw new Error(error.message);
    }
    return id;
  }
);

// Excel'den Araç Aktarma
export const importVehiclesFromExcel = createAsyncThunk(
  'vehicles/importFromExcel',
  async (importedVehicles: Omit<Vehicle, 'id'>[]) => {
    const { data, error } = await supabase.from('vehicles').insert(importedVehicles).select();
    if (error) {
      throw new Error(error.message);
    }
    return data;
  }
);

// Slice Tanımı
const vehiclesSlice = createSlice({
  name: 'vehicles',
  initialState: {
    vehicles: [] as Vehicle[],
    status: 'idle',
    error: null as string | null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchVehicles.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchVehicles.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.vehicles = action.payload;
      })
      .addCase(fetchVehicles.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || null;
      })
      .addCase(fetchVehicleById.fulfilled, (state, action) => {
        const index = state.vehicles.findIndex(v => v.id === action.payload.id);
        if (index !== -1) {
          state.vehicles[index] = action.payload;
        } else {
          state.vehicles.push(action.payload);
        }
      })
      .addCase(addVehicle.fulfilled, (state, action) => {
        state.vehicles.push(action.payload);
      })
      .addCase(updateVehicle.fulfilled, (state, action) => {
        const index = state.vehicles.findIndex(vehicle => vehicle.id === action.payload.id);
        if (index !== -1) {
          state.vehicles[index] = action.payload;
        }
      })
      .addCase(deleteVehicle.fulfilled, (state, action) => {
        state.vehicles = state.vehicles.filter(vehicle => vehicle.id !== action.payload);
      })
      .addCase(importVehiclesFromExcel.fulfilled, (state, action) => {
        state.vehicles = [...state.vehicles, ...action.payload];
      });
  }
});

export default vehiclesSlice.reducer;
