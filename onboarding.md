# Onboarding Guide

This guide explains how to set up your own copy of the Lead Tracker.

The entire setup usually takes around 5–10 minutes.

---

# Step 1 — Create a Google Sheet

Go to the project repository:

**https://github.com/UsmanAdnan234/calendar-sheets-appscript-etl**

If you don't have access, ask the project maintainer to grant you access.

Create a new Google Sheet.

Give it any name you like.

Example:

```
Lead Tracker
```

---

# Step 2 — Open Apps Script

Inside the sheet:

Extensions

→ Apps Script

Delete any sample code.

---

# Step 3 — Copy the Script

Copy the entire contents of `main.gs`.

Paste it into the Apps Script editor.

Save the project.

---

# Step 4 — Enable Google Calendar API

Inside Apps Script:

Services (+)

Add Service

Select:

```
Google Calendar API
```

Leave the identifier as:

```
Calendar
```

Click Add.

---

# Step 5 — Configure the Date Range

Find the CONFIG section.

Update:

```javascript
MANUAL_SYNC_START_DATE: '2026-07-13',
MANUAL_SYNC_END_DATE: '2026-07-20'
```

Example:

```javascript
MANUAL_SYNC_START_DATE: '2026-08-01',
MANUAL_SYNC_END_DATE: '2026-08-07'
```

---

# Step 6 — Run the Script

From the Apps Script toolbar:

Choose function

```
runDateRangeSync
```

Click

▶ Run

---

# Step 7 — Authorize Access

The first run requires Google authorization.

You will see:

Review Permissions

Choose your Google account.

Click:

Advanced

Go to project (unsafe)

Allow

The script needs permission to:

- Read your Google Calendar
- Edit your Google Sheet

This only happens once.

---

# Step 8 — View the Sheet

A sheet named:

```
Leads
```

will be created automatically.

It will contain all interview events in the configured date range.

---

# Running Again

Whenever you want to refresh the data:

1. Update the start/end dates (if needed)
2. Run:

```
runDateRangeSync()
```

That's it.

---

# Manual Columns

The following columns are **never overwritten**:

- Verified Lead
- Remarks
- Taken

You can safely edit these.

Even after running another sync, these values will remain for matching events.

---

# Hidden Event ID

The Event ID column is hidden automatically.

It is used internally to match events and preserve manual edits.

Do not modify or delete it.

---

# Cancelled Events

If a calendar event is cancelled:

- It is automatically removed from the sheet on the next sync.

---

# Excluded Calendar Events

The script ignores events such as:

- Meetings
- Busy
- Focus Time
- Holiday
- Vacation
- Out of Office
- Assessments

Only interview-related events are included.

---

# Troubleshooting

## No events appear

Check:

- The selected date range contains events.
- You're using the correct Google Calendar.
- The Calendar API is enabled.

---

## Permission Error

Run the script again and complete Google's authorization process.

---

## Calendar API Error

Verify that:

Services

→ Google Calendar API

has been added to the Apps Script project.

---

## Wrong Interview Information

The parser uses configurable rules.

If your team's event naming changes, update:

- `DISCIPLINE_RULES`
- `ROUND_RULES`
- `INTERVIEW_TYPE_RULES`

inside the `CONFIG` section.

---

# Updating the Script

When a new version is released:

1. Replace the contents of `main.gs`.
2. Save.
3. Run `runDateRangeSync()` again.

No additional setup is required.

---

