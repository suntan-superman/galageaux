import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { MaterialIcons, AntDesign } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { AuthContext } from '../contexts/AuthContext';
import { FONT_SIZES, SPACING, BUTTON_SIZES, BORDER_RADIUS, ICON_SIZES, CARD_SIZES, WIDTHS, HEIGHTS, hp, wp, rf } from '../constants/responsiveSizes';
import LiquidGlassButton from '../components/LiquidGlassButton';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [credentialsLoaded, setCredentialsLoaded] = useState(false);
  const [secureStoreStatus, setSecureStoreStatus] = useState('Testing...');

  const { signIn, loadSavedCredentials, saveCredentials, testSecureStore, clearSavedCredentials } = useContext(AuthContext);

  // Load saved credentials when component mounts
  useEffect(() => {
    const loadCredentials = async () => {
      const storeWorking = await testSecureStore();
      
      const result = await loadSavedCredentials();
      if (result.success && result.credentials) {
        setEmail(result.credentials.email);
        setPassword(result.credentials.password);
      }
      setCredentialsLoaded(true);
    };
    
    loadCredentials();
  }, [loadSavedCredentials, testSecureStore]);

  const handleLogin = async () => {
    if (!email || !password) {
      alert('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      const result = await signIn(email, password);
      if (result.success) {
        // Save credentials for next time
        await saveCredentials(email, password);
        
        const testLoad = await loadSavedCredentials();
        if (testLoad.success) {
          // console.log('✅ Immediate load test: Success!');
        } else {
          console.log('❌ Immediate load test: Failed!');
        }
        
        // Navigation will be handled by AuthContext state change
      } else {
        // Show user-friendly error message
        const errorMessage = result.error?.message || 'Invalid email or password. Please try again.';
        Alert.alert('Login Failed', errorMessage);
      }
    } catch (error) {
      // Only log unexpected errors
      if (error.code !== 'auth/invalid-credential' && 
          error.code !== 'auth/user-not-found' && 
          error.code !== 'auth/wrong-password') {
        console.error('Login error:', error);
      }
      Alert.alert('Login Failed', 'Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUpNavigation = () => {
    navigation.navigate('signup');
  };

  // Add manual credential clearing function for debugging
  const handleClearCredentials = async () => {
    try {
      const result = await clearSavedCredentials();
      if (result.success) {
        // console.log('🧹 Manually cleared all saved credentials');
        setEmail('');
        setPassword('');
        setCredentialsLoaded(false);
        // alert('✅ Saved credentials cleared successfully!');
      } else {
        alert('❌ Failed to clear credentials');
      }
    } catch (error) {
      console.error('Error clearing credentials:', error);
      alert('❌ Error clearing credentials');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <View style={styles.mainContent}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.contentWrapper}>
              <ScrollView
                style={{ flex: 1, width: '100%' }}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.logoText}>
                  <Text style={styles.factotumText}>Route</Text>
                  <Text style={styles.factotumText}> Logistics</Text>
                </Text>
                <Text style={styles.clientText}>Your Field Service Solution</Text>
              </View>

              {/* Auto-fill Notice */}
              {credentialsLoaded && email && password && (
                <View style={styles.demoNotice}>
                  <Text style={styles.demoText}>✨ Auto-filled</Text>
                  <Text style={styles.demoSubtext}>Using your saved credentials</Text>
                </View>
              )}

              {/* Form */}
              <View style={styles.formContainer}>
                {/* Email Input */}
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Email"
                    placeholderTextColor="rgba(255, 255, 255, 0.6)"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                    returnKeyType="next"
                    onSubmitEditing={() => {
                      // Focus password field on next
                      // This will be handled by the password input's ref if needed
                      Keyboard.dismiss();
                    }}
                  />
                  <MaterialIcons
                    name="email"
                    size={24}
                    color="#ffffff"
                    style={styles.inputIcon}
                  />
                </View>

                {/* Password Input */}
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Password"
                    placeholderTextColor="rgba(255, 255, 255, 0.6)"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                  />
                  <AntDesign
                    name="lock"
                    size={24}
                    color="#ffffff"
                    style={styles.inputIcon}
                  />
                </View>
              </View>

              {/* Login Button */}
              <View style={styles.actionContainer}>
                <LiquidGlassButton
                  title={isLoading ? 'Signing In...' : 'Login'}
                  width={wp('36%')}
                  height={hp('6%')}
                  onPress={handleLogin}
                  disabled={isLoading}
                />

                {/* Sign Up Link */}
                <TouchableOpacity 
                  style={styles.signUpLink}
                  onPress={handleSignUpNavigation}
                  disabled={isLoading}
                >
                  <Text style={styles.signUpText}>
                    Don't have an account? <Text style={styles.signUpTextBold}>Sign Up</Text>
                  </Text>
                </TouchableOpacity>
              </View>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </View>
      
      {/* Footer - outside KeyboardAvoidingView so it doesn't shift */}
      <View style={styles.footerContainer}>
        {/* Back to Selection Link */}
        <TouchableOpacity 
          style={styles.customerLink}
          onPress={() => {
            // Navigate back through the stack to the selection screen
            if (navigation.canGoBack()) {
              navigation.getParent()?.goBack();
            }
          }}
          disabled={isLoading}
        >
          <Text style={styles.footerText}>
            Are you a customer? <Text style={styles.footerLink}>Login as Customer</Text>
          </Text>
        </TouchableOpacity>

        {/* Debug: Clear Credentials Button */}
        <TouchableOpacity 
          style={styles.debugButton}
          onPress={handleClearCredentials}
          disabled={isLoading}
        >
          <Text style={styles.debugButtonText}>🧹 Clear Saved Credentials</Text>
        </TouchableOpacity>
        
        <Text style={styles.termsText}>
          By signing in, you agree to our Terms of Service and Privacy Policy
        </Text>
        <Text style={styles.copyrightText}>
          Workside Software LLC Copyright 2025
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  mainContent: {
    flex: 1,
    width: '100%',
  },
  contentWrapper: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  scrollContent: {
    width: '100%',
    paddingTop: hp('10%'),
    paddingBottom: hp('2%'),
    alignItems: 'center',
    alignSelf: 'stretch',
    flexGrow: 0,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.LARGE,
  },
  logoText: {
    fontSize: FONT_SIZES.DISPLAY * 0.75,
    fontWeight: 'bold',
  },
  factotumText: {
    color: COLORS.primary[400],
  },
  clientText: {
    fontSize: FONT_SIZES.HEADING * 0.75,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: SPACING.TINY,
  },
  demoNotice: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: COLORS.primary[400],
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.SMALL,
    paddingHorizontal: SPACING.MEDIUM,
    paddingVertical: SPACING.SMALL,
    marginBottom: SPACING.XLARGE,
    alignItems: 'center',
    width: '85%',
  },
  demoText: {
    fontSize: FONT_SIZES.MEDIUM,
    fontWeight: 'bold',
    color: COLORS.primary[300],
    marginBottom: SPACING.TINY,
  },
  demoSubtext: {
    fontSize: FONT_SIZES.SMALL,
    color: COLORS.primary[200],
    textAlign: 'center',
  },
  autoFillText: {
    fontSize: FONT_SIZES.CAPTION,
    color: COLORS.primary[500],
    textAlign: 'center',
    marginTop: SPACING.TINY,
    fontStyle: 'italic',
  },
  formContainer: {
    width: '100%',
    alignSelf: 'stretch',
    paddingHorizontal: SPACING.LARGE,
    marginBottom: SPACING.LARGE,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: BORDER_RADIUS.SMALL,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRightWidth: 4,
    borderBottomWidth: 4,
    marginBottom: SPACING.MEDIUM,
    paddingHorizontal: SPACING.SMALL,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: hp('0.25%') },
    shadowOpacity: 0.3,
    shadowRadius: wp('0.5%'),
    elevation: 2,
  },
  textInput: {
    flex: 1,
    height: hp('6%'),
    fontSize: FONT_SIZES.MEDIUM,
    color: '#ffffff',
    paddingVertical: SPACING.SMALL,
  },
  inputIcon: {
    marginLeft: SPACING.SMALL,
    color: '#ffffff',
  },
  actionContainer: {
    width: '100%',
    paddingHorizontal: SPACING.LARGE,
    alignItems: 'center',
    marginBottom: SPACING.XLARGE,
  },
  signUpLink: {
    padding: SPACING.SMALL,
  },
  signUpText: {
    fontSize: FONT_SIZES.MEDIUM,
    color: '#ffffff',
    textAlign: 'center',
  },
  signUpTextBold: {
    fontWeight: 'bold',
    color: COLORS.primary[400],
  },
  footerContainer: {
    paddingBottom: SPACING.XLARGE,
    paddingTop: SPACING.MEDIUM,
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#000000',
  },
  customerLink: {
    marginBottom: SPACING.MEDIUM,
  },
  footerText: {
    fontSize: FONT_SIZES.SMALL,
    color: '#ffffff',
    textAlign: 'center',
  },
  footerLink: {
    fontSize: FONT_SIZES.SMALL,
    color: COLORS.primary[400],
    fontWeight: '600',
  },
  debugButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.SMALL,
    paddingHorizontal: SPACING.MEDIUM,
    paddingVertical: SPACING.SMALL,
    marginBottom: SPACING.MEDIUM,
  },
  debugButtonText: {
    fontSize: FONT_SIZES.CAPTION,
    color: '#ffffff',
    textAlign: 'center',
  },
  termsText: {
    fontSize: FONT_SIZES.CAPTION,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: SPACING.SMALL,
  },
  copyrightText: {
    fontSize: FONT_SIZES.TINY,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
  },
});

export default LoginScreen;
