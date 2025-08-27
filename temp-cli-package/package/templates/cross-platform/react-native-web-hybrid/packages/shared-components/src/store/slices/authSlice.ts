import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Platform } from '../../utils/Platform';

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'user' | 'admin';
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;
  loginAttempts: number;
  lastLoginAttempt: number | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
  refreshToken: null,
  isLoading: false,
  error: null,
  loginAttempts: 0,
  lastLoginAttempt: null,
};

// Platform-specific storage
const getStorageAdapter = () => {
  if (Platform.isWeb) {
    return {
      getItem: (key: string) => localStorage.getItem(key),
      setItem: (key: string, value: string) => localStorage.setItem(key, value),
      removeItem: (key: string) => localStorage.removeItem(key),
    };
  } else {
    // React Native AsyncStorage
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    return {
      getItem: (key: string) => AsyncStorage.getItem(key),
      setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
      removeItem: (key: string) => AsyncStorage.removeItem(key),
    };
  }
};

const storage = getStorageAdapter();

// Async thunks
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (
    credentials: { email: string; password: string },
    { rejectWithValue }
  ) => {
    try {
      // This would be replaced with actual API call
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });
      
      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.message || 'Login failed');
      }
      
      const data = await response.json();
      
      // Store tokens in platform-specific storage
      await storage.setItem('auth_token', data.token);
      await storage.setItem('refresh_token', data.refreshToken);
      
      return {
        user: data.user,
        token: data.token,
        refreshToken: data.refreshToken,
      };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Network error'
      );
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/registerUser',
  async (
    userData: {
      email: string;
      password: string;
      name: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.message || 'Registration failed');
      }
      
      const data = await response.json();
      
      // Store tokens
      await storage.setItem('auth_token', data.token);
      await storage.setItem('refresh_token', data.refreshToken);
      
      return {
        user: data.user,
        token: data.token,
        refreshToken: data.refreshToken,
      };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Network error'
      );
    }
  }
);

export const refreshAuthToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: AuthState };
      const { refreshToken } = state.auth;
      
      if (!refreshToken) {
        return rejectWithValue('No refresh token available');
      }
      
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${refreshToken}`,
        },
      });
      
      if (!response.ok) {
        return rejectWithValue('Token refresh failed');
      }
      
      const data = await response.json();
      
      // Update stored token
      await storage.setItem('auth_token', data.token);
      
      return {
        token: data.token,
        user: data.user,
      };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Network error'
      );
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, { getState }) => {
    const state = getState() as { auth: AuthState };
    const { token } = state.auth;
    
    try {
      // Call logout endpoint if token exists
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      // Continue with logout even if API call fails
      console.warn('Logout API call failed:', error);
    }
    
    // Clear stored tokens
    await storage.removeItem('auth_token');
    await storage.removeItem('refresh_token');
  }
);

export const loadStoredAuth = createAsyncThunk(
  'auth/loadStoredAuth',
  async (_, { rejectWithValue }) => {
    try {
      const token = await storage.getItem('auth_token');
      const refreshToken = await storage.getItem('refresh_token');
      
      if (!token) {
        return rejectWithValue('No stored auth data');
      }
      
      // Verify token with API
      const response = await fetch('/api/auth/verify', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        // Clear invalid tokens
        await storage.removeItem('auth_token');
        await storage.removeItem('refresh_token');
        return rejectWithValue('Invalid stored token');
      }
      
      const data = await response.json();
      
      return {
        user: data.user,
        token,
        refreshToken,
      };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to load auth data'
      );
    }
  }
);

// Slice
export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    resetLoginAttempts: (state) => {
      state.loginAttempts = 0;
      state.lastLoginAttempt = null;
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.error = null;
        state.loginAttempts = 0;
        state.lastLoginAttempt = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.loginAttempts += 1;
        state.lastLoginAttempt = Date.now();
      });
    
    // Register
    builder
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
    
    // Refresh token
    builder
      .addCase(refreshAuthToken.fulfilled, (state, action) => {
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.error = null;
      })
      .addCase(refreshAuthToken.rejected, (state) => {
        // Token refresh failed, log out user
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.refreshToken = null;
      });
    
    // Logout
    builder.addCase(logoutUser.fulfilled, (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.error = null;
      state.loginAttempts = 0;
      state.lastLoginAttempt = null;
    });
    
    // Load stored auth
    builder
      .addCase(loadStoredAuth.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(loadStoredAuth.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.error = null;
      })
      .addCase(loadStoredAuth.rejected, (state) => {
        state.isLoading = false;
        // Don't set error for failed auth load (user just isn't logged in)
      });
  },
});

export const { clearError, updateUser, resetLoginAttempts } = authSlice.actions;

// Selectors
export const selectAuth = (state: { auth: AuthState }) => state.auth;
export const selectIsAuthenticated = (state: { auth: AuthState }) => 
  state.auth.isAuthenticated;
export const selectUser = (state: { auth: AuthState }) => state.auth.user;
export const selectAuthToken = (state: { auth: AuthState }) => state.auth.token;
export const selectAuthLoading = (state: { auth: AuthState }) => 
  state.auth.isLoading;
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error;