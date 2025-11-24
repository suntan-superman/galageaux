import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../constants/firebase';
import { signInWithCustomToken } from 'firebase/auth';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../constants/firebase';

// Storage keys for customer auth
const CUSTOMER_STORAGE_KEYS = {
  CUSTOMER_DATA: 'customerData',
  CUSTOMER_TOKEN: 'customerToken',
  CUSTOMER_SESSION: 'customerSession',
};

const USER_TYPE_PREFERENCE_KEY = 'user_type_preference';

const CustomerAuthContext = createContext({});

export const useCustomerAuth = () => {
  const context = useContext(CustomerAuthContext);
  if (!context) {
    throw new Error('useCustomerAuth must be used within a CustomerAuthProvider');
  }
  return context;
};

export const CustomerAuthProvider = ({ children }) => {
  const [customer, setCustomer] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // Initial auth state loading
  const [isOperationLoading, setIsOperationLoading] = useState(false); // OTP request/verification loading
  const [isAuthenticatedCustomer, setIsAuthenticatedCustomer] = useState(false);
  const [otpSentEmail, setOtpSentEmail] = useState(null);
  const [error, setError] = useState(null);
  const [companiesList, setCompaniesList] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);

  // Request OTP for customer login
  const requestOTP = useCallback(async (email) => {
    setIsOperationLoading(true); // Use operation loading, not initial loading
    setError(null);
    try {
      const response = await fetch(
        'https://us-central1-mi-factotum-field-service.cloudfunctions.net/requestCustomerOTP',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: email.toLowerCase() }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        // Parse error details from server response
        const errorDetails = {
          message: data.error || 'Failed to send OTP',
          isTechnician: data.isTechnician || false,
          accountNotFound: data.accountNotFound || false,
          notRegistered: data.notRegistered || false,
          statusCode: response.status
        };
        throw errorDetails;
      }

      setOtpSentEmail(email.toLowerCase());
      
      // Check if this is a test account
      if (data.isTestAccount && data.testOtp) {
        return { 
          success: true, 
          message: data.message || 'Test account ready',
          isTestAccount: true,
          testOtp: data.testOtp
        };
      }
      
      return { success: true, message: 'OTP sent to your email' };
    } catch (err) {
      // Handle structured error objects
      if (typeof err === 'object' && err.message) {
        const errorType = err.isTechnician ? 'technician' : 
                         err.accountNotFound ? 'deleted' : 
                         err.notRegistered ? 'notRegistered' : 'unknown';
        
        // Only log unexpected errors - not user-facing validation errors
        if (errorType === 'unknown' || err.statusCode >= 500) {
          console.error('Error requesting OTP:', err);
        } else {
          // Log expected validation errors at info level, not error level
          console.log(`[CustomerAuth] OTP request validation: ${errorType} - ${err.message}`);
        }
        
        setError(err.message);
        return { 
          success: false, 
          error: err.message,
          errorType: errorType,
          errorDetails: err
        };
      }
      
      // Handle string errors (unexpected errors)
      const errorMessage = err.message || err.toString() || 'Failed to request OTP';
      setError(errorMessage);
      console.error('Error requesting OTP:', err);
      return { success: false, error: errorMessage };
    } finally {
      setIsOperationLoading(false); // Use operation loading, not initial loading
    }
  }, []);

  // Verify OTP and sign in customer
  const verifyOTP = useCallback(async (email, otp) => {
    setIsOperationLoading(true); // Use operation loading, not initial loading
    setError(null);
    try {
      // Call Cloud Function to verify OTP
      const response = await fetch(
        'https://us-central1-mi-factotum-field-service.cloudfunctions.net/verifyCustomerOTP',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email.toLowerCase(),
            otp: otp.toString(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.details ? `${data.error}: ${data.details}` : data.error || 'Failed to verify OTP';
        console.error('[CustomerAuth] Error from server:', errorMsg);
        throw new Error(errorMsg);
      }

      if (!data.customToken) {
        throw new Error('No token received from server');
      }

      // Sign in with custom token
      const userCredential = await signInWithCustomToken(auth, data.customToken);
      const customerId = userCredential.user.uid;

      // Wait a moment for auth token to propagate to Firestore
      await new Promise(resolve => setTimeout(resolve, 500));

      // Fetch customer profile from unified customers collection
      const customerDoc = await getDoc(doc(db, 'customers', customerId));
      const customerData = customerDoc && customerDoc.exists()
        ? { id: customerId, ...customerDoc.data() }
        : { id: customerId, email: email.toLowerCase() };

      // Get companies associated with this customer
      const companies = await loadCustomerCompanies(customerId);
      
      // Store customer data securely
      await SecureStore.setItemAsync(
        CUSTOMER_STORAGE_KEYS.CUSTOMER_DATA,
        JSON.stringify(customerData)
      );
      await SecureStore.setItemAsync(
        CUSTOMER_STORAGE_KEYS.CUSTOMER_TOKEN,
        data.customToken
      );
      await SecureStore.setItemAsync(
        CUSTOMER_STORAGE_KEYS.CUSTOMER_SESSION,
        JSON.stringify({
          customerId: customerId,
          sessionId: data.sessionId,
          email: email.toLowerCase(),
          createdAt: new Date().toISOString(),
        })
      );

      // Update state
      setCustomer(customerData);
      setIsAuthenticatedCustomer(true);
      setOtpSentEmail(null);
      setCompaniesList(companies);
      setSelectedCompanyId(companies.length > 0 ? companies[0] : null);

      return { success: true, customer: customerData };
    } catch (err) {
      const errorMessage = err.message || 'Failed to verify OTP';
      setError(errorMessage);
      console.error('Error verifying OTP:', err);

      // Clear OTP state on error
      setOtpSentEmail(null);

      return { success: false, error: errorMessage };
    } finally {
      setIsOperationLoading(false); // Use operation loading, not initial loading
    }
  }, []);

  // Sign out customer
  const signOutCustomer = useCallback(async () => {
    setIsOperationLoading(true); // Use operation loading, not initial loading
    try {
      // Sign out from Firebase
      await auth.signOut();

      // Clear stored data
      await SecureStore.deleteItemAsync(CUSTOMER_STORAGE_KEYS.CUSTOMER_DATA);
      await SecureStore.deleteItemAsync(CUSTOMER_STORAGE_KEYS.CUSTOMER_TOKEN);
      await SecureStore.deleteItemAsync(CUSTOMER_STORAGE_KEYS.CUSTOMER_SESSION);

      // Clear user type preference so they see the selection screen again
      await AsyncStorage.removeItem(USER_TYPE_PREFERENCE_KEY);

      // Reset state
      setCustomer(null);
      setIsAuthenticatedCustomer(false);
      setOtpSentEmail(null);
      setError(null);

      return { success: true };
    } catch (err) {
      console.error('Error signing out customer:', err);
      return {
        success: false,
        error: err.message || 'Failed to sign out',
      };
    } finally {
      setIsOperationLoading(false); // Use operation loading, not initial loading
    }
  }, []);

  // Delete customer account
  const deleteCustomerAccount = useCallback(async () => {
    setIsOperationLoading(true); // Use operation loading, not initial loading
    try {
      const user = auth.currentUser;
      if (!user) {
        return {
          success: false,
          error: 'No user is currently signed in',
        };
      }

      // Get the Firebase Auth ID token
      const idToken = await user.getIdToken();

      // Get the Cloud Functions URL (always use production since function is deployed)
      const functionsUrl = 'https://us-central1-mi-factotum-field-service.cloudfunctions.net';
      const fullUrl = `${functionsUrl}/deleteUserAccount`;

      console.log('[DeleteCustomerAccount] Calling Cloud Function:', fullUrl);
      console.log('[DeleteCustomerAccount] User ID:', user.uid);

      // Call the deleteUserAccount Cloud Function
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to delete account';
        try {
          const result = await response.json();
          errorMessage = result.error || errorMessage;
        } catch (e) {
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        return {
          success: false,
          error: errorMessage,
          details: response.status,
        };
      }

      const result = await response.json();
      console.log('[DeleteCustomerAccount] Cloud Function response:', result);

      // Sign out from Firebase Auth to clear local state
      // This triggers navigation change via RootNavigator
      console.log('[DeleteCustomerAccount] Signing out from Firebase Auth...');
      try {
        await auth.signOut();
        console.log('[DeleteCustomerAccount] Successfully signed out from Firebase Auth');
      } catch (signOutError) {
        // If sign out fails (e.g., user already deleted), that's okay
        console.log('[DeleteCustomerAccount] Sign out after deletion (expected if user already deleted):', signOutError.message);
      }

      // Clear all stored data
      console.log('[DeleteCustomerAccount] Clearing local storage...');
      await SecureStore.deleteItemAsync(CUSTOMER_STORAGE_KEYS.CUSTOMER_DATA);
      await SecureStore.deleteItemAsync(CUSTOMER_STORAGE_KEYS.CUSTOMER_TOKEN);
      await SecureStore.deleteItemAsync(CUSTOMER_STORAGE_KEYS.CUSTOMER_SESSION);
      await AsyncStorage.removeItem(USER_TYPE_PREFERENCE_KEY);

      // Reset state - this will trigger RootNavigator to redirect to AuthSelection
      console.log('[DeleteCustomerAccount] Resetting state...');
      setCustomer(null);
      setIsAuthenticatedCustomer(false);
      setOtpSentEmail(null);
      setError(null);
      
      console.log('[DeleteCustomerAccount] Account deletion completed, RootNavigator should redirect to AuthSelection');

      return {
        success: true,
        message: result.message || 'Account deleted successfully',
      };
    } catch (err) {
      console.error('Error deleting customer account:', err);
      console.error('Delete customer account error details:', {
        message: err.message,
        code: err.code,
        name: err.name,
        stack: err.stack
      });
      return {
        success: false,
        error: err.message || 'Failed to delete account',
      };
    } finally {
      setIsOperationLoading(false); // Use operation loading, not initial loading
    }
  }, []);

  // Update customer profile
  const updateCustomerProfile = useCallback(async (profileData) => {
    try {
      if (!customer || !customer.id) {
        return { success: false, error: 'No customer logged in' };
      }

      // Update in Firestore
      if (db && customer.id) {
        const { updateDoc } = await import('firebase/firestore');
        await updateDoc(doc(db, 'customers', customer.id), {
          ...profileData,
          updatedAt: new Date().toISOString(),
        });
      }

      // Update local state
      const updatedCustomer = { ...customer, ...profileData };
      setCustomer(updatedCustomer);

      // Store updated data
      await SecureStore.setItemAsync(
        CUSTOMER_STORAGE_KEYS.CUSTOMER_DATA,
        JSON.stringify(updatedCustomer)
      );

      return { success: true, customer: updatedCustomer };
    } catch (err) {
      console.error('Error updating customer profile:', err);
      return {
        success: false,
        error: err.message || 'Failed to update profile',
      };
    }
  }, [customer]);

  // Restore customer session on app load
  const restoreCustomerSession = useCallback(async () => {
    setIsLoading(true);
    try {
      // Check if stored customer data exists
      const storedCustomerData = await SecureStore.getItemAsync(
        CUSTOMER_STORAGE_KEYS.CUSTOMER_DATA
      );

      if (!storedCustomerData) {
        setIsLoading(false);
        return;
      }

      const customerData = JSON.parse(storedCustomerData);
      
      // Check if user is authenticated with Firebase
      if (!auth.currentUser) {
        // Not authenticated, clear stored data
        await SecureStore.deleteItemAsync(CUSTOMER_STORAGE_KEYS.CUSTOMER_DATA);
        await SecureStore.deleteItemAsync(CUSTOMER_STORAGE_KEYS.CUSTOMER_TOKEN);
        await SecureStore.deleteItemAsync(CUSTOMER_STORAGE_KEYS.CUSTOMER_SESSION);
        setIsLoading(false);
        return;
      }
      
      // Verify the stored customer ID matches the current Firebase user
      if (customerData.id !== auth.currentUser.uid) {
        // Mismatch - clear stored data
        await SecureStore.deleteItemAsync(CUSTOMER_STORAGE_KEYS.CUSTOMER_DATA);
        await SecureStore.deleteItemAsync(CUSTOMER_STORAGE_KEYS.CUSTOMER_TOKEN);
        await SecureStore.deleteItemAsync(CUSTOMER_STORAGE_KEYS.CUSTOMER_SESSION);
        setIsLoading(false);
        return;
      }
      
      // Refresh customer data from Firestore
      if (customerData.id) {
        const customerDoc = await getDoc(doc(db, 'customers', customerData.id));
        
        if (customerDoc.exists()) {
          const freshData = { id: customerData.id, ...customerDoc.data() };
          setCustomer(freshData);
          
          // Update stored data with fresh data
          await SecureStore.setItemAsync(
            CUSTOMER_STORAGE_KEYS.CUSTOMER_DATA,
            JSON.stringify(freshData)
          );
        } else {
          // Customer document doesn't exist - clear session
          await SecureStore.deleteItemAsync(CUSTOMER_STORAGE_KEYS.CUSTOMER_DATA);
          await SecureStore.deleteItemAsync(CUSTOMER_STORAGE_KEYS.CUSTOMER_TOKEN);
          await SecureStore.deleteItemAsync(CUSTOMER_STORAGE_KEYS.CUSTOMER_SESSION);
          setIsLoading(false);
          return;
        }
      } else {
        setCustomer(customerData);
      }
      
      setIsAuthenticatedCustomer(true);

      // Load companies for this customer
      if (customerData && customerData.id) {
        const companies = await loadCustomerCompanies(customerData.id);
        setCompaniesList(companies);
        if (companies.length > 0) {
          setSelectedCompanyId(companies[0]);
        }
      }
    } catch (err) {
      // Silently handle errors - don't log permissions errors
      // This prevents errors when checking for customer data while logged in as tech
      if (err.code !== 'permission-denied' && !err.message?.includes('permission')) {
        console.error('[CustomerAuthContext] Error restoring customer session:', err);
      }
      
      // Clear invalid session data
      try {
        await SecureStore.deleteItemAsync(CUSTOMER_STORAGE_KEYS.CUSTOMER_DATA);
        await SecureStore.deleteItemAsync(CUSTOMER_STORAGE_KEYS.CUSTOMER_TOKEN);
        await SecureStore.deleteItemAsync(CUSTOMER_STORAGE_KEYS.CUSTOMER_SESSION);
      } catch (clearErr) {
        // Silently handle clear errors
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load companies associated with customer
  const loadCustomerCompanies = async (customerId) => {
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const companiesSet = new Set();
      
      const customerDoc = await getDoc(doc(db, 'customers', customerId));
      if (customerDoc.exists()) {
        const data = customerDoc.data();
        if (data.companies && Array.isArray(data.companies)) {
          data.companies.forEach((companyId) => companiesSet.add(companyId));
        }
      }
      
      return Array.from(companiesSet);
    } catch (error) {
      console.error('[CustomerAuth] Error loading companies:', error);
      return [];
    }
  };

  // Select a company (for customers with multiple companies)
  const selectCompany = useCallback((companyId) => {
    setSelectedCompanyId(companyId);
  }, []);

  // Refresh customer data
  const refreshCustomerData = useCallback(async () => {
    if (!customer || !customer.id) return;
    
    try {
      const customerDoc = await getDoc(doc(db, 'customers', customer.id));
      
      if (customerDoc.exists()) {
        const updatedData = { id: customer.id, ...customerDoc.data() };
        setCustomer(updatedData);
        await SecureStore.setItemAsync(
          CUSTOMER_STORAGE_KEYS.CUSTOMER_DATA,
          JSON.stringify(updatedData)
        );
      }
      
      // Refresh companies list
      const companies = await loadCustomerCompanies(customer.id);
      setCompaniesList(companies);
    } catch (error) {
      console.error('[CustomerAuth] Error refreshing customer data:', error);
    }
  }, [customer]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Restore session on mount
  useEffect(() => {
    restoreCustomerSession();
  }, []);

  const value = useMemo(() => {
    return {
      // State
      customer,
      isAuthenticatedCustomer,
      isLoading, // Initial auth state loading (used by RootNavigator)
      isOperationLoading, // OTP request/verification loading (for UI spinners)
      otpSentEmail,
      error,
      companiesList,
      selectedCompanyId,

      // Methods
      requestOTP,
      verifyOTP,
      signOutCustomer,
      updateCustomerProfile,
      restoreCustomerSession,
      selectCompany,
      refreshCustomerData,
      clearError,
      deleteCustomerAccount,
    };
  }, [
    customer,
    isAuthenticatedCustomer,
    isLoading,
    isOperationLoading,
    otpSentEmail,
    error,
    companiesList,
    selectedCompanyId,
    requestOTP,
    verifyOTP,
    signOutCustomer,
    updateCustomerProfile,
    restoreCustomerSession,
    selectCompany,
    refreshCustomerData,
    clearError,
    deleteCustomerAccount,
  ]);

  return (
    <CustomerAuthContext.Provider value={value}>
      {children}
    </CustomerAuthContext.Provider>
  );
};

