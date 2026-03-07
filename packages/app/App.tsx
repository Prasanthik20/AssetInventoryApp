import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { Platform } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { RootStackParamList } from "./src/navigation/types";

const Stack = createNativeStackNavigator<RootStackParamList>();
// ================= SCREENS =================

// Client
import CompanyLoginScreen from "./src/screens/Client/CompanyLoginScreen";
import AddCompanyScreen from "./src/screens/Client/AddCompanyScreen";

// Admin
import CompanyDashboard from "./src/screens/Admin/CompanyDashboard";
import CompanyUsersScreen from "./src/screens/CommonScreen/CompanyUsersScreen";
import AddCompanyUser from "./src/screens/Admin/AddCompanyUser";

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
        SupervisorDashboard: 'supervisor',
        OperatorDashboard: 'operator',
        SuperAdminLogin: 'superadmin/login',
        SuperAdminDashboard: 'superadmin/dashboard',
        TotalAssetDetails: 'assets/total',
        OfficeAssets: 'assets/office',
        FieldAssets: 'assets/field',
        AddEditAsset: 'assets/edit',
        AssignAsset: 'assign',
        AssetFullDetails: 'assets/:asset',
        ReturnAsset: 'return',
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

  return (
    <NavigationContainer linking={linking}>
      {user ? <AppStack user={user} setUser={setUser} /> : <AuthStack setUser={setUser} />}
    </NavigationContainer>
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
  const getInitialRoute = () => {
    switch (user.roleName) {
      case "Admin":
        return "CompanyDashboard";
      case "Supervisor":
        return "SupervisorDashboard";
      case "Operator":
        return "OperatorDashboard";
      case "SuperAdmin":
        return "SuperAdminDashboard";
      default:
        return "CompanyDashboard";
    }
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
        name="SupervisorDashboard"
        // Use children to pass props
        children={(props) => (
          <SupervisorDashboard
            {...props}      // pass navigation & route props
            user={user}     // your state from App.tsx
            setUser={setUser}  />
  )}
      />

      <Stack.Screen name="OperatorDashboard"
      children={(props) => (
          <OperatorDashboard
            {...props}      // pass navigation & route props
            user={user}     // your state from App.tsx
            setUser={setUser}  /> // optional: if you need logout functionality
      )}
      />

      <Stack.Screen
        name="SuperAdminDashboard"
        component={SuperAdminDashboard}
      />

      <Stack.Screen
        name="AddCompanyUser"
        component={AddCompanyUser}
      />

      <Stack.Screen
        name="CompanyUsersScreen"
        component={CompanyUsersScreen}
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
    </Stack.Navigator>
  );
}

export default App;