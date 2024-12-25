import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { store, RootState, AppDispatch } from './store';
import { supabase } from './lib/supabaseClient';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Vehicles from './pages/Vehicles';
import AddEditVehicle from './pages/AddEditVehicle';
import VehicleDetails from './pages/VehicleDetails';
import FuelManagement from './pages/FuelManagement';
import Tasks from './pages/Tasks';
import Login from './pages/Login';
import UserProfile from './pages/UserProfile';
import { Toaster } from "./components/ui/toaster"
import { fetchVehicles } from './store/vehiclesSlice';
import { fetchTasks } from './store/tasksSlice';
import { fetchFuelRecords } from './store/fuelRecordsSlice';
import { setAuth } from './store/authSlice'; 
import FuelTankList from './pages/FuelTankList';
import FuelTankDefinition from './pages/FuelTankDefinition';
import FuelTankDetails from './pages/FuelTankDetails';
import VehicleFuelEntry from './pages/VehicleFuelEntry';
import FuelRecords from './pages/FuelRecords';
import FuelTankEntry from './pages/FuelTankEntry';
import VisaInspection from './pages/VisaInspection';
import ServiceMaintenance from './pages/ServiceMaintenance';
import KmRecords from './pages/KmRecords';
import TireRecords from './pages/TireRecords';
import Settings from './pages/Settings';
import Reports from './pages/Reports';
import FuelExits from './pages/FuelExits';
import ForgotPassword from './pages/ForgotPassword';
import Register from './pages/register';
import AddServiceRecord from './pages/AddServiceRecord';
import TiresStok from './pages/TiresStok';
import TireChange from './pages/TiresChange';
import AddNewTires from './pages/TiresAdd';


const PrivateRoute: React.FC<{ element: React.ReactElement }> = ({ element }) => {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  
  if (typeof window === 'undefined') {
    return null; // Sunucu tarafında render etme
  }

  return isAuthenticated ? element : <Navigate to="/login" />;
};

const AppContent: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      dispatch(setAuth(!!session));

      if (session) {
        dispatch(fetchVehicles());
        dispatch(fetchTasks());
        dispatch(fetchFuelRecords());
      }
    };

    checkAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      dispatch(setAuth(!!session));
    });

    return () => {
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, [dispatch]);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/*"
          element={
            <Layout>
              <Routes>
                <Route path="/" element={<PrivateRoute element={<Dashboard />} />} />
                <Route path="/vehicles" element={<PrivateRoute element={<Vehicles />} />} />
                <Route path="/vehicles/add" element={<PrivateRoute element={<AddEditVehicle />} />} />
                <Route path="/vehicles/edit/:id" element={<PrivateRoute element={<AddEditVehicle />} />} />
                <Route path="/vehicles/:id" element={<PrivateRoute element={<VehicleDetails />} />} />
                <Route path="/fuel" element={<PrivateRoute element={<FuelManagement />} />} />
                <Route path="/tasks" element={<PrivateRoute element={<Tasks />} />} />
                <Route path="/profile" element={<PrivateRoute element={<UserProfile />} />} />
                <Route path="/fuel-tanks" element={<PrivateRoute element={<FuelTankList />} />} />
                <Route path="/fuel-tank-definition" element={<PrivateRoute element={<FuelTankDefinition />} />} />
                <Route path="/fuel-tank-definition/:id" element={<PrivateRoute element={<FuelTankDefinition />} />} />
                <Route path="/fuel-tanks/:id" element={<PrivateRoute element={<FuelTankDetails />} />} />
                <Route path="/vehicle-fuel-entry" element={<PrivateRoute element={<VehicleFuelEntry />} />} />
                <Route path="/fuel-records" element={<PrivateRoute element={<FuelRecords />} />} />
                <Route path="/fuel-tank-entry" element={<PrivateRoute element={<FuelTankEntry />} />} />
                <Route path="/visa" element={<PrivateRoute element={<VisaInspection />} />} />
                <Route path="/service" element={<PrivateRoute element={<ServiceMaintenance />} />} />
                <Route path="/service/add" element={<PrivateRoute element={<AddServiceRecord />} />} />
                <Route path="/km-records" element={<PrivateRoute element={<KmRecords />} />} />
                <Route path="/tire-records" element={<PrivateRoute element={<TireRecords />} />} />
                <Route path="/settings" element={<PrivateRoute element={<Settings />} />} />
                <Route path="/reports" element={<PrivateRoute element={<Reports />} />} />
                <Route path="/fuel-exits" element={<PrivateRoute element={<FuelExits />} />} />
                <Route path="/tire-stok" element={<PrivateRoute element={<TiresStok/>} />} />
                <Route path="/tire-change" element={<PrivateRoute element={<TireChange />} />} />
                <Route path="/add-new-tire" element={<PrivateRoute element={<AddNewTires />} />} />
                
              </Routes>
            </Layout>
          }
        />
      </Routes>
      <Toaster />
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
};

export default App;