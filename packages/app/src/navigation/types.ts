// types.ts

import { Platform } from "react-native";


export type Asset = {
  id: number;                 // PRIMARY KEY
  assetId: number;          // Asset_Details.id      
  assetName: string;
  modelNumber?: string;
  serialNumber?: string;
  category?: string;
  controllerKey?: string | null;
  status?: string;
  barcode?: string;
  barcodeURL?: string | null;
  location?: string;
  price?: string;
  purchaseDate?: string;
  warrantyExpiry?: string;
  photoURL?: string | null;
  assignedTo?: string | null; // Add this
  assignedBy?: string | null; // Add this
  assignedDate?: string | null;
  projectName?: string | null;
  expectedReturnDate?: string | null;
  returnedDate?: string | null;
  assignmentId: number;
  isOverdue: boolean;
  senderId?: string | number;
  receiverId?: string | number;
  operatorId?: string | number;
  dynamicValues?: any[];
  usefulLife?: number;
  salvageValue?: string;
  depreciationMessage?: string | null;
  remainingValue?: number;
};

export type AssetAssignment = {
  assignmentId: number;            // PRIMARY KEY
  assetId: number;
  operatorEmployeeId: number;
  supervisorEmployeeId: number;
  expectedReturnDate?: string | null;
  assignedDate?: string;
  location?: string;
  notes?: string;
};


export type RootStackParamList = {
  CompanyLogin: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token: string };
  AddCompany: undefined;
  CompanyDashboard: {
    adminName: string;
    adminImage: string | null;
    roleName: string;
    employeeId: string;
  };

  CompanyUsersScreen: undefined;
  AddCompanyUser: undefined;
  CustomCategoryBuilder: undefined;

  SupervisorDashboard: {
    supervisorName: string;
    roleName: string;
    employeeId: string;
  };
  OperatorDashboard: {
    operatorName: string;
    roleName: string;
    employeeId: string;
    refresh?: boolean;
  };

  SuperAdminLogin: undefined;
  SuperAdminDashboard: undefined;

  TotalAssetDetails: {
    statusFilter?: string;
  } | undefined;
  OfficeAssets: undefined;
  FieldAssets:
  | {
    employeeId?: string;
    operatorName?: string;
  }
  | undefined;
  AddEditAsset: {
    editAsset?: Asset;
  } | undefined;

  AssetFullDetails: {
    asset: Asset;
    startInEditMode?: boolean;
  };
  ReturnAsset: {
    assets: Asset[];
    operatorEmployeeId?: string;
    supervisorEmployeeId?: string;
    returnByRole?: 'operator' | 'supervisor';
  };
  AssignAsset: {
    supervisor_employeeId: string;
    supervisorName: string;
    editAsset?: Asset;
  };
  Reports: {
    employeeId: string;
    roleName: string;
  };
  Billing: undefined;
};

const PROD_API_URL = 'https://asq-asset-api-ckdtfzgqdggjcedv.southindia-01.azurewebsites.net';
const WEB_DEV_API_URL =
  process.env.REACT_APP_API_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  PROD_API_URL;
const DEV_API_URL = Platform.OS === 'web' ? WEB_DEV_API_URL : 'http://localhost:3000';

// Keep all app screens on the same backend in development.
export const baseURL = 'http://localhost:3000'; //'https://asq-asset-api-ckdtfzgqdggjcedv.southindia-01.azurewebsites.net' //DEV_API_URL; //http://localhost:3000'; //PROD_API_URL
