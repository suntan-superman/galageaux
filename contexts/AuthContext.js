import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState, Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthService } from '../services/firebase';
import { getDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../constants/firebase';

// Storage keys constants
const STORAGE_KEYS = {
  USER_DATA: 'userData',
  USER_TOKEN: 'userToken',
  SAVED_CREDENTIALS: 'savedCredentials',
  TEMP_CREDENTIALS: 'tempCredentials', // For storing credentials during email verification
};

const USER_TYPE_PREFERENCE_KEY = 'user_type_preference';

const AuthContext = createContext({});

// Export the context so it can be imported directly
export { AuthContext };

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Initialize auth state
  useEffect(() => {
    let unsubscribe = () => {};
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        // Wait a short moment to ensure Firebase is fully initialized
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Check auth state first (this only accesses SecureStore, not Firestore)
        if (isMounted) {
          await checkAuthState();
        }
        
        // Listen to auth state changes
        unsubscribe = AuthService.onAuthStateChanged(async (firebaseUser) => {
          if (!isMounted) return; // Prevent state updates if component is unmounted
          if (firebaseUser) {
            // Ensure user is fully authenticated before making Firestore calls
            // Wait for auth token to be available
            try {
              const token = await firebaseUser.getIdToken();
              const decodedToken = await firebaseUser.getIdTokenResult();
              
              // Check if this is a customer user (has customer custom claim or exists in customer collections)
              // If so, ignore them - let CustomerAuthContext handle them
              if (decodedToken.claims?.role === 'customer') {
                console.log('[AuthContext] Ignoring customer user, CustomerAuthContext will handle it');
                setUser(null);
                setIsAuthenticated(false);
                setIsLoading(false);
                return;
              }
            } catch (tokenError) {
              console.error('❌ Failed to get auth token:', tokenError);
              setUser(null);
              setIsAuthenticated(false);
              setIsLoading(false);
              return;
            }
            
            // Fetch complete user data from Firestore
            try {
              
              if (db && firebaseUser.uid) {
                // Check if user exists in users collection (technician/admin)
                const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
                
                // If user doesn't exist in users collection, check if they're a customer
                // If they're a customer, ignore them - let CustomerAuthContext handle them
                if (!userDoc.exists()) {
                  const customerDoc = await getDoc(doc(db, 'customers', firebaseUser.uid));
                  if (customerDoc.exists()) {
                    console.log('[AuthContext] User is a customer, ignoring - CustomerAuthContext will handle it');
                    setUser(null);
                    setIsAuthenticated(false);
                    setIsLoading(false);
                    return;
                  }
                  
                  // User doesn't exist in any collection - don't authenticate
                  console.log('[AuthContext] User not found in users or customer collections');
                  setUser(null);
                  setIsAuthenticated(false);
                  setIsLoading(false);
                  return;
                }
                
                // User exists in users collection - this is a technician/admin
                const firestoreData = userDoc.data();
                
                const userData = {
                  id: firebaseUser.uid,
                  email: firebaseUser.email,
                  name: firebaseUser.displayName || firestoreData.name,
                  emailVerified: firebaseUser.emailVerified,
                  ...firestoreData,
                };
                
                setUser(userData);
                setIsAuthenticated(true);
                
                // Store user data securely
                await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
              } else {
                // Fallback if Firestore is not available - don't authenticate without Firestore check
                console.log('[AuthContext] Firestore not available, cannot verify user type');
                setUser(null);
                setIsAuthenticated(false);
              }
            } catch (error) {
              console.error('Error fetching user data from Firestore:', error);
              
              // Don't set auth state on error - let CustomerAuthContext handle it if it's a customer
              setUser(null);
              setIsAuthenticated(false);
            }
          } else {
            setUser(null);
            setIsAuthenticated(false);
            
            // Clear stored data
            try {
              await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_DATA);
              await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_TOKEN);
            } catch (error) {
              console.error('Error clearing stored data:', error);
            }
          }
          setIsLoading(false);
        });
      } catch (error) {
        console.error('Error initializing auth:', error);
        setIsLoading(false);
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // Listen for app state changes to refresh user data when app becomes active
  useEffect(() => {
    const handleAppStateChange = async (nextAppState) => {
      if (nextAppState === 'active' && isAuthenticated && user) {
        // Small delay to ensure Firebase has time to update
        setTimeout(async () => {
          await refreshUser();
        }, 1000);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, [isAuthenticated, user]);

  // Check if user is already authenticated
  const checkAuthState = async () => {
    try {
      const storedUserData = await SecureStore.getItemAsync(STORAGE_KEYS.USER_DATA);
      const currentUser = AuthService.getCurrentUser();
      
      if (currentUser && storedUserData) {
        // Verify this is actually a technician/admin, not a customer
        try {
          const tokenResult = await currentUser.getIdTokenResult();
          
          // If user has customer role, clear stored data and let CustomerAuthContext handle it
          if (tokenResult.claims?.role === 'customer') {
            console.log('[AuthContext] Stored user is a customer, clearing - CustomerAuthContext will handle it');
            await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_DATA);
            await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_TOKEN);
            setUser(null);
            setIsAuthenticated(false);
            setIsLoading(false);
            return;
          }
          
          // Verify user exists in users collection (not customer collections)
          if (db && currentUser.uid) {
            const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
            
            if (!userDoc.exists()) {
              // Check if they're a customer instead
              const customerDoc = await getDoc(doc(db, 'customers', currentUser.uid));
              if (customerDoc.exists()) {
                console.log('[AuthContext] Stored user is a customer, clearing - CustomerAuthContext will handle it');
                await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_DATA);
                await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_TOKEN);
                setUser(null);
                setIsAuthenticated(false);
                setIsLoading(false);
                return;
              }
              
              // User doesn't exist in any collection - clear stored data
              console.log('[AuthContext] Stored user not found in users collection, clearing');
              await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_DATA);
              await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_TOKEN);
              setUser(null);
              setIsAuthenticated(false);
              setIsLoading(false);
              return;
            }
          }
          
          // User is verified as technician/admin - restore session
          const userData = JSON.parse(storedUserData);
          setUser(userData);
          setIsAuthenticated(true);
          return;
        } catch (verifyError) {
          console.error('[AuthContext] Error verifying stored user:', verifyError);
          // Clear stored data on verification error
          await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_DATA);
          await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_TOKEN);
          setUser(null);
          setIsAuthenticated(false);
        }
      }
      
      // If no existing session, check for saved credentials and auto-sign in
      const credentialsResult = await loadSavedCredentials();
      
      if (credentialsResult.success && credentialsResult.credentials) {
        const { email, password } = credentialsResult.credentials;
        
        // Only attempt auto-sign-in if both email and password are present
        if (email && password && password.trim() !== '') {
          // Attempt automatic sign in
          const signInResult = await signInInternal(email, password);
          
          if (signInResult.success) {
            // User state will be updated by the signIn function
          } else {
            // Clear invalid credentials to prevent repeated failed attempts
            await clearSavedCredentials();
          }
        } else {
          // Clear invalid credentials (missing password)
          await clearSavedCredentials();
        }
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Sign up
  const signUp = async (email, password, userData = {}) => {
    setIsLoading(true);
    try {
      const result = await AuthService.signUp(email, password, userData);
      
      // Only show debug alert for non-expected errors (email-already-in-use is handled in UI)
      if (!result.success && result.error?.code !== 'auth/email-already-in-use') {
        Alert.alert('Sign Up Debug', `Error: ${result.error?.message || 'Unknown error'}`);
      }
      
      if (result.success) {
        // IMPORTANT: Do NOT set user or authenticate if email verification is needed
        // User must verify email before being signed in
        if (result.needsEmailVerification) {
          // Store temporary credentials for after email verification
          const tempCredentials = { email, password };
          await SecureStore.setItemAsync(STORAGE_KEYS.TEMP_CREDENTIALS, JSON.stringify(tempCredentials));
          
          // Do NOT set user or authenticate - user must verify email first
          return { 
            success: true, 
            needsEmailVerification: true,
            email: result.email
          };
        } else {
          // Only set user if email is already verified (shouldn't happen in normal flow)
          setUser(result.user);
          setIsAuthenticated(true);
          await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(result.user));
          
          return { 
            success: true, 
            needsEmailVerification: false 
          };
        }
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Signup error:', error);
      // Provide more specific error message based on error type
      let errorMessage = 'An unexpected error occurred during sign up.';
      if (error.code) {
        // Use Firebase error message if available
        errorMessage = AuthService.getErrorMessage(error.code);
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return {
        success: false,
        error: { message: errorMessage, code: error.code }
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Internal sign in function (doesn't manage loading state)
  const signInInternal = async (email, password) => {
    try {
      const result = await AuthService.signIn(email, password);
      
      if (result.success) {
        setUser(result.user);
        setIsAuthenticated(true);
        
        // Store user data
        await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(result.user));
        
        // Check for pending company data and handle it
        try {
          const pendingCompanyDataStr = await SecureStore.getItemAsync('pendingCompanyData');
          if (pendingCompanyDataStr && result.user) {
            const pendingCompanyData = JSON.parse(pendingCompanyDataStr);
            const { CompanyService } = await import('../services/firebase');
            
            // Handle company creation/joining
            if (pendingCompanyData.companyOption === 'new' && pendingCompanyData.companyName) {
              const companyData = {
                name: pendingCompanyData.companyName,
                phone: pendingCompanyData.companyPhone || '',
                address: pendingCompanyData.companyAddress || '',
                email: email,
                services: [],
                serviceCategories: []
              };
              
              const companyResult = await CompanyService.createCompany(companyData);
              if (companyResult.success) {
                console.log('Company created after email verification');
                // Clear pending data
                await SecureStore.deleteItemAsync('pendingCompanyData');
              }
            } else if (pendingCompanyData.companyOption === 'existing' && pendingCompanyData.companyCode) {
              const joinResult = await CompanyService.joinCompanyByCode(
                result.user.id,
                pendingCompanyData.companyCode,
                pendingCompanyData.role || 'field_tech'
              );
              if (joinResult.success) {
                console.log('Company joined after email verification');
                // Clear pending data
                await SecureStore.deleteItemAsync('pendingCompanyData');
              }
            }
          }
        } catch (companyError) {
          console.error('Error handling pending company data:', companyError);
          // Don't fail login if company setup fails
        }
        
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      // Don't log invalid-credential errors as errors - they're expected user input issues
      if (error.code !== 'auth/invalid-credential' && 
          error.code !== 'auth/user-not-found' && 
          error.code !== 'auth/wrong-password') {
        console.error('❌ Sign in error:', error);
      }
      // Provide more specific error message based on error type
      let errorMessage = 'An unexpected error occurred during sign in.';
      if (error.code) {
        // Use Firebase error message if available
        errorMessage = AuthService.getErrorMessage(error.code);
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return {
        success: false,
        error: { message: errorMessage, code: error.code }
      };
    }
  };

  // Sign in (public function that manages loading state)
  const signIn = async (email, password) => {
    setIsLoading(true);
    try {
      const result = await signInInternal(email, password);
      
      // Only show debug alert for unexpected errors (not invalid credentials)
      if (!result.success && 
          result.error?.code !== 'auth/invalid-credential' && 
          result.error?.code !== 'auth/user-not-found' && 
          result.error?.code !== 'auth/wrong-password') {
        Alert.alert('Sign In Debug', `Error: ${result.error?.message || 'Unknown error'}`);
      }
      
      return result;
    } catch (error) {
      // Don't show alert for expected authentication errors
      if (error.code !== 'auth/invalid-credential' && 
          error.code !== 'auth/user-not-found' && 
          error.code !== 'auth/wrong-password') {
        Alert.alert('Sign In Error', `Catch block: ${error.message}`);
      }
      return { 
        success: false, 
        error: { 
          message: error.code ? AuthService.getErrorMessage(error.code) : 'An unexpected error occurred. Please try again.',
          code: error.code 
        } 
      };
    } finally {
      setIsLoading(false);
    }
  };


  // Test function to verify SecureStore is working
  const testSecureStore = async () => {
    try {
      const testKey = 'testKey';
      const testValue = 'testValue';
      
      // Save test value
      await SecureStore.setItemAsync(testKey, testValue);
      
      // Immediately load test value
      const loadedValue = await SecureStore.getItemAsync(testKey);
      
      // Clean up
      await SecureStore.deleteItemAsync(testKey);
      
      return loadedValue === testValue;
    } catch (error) {
      console.error('🧪 SecureStore test failed:', error);
      return false;
    }
  };

  // Sign out
  const signOut = async () => {
    setIsLoading(true);
    try {
      const result = await AuthService.signOut();
      
      if (result.success) {
        setUser(null);
        setIsAuthenticated(false);
        
        // Save email but clear password for security
        try {
          const storedCredentials = await SecureStore.getItemAsync(STORAGE_KEYS.SAVED_CREDENTIALS);
          if (storedCredentials) {
            const credentials = JSON.parse(storedCredentials);
            // Keep only the email, clear password
            const emailOnly = { email: credentials.email, password: '' };
            await SecureStore.setItemAsync(STORAGE_KEYS.SAVED_CREDENTIALS, JSON.stringify(emailOnly));
          }
        } catch (credError) {
          console.error('Error preserving email:', credError);
        }
        
        // Clear session data
        await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_DATA);
        await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_TOKEN);
        await SecureStore.deleteItemAsync(STORAGE_KEYS.TEMP_CREDENTIALS);
        
        // Clear user type preference so they see the selection screen again
        await AsyncStorage.removeItem(USER_TYPE_PREFERENCE_KEY);
        
        // Force a longer delay to ensure state is completely cleared
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      return {
        success: false,
        error: { message: 'An unexpected error occurred during sign out.' }
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Reset password
  const resetPassword = async (email) => {
    try {
      const result = await AuthService.resetPassword(email);
      return result;
    } catch (error) {
      return {
        success: false,
        error: { message: 'An unexpected error occurred while resetting password.' }
      };
    }
  };

  // Save credentials for persistence (Demo purposes - not recommended for production)
  const saveCredentials = async (email, password) => {
    try {
      const credentials = { email, password };
      await SecureStore.setItemAsync(STORAGE_KEYS.SAVED_CREDENTIALS, JSON.stringify(credentials));
      
      // Immediately verify they were saved
      const verification = await SecureStore.getItemAsync(STORAGE_KEYS.SAVED_CREDENTIALS);
      
      // Wait a moment and try again to test timing
      await new Promise(resolve => setTimeout(resolve, 100));
      const delayedVerification = await SecureStore.getItemAsync(STORAGE_KEYS.SAVED_CREDENTIALS);
      
      return { success: true };
    } catch (error) {
      console.error('❌ Error saving credentials:', error);
      return { success: false };
    }
  };

  // Load saved credentials
  const loadSavedCredentials = async () => {
    try {
      const storedCredentials = await SecureStore.getItemAsync(STORAGE_KEYS.SAVED_CREDENTIALS);
      if (storedCredentials) {
        const credentials = JSON.parse(storedCredentials);
        return { success: true, credentials };
      }
      return { success: false, credentials: null };
    } catch (error) {
      console.error('❌ Error loading credentials:', error);
      return { success: false, credentials: null };
    }
  };

  // Clear saved credentials
  const clearSavedCredentials = async () => {
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.SAVED_CREDENTIALS);
      return { success: true };
    } catch (error) {
      console.error('Error clearing credentials:', error);
      return { success: false };
    }
  };

  // Clear ALL data including saved credentials (for testing)
  const clearAllData = async () => {
    try {
      setUser(null);
      setIsAuthenticated(false);
      
      // Clear ALL stored data
      await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_DATA);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_TOKEN);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.SAVED_CREDENTIALS);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.TEMP_CREDENTIALS);
      
      return { success: true };
    } catch (error) {
      console.error('Error clearing all data:', error);
      return { success: false, error: error.message };
    }
  };

  // Save temporary credentials permanently after email verification
  const saveCredentialsAfterVerification = async () => {
    try {
      const tempCredentials = await SecureStore.getItemAsync(STORAGE_KEYS.TEMP_CREDENTIALS);
      
      if (tempCredentials) {
        const credentials = JSON.parse(tempCredentials);
        
        // Save credentials permanently
        await SecureStore.setItemAsync(STORAGE_KEYS.SAVED_CREDENTIALS, JSON.stringify(credentials));
        
        // Clear temporary credentials
        await SecureStore.deleteItemAsync(STORAGE_KEYS.TEMP_CREDENTIALS);
        
        return { success: true };
      } else {
        return { success: false, error: 'No temporary credentials found' };
      }
    } catch (error) {
      console.error('❌ Error saving credentials after verification:', error);
      return { success: false, error: error.message };
    }
  };

  // Send email verification
  const sendEmailVerification = async () => {
    setIsLoading(true);
    try {
      const result = await AuthService.sendEmailVerification();
      return result;
    } catch (error) {
      return {
        success: false,
        error: { message: 'Failed to send verification email. Please try again.' }
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh current user data (to detect email verification changes)
  const refreshUser = async () => {
    try {
      const currentUser = AuthService.getCurrentUser();
      if (currentUser) {
        // Wait a moment to ensure auth token is ready
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Reload the user to get fresh data from Firebase
        await currentUser.reload();
        
        // Fetch updated user data from Firestore
        try {
          
          // Double-check that user is still authenticated before Firestore call
          const authUser = AuthService.getCurrentUser();
          if (db && authUser && authUser.uid === currentUser.uid) {
            const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
            const firestoreData = userDoc.exists() ? userDoc.data() : {};
            
            // Handle Firebase email verification inconsistency
            const isVerifiedCheck = await AuthService.isEmailVerified();
            const reloadVerified = currentUser.emailVerified;
            
            // If there's a discrepancy, trust the isEmailVerified() function
            const finalEmailVerified = isVerifiedCheck || reloadVerified;
            
            // Exclude emailVerified from Firestore data to prevent override
            const { emailVerified: firestoreEmailVerified, ...safeFirestoreData } = firestoreData;
            
            const userData = {
              id: currentUser.uid,
              email: currentUser.email,
              name: currentUser.displayName || firestoreData.name,
              ...safeFirestoreData, // Spread Firestore data first
              emailVerified: finalEmailVerified, // Then override with Firebase Auth status
            };
            
            setUser(userData);
            setIsAuthenticated(true);
            
            // Store user data securely
            await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
            
            return { success: true, user: userData };
          } else {
            // If no Firestore access, continue with basic Firebase Auth data
            const firestoreData = {};
            
            // Continue with the same logic as if Firestore succeeded
            const isVerifiedCheck = await AuthService.isEmailVerified();
            const reloadVerified = currentUser.emailVerified;
            const finalEmailVerified = isVerifiedCheck || reloadVerified;
            
            const userData = {
              id: currentUser.uid,
              email: currentUser.email,
              name: currentUser.displayName || 'User',
              emailVerified: finalEmailVerified,
            };
            
            setUser(userData);
            setIsAuthenticated(true);
            
            await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
            
            return { success: true, user: userData };
          }
        } catch (error) {
          console.error('Error fetching updated user data from Firestore:', error);
          
          // Fallback to basic Firebase Auth data
          const isVerifiedCheck = await AuthService.isEmailVerified();
          const reloadVerified = currentUser.emailVerified;
          const finalEmailVerified = isVerifiedCheck || reloadVerified;
          
          const userData = {
            id: currentUser.uid,
            email: currentUser.email,
            name: currentUser.displayName || 'User',
            emailVerified: finalEmailVerified,
          };
          
          setUser(userData);
          setIsAuthenticated(true);
          
          await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
          
          return { success: true, user: userData };
        }
      }
      
      return { success: false, error: 'No current user' };
    } catch (error) {
      console.error('Error refreshing user:', error);
      return { success: false, error: error.message };
    }
  };

  // Check if current user's email is verified
  const isEmailVerified = async () => {
    try {
      return await AuthService.isEmailVerified();
    } catch (error) {
      console.error('Error checking email verification:', error);
      return false;
    }
  };

  // Manual override for email verification (debug/temporary)
  const forceEmailVerified = async () => {
    try {
      if (user) {
        const updatedUser = { ...user, emailVerified: true };
        setUser(updatedUser);
        
        // Store updated user data
        await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(updatedUser));
        
        return { success: true };
      }
      return { success: false, error: 'No user to update' };
    } catch (error) {
      console.error('Error in manual override:', error);
      return { success: false, error: error.message };
    }
  };

  // Update user profile in Firestore and local state
  const updateUserProfile = async (profileData) => {
    try {
      if (!user || !user.id) {
        return { success: false, error: 'No user to update' };
      }

      // Update user data in Firestore
      
      if (db && user.id) {
        await updateDoc(doc(db, 'users', user.id), {
          ...profileData,
          updatedAt: new Date().toISOString(),
        });
      }

      // Update local user state
      const updatedUser = { ...user, ...profileData };
      setUser(updatedUser);
      
      // Store updated user data
      await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(updatedUser));
      
      return { success: true, user: updatedUser };
    } catch (error) {
      console.error('Error updating user profile:', error);
      return { success: false, error: error.message };
    }
  };

  // Delete user account
  const deleteAccount = async () => {
    setIsLoading(true);
    try {
      const result = await AuthService.deleteAccount();
      
      if (result.success) {
        console.log('[AuthContext] Account deleted successfully, clearing local state...');
        
        // Clear all local data
        setUser(null);
        setIsAuthenticated(false);
        
        // Clear all stored credentials and data
        await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_DATA);
        await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_TOKEN);
        await SecureStore.deleteItemAsync(STORAGE_KEYS.SAVED_CREDENTIALS);
        await SecureStore.deleteItemAsync(STORAGE_KEYS.TEMP_CREDENTIALS);
        await AsyncStorage.removeItem(USER_TYPE_PREFERENCE_KEY);
        
        console.log('[AuthContext] Local state cleared, RootNavigator should redirect to AuthSelection');
        
        return { success: true, message: result.message || 'Account deleted successfully' };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      return {
        success: false,
        error: { message: 'An unexpected error occurred during account deletion.' }
      };
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    saveCredentials,
    loadSavedCredentials,
    clearSavedCredentials,
    clearAllData, // Add function to clear all data
    saveCredentialsAfterVerification, // Add function to save credentials after verification
    sendEmailVerification,
    isEmailVerified,
    refreshUser, // Add refresh function
    forceEmailVerified, // Add manual override function
    updateUserProfile, // Add profile update function
    deleteAccount, // Add account deletion function
    testSecureStore, // Add test function
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
