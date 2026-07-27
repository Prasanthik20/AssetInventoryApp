-- 1. Insert Standard Permissions
INSERT INTO "Permissions" ("code", "name") VALUES
('VIEW_DASHBOARD', 'View Dashboard'),
('ASSIGN_ASSETS', 'Assign Assets'),
('INITIATE_RETURN', 'Initiate Return'),
('CONFIRM_RETURN', 'Confirm Return / Approvals'),
('MANAGE_WORKFLOWS', 'Configure Approval Workflows'),
('MANAGE_USERS', 'Manage Users & Roles'),
('VIEW_REPORTS', 'View Reports')
ON CONFLICT ("code") DO NOTHING;

-- 2. Bind Permissions to Default System Roles
-- Admin/Tenant Admin Role Permissions
INSERT INTO "Role_Permissions" ("roleId", "permissionId")
SELECT r."roleId", p.id
FROM "Roles" r
CROSS JOIN "Permissions" p
WHERE r."roleName" IN ('Tenant Admin', 'Super Admin')
ON CONFLICT DO NOTHING;

-- Supervisor Role Permissions
INSERT INTO "Role_Permissions" ("roleId", "permissionId")
SELECT r."roleId", p.id
FROM "Roles" r
CROSS JOIN "Permissions" p
WHERE r."roleName" = 'Supervisor'
  AND p.code IN ('VIEW_DASHBOARD', 'ASSIGN_ASSETS', 'INITIATE_RETURN', 'CONFIRM_RETURN', 'VIEW_REPORTS')
ON CONFLICT DO NOTHING;

-- Operator Role Permissions
INSERT INTO "Role_Permissions" ("roleId", "permissionId")
SELECT r."roleId", p.id
FROM "Roles" r
CROSS JOIN "Permissions" p
WHERE r."roleName" = 'Operator'
  AND p.code IN ('VIEW_DASHBOARD', 'INITIATE_RETURN')
ON CONFLICT DO NOTHING;

-- 3. Set up default approval workflows for all existing tenants
DO $$
DECLARE
    t_record RECORD;
    workflow_id BIGINT;
    supervisor_role_id BIGINT;
    admin_role_id BIGINT;
BEGIN
    -- Find system roles
    SELECT "roleId" INTO admin_role_id FROM "Roles" WHERE "roleName" = 'Tenant Admin' LIMIT 1;
    SELECT "roleId" INTO supervisor_role_id FROM "Roles" WHERE "roleName" = 'Supervisor' LIMIT 1;

    FOR t_record IN SELECT id FROM "Tenants" LOOP
        -- A. Default RETURN Workflow
        IF NOT EXISTS (SELECT 1 FROM "Approval_Workflows" WHERE "tenantId" = t_record.id AND "actionType" = 'RETURN') THEN
            INSERT INTO "Approval_Workflows" ("tenantId", "name", "actionType", "isActive")
            VALUES (t_record.id, 'Default Return Workflow', 'RETURN', true)
            RETURNING id INTO workflow_id;

            -- Step 1: Supervisor must approve the return
            IF supervisor_role_id IS NOT NULL THEN
                INSERT INTO "Approval_Workflow_Steps" ("workflowId", "stepSequence", "approverRoleId")
                VALUES (workflow_id, 1, supervisor_role_id);
            END IF;

            -- Step 2: Admin must confirm final return
            IF admin_role_id IS NOT NULL THEN
                INSERT INTO "Approval_Workflow_Steps" ("workflowId", "stepSequence", "approverRoleId")
                VALUES (workflow_id, CASE WHEN supervisor_role_id IS NOT NULL THEN 2 ELSE 1 END, admin_role_id);
            END IF;
        END IF;

        -- B. Default CHECKOUT Workflow (Direct Assign / 1-step auto-approve)
        IF NOT EXISTS (SELECT 1 FROM "Approval_Workflows" WHERE "tenantId" = t_record.id AND "actionType" = 'CHECKOUT') THEN
            INSERT INTO "Approval_Workflows" ("tenantId", "name", "actionType", "isActive")
            VALUES (t_record.id, 'Direct Assignment Workflow', 'CHECKOUT', true)
            RETURNING id INTO workflow_id;
        END IF;
    END LOOP;
END $$;
