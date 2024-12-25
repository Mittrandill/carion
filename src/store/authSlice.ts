import { createSlice, createAsyncThunk, PayloadAction, configureStore } from '@reduxjs/toolkit';
import { User } from '../types/user';
import { supabase } from '../lib/supabaseClient';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

export const register = createAsyncThunk<User, Partial<User>>(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email!,
        password: userData.password!,
      });

      if (authError) throw authError;

      if (authData.user) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: authData.user.id,
              first_name: userData.firstName,
              last_name: userData.lastName,
              username: userData.username,
              email: userData.email,
            },
          ])
          .select()
          .single();

        if (profileError) throw profileError;

        return {
          id: authData.user.id,
          email: authData.user.email!,
          firstName: profileData.first_name,
          lastName: profileData.last_name,
          username: profileData.username,
        } as User;
      } else {
        throw new Error('User registration failed');
      }
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const login = createAsyncThunk<User, { email: string; password: string }>(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (authError) throw authError;

      if (authData.user) {
        let profileData = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .single()
          .then(({ data, error }) => {
            if (error) throw error;
            return data;
          });

        if (!profileData) {
          profileData = await supabase
            .from('profiles')
            .insert([
              {
                id: authData.user.id,
                email: authData.user.email,
                username: authData.user.email?.split('@')[0],
              },
            ])
            .select()
            .single()
            .then(({ data, error }) => {
              if (error) throw error;
              return data;
            });
        }

        return {
          id: authData.user.id,
          email: authData.user.email!,
          firstName: profileData.first_name,
          lastName: profileData.last_name,
          username: profileData.username,
        } as User;
      } else {
        throw new Error('Login failed');
      }
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const updateUserProfile = createAsyncThunk<User, Partial<User>>(
  'auth/updateUserProfile',
  async (updatedProfile, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState() as { auth: AuthState };
      if (!auth.user) {
        throw new Error('User not found');
      }

      const { data, error } = await supabase
        .from('profiles')
        .update({
          first_name: updatedProfile.firstName,
          last_name: updatedProfile.lastName,
          username: updatedProfile.username,
        })
        .eq('id', auth.user.id)
        .select()
        .single();

      if (error) throw error;

      return {
        ...auth.user,
        ...updatedProfile,
      } as User;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const resetPassword = createAsyncThunk<void, string>(
  'auth/resetPassword',
  async (email, { rejectWithValue }) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuth: (state, action: PayloadAction<boolean>) => {
      state.isAuthenticated = action.payload;
    },
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action: PayloadAction<User>) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload;
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action: PayloadAction<User>) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(logout.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.user = null;
      })
      .addCase(updateUserProfile.fulfilled, (state, action: PayloadAction<User>) => {
        state.user = action.payload;
      })
      .addCase(resetPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resetPassword.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const { setAuth, setUser } = authSlice.actions;
export default authSlice.reducer;