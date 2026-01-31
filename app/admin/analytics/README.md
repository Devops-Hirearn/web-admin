# Extended Dashboard - KPI Documentation

This dashboard provides real-time operational visibility for founders when they cannot access the database or server logs.

## Overview

The Extended Dashboard shows critical daily KPIs organized into 5 sections:
1. **Money Health (P0)** - Payment status and pending payment alerts
2. **Revenue Reality** - Daily revenue breakdown and net platform revenue
3. **Job Execution Health** - Job lifecycle and attendance reliability
4. **Settlement & Payout Health** - Settlement status and payout failures
5. **Trust & Intervention** - Incidents and manual interventions

---

## Section 1: Money Health (P0)

**Priority: P0 (Highest)** - This section shows payment health, which directly impacts cash flow.

### KPIs:

#### Payment Status Breakdown
- **Completed Today**: Number of payments successfully completed today
  - **Action**: None (green = good)
  
- **Pending (All)**: Total number of payments currently pending or processing
  - **Action**: 
    - **Red**: If > 0, investigate why payments are stuck
    - **Green**: All payments processed
  
- **Pending >15min**: Payments that have been pending for more than 15 minutes
  - **Action**: 
    - **Red**: If > 0, **IMMEDIATE ACTION REQUIRED** - Check payment gateway status, investigate stuck payments
    - **Yellow**: If 1-2, monitor closely
    - **Green**: All payments processing normally

- **Failed Today**: Payments that failed today
  - **Action**: 
    - **Red**: If > 0, investigate failure reasons, check payment gateway logs
    - **Green**: No failures

#### Oldest Pending Payment
- **Age in minutes**: How long the oldest pending payment has been waiting
  - **Action**:
    - **Red (>15 min)**: **IMMEDIATE ACTION REQUIRED** - Payment gateway may be down, check Razorpay dashboard
    - **Yellow (5-15 min)**: Monitor - May be normal processing delay
    - **Green (<5 min)**: Normal processing time

---

## Section 2: Revenue Reality

**Priority: P1** - Daily revenue metrics to track business health.

### KPIs:

#### Gross Job Value
- **What it is**: Total value of all jobs created today (before any fees)
- **Action**: Monitor trends - significant drops may indicate issues

#### Platform Fee
- **What it is**: 7% commission collected from jobs created today
- **Action**: Should be ~7% of gross job value

#### Gateway Fees
- **What it is**: Estimated Razorpay fees (~2% of completed payments)
- **Note**: This is an estimate since gateway fees aren't explicitly stored
- **Action**: Monitor - should be ~2% of payment volume

#### Net Platform Revenue
- **What it is**: Platform Fee - Gateway Fees (actual revenue after payment processing costs)
- **Action**:
  - **Red (< 0)**: **CRITICAL** - Gateway fees exceed platform fees (unusual, investigate)
  - **Green (> 0)**: Normal operation

---

## Section 3: Job Execution Health

**Priority: P1** - Tracks job lifecycle and worker attendance reliability.

### KPIs:

#### Jobs Lifecycle
- **Created Today**: New jobs posted today
- **In Progress**: Jobs currently ongoing
- **Completed Today**: Jobs completed today
- **Cancelled/Expired**: Jobs cancelled or expired today
- **Action**: Monitor completion rate - high cancellation may indicate issues

#### Attendance Reliability
- **Expected Check-ins**: Number of job days scheduled for today
- **Actual Check-ins**: Number of workers who actually checked in today
- **Action**:
  - **Red**: If actual < 80% of expected, investigate attendance issues
  - **Green**: Normal attendance rate

- **Auto Checkouts**: Workers automatically checked out by system (after scheduled end time)
- **Action**: Monitor - high auto checkouts may indicate workers not manually checking out

- **No-Shows**: Workers who didn't show up for scheduled work
- **Action**:
  - **Red**: If > 0, investigate worker reliability, may need to improve worker vetting
  - **Green**: All workers showed up

---

## Section 4: Settlement & Payout Health

**Priority: P0** - Directly impacts worker payments and trust.

### KPIs:

#### Jobs Eligible for Settlement
- **What it is**: Jobs that are completed, fully paid, and in DIGITAL mode (ready for worker wallet credit)
- **Action**: Monitor - should match completed jobs (with some delay)

#### Settled Today
- **What it is**: Number of jobs successfully settled (worker wallets credited) today
- **Action**: Should increase as jobs complete

#### Settlements Pending >24h
- **What it is**: Jobs eligible for settlement but not settled in last 24 hours
- **Action**:
  - **Red**: If > 0, **IMMEDIATE ACTION REQUIRED** - Workers are waiting for payment
    - Check settlement cron job status
    - Review SettlementAttempt logs for failures
    - Manually trigger settlement if needed
  - **Green**: All eligible jobs settled promptly

#### Payout Failures Today
- **What it is**: Razorpay payout transfers that failed today
- **Action**:
  - **Red**: If > 0, **IMMEDIATE ACTION REQUIRED** - Workers' money is stuck
    - Check Razorpay dashboard for payout status
    - Review payout failure reasons
    - Retry failed payouts or contact Razorpay support
  - **Green**: All payouts successful

---

## Section 5: Trust & Intervention

**Priority: P1** - Tracks incidents requiring manual intervention.

### KPIs:

#### Payment Issues Today
- **What it is**: Failed payments + payments pending >15 minutes
- **Action**:
  - **Red**: If > 0, investigate payment gateway, check for system issues
  - **Green**: No payment issues

#### Settlement Issues Today
- **What it is**: Failed settlement attempts today
- **Action**:
  - **Red**: If > 0, check settlement logs, investigate why settlements are failing
  - **Green**: All settlements successful

#### Manual Interventions Today
- **What it is**: Number of admin actions taken today (KYC approvals, wallet freezes, etc.)
- **Action**: Monitor - high numbers may indicate systemic issues requiring automation

#### Unresolved Incidents Count
- **What it is**: Total failed payments + failed settlements (not yet resolved)
- **Action**:
  - **Red**: If > 0, prioritize resolving these incidents
  - **Green**: All incidents resolved

---

## Color Coding

- **Red**: Action required immediately
- **Yellow**: Watch closely, may need intervention
- **Green**: Normal operation, no action needed

## Auto-Refresh

The dashboard automatically refreshes every 5 minutes. You can also manually refresh using the "Refresh" button.

## When to Act

### Immediate Action (Red Alerts):
1. **Pending payments >15 min**: Check payment gateway
2. **Settlements pending >24h**: Workers waiting for payment
3. **Payout failures**: Workers' money stuck
4. **Net revenue < 0**: Critical financial issue

### Monitor (Yellow):
1. **High no-shows**: May need better worker vetting
2. **Low attendance rate**: Investigate worker reliability
3. **High manual interventions**: Consider automation

### Normal (Green):
- All metrics in green = system operating normally
- No action needed

---

## Technical Notes

- All data is read-only (no writes to production tables)
- Uses MongoDB aggregation pipelines for fast queries
- Gateway fees are estimated (2% of payment volume) since not explicitly stored
- All timestamps are in UTC
- Currency amounts are in paise (divide by 100 for rupees)
