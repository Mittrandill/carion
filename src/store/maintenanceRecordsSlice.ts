import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { MaintenanceRecord } from '../types/maintenanceRecord';
import { supabase } from '../lib/supabaseClient';

// Async thunks

export const fetchMaintenanceRecords = createAsyncThunk<MaintenanceRecord[]>(
  'maintenanceRecords/fetchMaintenanceRecords',
  async () => {
    const { data, error } = await supabase
      .from('maintenance_records')
      .select('*')
      .order('date', { ascending: false });
    if (error) throw error;
    return data || [];
  }
);

export const addMaintenanceRecord = createAsyncThunk<MaintenanceRecord, Omit<MaintenanceRecord, 'id'>>(
  'maintenanceRecords/addMaintenanceRecord',
  async (record) => {
    const { data, error } = await supabase
      .from('maintenance_records')
      .insert([record])
      .select()
      .single();
    if (error) throw error;
    return data;
  }
);

export const updateMaintenanceRecord = createAsyncThunk<MaintenanceRecord, MaintenanceRecord>(
  'maintenanceRecords/updateMaintenanceRecord',
  async (record) => {
    const { data, error } = await supabase
      .from('maintenance_records')
      .update(record)
      .eq('id', record.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
);

export const deleteMaintenanceRecord = createAsyncThunk<string, string>(
  'maintenanceRecords/deleteMaintenanceRecord',
  async (id) => {
    const { error } = await supabase
      .from('maintenance_records')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return id;
  }
);

// Slice

interface MaintenanceRecordsState {
  maintenanceRecords: MaintenanceRecord[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: MaintenanceRecordsState = {
  maintenanceRecords: [],
  status: 'idle',
  error: null,
};

const maintenanceRecordsSlice = createSlice({
  name: 'maintenanceRecords',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // fetchMaintenanceRecords
      .addCase(fetchMaintenanceRecords.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchMaintenanceRecords.fulfilled, (state, action: PayloadAction<MaintenanceRecord[]>) => {
        state.status = 'succeeded';
        state.maintenanceRecords = action.payload;
      })
      .addCase(fetchMaintenanceRecords.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Something went wrong';
      })
      // addMaintenanceRecord
      .addCase(addMaintenanceRecord.fulfilled, (state, action: PayloadAction<MaintenanceRecord>) => {
        state.maintenanceRecords.push(action.payload);
      })
      // updateMaintenanceRecord
      .addCase(updateMaintenanceRecord.fulfilled, (state, action: PayloadAction<MaintenanceRecord>) => {
        const index = state.maintenanceRecords.findIndex((record) => record.id === action.payload.id);
        if (index !== -1) {
          state.maintenanceRecords[index] = action.payload;
        }
      })
      // deleteMaintenanceRecord
      .addCase(deleteMaintenanceRecord.fulfilled, (state, action: PayloadAction<string>) => {
        state.maintenanceRecords = state.maintenanceRecords.filter((record) => record.id !== action.payload);
      });
  },
});

export default maintenanceRecordsSlice.reducer;