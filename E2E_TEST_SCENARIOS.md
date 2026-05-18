# End-to-End Test Scenarios

## 1. Purpose
This document defines end-to-end (E2E) test scenarios for the Asset Inventory application across Admin, Supervisor, and Operator workflows on web, mobile web viewport, and Android APK.

## 2. In Scope
- Authentication and session handling
- Role-based dashboards and routing
- Asset assignment, receipt confirmation, return, and final confirmation lifecycle
- Notifications (delivery, action buttons, hide/read, status transitions)
- Reports and receipt-proof notes/photo viewing
- Responsive behavior (desktop and mobile)

## 3. Test Environments
- Web Desktop: Chrome latest, width >= 1366
- Web Mobile Viewport: Chrome DevTools iPhone 12/13 profile
- Android APK: physical device and emulator

## 4. Core Test Data
- Admin user: valid active account
- Supervisor user: valid active account
- Operator user: valid active account
- At least 3 assets in `Unassigned`
- At least 1 active assignment with due date in past (overdue case)
- At least 1 notification with return pending confirmation
- At least 1 `Asset_Assignments.notes` containing `[RECEIPT_PROOF] {...}` payload with `proofPhotos`

## 5. E2E Scenarios

### 5.1 Authentication & Session

| ID | Scenario | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| AUTH-01 | Login as Admin | Admin credentials available | Open app, login as Admin | Admin dashboard loads |
| AUTH-02 | Login as Supervisor | Supervisor credentials available | Open app, login as Supervisor | Supervisor dashboard loads |
| AUTH-03 | Login as Operator | Operator credentials available | Open app, login as Operator | Operator dashboard loads |
| AUTH-04 | Invalid login | None | Enter wrong password | Error shown, user remains on login |
| AUTH-05 | Logout from Admin | Admin logged in | Click logout, refresh browser | Redirect/login screen shown, dashboard not restored |
| AUTH-06 | Logout from Supervisor | Supervisor logged in | Click logout, refresh browser | Redirect/login screen shown |
| AUTH-07 | Logout from Operator | Operator logged in | Click logout, refresh browser | Redirect/login screen shown |
| AUTH-08 | Protected route after logout | User logged out | Directly open `/company-dashboard` URL | Redirect/login flow enforced |

### 5.2 Admin Dashboard & Notifications

| ID | Scenario | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| ADM-01 | Admin metrics load | Admin logged in | Open dashboard | Total/assigned/unassigned/overdue/maintenance metrics shown |
| ADM-02 | Activity feed grouping | Notifications exist | Open Global Activity Feed | Notifications grouped by sender with count badge |
| ADM-03 | Accordion expand/collapse | Group present | Toggle a sender group | Group expands/collapses correctly |
| ADM-04 | Internal scroll in expanded group | Group has many rows (>10) | Expand group and scroll inside | Inner scrollbar appears; page height does not balloon |
| ADM-05 | Confirm Return button visibility (pending only) | Pending return notification exists | Expand group | Confirm Return button shown only for pending status |
| ADM-06 | Confirm Return hidden after confirmation | Previously confirmed return exists | Open feed | Confirm Return button not shown for resolved/received |
| ADM-07 | Mark as seen | Notification row exists | Click Mark as seen | Row removed from list immediately |
| ADM-08 | Notification message normalization | Reply contains JSON | Open row message | Only clean parsed message shown (no raw JSON blob) |

### 5.3 Supervisor Dashboard

| ID | Scenario | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| SUP-01 | Supervisor metrics load | Supervisor logged in | Open dashboard | Supervisor metrics visible |
| SUP-02 | My Assigned Assets action | Supervisor has assigned assets | Click My Assigned Assets | Field assets screen filtered to supervisor assets |
| SUP-03 | Return Assigned Assets action | Supervisor has assigned assets | Click Return Assigned Assets | Return screen opens with supervisor assets |
| SUP-04 | Activity internal scroll | Many supervisor activity rows | Scroll Recent Activities | Inner scroll works, layout remains compact |
| SUP-05 | Confirm Receipt visibility | Assignment notification pending | Check activity row | Confirm Receipt visible only when valid |
| SUP-06 | Confirm Return visibility | Return pending for supervisor | Check activity row | Confirm Return visible when pending |
| SUP-07 | Confirm Return hidden after final confirm | Return already confirmed by Admin | Refresh dashboard | Confirm Return not shown |
| SUP-08 | Mark as Read | Activity row exists | Click Mark as Read | Row removed from activity list |

### 5.4 Operator Dashboard

| ID | Scenario | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| OPR-01 | Operator assets load | Operator logged in | Open dashboard | Assigned assets list shown |
| OPR-02 | Returned history section | Returned assets exist | Open dashboard | Returned History list shown |
| OPR-03 | Pending notifications internal scroll | >10 pending notifications | Open Notifications | Pending section has inner scrollbar |
| OPR-04 | History notifications internal scroll | >10 history notifications | Open Notifications | History section has inner scrollbar |
| OPR-05 | Confirm/Reply action visibility | Pending assignment notification | Check notification row | Confirm/Reply shown only when not replied/resolved/received |
| OPR-06 | Mark as Read | Notification row exists | Click Mark as Read | Row hidden from list |
| OPR-07 | Reply with proof images | Assignment notification pending | Reply and attach 4 images | Reply succeeds; status moves to replied/received flow |

### 5.5 Assignment & Receipt Lifecycle

