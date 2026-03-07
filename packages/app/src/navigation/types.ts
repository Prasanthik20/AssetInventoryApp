// types.ts

import { Platform } from "react-native";


export type Asset = {
  id: number;                 // PRIMARY KEY
  assetId: number;          // Asset_Details.id      
  assetName: string;
  modelNumber?: string;
  serialNumber?: string;
  category?: string;
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
  expectedReturnDate?: string | null;
  assignmentId: number;
  isOverdue: boolean;
  senderId?: string | number;   // Changed to allow both for flexibility
  receiverId?: string | number; // Changed to allow both for flexibility
  operatorId?: string | number;
  
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

  TotalAssetDetails: undefined;
  OfficeAssets: undefined;
  FieldAssets: {
    employeeId: string;
    operatorName: string; } | undefined;
  AddEditAsset: undefined;

  AssetFullDetails: { asset: Asset };
  ReturnAsset: {
    assets: Asset[];
    operatorEmployeeId: string;
  };
  AssignAsset: {
    supervisor_employeeId: string;
    supervisorName: string;
  };
};

// Azure production URL (currently has old CORS config)
export const baseURL = "https://asset-api-anbfahfmdjh6bzap.southindia-01.azurewebsites.net"

// Local development URL with updated CORS
// export const baseURL =  Platform.OS === 'web' 
//             ? 'http://localhost:3000' 
//             : 'http://localhost:3000';
