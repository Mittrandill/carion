import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { TireRecord } from '../types/tireRecord';
import { supabase } from '../lib/supabaseClient';

// Async thunks

export const fetchTireRecords = createAsyncThunk<TireRecord[]>(
  'tireRecords/fetchTireRecords',
  async () => {
    const { data, error } = await supabase
      .from('tire_records')
      .select('*')
      .order('changeDate', { ascending: false });
    if (error) throw error;
    return data || [];
  }
);

export const addTireRecord = createAsyncThunk<TireRecord, Omit<TireRecord, 'id'>>(
  'tireRecords/addTireRecord',
  async (record) => {
    const { data, error } = await supabase
      .from('tire_records')
      .insert([record])
      .select()
      .single();
    if (error) throw error;
    return data;
  }
);

export const updateTireRecord = createAsyncThunk<TireRecord, TireRecord>(
  'tireRecords/updateTireRecord',
  async (record) => {
    const { data, error } = await supabase
      .from('tire_records')
      .update(record)
      .eq('id', record.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
);

export const deleteTireRecord = createAsyncThunk<string, string>(
  'tireRecords/deleteTireRecord',
  async (id) => {
    const { error } = await supabase
      .from('tire_records')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return id;
  }
);

// Slice

interface TireRecordsState {
  tireRecords: TireRecord[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: TireRecordsState = {
  tireRecords: [],
  status: 'idle',
  error: null,
};

const tireRecordsSlice = createSlice({
  name: 'tireRecords',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // fetchTireRecords
      .addCase(fetchTireRecords.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchTireRecords.fulfilled, (state, action: PayloadAction<TireRecord[]>) => {
        state.status = 'succeeded';
        state.tireRecords = action.payload;
      })
      .addCase(fetchTireRecords.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Bir şeyler yanlış gitti';
      })
      // addTireRecord
      .addCase(addTireRecord.fulfilled, (state, action: PayloadAction<TireRecord>) => {
        state.tireRecords.push(action.payload);
      })
      // updateTireRecord
      .addCase(updateTireRecord.fulfilled, (state, action: PayloadAction<TireRecord>) => {
        const index = state.tireRecords.findIndex((record) => record.id === action.payload.id);
        if (index !== -1) {
          state.tireRecords[index] = action.payload;
        }
      })
      // deleteTireRecord
      .addCase(deleteTireRecord.fulfilled, (state, action: PayloadAction<string>) => {
        state.tireRecords = state.tireRecords.filter((record) => record.id !== action.payload);
      });
  },
});

export default tireRecordsSlice.reducer;