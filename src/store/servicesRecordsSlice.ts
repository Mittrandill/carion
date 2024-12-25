import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { ServiceRecord } from '../types/serviceRecord';
import { supabase } from '../lib/supabaseClient';

// Fetch all service records
export const fetchServiceRecords = createAsyncThunk<ServiceRecord[]>(
  'serviceRecords/fetchServiceRecords',
  async () => {
    const { data, error } = await supabase
      .from('service_records')
      .select('*')
      .order('date', { ascending: false });

    if (error) throw error;
    return data || [];
  }
);

// Add a new service record
export const addServiceRecord = createAsyncThunk<ServiceRecord, Omit<ServiceRecord, 'id'>>(
  'serviceRecords/addServiceRecord',
  async (record) => {
    const { data, error } = await supabase
      .from('service_records')
      .insert([{ ...record, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }
);

// Update an existing service record
export const updateServiceRecord = createAsyncThunk<ServiceRecord, ServiceRecord>(
  'serviceRecords/updateServiceRecord',
  async (record) => {
    const { data, error } = await supabase
      .from('service_records')
      .update({ ...record, updated_at: new Date().toISOString() })
      .eq('id', record.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
);

// Delete a service record
export const deleteServiceRecord = createAsyncThunk<string, string>(
  'serviceRecords/deleteServiceRecord',
  async (id) => {
    const { error } = await supabase
      .from('service_records')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return id; // Return the id of the deleted record
  }
);

interface ServiceRecordsState {
  serviceRecords: ServiceRecord[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: ServiceRecordsState = {
  serviceRecords: [],
  status: 'idle',
  error: null,
};

const serviceRecordsSlice = createSlice({
  name: 'serviceRecords',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchServiceRecords.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchServiceRecords.fulfilled, (state, action: PayloadAction<ServiceRecord[]>) => {
        state.status = 'succeeded';
        state.serviceRecords = action.payload;
      })
      .addCase(fetchServiceRecords.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Bir şeyler yanlış gitti';
      })
      .addCase(addServiceRecord.fulfilled, (state, action: PayloadAction<ServiceRecord>) => {
        state.serviceRecords.unshift(action.payload);
      })
      .addCase(updateServiceRecord.fulfilled, (state, action: PayloadAction<ServiceRecord>) => {
        const index = state.serviceRecords.findIndex((record) => record.id === action.payload.id);
        if (index !== -1) {
          state.serviceRecords[index] = action.payload;
        }
      })
      .addCase(deleteServiceRecord.fulfilled, (state, action: PayloadAction<string>) => {
        state.serviceRecords = state.serviceRecords.filter((record) => record.id !== action.payload);
      });
  },
});

export default serviceRecordsSlice.reducer;
