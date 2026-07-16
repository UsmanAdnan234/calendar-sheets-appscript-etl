# Google Calendar Lead Tracker

A Google Apps Script that converts Google Calendar interview events into a structured Google Sheet.

---

## Features

- Pulls interview events from Google Calendar
- Generates a clean lead tracker in Google Sheets
- Detects:
  - Lead Name
  - BD Owner
  - Interview Round
  - Discipline
  - Interview Platform
- Ignores non-interview calendar events
- Preserves manual columns after every sync:
  - Verified Lead
  - Remarks
  - Taken
- Stores manual fields in a hidden data store sheet
- Removes cancelled events automatically
- Supports manual date-range syncing

---

## Generated Columns

| Column | Description |
|---------|-------------|
| Date | Interview date |
| Time | Interview time |
| Lead Name | Calendar event title |
| BD | Business Development owner |
| Round | Interview round |
| Discipline | Parsed from event title |
| Interview Type | Teams, Zoom, Google Meet, etc. |
| Verified Lead | Manual checkbox |
| Remarks | Manual notes |
| Taken | Manual checkbox |
| Event Id | Internal identifier (hidden) |

---

## How It Works

The script:

1. Reads interview events from Google Calendar.
2. Filters unwanted calendar events.
3. Parses interview information.
4. Rebuilds the Lead Tracker sheet.
5. Restores manual fields (Verified Lead, Remarks, Taken) from a hidden data store using each event's unique Event ID.
6. Updates the hidden data store with the latest manual values for future syncs.

This approach allows the sheet to be rebuilt without losing manually entered information.

---

## Manual Data Preservation

The project automatically creates a hidden sheet named: ManualDataStore


This sheet stores the manual fields for every interview event:

| Column |
|--------|
| Event Id |
| Verified Lead |
| Remarks |
| Taken |

> **Note:** The Event Id column is used internally to match calendar events with stored manual data. It should not be edited or removed.

During every sync:

1. Existing manual values are read from both the Lead Tracker sheet and the hidden data store.
2. The Lead Tracker sheet is rebuilt from the latest calendar events.
3. Matching manual values are restored using the Event ID.
4. The hidden data store is updated with the latest manual values.

Because the Event ID remains constant for the same Google Calendar event, manual edits are preserved even after the sheet is completely regenerated.

---

## Hidden ManualDataStore Sheet

The script automatically creates a hidden sheet called `ManualDataStore` if it does not already exist.

This sheet is used internally to preserve user-entered data between syncs and should not be deleted or modified manually.

If the sheet is accidentally removed, it will be recreated automatically on the next sync, but previously stored manual values will be lost.

---

## Configuration

The only section most users need to edit is:

```javascript
MANUAL_SYNC_START_DATE: '2026-07-13',
MANUAL_SYNC_END_DATE: '2026-07-20'
```

Change these dates before running the sync.

---

## Excluded Events

Events containing keywords like:

- Meeting
- Busy
- Holiday
- Focus Time
- Vacation
- Assessment
- Out of Office

will not appear in the sheet.

---

## Supported Interview Platforms

Automatically detects:

- Microsoft Teams
- Google Meet
- Zoom
- Dial Pad
- Alphaphone

---

## Supported Discipline Detection

Examples include:

- Data Engineer
- Data Engineering
- Data Architect
- DevOps
- DevSecOps
- SRE
- Power BI
- Dynamics
- Security Engineer
- Network Engineer

Additional rules can easily be added in `DISCIPLINE_RULES`.

---

## Interview Round Detection

Examples:

- Round 1
- 1st Call
- Final

Unknown rounds are marked as:

```
Unspecified
```

---

## Entry Point

The only function that should be run manually is:

```javascript
runDateRangeSync()
```

---

## Project Structure

```
main.gs
README.md
ONBOARDING.md

Google Sheets
├── Lead Tracker
└── ManualDataStore (hidden)
```

---

## Requirements

- Google Account
- Google Sheets
- Google Calendar
- Google Apps Script
- Google Calendar Advanced Service enabled

---

## License

Internal company tool.
