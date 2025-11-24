import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  useWindowDimensions
} from 'react-native';
import LiquidGlassBackground from '../components/LiquidGlassBackground';
import LiquidGlassCard from '../components/LiquidGlassCard';
import LiquidGlassButton from '../components/LiquidGlassButton';

const MODES = [
  { key: 'login', label: 'Login' },
  { key: 'register', label: 'Register' },
  { key: 'confirm', label: 'Confirm OTP' },
  { key: 'delete', label: 'Delete User' }
];

export default function AuthScreen({ onClose }) {
  const { width: screenWidth } = useWindowDimensions();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [screenName, setScreenName] = useState('');
  const [otp, setOtp] = useState('');

  const title = useMemo(() => {
    switch (mode) {
      case 'register':
        return 'Create Squadron Account';
      case 'confirm':
        return 'Confirm Access Code';
      case 'delete':
        return 'Delete Account';
      default:
        return 'Welcome Back Pilot';
    }
  }, [mode]);

  const handleLogin = () => {
    if (!email || !password) {
      Alert.alert('Hold up!', 'Enter both email and password.');
      return;
    }
    Alert.alert('Logged In', 'Auth backend hookup coming soon.');
    onClose?.();
  };

  const handleRegister = () => {
    if (!email || !password || !screenName) {
      Alert.alert('Missing data', 'Screen name, email, and password are required.');
      return;
    }
    Alert.alert('Registration Sent', 'We just sent an OTP to your inbox.');
    setMode('confirm');
  };

  const handleConfirm = () => {
    if (!otp || otp.length < 4) {
      Alert.alert('Invalid OTP', 'Enter the 4–6 digit code we sent.');
      return;
    }
    Alert.alert('Confirmed', 'Your account is now verified.');
    onClose?.();
  };

  const handleDelete = () => {
    if (!email) {
      Alert.alert('Missing email', 'Enter the account email.');
      return;
    }
    Alert.alert('Request queued', 'Account deletion will be available once backend is wired up.');
    onClose?.();
  };

  const cardWidth = screenWidth * 0.9;
  const buttonWidth = cardWidth - 32; // Account for card padding (16px * 2)

  const renderForm = () => {
    switch (mode) {
      case 'register':
        return (
          <>
            <TextInput
              style={styles.input}
              placeholder="Screen name"
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={screenName}
              onChangeText={setScreenName}
              autoCapitalize="words"
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <View style={{ width: '100%', alignItems: 'center' }}>
              <LiquidGlassButton title="Register & Send OTP" width={buttonWidth} onPress={handleRegister} />
            </View>
          </>
        );
      case 'confirm':
        return (
          <>
            <Text style={styles.helperText}>
              Enter the 4–6 digit code we emailed to {email || 'your inbox'}.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="OTP Code"
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={otp}
              onChangeText={setOtp}
              keyboardType="numeric"
            />
            <View style={{ width: '100%', alignItems: 'center' }}>
              <LiquidGlassButton title="Confirm Email" width={buttonWidth} onPress={handleConfirm} />
            </View>
            <TouchableOpacity style={styles.altLink} onPress={() => Alert.alert('Resend', 'OTP resend coming soon')}>
              <Text style={styles.altLinkText}>Resend code</Text>
            </TouchableOpacity>
          </>
        );
      case 'delete':
        return (
          <>
            <Text style={styles.helperText}>
              Enter the account email you would like to remove.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <View style={{ width: '100%', alignItems: 'center' }}>
              <LiquidGlassButton title="Request Deletion" width={buttonWidth} onPress={handleDelete} />
            </View>
          </>
        );
      default:
        return (
          <>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <View style={{ width: '100%', alignItems: 'center' }}>
              <LiquidGlassButton title="Sign In" width={buttonWidth} onPress={handleLogin} />
            </View>
            <TouchableOpacity style={styles.altLink} onPress={() => setMode('register')}>
              <Text style={styles.altLinkText}>Need an account? Register</Text>
            </TouchableOpacity>
          </>
        );
    }
  };

  return (
    <LiquidGlassBackground>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>

          <Text style={styles.appName}>GALAGEAUX</Text>

          <View style={styles.tabRow}>
            {MODES.map(item => (
              <TouchableOpacity
                key={item.key}
                style={[styles.tab, mode === item.key && styles.tabActive]}
                onPress={() => setMode(item.key)}
              >
                <Text style={[styles.tabText, mode === item.key && styles.tabTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>Secure hangar access for Galageaux pilots.</Text>

          <ScrollView 
            style={{ flex: 1 }}
            contentContainerStyle={{ alignItems: 'center', paddingVertical: 16 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <LiquidGlassCard width={screenWidth * 0.9} height={mode === 'register' ? 380 : 320}>
              <View style={styles.formContent}>
                {renderForm()}
              </View>
            </LiquidGlassCard>
          </ScrollView>

          <View style={styles.footer}>
            <Text style={styles.termsText}>
              By signing in, you agree to our Terms of Service and Privacy Policy
            </Text>
            <Text style={styles.copyrightText}>
              Galageaux © 2025
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </LiquidGlassBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20
  },
  closeBtn: {
    alignSelf: 'flex-end',
    padding: 12
  },
  closeText: {
    color: '#f87171',
    fontSize: 14,
    fontWeight: '600'
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#e5e7eb',
    textAlign: 'center',
    letterSpacing: 4,
    marginBottom: 20
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#f8fafc',
    textAlign: 'center',
    letterSpacing: 2
  },
  subtitle: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 16
  },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12
  },
  tab: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)'
  },
  tabActive: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderColor: 'rgba(255,255,255,0.45)'
  },
  tabText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '500'
  },
  tabTextActive: {
    color: '#f8fafc',
    fontWeight: '700'
  },
  formContent: {
    width: '100%',
    alignItems: 'stretch',
    gap: 16,
    paddingBottom: 8
  },
  input: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16
  },
  helperText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    textAlign: 'center',
    width: '100%'
  },
  altLink: {
    alignSelf: 'center',
    marginTop: 12
  },
  altLinkText: {
    color: '#38bdf8',
    fontWeight: '600'
  },
  footer: {
    paddingBottom: 20,
    paddingTop: 12,
    alignItems: 'center',
    width: '100%'
  },
  termsText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 20
  },
  copyrightText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center'
  }
});

