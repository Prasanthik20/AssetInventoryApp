# SaaS Extended E2E Test Scenarios

These scenarios complement the existing `E2E_TEST_SCENARIOS.md` by focusing on the Multi-Tenant SaaS lifecycle.

## 1. SaaS Registration & Onboarding

| ID | Scenario | Steps | Expected Result |
| :--- | :--- | :--- | :--- |
| REG-01 | New Organization Signup | Fill Org Details + Admin Details + Submit | Tenant created, Trial sub active, Redirect to dashboard |
| REG-02 | OTP Verification | Enter invalid OTP | Error shown, registration blocked |
| REG-03 | Duplicate Email Check | Register with existing user email | Conflict error (409) shown |
| REG-04 | Mandatory Fields | Submit empty registration form | Inline validation errors for all required fields |

## 2. Multi-Tenant Isolation (Critical)

| ID | Scenario | Steps | Expected Result |
| :--- | :--- | :--- | :--- |
| ISO-01 | Cross-Tenant User Leak | Login Tenant A; attempt to fetch User ID from Tenant B | 403 Forbidden or 404 Not Found |
| ISO-02 | Cross-Tenant Asset Leak | Login Tenant A; attempt to view Asset ID from Tenant B | 403 Forbidden or 404 Not Found |
| ISO-03 | Shared Category Isolation | Tenant A creates category 'IT'; Tenant B logs in | Tenant B should NOT see Tenant A's 'IT' category |

## 3. Subscription & Billing Lifecycle

| ID | Scenario | Steps | Expected Result |
| :--- | :--- | :--- | :--- |
| SUB-01 | Trial Countdown | View dashboard on Day 1 | "29 days remaining" banner visible |
| SUB-02 | Asset Limit Enforcement | Try adding 26th asset on Trial plan | Error: "Plan limit reached. Upgrade to Starter" |
| SUB-03 | Trial Expiry | Simulate 31 days passed | App redirects to Upgrade screen; dashboard read-only |
| SUB-04 | Plan Upgrade | Initiate Stripe/Razorpay checkout | Subscription status updates to 'Active'; limits increased |

## 4. RBAC & Admin Permissions

| ID | Scenario | Steps | Expected Result |
| :--- | :--- | :--- | :--- |
| RBAC-01 | Tenant Admin vs Operator | Operator attempts to access Billing page | Permission denied / UI hidden |
| RBAC-02 | User Invitation | Admin invites new user via email | Invitation record created; email sent with link |
| RBAC-03 | Disable User | Admin disables an Operator account | Operator immediately logged out and blocked from login |

## 5. Security & Session

| ID | Scenario | Steps | Expected Result |
| :--- | :--- | :--- | :--- |
| SEC-01 | Token Expiry | Wait for JWT expiry (simulated) | Refresh token used automatically to get new session |
| SEC-02 | Invalid Refresh Token | Provide malformed refresh token | Complete logout enforced |
| SEC-03 | Rate Limiting | Spam login API 50 times/min | 429 Too Many Requests response |
