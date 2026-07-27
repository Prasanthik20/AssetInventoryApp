import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { Platform } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "./src/config/api"; // Initializes global Axios interceptors
import { useNotificationListener } from "./src/hooks/useNotificationListener";

import { RootStackParamList } from "./src/navigation/types";

const Stack = createNativeStackNavigator<RootStackParamList>();
// ================= SCREENS =================

// Client
import CompanyLoginScreen from "./src/screens/Client/CompanyLoginScreen";
import AddCompanyScreen from "./src/screens/Client/AddCompanyScreen";

// Admin
import CompanyDashboard from "./src/screens/Admin/CompanyDashboard";
import CompanyUsersScreen from "./src/screens/CommonScreen/CompanyUsersScreen";
import ReportsScreen from "./src/screens/CommonScreen/ReportsScreen";
import AddCompanyUser from "./src/screens/Admin/AddCompanyUser";
import CustomCategoryBuilder from "./src/screens/Admin/CustomCategoryBuilder";
import BillingScreen from "./src/screens/CommonScreen/BillingScreen";
import ManageRolesScreen from "./src/screens/Admin/ManageRolesScreen";
import ConfigureWorkflowsScreen from "./src/screens/Admin/ConfigureWorkflowsScreen";

// Supervisor
import SupervisorDashboard from "./src/screens/Supervisor/SupervisorDashboard";

// Operator
import OperatorDashboard from "./src/screens/Operator/OperatorDashboard";

// Super Admin
import SuperAdminLoginScreen from "./src/screens/SuperAdmin/SuperAdminLoginScreen";
import SuperAdminDashboard from "./src/screens/SuperAdmin/SuperAdminDashboard";

// Assets
import TotalAssetDetails from "./src/screens/AssetDetails/TotalAssetDetails";
import OfficeAssets from "./src/screens/AssetDetails/OfficeAssets";
import FieldAssets from "./src/screens/AssetDetails/FieldAssets";
import AddEditAsset from "./src/screens/AssetDetails/AddEditAsset";
import AssignAssetScreen from "./src/screens/AssetDetails/AssignAssetScreen";
import AssetFullDetails from "./src/screens/AssetDetails/AssetFullDetails";
import ReturnAssetScreen from "./src/screens/AssetDetails/ReturnAssetScreen";

// Password
import ForgotPasswordScreen from "./src/screens/Password/ForgotPassword";
import ResetPasswordScreen from "./src/screens/Password/ResetPassword";

