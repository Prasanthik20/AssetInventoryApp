import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Dynamically navigates a user to their corresponding dashboard cockpit 
 * based on role permissions (or role name sub-strings as a fallback).
 */
export const navigateToDashboard = async (navigation: any) => {
  try {
    const storedUser = await AsyncStorage.getItem('user');
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      
      const role = String(parsed.roleName || parsed.role || '').toLowerCase();
      
      // 1. Check Super Admin
      if (role.includes('superadmin') || role.includes('super admin')) {
        navigation.navigate('SuperAdminDashboard');
        return;
      }
      
      // 2. Inspect permissions (dynamic RBAC)
      const permissions = Array.isArray(parsed.permissions) ? parsed.permissions : [];
      if (permissions.length > 0) {
        const isOperator = permissions.includes('INITIATE_RETURN') || permissions.includes('VIEW_DASHBOARD');
        const isSupervisor = permissions.includes('ASSIGN_ASSETS') || permissions.includes('CONFIRM_RETURN');
        const isAdmin = permissions.includes('MANAGE_USERS') || permissions.includes('MANAGE_WORKFLOWS');

        if (isAdmin) {
          navigation.navigate('CompanyDashboard');
        } else if (isSupervisor) {
          navigation.navigate('SupervisorDashboard');
        } else if (isOperator) {
          navigation.navigate('OperatorDashboard');
        } else {
          navigation.navigate('OperatorDashboard');
        }
        return;
      }
      
      // 3. Fallback to hardcoded string matches (backward compatibility)
      if (role.includes('supervisor') || role.includes('manager')) {
        navigation.navigate('SupervisorDashboard');
      } else if (role.includes('operator') || role.includes('employee') || role.includes('staff')) {
        navigation.navigate('OperatorDashboard');
      } else {
        navigation.navigate('CompanyDashboard');
      }
    } else {
      navigation.navigate('Login');
    }
  } catch (error) {
    console.error("Navigation error inside navigateToDashboard utility:", error);
    navigation.navigate('Login');
  }
};
