// types.ts

export type Asset = {
  assetId: number;          // Asset_Details.id      
  assetName: string;
  modelNumber?: string;
  serialNumber?: string;
  category?: string;
  status?: string;
  barcode?: string;
  location?: string;
  price?: string;
  purchaseDate?: string;
  warrantyExpiry?: string;
  assignedTo?: string | null; // Add this
  assignedBy?: string | null; // Add this
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

export type AssignedAsset = {
  assignmentId: number;    // ✅ FlatList key
  assetId: number;
  assetName: string;
  barcode?: string;
  location?: string;
  expectedReturnDate?: string | null;
  status: "Assigned" | "Overdue";
  isOverdue: boolean;
};
export type RootStackParamList = {
  CompanyLogin: undefined;
  AddCompany: undefined;
  CompanyDashboard: {
    adminName: string;
    adminImage: string | null;
    roleName: string;
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
  };

  SuperAdminLogin: undefined;
  SuperAdminDashboard: undefined;

  TotalAssetDetails: undefined;
  OfficeAssets: undefined;
  FieldAssets: {
    employeeId: string;
    operatorName: string; };
  AddEditAsset: undefined;

  AssetFullDetails: { asset: Asset };
  ReturnAsset: {
    assets: AssignedAsset[];
    operatorEmployeeId: string;
  };
  AssignAsset: {
    supervisor_employeeId: string;
    supervisorName: string;
  };
};