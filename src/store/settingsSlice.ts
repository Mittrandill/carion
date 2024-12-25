import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { SettingsState, SettingsActionType } from '../types/settings';
import { supabase } from '../lib/supabaseClient';

const initialState: SettingsState = {
  stations: [],
  brands: [],
  suppliers: [],
  status: 'idle',
  error: null,
};

export const fetchSettings = createAsyncThunk<SettingsState>(
  'settings/fetchSettings',
  async () => {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .single();
    if (error) throw error;
    return data || initialState;
  }
);

export const updateSetting = createAsyncThunk<
  SettingsState,
  { type: SettingsActionType; value: string; action: 'add' | 'remove' }
>(
  'settings/updateSetting',
  async ({ type, value, action }, { getState }) => {
    const state = getState() as { settings: SettingsState };
    let updatedSettings = { ...state.settings };

    if (action === 'add' && !updatedSettings[type].includes(value)) {
      updatedSettings[type] = [...updatedSettings[type], value];
    } else if (action === 'remove') {
      updatedSettings[type] = updatedSettings[type].filter(item => item !== value);
    }

    const { data, error } = await supabase
      .from('settings')
      .upsert(updatedSettings)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
);

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSettings.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchSettings.fulfilled, (state, action: PayloadAction<SettingsState>) => {
        state.status = 'succeeded';
        state.stations = action.payload.stations;
        state.brands = action.payload.brands;
        state.suppliers = action.payload.suppliers;
      })
      .addCase(fetchSettings.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to fetch settings';
      })
      .addCase(updateSetting.fulfilled, (state, action: PayloadAction<SettingsState>) => {
        state.stations = action.payload.stations;
        state.brands = action.payload.brands;
        state.suppliers = action.payload.suppliers;
      });
  },
});

export default settingsSlice.reducer;