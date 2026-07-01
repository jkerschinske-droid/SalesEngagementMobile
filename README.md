# Mobile Work Queue for Sales Engagement

> **Note:** Built and tested on iOS only. Android has not been tested.

A custom Salesforce mobile experience that lets reps work through their Sales Engagement cadence queue from their phone — logging calls, sending emails, and advancing steps without touching a laptop.

Built as a set of LWCs backed by an Apex controller. Grouped by cadence and step type, with tap-to-call, one-tap email copy, inline dispositions, and auto-advance to the next item.

---

## Prerequisites

- Sales Engagement (High Velocity Sales) enabled in your org
- Reps with active cadence steps assigned
- API version 66.0+

---

## What's Included

| Metadata | Description |
|---|---|
| `MobileWorkQueueController` | Apex controller — queries `ActionCadenceStepTracker`, completes steps via Connect API, logs Tasks |
| `mobileWorkQueue` | Shell LWC — owns all state, renders list or step panel |
| `workQueueList` | List LWC — grouped by cadence and step type |
| `workQueueStepPanel` | Step panel LWC — contact info, script, disposition buttons |
| `MobileWorkQueue` flexipage | Lightning App Page definition |
| `GetSessionId` | Visualforce page used to retrieve session token for Connect API callout |

---

## Deploy

```bash
sf project deploy start --source-dir force-app/main/default
```

Or deploy just the Mobile Work Queue components:

```bash
sf project deploy start --source-dir force-app/main/default/classes/MobileWorkQueueController.cls --source-dir force-app/main/default/lwc/mobileWorkQueue --source-dir force-app/main/default/lwc/workQueueList --source-dir force-app/main/default/lwc/workQueueStepPanel --source-dir force-app/main/default/flexipages/MobileWorkQueue.flexipage-meta.xml --source-dir force-app/main/default/pages/GetSessionId.page
```

---

## Setup

1. After deploying, go to **Setup → Mobile App → Navigation**
2. Add the **Mobile Work Queue** Lightning App Page to the nav menu
3. Assign it to the relevant user profiles

Reps will see the Work Queue in their Salesforce Mobile App nav.

---

## Built By

Julius Kerschinske — Lead, Account SE at Salesforce  
Built because I saw a gap, and wanted to learn more about AI-Assisted Development.
