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

1. Reads events from Google Calendar.
2. Filters unwanted events.
3. Parses interview information.
4. Rebuilds the Google Sheet.
5. Preserves manual fields using the Event ID.

The sheet always reflects the selected date range exactly.

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
