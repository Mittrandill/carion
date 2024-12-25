import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '../lib/supabaseClient';
import { Tire, TireRecord } from '../types/tire';

interface TiresState {
  tires: Tire[];
  tireRecords: TireRecord[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: TiresState = {
  tires: [],
  tireRecords: [],
  status: 'idle',
  error: null
};

export const fetchTires = createAsyncThunk('tires/fetchTires', async () => {
  const { data, error } = await supabase.from('tire_stocks').select('*');
  if (error) throw error;
  return data;
});

export const fetchTireRecords = createAsyncThunk('tires/fetchTireRecords', async () => {
  const { data, error } = await supabase.from('tire_records').select('*');
  if (error) throw error;
  return data;
});

export const addTire = createAsyncThunk('tires/addTire', async (tire: Omit<Tire, 'id' | 'created_at' | 'updated_at'>) => {
  const { data, error } = await supabase.from('tire_stocks').insert([tire]).select();
  if (error) throw error;
  return data[0];
});

export const addTireRecord = createAsyncThunk('tires/addTireRecord', async (record: Omit<TireRecord, 'id' | 'created_at' | 'updated_at'>) => {
  const { data, error } = await supabase.from('tire_records').insert([record]).select();
  if (error) throw error;
  return data[0];
});



const tiresSlice = createSlice({
  name: 'tires',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTires.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchTires.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.tires = action.payload;
      })
      .addCase(fetchTires.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || null;
      })
      .addCase(fetchTireRecords.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchTireRecords.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.tireRecords = action.payload;
      })
      .addCase(fetchTireRecords.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || null;
      })
      .addCase(addTire.fulfilled, (state, action) => {
        state.tires.push(action.payload);
      })
      .addCase(addTireRecord.fulfilled, (state, action) => {
        state.tireRecords.push(action.payload);
      });
  },
});

export default tiresSlice.reducer;