function App(): React.JSX.Element {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const isPublicPath = (pathName: string): boolean => {
    const normalized = String(pathName || '').toLowerCase();
    return (
      normalized === '/' ||
      normalized === '/login' ||
      normalized === '/add-company' ||
      normalized === '/forgot-password' ||
      normalized.startsWith('/reset-password') ||
      normalized === '/superadmin/login'
    );
  };

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = await AsyncStorage.getItem("user");
        if (userData) {
          setUser(JSON.parse(userData));
        }
      } catch (error) {
        console.error("Error loading user data:", error);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  // Set browser tab title for web and prevent navigation from changing it
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.title = 'ASQ - Asset Management';

      // Monitor for title changes and reset if needed
      const observer = new MutationObserver(() => {
        if (document.title !== 'ASQ - Asset Management') {
          document.title = 'ASQ - Asset Management';
        }
      });

      observer.observe(document.head, {
        childList: true,
        subtree: true,
      });

      return () => observer.disconnect();
    }
  }, []);

  // On web, prevent direct refresh on protected routes after logout.
  useEffect(() => {
    if (loading || user || Platform.OS !== 'web' || typeof window === 'undefined') {
      return;
    }

    const currentPath = window.location.pathname;
    if (!isPublicPath(currentPath)) {
      window.history.replaceState({}, '', '/login');
    }
  }, [loading, user]);

  // Linking configuration so web refresh preserves the current route
  const linking = {
    prefixes: Platform.OS === 'web' && typeof window !== 'undefined'
      ? [window.location.origin]
      : ['assetinventory://'],
    config: {
      screens: {
        CompanyLogin: 'login',
        AddCompany: 'add-company',
        CompanyDashboard: 'company-dashboard',
        CompanyUsersScreen: 'company-users',
        AddCompanyUser: 'add-company-user',
        CustomCategoryBuilder: 'categories/custom',
        ManagerDashboard: 'manager',
        SupervisorDashboard: 'supervisor',
        EmployeeDashboard: 'employee',
        OperatorDashboard: 'operator',
        SuperAdminLogin: 'superadmin/login',
        SuperAdminDashboard: 'superadmin/dashboard',
        TotalAssetDetails: 'inventory/total',
        OfficeAssets: 'inventory/office',
        FieldAssets: 'inventory/field',
        AddEditAsset: 'inventory/edit',
        AssignAsset: 'assign',
        Reports: 'reports',
        Billing: 'billing',
        AssetFullDetails: 'inventory/:asset',
        ReturnAsset: 'return',
        ManageRoles: 'roles/manage',
        ConfigureWorkflows: 'workflows/configure',
        ForgotPassword: 'forgot-password',
        ResetPassword: 'reset-password',
      },
    },
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  // Reset title whenever navigation state changes
  const onNavigationStateChange = () => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      setTimeout(() => {
        document.title = 'ASQ - Asset Management';
      }, 0);
    }
  };

  return (
    <SafeAreaProvider>
      <NavigationContainer
        linking={linking}
        onStateChange={onNavigationStateChange}
      >
        {user ? <AppStack user={user} setUser={setUser} /> : <AuthStack setUser={setUser} />}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

/* ================= AUTH STACK ================= */

function AuthStack({ setUser }: any) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CompanyLogin">
        {(props) => (
          <CompanyLoginScreen
            {...props}
            setUser={setUser}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="AddCompany" component={AddCompanyScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <Stack.Screen name="SuperAdminLogin" component={SuperAdminLoginScreen} />
    </Stack.Navigator>
  );
}

/* ================= APP STACK ================= */

function AppStack({ user, setUser }: any) {
  useNotificationListener(user);

  const getInitialRoute = () => {
    const role = String(user?.roleName || '').toLowerCase();
    if (role.includes('superadmin') || role.includes('super admin')) {
      return "SuperAdminDashboard";
    }

    const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
    if (permissions.length > 0) {
      const isOperator = permissions.includes('INITIATE_RETURN') || permissions.includes('VIEW_DASHBOARD');
      const isSupervisor = permissions.includes('ASSIGN_ASSETS') || permissions.includes('CONFIRM_RETURN');
      const isAdmin = permissions.includes('MANAGE_USERS') || permissions.includes('MANAGE_WORKFLOWS');

      if (isAdmin) {
        return "CompanyDashboard";
      }
      if (isSupervisor) {
        return "SupervisorDashboard";
      }
      if (isOperator) {
        return "OperatorDashboard";
      }
    }

    // Fallback checks
    if (role.includes('supervisor') || role.includes('manager')) {
      return "SupervisorDashboard";
    }
    if (role.includes('operator') || role.includes('employee') || role.includes('staff')) {
      return "OperatorDashboard";
    }

    return "CompanyDashboard";
  };

  return (
    <Stack.Navigator
      initialRouteName={getInitialRoute()}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="CompanyDashboard">
        {(props) => (
          <CompanyDashboard
            {...props}
            setUser={setUser}
          />
        )}
      </Stack.Screen>

      <Stack.Screen
        name="ManagerDashboard"
        children={(props) => (
          <SupervisorDashboard
            {...props}
            user={user}
            setUser={setUser} />
        )}
      />

      <Stack.Screen
        name="SupervisorDashboard"
        children={(props) => (
          <SupervisorDashboard
            {...props}
            user={user}
            setUser={setUser} />
        )}
      />

      <Stack.Screen
        name="EmployeeDashboard"
        children={(props) => (
          <OperatorDashboard
            {...props}
            user={user}
            setUser={setUser} />
        )}
      />

      <Stack.Screen name="OperatorDashboard"
        children={(props) => (
          <OperatorDashboard
            {...props}
            user={user}
            setUser={setUser} />
        )}
      />

      <Stack.Screen name="SuperAdminDashboard">
        {(props) => (
          <SuperAdminDashboard
            {...props}
            setUser={setUser}
          />
        )}
      </Stack.Screen>

      <Stack.Screen
        name="AddCompany"
        component={AddCompanyScreen}
      />

      <Stack.Screen
        name="AddCompanyUser"
        component={AddCompanyUser}
      />

      <Stack.Screen
        name="CompanyUsersScreen"
        component={CompanyUsersScreen}
      />

      <Stack.Screen
        name="CustomCategoryBuilder"
        component={CustomCategoryBuilder}
      />

      <Stack.Screen
        name="ManageRoles"
        component={ManageRolesScreen}
      />

      <Stack.Screen
        name="ConfigureWorkflows"
        component={ConfigureWorkflowsScreen}
      />

      {/* ===== ASSET SCREENS ===== */}
      <Stack.Screen
        name="TotalAssetDetails"
        component={TotalAssetDetails}
      />

      <Stack.Screen
        name="OfficeAssets"
        component={OfficeAssets}
      />

      <Stack.Screen
        name="FieldAssets"
        component={FieldAssets}
      />

      <Stack.Screen
        name="AddEditAsset"
        component={AddEditAsset}
      />

      <Stack.Screen
        name="AssignAsset"
        component={AssignAssetScreen}
      />

      <Stack.Screen
        name="AssetFullDetails"
        component={AssetFullDetails}
      />

      <Stack.Screen
        name="ReturnAsset"
        component={ReturnAssetScreen}
      />

      <Stack.Screen
        name="Reports"
        component={ReportsScreen}
      />
      <Stack.Screen
        name="Billing"
        component={BillingScreen}
      />
    </Stack.Navigator>
  );
}

export default App;