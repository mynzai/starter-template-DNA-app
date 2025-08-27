import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Card,
  useTheme,
  Surface,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import { useForm, Controller } from 'react-hook-form';

import { loginStart, loginSuccess, loginFailure } from '../store/slices/authSlice';
import { AppDispatch } from '../store/store';

interface LoginForm {
  email: string;
  password: string;
}

interface LoginScreenProps {
  navigation: any;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const theme = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    try {
      setIsLoading(true);
      dispatch(loginStart());

      // Mock OAuth authentication
      // In a real app, replace with your OAuth provider (Google, Microsoft, etc.)
      const mockAuthResponse = await mockOAuthLogin(data.email, data.password);

      if (mockAuthResponse.success) {
        dispatch(loginSuccess({
          token: mockAuthResponse.token,
          refreshToken: mockAuthResponse.refreshToken,
          user: mockAuthResponse.user,
        }));
        navigation.replace('Home');
      } else {
        throw new Error(mockAuthResponse.error || 'Authentication failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      dispatch(loginFailure(errorMessage));
      Alert.alert('Login Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const mockOAuthLogin = async (email: string, password: string) => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock authentication logic
    if (email === 'demo@{{companyName.toLowerCase()}}.com' && password === 'demo123') {
      return {
        success: true,
        token: 'mock-jwt-token-' + Date.now(),
        refreshToken: 'mock-refresh-token-' + Date.now(),
        user: {
          id: '1',
          email: email,
          name: 'Demo User',
        },
      };
    }

    return {
      success: false,
      error: 'Invalid credentials. Use demo@{{companyName.toLowerCase()}}.com / demo123',
    };
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollView}>
          <Surface style={styles.logoContainer} elevation={2}>
            <Text variant="headlineLarge" style={[styles.title, { color: theme.colors.primary }]}>
              {{companyName}}
            </Text>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
              Business Application
            </Text>
          </Surface>

          <Card style={styles.card}>
            <Card.Content>
              <Text variant="headlineSmall" style={styles.cardTitle}>
                Sign In
              </Text>

              <Controller
                control={control}
                rules={{
                  required: 'Email is required',
                  pattern: {
                    value: /\S+@\S+\.\S+/,
                    message: 'Enter a valid email',
                  },
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    label="Email"
                    mode="outlined"
                    value={value}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    error={!!errors.email}
                    style={styles.input}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                  />
                )}
                name="email"
              />
              {errors.email && (
                <Text style={[styles.errorText, { color: theme.colors.error }]}>
                  {errors.email.message}
                </Text>
              )}

              <Controller
                control={control}
                rules={{
                  required: 'Password is required',
                  minLength: {
                    value: 6,
                    message: 'Password must be at least 6 characters',
                  },
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    label="Password"
                    mode="outlined"
                    value={value}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    error={!!errors.password}
                    style={styles.input}
                    secureTextEntry={!showPassword}
                    right={
                      <TextInput.Icon
                        icon={showPassword ? 'eye-off' : 'eye'}
                        onPress={() => setShowPassword(!showPassword)}
                      />
                    }
                  />
                )}
                name="password"
              />
              {errors.password && (
                <Text style={[styles.errorText, { color: theme.colors.error }]}>
                  {errors.password.message}
                </Text>
              )}

              <Button
                mode="contained"
                onPress={handleSubmit(onSubmit)}
                loading={isLoading}
                disabled={isLoading}
                style={styles.loginButton}
              >
                Sign In with {{oauthProvider}}
              </Button>

              <Text variant="bodyMedium" style={styles.demoText}>
                Demo credentials:{'\n'}
                Email: demo@{{companyName.toLowerCase()}}.com{'\n'}
                Password: demo123
              </Text>
            </Card.Content>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    padding: 30,
    marginBottom: 30,
    borderRadius: 12,
  },
  title: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  card: {
    marginBottom: 20,
  },
  cardTitle: {
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    marginBottom: 8,
  },
  errorText: {
    marginBottom: 12,
    marginLeft: 12,
    fontSize: 12,
  },
  loginButton: {
    marginTop: 20,
    marginBottom: 16,
  },
  demoText: {
    textAlign: 'center',
    fontFamily: 'monospace',
    opacity: 0.7,
  },
});

export default LoginScreen;