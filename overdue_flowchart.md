# Overdue Asset Extension Flow Chart

This flowchart describes the end-to-end process of overdue asset tracking, operator notification, extension requests, and the final approval flow.

---

## 1. Process Flowchart

```mermaid
graph TD
    %% Define Styles
    classDef roles fill:#f9f,stroke:#333,stroke-width:2px;
    classDef states fill:#bbf,stroke:#333,stroke-width:2px;
    classDef actions fill:#bfb,stroke:#333,stroke-width:1px;

    %% States & Roles
    Start([Asset Assigned]) --> ExpectCheck{Expected Return<br>Date Passed?}
    
    %% Overdue State
    ExpectCheck -- Yes --> OverdueState[Status: OVERDUE]:::states
    ExpectCheck -- No --> ActiveState[Status: ASSIGNED]:::states

    %% Notification Trigger
    OverdueState --> AssignerCheck{Who assigned asset?}
    
    AssignerCheck -->|Tenant Admin| TA_Notify[Click 'Notify' Button]:::actions
    AssignerCheck -->|Supervisor| SV_Notify[Click 'Notify' Button]:::actions
    AssignerCheck -->|Manager| MG_Notify[Click 'Notify' Button]:::actions

    %% Sending Notification
    TA_Notify --> SendAlert[Send Overdue Notification to Assignee]
    SV_Notify --> SendAlert
    MG_Notify --> SendAlert

    %% Operator / Assignee Action
    SendAlert --> AssigneeReceive[Assignee receives notification]
    AssigneeReceive --> ReplyAction[Click 'Reply' Button]:::actions
    ReplyAction --> ReplyMsg[Send Reply: 'I need extra days, please extend']

    %% Extender Actions
    ReplyMsg --> ReceiverCheck{Who notified the user?}
    
    ReceiverCheck -->|Tenant Admin| TA_Extend[Enter Extended Days]:::actions
    ReceiverCheck -->|Supervisor| SV_Extend[Enter Extended Days]:::actions
    ReceiverCheck -->|Manager| MG_Extend[Enter Extended Days]:::actions

    %% Approval Request
    TA_Extend --> TA_Direct[Direct Auto-Approval]
    SV_Extend --> AppRequest[Generate Extension Approval Request]
    MG_Extend --> AppRequest

    %% Tenant Admin Approval
    AppRequest --> TA_Review{Tenant Admin Reviews}
    
    TA_Review -- Approved --> ApproveUpdate[Update expected_return_date & status to ASSIGNED]:::states
    TA_Direct --> ApproveUpdate
    
    TA_Review -- Rejected --> RejectState[Keep status as OVERDUE]:::states

    %% End of Flow
    ApproveUpdate --> End([Flow Completed])
    RejectState --> End
```

---

## 2. Step-by-Step Description

| Step | Persona / System | Action | Description |
|---|---|---|---|
| **1** | **System** | Overdue Detection | Checks if `expected_return_date < NOW()`. If true, updates asset status to **OVERDUE**. |
| **2** | **Assigner** (Tenant Admin, Supervisor, Manager) | Notify User | Views the overdue asset on the dashboard and clicks **Notify**. An alert is sent to the assignee (Operator, Supervisor, or Manager). |
| **3** | **Assignee** (Operator, Supervisor, Manager) | Reply with Request | Receives the alert, clicks **Reply**, and enters: *"I need the asset for extra days, please extend."* |
| **4** | **Assigner** | Enter Extension | Receives the reply, enters the proposed number of extension days, and submits the request. |
| **5** | **Tenant Admin** | Review & Approve | Reviews the pending extension request. If approved, the system automatically updates the expected return date and resets the status back to **ASSIGNED**. |