| ID | Scenario | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| LIFE-01 | Assign asset Admin -> Supervisor | Unassigned asset exists | Assign from Admin | Assignment succeeds; status assigned |
| LIFE-02 | Assign asset Supervisor -> Operator | Unassigned asset exists | Assign from Supervisor | Notification sent to operator |
| LIFE-03 | Correct recipient mapping | Multiple users exist | Assign to specific employee ID | Notification delivered to intended receiver only |
| LIFE-04 | Receipt confirmation with proof | Assignment pending receipt | Operator/Supervisor confirms with >=4 photos | Status updates to received, proof stored |
| LIFE-05 | Receipt confirm validation | Assignment pending receipt | Submit with <4 photos | Validation error shown |
| LIFE-06 | Extend button rule | Notification already confirmed/received | Open activity row | Extend shown only where allowed |

### 5.6 Return Flow: Operator-Initiated

| ID | Scenario | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| RET-01 | Operator return submit | Operator has assigned assets | Return asset with media | Return request accepted |
| RET-02 | Return pending notifications fan-out | Operator return submitted | Check supervisor/admin notifications | Both receive pending confirmation notification |
| RET-03 | Interim ownership behavior | Return submitted, not confirmed | Check supervisor asset view | Asset remains with supervisor until confirm |
| RET-04 | Operator post-return view | Return submitted | Check operator dashboard/history | Asset appears as returned/unassigned history |
| RET-05 | Final confirm by supervisor/admin | Pending return exists | Confirm return action | Asset becomes unassigned |
| RET-06 | Stale confirm buttons removed | Return confirmed | Open supervisor/admin feeds | Pending confirm buttons disappear |

### 5.7 Return Flow: Supervisor-Initiated

| ID | Scenario | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| SRET-01 | Supervisor return submit | Supervisor has assigned assets | Return via supervisor flow | Pending admin confirmation notification created |
| SRET-02 | Admin confirm supervisor return | Pending supervisor return exists | Admin clicks Confirm Return | Asset becomes unassigned |
| SRET-03 | assignmentId=0 fallback | Notification has no assignmentId | Confirm return | API resolves by notification/asset context successfully |
| SRET-04 | Invalid recipient safety | Data has null/invalid receiver IDs | Confirm return | No FK crash (`receiverId=0` not inserted) |

### 5.8 Reports & Receipt-Proof Notes

| ID | Scenario | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| RPT-01 | Role-based report access: Admin | Admin logged in | Open Reports | Full report data visible |
| RPT-02 | Role-based report access: Supervisor | Supervisor logged in | Open Reports | Supervisor-scoped data only |
| RPT-03 | Notes plain text render | Assignment notes plain text | Open report row | Notes shown as plain text |
| RPT-04 | Notes JSON render | Assignment notes JSON object | Open report row | Human-readable normalized text shown |
| RPT-05 | Receipt-proof note parse | Note contains `[RECEIPT_PROOF]` JSON | Open report row | “Asset receipt confirmation” block shown |
| RPT-06 | View Photos modal open | Receipt-proof row exists | Click View Photos | Modal opens with message and proof count |
| RPT-07 | View Photos responsive (mobile) | Mobile viewport/APK | Open modal | Full-width stacked photo layout, usable controls |
| RPT-08 | View Photos responsive (desktop) | Desktop web | Open modal | Grid layout, bounded modal, scroll usable |

### 5.9 Responsive & UX Validation

| ID | Scenario | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| UI-01 | Admin mobile feed/actions alignment | Mobile viewport | Open Admin dashboard | Activity Feed and Quick Actions align correctly |
| UI-02 | Admin accordion large-content behavior | Large grouped notifications | Expand sender accordion | Internal scroll appears; reduced page expansion |
| UI-03 | Supervisor activity compactness | Many activity entries | Open supervisor dashboard | Section remains compact with inner scroll |
| UI-04 | Operator notifications compactness | Many pending/history entries | Open operator dashboard | Both lists use inner scroll and preserve layout |
| UI-05 | Button tap targets on mobile | Mobile viewport/APK | Tap key actions (Confirm/Mark as read/View Photos) | Controls are accessible and not clipped |

### 5.10 Negative & Data Integrity

| ID | Scenario | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| NEG-01 | Confirm return with invalid IDs | Invalid payload | Call confirm API | Graceful 4xx response, no crash |
| NEG-02 | Confirm return duplicate click | Pending return exists | Click confirm twice quickly | Idempotent/second call handled safely |
| NEG-03 | Hide notification id not found | Non-existent id | Mark as seen | Graceful error or no-op |
| NEG-04 | Large proof photo payload | High-res images | Submit receipt confirmation | API handles payload or gives clear error |
| NEG-05 | Network failure during actions | Simulated offline/error | Perform confirm/reply/hide | User gets actionable error message |

## 6. Regression Smoke Pack (Must Pass)
- AUTH-01, AUTH-05
- ADM-05, ADM-06, ADM-08
- SUP-03, SUP-06, SUP-07
- OPR-03, OPR-04, OPR-07
- LIFE-02, LIFE-04
- RET-02, RET-05, RET-06
- SRET-02, SRET-03, SRET-04
- RPT-05, RPT-07, RPT-08
- UI-01, UI-02, UI-03, UI-04

## 7. Execution Notes
- Run all critical flows on web desktop and one mobile target (web viewport or APK).
- Capture API request/response for lifecycle transitions (`assign`, `reply`, `return`, `confirm-return`).
- For media tests, include both small and large image payloads.
- For timezone-sensitive checks (overdue/returned date), verify with IST display expectations.


# APK Generation

cd /Volumes/Data/ASquare/Lavnya\ Group/asqassetledger

cd packages/app

npx expo prebuild

cd android

# Fix permissions if needed
ls -l ./gradlew && chmod +x ./gradlew && ls -l ./gradlew

# Build release APK
./gradlew assembleRelease