---
title: 'Prod backend task resilience -- root-cause + elevated fix (EvoTacticsBackend)'
date: 2026-06-20
type: runbook
doc_status: active
doc_owner: master-dd
workstream: ops-qa
last_verified: '2026-06-20'
source_of_truth: false
language: en
review_cycle_days: 30
tags: [evo-tactics, ops, prod, scheduled-task, resilience]
---

# Prod backend task resilience (EvoTacticsBackend)

## Symptom

Prod (`evo-tactics.com`, Lenovo / CODEMASTERDD: API 3334 + WS 3341, same node
process) fell **3 times** in the 2026-06-19 session and had to be restored by hand
(`Start-ScheduledTask -TaskName EvoTacticsBackend`). See
[[lesson_prod_host_ports_3334_3341]].

## Root cause (verify-first, 2026-06-20)

The `EvoTacticsBackend` scheduled task runs `C:\Users\edusc\start-evo-backend.cmd`,
which **blocks** on `npm run start:api` (foreground). So the task stays "Running"
while the backend runs, and the configured `RestartCount=3` restarts it on crash --
**but only 3 times**. After 3 crashes (the 3 prod-down incidents = kill-by-port
churn during test-backend work) the task **exhausts its restarts and goes "Ready"**
-> prod stays down until a manual `Start-ScheduledTask`. Observed: task `State=Ready`,
`LastTaskResult=1`, while prod was up only via a manually-started (orphaned) process.

Two gaps:

1. `RestartCount=3` is too low for a long-running service -- it gives up after 3
   crashes.
2. The only trigger is `LogonTrigger` (no `AtStartup`) -> **no reboot-survival**
   without an interactive logon.

## Fix (designed; requires admin elevation to apply)

Additive, low-risk -- does NOT touch the running backend or the `.cmd`, keeps the
blocking-supervision model + all other settings:

1. Add an **AtStartup** trigger (reboot-survival).
2. Bump **RestartCount 3 -> 999** (never exhausts under normal crash rates).

> A non-elevated PowerShell session gets `Accesso negato` on `Set-ScheduledTask`
> (observed 2026-06-20) -- so this is **owner-gated: run elevated (Administrator)**.

### How to apply

```powershell
# elevated (Administrator) PowerShell
powershell -ExecutionPolicy Bypass -File C:\Users\edusc\fix-evo-backend-task-resilience.ps1
```

The script (`C:\Users\edusc\fix-evo-backend-task-resilience.ps1`) applies the two
changes and prints a verification line (expects `RestartCount=999` + a
`BootTrigger`). Backup of the current task definition:
`C:\Users\edusc\evo-backend-task-backup-2026-06-20.xml`.

### Transition the current process (optional, one-time ~5s prod blip)

After the config is applied the CURRENT prod process is still the orphan started by
hand (unsupervised). To put it under the now-resilient task:

```powershell
Start-ScheduledTask -TaskName EvoTacticsBackend   # start-evo-backend.cmd kills node on 3334/3341 then relaunches
Start-Sleep 6
(Invoke-WebRequest http://127.0.0.1:3334/api/health -UseBasicParsing).StatusCode   # expect 200
```

Skip this to avoid the blip; the fix then takes effect on the next natural
(re)start / reboot.

### Revert

```powershell
Register-ScheduledTask -Xml (Get-Content C:\Users\edusc\evo-backend-task-backup-2026-06-20.xml -Raw) -TaskName EvoTacticsBackend -Force
```

## Not covered here (follow-up options for master-dd)

- A true **watchdog** (lightweight task on a 2-min repetition that health-checks
  3334 + relaunches if down, with a DETACHED launch) would recover from ANY death
  within 2 min regardless of `RestartCount` -- but it needs a `.cmd` launch-model
  rewrite (detach instead of block) + an idempotent health-check guard. Deferred as
  a bigger change; the RestartCount-999 + AtStartup fix covers the observed failure
  modes with no rewrite.
- **Postgres auto-start** (separate prod dependency) -- the portable PG is started
  by hand (`pg_ctl -D C:/dev/tools/pgdata-game`); a parallel ops residue, not in
  this runbook.
