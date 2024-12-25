import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { VisaInspectionRecord } from '../types/visaInspectionRecord';
import { supabase } from '../lib/supabaseClient';

// Async thunks

export const fetchVisaInspectionRecords = createAsyncThunk<VisaInspectionRecord[]>(
  'visaInspection/fetchVisaInspectionRecords',
  async () => {
    const { data, error } = await supabase
      .from('visa_inspection_records')
      .select('*')
      .order('date', { ascending: false });
    if (error) throw error;
    return data || [];
  }
);

export const addVisaInspectionRecord = createAsyncThunk<VisaInspectionRecord, Omit<VisaInspectionRecord, 'id'>>(
  'visaInspection/addVisaInspectionRecord',
  async (record) => {
    const { data, error } = await supabase
      .from('visa_inspection_records')
      .insert([record])
      .select()
      .single();
    if (error) throw error;
    return data;
  }
);

export const updateVisaInspectionRecord = createAsyncThunk<VisaInspectionRecord, VisaInspectionRecord>(
  'visaInspection/updateVisaInspectionRecord',
  async (record) => {
    const { data, error } = await supabase
      .from('visa_inspection_records')
      .update(record)
      .eq('id', record.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
);

export const deleteVisaInspectionRecord = createAsyncThunk<number, number>(
  'visaInspection/deleteVisaInspectionRecord',
  async (id) => {
    const { error } = await supabase
      .from('visa_inspection_records')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return id;
  }
);

export const importVisaInspectionRecordsFromExcel = createAsyncThunk<VisaInspectionRecord[], Omit<VisaInspectionRecord, 'id'>[]>(
  'visaInspection/importFromExcel',
  async (records) => {
    const { data, error } = await supabase
      .from('visa_inspection_records')
      .insert(records)
      .select();
    if (error) throw error;
    return data || [];
  }
);

// Slice

interface VisaInspectionState {
  visaInspectionRecords: VisaInspectionRecord[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: VisaInspectionState = {
  visaInspectionRecords: [],
  status: 'idle',
  error: null,
};

const visaInspectionSlice = createSlice({
  name: 'visaInspection',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // fetchVisaInspectionRecords
      .addCase(fetchVisaInspectionRecords.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchVisaInspectionRecords.fulfilled, (state, action: PayloadAction<VisaInspectionRecord[]>) => {
        state.status = 'succeeded';
        state.visaInspectionRecords = action.payload;
      })
      .addCase(fetchVisaInspectionRecords.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Bir şeyler yanlış gitti';
      })
      // addVisaInspectionRecord
      .addCase(addVisaInspectionRecord.fulfilled, (state, action: PayloadAction<VisaInspectionRecord>) => {
        state.visaInspectionRecords.unshift(action.payload);
      })
      // updateVisaInspectionRecord
      .addCase(updateVisaInspectionRecord.fulfilled, (state, action: PayloadAction<VisaInspectionRecord>) => {
        const index = state.visaInspectionRecords.findIndex((record) => record.id === action.payload.id);
        if (index !== -1) {
          state.visaInspectionRecords[index] = action.payload;
        }
      })
      // deleteVisaInspectionRecord
      .addCase(deleteVisaInspectionRecord.fulfilled, (state, action: PayloadAction<number>) => {
        state.visaInspectionRecords = state.visaInspectionRecords.filter((record) => record.id !== action.payload);
      })
      // importVisaInspectionRecordsFromExcel
      .addCase(importVisaInspectionRecordsFromExcel.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(importVisaInspectionRecordsFromExcel.fulfilled, (state, action: PayloadAction<VisaInspectionRecord[]>) => {
        state.status = 'succeeded';
        state.visaInspectionRecords = [...action.payload, ...state.visaInspectionRecords];
      })
      .addCase(importVisaInspectionRecordsFromExcel.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Excel içe aktarma sırasında bir hata oluştu';
      });
  },
});

export default visaInspectionSlice.reducer;