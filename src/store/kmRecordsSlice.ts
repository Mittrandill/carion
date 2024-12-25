import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { KmRecord } from '../types/kmRecord';
import { supabase } from '../lib/supabaseClient';

// Async thunks

export const fetchKmRecords = createAsyncThunk<KmRecord[]>(
  'kmRecords/fetchKmRecords',
  async () => {
    const { data, error } = await supabase
      .from('km_records')
      .select('*')
      .order('date', { ascending: false });
    if (error) throw error;
    return data || [];
  }
);

export const addKmRecord = createAsyncThunk<KmRecord, Omit<KmRecord, 'id'>>(
  'kmRecords/addKmRecord',
  async (record) => {
    const { data, error } = await supabase
      .from('km_records')
      .insert([record])
      .select()
      .single();
    if (error) throw error;
    return data;
  }
);

export const updateKmRecord = createAsyncThunk<KmRecord, KmRecord>(
  'kmRecords/updateKmRecord',
  async (record) => {
    const { data, error } = await supabase
      .from('km_records')
      .update(record)
      .eq('id', record.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
);

export const deleteKmRecord = createAsyncThunk<number, number>(
  'kmRecords/deleteKmRecord',
  async (id) => {
    const { error } = await supabase
      .from('km_records')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return id;
  }
);

export const importKmRecordsFromExcel = createAsyncThunk<KmRecord[], Omit<KmRecord, 'id'>[]>(
  'kmRecords/importFromExcel',
  async (records) => {
    const { data, error } = await supabase
      .from('km_records')
      .insert(records)
      .select();
    if (error) throw error;
    return data || [];
  }
);

// Slice

interface KmRecordsState {
  kmRecords: KmRecord[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: KmRecordsState = {
  kmRecords: [],
  status: 'idle',
  error: null,
};

const kmRecordsSlice = createSlice({
  name: 'kmRecords',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // fetchKmRecords
      .addCase(fetchKmRecords.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchKmRecords.fulfilled, (state, action: PayloadAction<KmRecord[]>) => {
        state.status = 'succeeded';
        state.kmRecords = action.payload;
      })
      .addCase(fetchKmRecords.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Something went wrong';
      })
      // addKmRecord
      .addCase(addKmRecord.fulfilled, (state, action: PayloadAction<KmRecord>) => {
        state.kmRecords.push(action.payload);
      })
      // updateKmRecord
      .addCase(updateKmRecord.fulfilled, (state, action: PayloadAction<KmRecord>) => {
        const index = state.kmRecords.findIndex((record) => record.id === action.payload.id);
        if (index !== -1) {
          state.kmRecords[index] = action.payload;
        }
      })
      // deleteKmRecord
      .addCase(deleteKmRecord.fulfilled, (state, action: PayloadAction<number>) => {
        state.kmRecords = state.kmRecords.filter((record) => record.id !== action.payload);
      })
      // importKmRecordsFromExcel
      .addCase(importKmRecordsFromExcel.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(importKmRecordsFromExcel.fulfilled, (state, action: PayloadAction<KmRecord[]>) => {
        state.status = 'succeeded';
        state.kmRecords = [...state.kmRecords, ...action.payload];
      })
      .addCase(importKmRecordsFromExcel.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Excel içe aktarma sırasında bir hata oluştu';
      });
  },
});

export default kmRecordsSlice.reducer;