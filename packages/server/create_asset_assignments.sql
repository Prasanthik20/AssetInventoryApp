-- CreateTable
CREATE TABLE "Roles" (
    "roleId" BIGSERIAL NOT NULL,
    "roleName" TEXT NOT NULL,

    CONSTRAINT "Roles_pkey" PRIMARY KEY ("roleId")
);

-- CreateTable
CREATE TABLE "Users" (
    "userId" BIGSERIAL NOT NULL,
    "employeeId" BIGINT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "phoneNumebr" TEXT,
    "address" TEXT,
    "photoURL" TEXT,
    "roleId" BIGINT NOT NULL,

    CONSTRAINT "Users_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" BIGSERIAL NOT NULL,
    "categoryId" BIGINT NOT NULL,
    "category" TEXT,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category_Details" (
    "id" BIGSERIAL NOT NULL,
    "categoryId" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "asset_Id" TEXT,

    CONSTRAINT "Category_Details_pkey1" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Status" (
    "id" BIGSERIAL NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "Status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset_Details" (
    "id" BIGSERIAL NOT NULL,
    "categoryId" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "asset_Id" TEXT,
    "model_no" TEXT,
    "serial_no" TEXT,
    "status_id" BIGINT,
    "assigned_by" BIGINT,
    "warranty_expiry" DATE,
    "purchase_date" DATE,
    "price" TEXT,
    "location" TEXT,
    "assigned_to" BIGINT,

    CONSTRAINT "Asset_Details_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Users_employeeId_key" ON "Users"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Users_email_key" ON "Users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Category_categoryId_key" ON "Category"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_Details_asset_Id_key" ON "Category_Details"("asset_Id");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_Details_id_key" ON "Asset_Details"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_Details_assetId_key" ON "Asset_Details"("asset_Id");

-- AddForeignKey
ALTER TABLE "Users" ADD CONSTRAINT "Users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Roles"("roleId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Category_Details" ADD CONSTRAINT "Category_Details_asset_Id_fkey" FOREIGN KEY ("asset_Id") REFERENCES "Asset_Details"("asset_Id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Category_Details" ADD CONSTRAINT "Category_Details_categoryId_fkey1" FOREIGN KEY ("categoryId") REFERENCES "Category"("categoryId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Asset_Details" ADD CONSTRAINT "Asset_Details_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "Users"("employeeId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Asset_Details" ADD CONSTRAINT "Asset_Details_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "Users"("employeeId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Asset_Details" ADD CONSTRAINT "Asset_Details_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "Status"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Asset_Details" ADD CONSTRAINT "Category_Details_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("categoryId") ON DELETE NO ACTION ON UPDATE NO ACTION;



-- Create Asset_Assignments table
CREATE TABLE "Asset_Assignments" (
    "id" BIGSERIAL NOT NULL PRIMARY KEY,
    "assetId" BIGINT NOT NULL,
    "operator_employeeId" BIGINT NOT NULL,
    "supervisor_employeeId" BIGINT NOT NULL,
    "projectName" TEXT,
    "location" TEXT,
    "assigned_date" DATE,
    "expected_return_date" DATE,
    "notes" TEXT
);

-- Add foreign keys
ALTER TABLE "Asset_Assignments"
ADD CONSTRAINT "AssetAssignments_assetId_fkey" 
FOREIGN KEY ("assetId") REFERENCES "Asset_Details"("id") 
ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "Asset_Assignments"
ADD CONSTRAINT "AssetAssignments_operator_fkey" 
FOREIGN KEY ("operator_employeeId") REFERENCES "Users"("employeeId") 
ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "Asset_Assignments"
ADD CONSTRAINT "AssetAssignments_supervisor_fkey" 
FOREIGN KEY ("supervisor_employeeId") REFERENCES "Users"("employeeId") 
ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Add photoURL column to Asset_Details for storing asset photos
ALTER TABLE "Asset_Details" ADD COLUMN "photoURL" TEXT;