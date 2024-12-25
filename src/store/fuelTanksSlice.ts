import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { FuelTank } from '../types/fuelTank';
import { supabase } from '../lib/supabaseClient';

// Async thunks

export const fetchFuelTanks = createAsyncThunk<FuelTank[]>(
  'fuelTanks/fetchFuelTanks',
  async () => {
    const { data, error } = await supabase
      .from('fuel_tanks')
      .select('*');
    if (error) throw error;
    return data || [];
  }
);

export const addFuelTank = createAsyncThunk<FuelTank, Omit<FuelTank, 'id'>>(
  'fuelTanks/addFuelTank',
  async (tank) => {
    const { data, error } = await supabase
      .from('fuel_tanks')
      .insert([tank])
      .select()
      .single();
    if (error) throw error;
    return data;
  }
);

export const updateFuelTank = createAsyncThunk<FuelTank, FuelTank>(
  'fuelTanks/updateFuelTank',
  async (tank) => {
    const { data, error } = await supabase
      .from('fuel_tanks')
      .update(tank)
      .eq('id', tank.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
);

export const deleteFuelTank = createAsyncThunk<number, number>(
  'fuelTanks/deleteFuelTank',
  async (id) => {
    const { error } = await supabase
      .from('fuel_tanks')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return id;
  }
);

// Slice

interface FuelTanksState {
  fuelTanks: FuelTank[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: FuelTanksState = {
  fuelTanks: [],
  status: 'idle',
  error: null,
};

const fuelTanksSlice = createSlice({
  name: 'fuelTanks',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // fetchFuelTanks
      .addCase(fetchFuelTanks.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchFuelTanks.fulfilled, (state, action: PayloadAction<FuelTank[]>) => {
        state.status = 'succeeded';
        state.fuelTanks = action.payload;
      })
      .addCase(fetchFuelTanks.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Something went wrong';
      })
      // addFuelTank
      .addCase(addFuelTank.fulfilled, (state, action: PayloadAction<FuelTank>) => {
        state.fuelTanks.push(action.payload);
      })
      // updateFuelTank
      .addCase(updateFuelTank.fulfilled, (state, action: PayloadAction<FuelTank>) => {
        const index = state.fuelTanks.findIndex((tank) => tank.id === action.payload.id);
        if (index !== -1) {
          state.fuelTanks[index] = action.payload;
        }
      })
      // deleteFuelTank
      .addCase(deleteFuelTank.fulfilled, (state, action: PayloadAction<number>) => {
        state.fuelTanks = state.fuelTanks.filter((tank) => tank.id !== action.payload);
      });
  },
});

export default fuelTanksSlice.reducer;