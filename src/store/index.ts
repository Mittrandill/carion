import { configureStore } from '@reduxjs/toolkit';
import vehiclesReducer from './vehiclesSlice';
import tasksReducer from './tasksSlice';
import fuelRecordsReducer from './fuelRecordsSlice';
import fuelTanksReducer from './fuelTanksSlice';
import authReducer from './authSlice';
import settingsReducer from './settingsSlice';
import maintenanceRecordsReducer from './maintenanceRecordsSlice';
import kmRecordsReducer from './kmRecordsSlice';
import visaInspectionReducer from './visaInspectionSlice';
import tireRecordsReducer from './tireRecordsSlice';
import TiresReducer from './TiresSlices';

export const store = configureStore({
  reducer: {
    vehicles: vehiclesReducer,
    tasks: tasksReducer,
    fuelRecords: fuelRecordsReducer,
    fuelTanks: fuelTanksReducer,
    auth: authReducer,
    settings: settingsReducer,
    maintenanceRecords: maintenanceRecordsReducer,
    kmRecords: kmRecordsReducer,
    visaInspection: visaInspectionReducer,
    TireRecord:tireRecordsReducer,
    Tires:TiresReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;