import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

// Import the shared navigation types
import { RootStackParamList } from "./src/navigation/types";

// Create navigator with imported type
const Stack = createNativeStackNavigator<RootStackParamList>();

// Client Screens
import CompanyLoginScreen from "./src/screens/Client/CompanyLoginScreen";
import AddCompanyScreen from "./src/screens/Client/AddCompanyScreen";

// Admin Screens
import CompanyDashboard from "./src/screens/Admin/CompanyDashboard";
import CompanyUsersScreen from "./src/screens/CommonScreen/CompanyUsersScreen";
import AddCompanyUser from "./src/screens/Admin/AddCompanyUser";

// Supervisor Screens
import SupervisorDashboard from "./src/screens/Supervisor/SupervisorDashboard";

// Operator Screens
import OperatorDashboard from "./src/screens/Operator/OperatorDashboard";

// Super Admin Screens
import SuperAdminLoginScreen from "./src/screens/SuperAdmin/SuperAdminLoginScreen";
import SuperAdminDashboard from "./src/screens/SuperAdmin/SuperAdminDashboard";

// Asset Management Screens
import TotalAssetDetails from "./src/screens/AssetDetails/TotalAssetDetails";
import OfficeAssets from "./src/screens/AssetDetails/OfficeAssets";
import FieldAssets from "./src/screens/AssetDetails/FieldAssets";
import AddEditAsset from "./src/screens/AssetDetails/AddEditAsset";
import AssignAssetScreen from "./src/screens/AssetDetails/AssignAssetScreen";
import AssetFullDetails from "./src/screens/AssetDetails/AssetFullDetails";
import ReturnAssetScreen from "./src/screens/AssetDetails/ReturnAssetScreen";

function App(): React.JSX.Element {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="CompanyLogin">

        {/* Client Flow */}
        <Stack.Screen name="CompanyLogin" component={CompanyLoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="AddCompany" component={AddCompanyScreen} options={{ headerShown: false }} />

        {/* Admin Flow */}
        <Stack.Screen name="CompanyDashboard" component={CompanyDashboard} options={{ headerShown: false }} />
        <Stack.Screen name="CompanyUsersScreen" component={CompanyUsersScreen} options={{ headerShown: false }} />
        <Stack.Screen name="AddCompanyUser" component={AddCompanyUser} options={{ headerShown: false }} />

        {/* Supervisor Flow */}
        <Stack.Screen name="SupervisorDashboard" component={SupervisorDashboard} options={{ headerShown: false }} />

        {/* Operator Flow */}
        <Stack.Screen name="OperatorDashboard" component={OperatorDashboard} options={{ headerShown: false }} />

        {/* Super Admin Flow */}
        <Stack.Screen name="SuperAdminLogin" component={SuperAdminLoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="SuperAdminDashboard" component={SuperAdminDashboard} options={{ headerShown: false }} />

        {/* Asset Management */}
        <Stack.Screen name="TotalAssetDetails" component={TotalAssetDetails} options={{ headerShown: false }} />
        <Stack.Screen name="OfficeAssets" component={OfficeAssets} options={{ headerShown: false }} />
        <Stack.Screen name="FieldAssets" component={FieldAssets} options={{ headerShown: false }} />
        <Stack.Screen name="AddEditAsset" component={AddEditAsset} options={{ headerShown: false }} />
        <Stack.Screen name="AssignAsset" component={AssignAssetScreen} options={{ headerShown: false }} />
        <Stack.Screen name="AssetFullDetails" component={AssetFullDetails} options={{ headerShown: false }} />
        <Stack.Screen name="ReturnAsset" component={ReturnAssetScreen} options={{ headerShown: false }} />

      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;