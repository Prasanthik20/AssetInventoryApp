export type Asset = {
  id: string;
  serialNumber?: string;
  barcode?: string;
  assetName?: string;
  status?: string;
  modelNumber?: string;
  assignedTo?: string | null;
  assignedBy?: string | null;
  location?: string;
  price?: string;
  purchaseDate?: String| Date;
  warrantyExpiry?: String | Date;
  category?: string;
  expectedReturnDate?: string | null;
  assignmentId?: number | null;
  operatorId?: number | null;
  senderId?: number | null;
  // add other fields if needed
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
  ReturnAsset: undefined;
  AssignAsset: {
    supervisor_employeeId: string;
    supervisorName: string;
  };
};