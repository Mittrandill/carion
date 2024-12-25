import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { FuelRecord } from '../types/fuelRecord';
import { supabase } from '../lib/supabaseClient';

// Yakıt Kayıtlarını Supabase'den Fetch Etme
export const fetchFuelRecords = createAsyncThunk('fuelRecords/fetchFuelRecords', async () => {
  const { data, error } = await supabase.from('fuel_records').select('*');
  if (error) {
    throw new Error(error.message);
  }
  return data || [];
});

// Yeni Yakıt Kaydı Ekleme
export const addFuelRecord = createAsyncThunk(
  'fuelRecords/addFuelRecord',
  async (record: Omit<FuelRecord, 'id'>) => {
    const { data, error } = await supabase.from('fuel_records').insert([record]).select().single();
    if (error) {
      throw new Error(error.message);
    }
    return data;
  }
);

// Yakıt Kaydı Güncelleme
export const updateFuelRecord = createAsyncThunk(
  'fuelRecords/updateFuelRecord',
  async (record: FuelRecord) => {
    const { data, error } = await supabase.from('fuel_records').update(record).eq('id', record.id).select().single();
    if (error) {
      throw new Error(error.message);
    }
    return data;
  }
);

// Yakıt Kaydı Silme
export const deleteFuelRecord = createAsyncThunk(
  'fuelRecords/deleteFuelRecord',
  async (id: number) => {
    const { error } = await supabase.from('fuel_records').delete().eq('id', id);
    if (error) {
      throw new Error(error.message);
    }
    return id;
  }
);

// Excel'den Yakıt Kayıtlarını İçe Aktarma
export const importFuelRecordsFromExcel = createAsyncThunk(
  'fuelRecords/importFromExcel',
  async (records: Omit<FuelRecord, 'id'>[]) => {
    const { data, error } = await supabase.from('fuel_records').insert(records).select();
    if (error) {
      throw new Error(error.message);
    }
    return data;
  }
);

// Slice Tanımı
interface FuelRecordsState {
  fuelRecords: FuelRecord[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: FuelRecordsState = {
  fuelRecords: [],
  status: 'idle',
  error: null,
};

const fuelRecordsSlice = createSlice({
  name: 'fuelRecords',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchFuelRecords.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchFuelRecords.fulfilled, (state, action: PayloadAction<FuelRecord[]>) => {
        state.status = 'succeeded';
        state.fuelRecords = action.payload;
      })
      .addCase(fetchFuelRecords.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Something went wrong';
      })
      .addCase(addFuelRecord.fulfilled, (state, action: PayloadAction<FuelRecord>) => {
        state.fuelRecords.push(action.payload);
      })
      .addCase(updateFuelRecord.fulfilled, (state, action: PayloadAction<FuelRecord>) => {
        const index = state.fuelRecords.findIndex((record) => record.id === action.payload.id);
        if (index !== -1) {
          state.fuelRecords[index] = action.payload;
        }
      })
      .addCase(deleteFuelRecord.fulfilled, (state, action: PayloadAction<number>) => {
        state.fuelRecords = state.fuelRecords.filter((record) => record.id !== action.payload);
      })
      .addCase(importFuelRecordsFromExcel.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(importFuelRecordsFromExcel.fulfilled, (state, action: PayloadAction<FuelRecord[]>) => {
        state.status = 'succeeded';
        state.fuelRecords = [...state.fuelRecords, ...action.payload];
      })
      .addCase(importFuelRecordsFromExcel.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Excel içe aktarma sırasında bir hata oluştu';
      });
  },
});

export default fuelRecordsSlice.reducer;