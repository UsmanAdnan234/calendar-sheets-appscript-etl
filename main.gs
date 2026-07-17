/**
 * ...
 * TO USE:
 *   1. Extensions -> Apps Script on your own Sheet, paste this whole file
 *      in as Code.gs (replacing whatever's there).
 *   2. Services (+ icon) -> add "Google Calendar API", keep identifier
 *      as "Calendar".
 *   3. Edit CONFIG.MANUAL_SYNC_START_DATE / MANUAL_SYNC_END_DATE below.
 *   4. Function dropdown -> select "runDateRangeSync" -> Run.
 *
 * The very first time you run it, Google will show an authorization
 * prompt (Review permissions -> Advanced -> Go to [project] (unsafe) ->
 * approve Calendar + Sheets access). After that, running it again just
 * works — same one function, every time.
 *
 * Each run REPLACES the sheet's contents with only what's in that date
 * range (Verified Lead / Remarks / Taken are preserved by Event Id for
 * anything still in range). There's no weekly automation and no
 * incremental sync token — every run is a fresh, explicit pull.
 */

// =============================================================
// CONFIG — this is the only section most people need to touch.
// =============================================================
var CONFIG = {
  SHEET_NAME: 'Leads',

  COLUMNS: [
    'Date', 'Time', 'Lead Name', 'BD', 'Round', 'Discipline',
    'Interview type', 'Verified Lead', 'Remarks', 'Taken',
    'Event Id' // hidden — used internally to identify events, don't edit
  ],
  MANUAL_COLUMNS: ['Verified Lead', 'Remarks', 'Taken'], // never overwritten
  CHECKBOX_COLUMNS: ['Verified Lead', 'Taken'],

  DISPLAY_TIMEZONE: 'Asia/Karachi', // UTC+5

  // First match wins — more specific phrases before generic catch-alls.
  DISCIPLINE_RULES: [
    { label: 'Data Architect', pattern: /data\s*architect/i },
    { label: 'Data Engineering', pattern: /data\s*engineering/i },
    { label: 'Data Engineer', pattern: /data\s*engineer/i },
    { label: 'Data Engineering', pattern: /\bde\b/i },  
    { label: 'Site Reliability', pattern: /site\s*reliability/i },
    { label: 'SRE', pattern: /\bsre\b/i },
    { label: 'Devsecops', pattern: /devsecops/i },
    { label: 'Devops', pattern: /devops/i },
    { label: 'Security Engineer', pattern: /security\s*engineer/i },
    { label: 'Network Engineer', pattern: /network\s*engineer/i },
    { label: 'Power BI', pattern: /power\s*bi|powerbi/i },
    { label: 'Dynamics', pattern: /dynamics/i },
    { label: 'Architect', pattern: /\barchitect\b/i },
    { label: 'Data', pattern: /data/i },
    { label: 'Security', pattern: /security/i }
  ],

  INTERVIEW_TYPE_RULES: [
    { label: 'Teams', pattern: /microsoft\s*teams|teams\.microsoft\.com/i },
    { label: 'Dial Pad', pattern: /dial\s*pad/i },
    { label: 'Alphaphone', pattern: /alpha\s*phone/i },
    { label: 'Zoom', pattern: /zoom/i },
    { label: 'Google Meet', pattern: /meet\.google\.com|google\s*meet/i }
  ],
  INTERVIEW_TYPE_FALLBACK: 'Dial Pad / Alphaphone',

  // Whole-word match, not substring — "Business Sync" won't match "busy".
  EXCLUSION_KEYWORDS: [
    'assisting', 'assessments', 'assessment', 'curinos', 'uhy',
    'meeting', 'meetings', 'busy', 'focus time', 'block', 'hold',
    'ooo', 'out of office', 'vacation', 'holiday', 'blocked', 'daily',
    'stand-up', 'standup', 'stand up', 'sprint', 'scrum'
  ],

  ROUND_RULES: [
  { pattern: /\b(\d{1,2})(?:st|nd|rd|th)\s*(?:call|interview|round|screening)\b/i, extract: function (m) { return m[1]; } },
  { pattern: /\bround\s*(\d{1,2})\b/i, extract: function (m) { return m[1]; } },
  { pattern: /\bfinal\b/i, extract: function () { return 'Final'; } },
  { pattern: /\b(\d{1,2})(?:st|nd|rd|th)\b/i, extract: function (m) { return m[1]; } }
  ],

  UNSPECIFIED: 'Unspecified',
  CALENDAR_ID: 'primary',

  // <<< EDIT THESE TWO LINES to choose your date range >>>
  MANUAL_SYNC_START_DATE: '2026-07-13',
  MANUAL_SYNC_END_DATE: '2026-07-20'
};

// =============================================================
// CALENDAR — fetching and normalizing raw events
// =============================================================
function getEventsInManualRange() {
  var events = [];
  var pageToken = null;
  do {
    var params = {
      timeMin: new Date(CONFIG.MANUAL_SYNC_START_DATE).toISOString(),
      timeMax: new Date(CONFIG.MANUAL_SYNC_END_DATE).toISOString(),
      singleEvents: true,
      showDeleted: true, // so cancelled events in range are still reported
      orderBy: 'startTime',
      maxResults: 250,
      pageToken: pageToken || undefined
    };
    var response = Calendar.Events.list(CONFIG.CALENDAR_ID, params);
    events = events.concat(response.items || []);
    pageToken = response.nextPageToken || null;
  } while (pageToken);
  return events;
}

function buildDescriptionHaystack(rawEvent) {
  return rawEvent.description || '';
}

function normalizeEvent(rawEvent) {
  if (rawEvent.status === 'cancelled') {
    return { id: rawEvent.id, cancelled: true };
  }
  if (!rawEvent.start || !rawEvent.start.dateTime) {
    return null; // all-day events are out of scope
  }
  return {
    id: rawEvent.id,
    title: rawEvent.summary || '',
    start: new Date(rawEvent.start.dateTime),
    organizerEmail: (rawEvent.organizer && rawEvent.organizer.email) || '',
    descriptionHaystack: buildDescriptionHaystack(rawEvent),
    cancelled: false
  };
}

// =============================================================
// PARSING — pure logic, turns one normalized event into a row
// =============================================================
function extractRound(title) {
  var rules = CONFIG.ROUND_RULES;
  for (var i = 0; i < rules.length; i++) {
    var match = title.match(rules[i].pattern);
    if (match) return rules[i].extract(match);
  }
  return CONFIG.UNSPECIFIED;
}

function matchDiscipline(title) {
  var rules = CONFIG.DISCIPLINE_RULES;
  for (var i = 0; i < rules.length; i++) {
    if (rules[i].pattern.test(title)) return rules[i].label;
  }
  return CONFIG.UNSPECIFIED;
}

function matchInterviewType(haystack) {
  var rules = CONFIG.INTERVIEW_TYPE_RULES;
  var text = haystack || '';
  for (var i = 0; i < rules.length; i++) {
    if (rules[i].pattern.test(text)) return rules[i].label;
  }
  return CONFIG.INTERVIEW_TYPE_FALLBACK;
}

function organizerToBDName(email) {
  if (!email || email.indexOf('@') === -1) {
    return email || CONFIG.UNSPECIFIED;
  }
  var localPart = email.split('@')[0];
  var parts = localPart.split(/[._-]+/).filter(Boolean);
  if (parts.length === 0) return email;
  return parts
    .map(function (p) { return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase(); })
    .join(' ');
}

function formatDateTime(date) {
  return {
    date: Utilities.formatDate(date, CONFIG.DISPLAY_TIMEZONE, 'yyyy-MM-dd'),
    time: Utilities.formatDate(date, CONFIG.DISPLAY_TIMEZONE, 'HH:mm')
  };
}

function escapeForRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isExcluded(title) {
  var escaped = CONFIG.EXCLUSION_KEYWORDS.map(escapeForRegex);
  var pattern = new RegExp('\\b(?:' + escaped.join('|') + ')\\b', 'i');
  return pattern.test(title || '');
}

function buildLeadRecord(event) {
  var dt = formatDateTime(event.start);
  return {
    date: dt.date,
    time: dt.time,
    leadName: event.title,
    bd: organizerToBDName(event.organizerEmail),
    round: extractRound(event.title),
    discipline: matchDiscipline(event.title),
    interviewType: matchInterviewType(event.descriptionHaystack)
  };
}

// =============================================================
// SHEET — the only section that touches SpreadsheetApp
// =============================================================
function getOrCreateSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(CONFIG.COLUMNS);
    sheet.hideColumns(CONFIG.COLUMNS.indexOf('Event Id') + 1);
  }
  return sheet;
}

function getColumnIndexMap(sheet) {
  var header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var map = {};
  header.forEach(function (name, i) { map[name] = i + 1; });
  return map;
}

function writeDerivedColumns(sheet, rowNumber, colMap, record, eventId) {
  sheet.getRange(rowNumber, colMap['Date']).setValue(record.date);
  sheet.getRange(rowNumber, colMap['Time']).setValue(record.time);
  sheet.getRange(rowNumber, colMap['Lead Name']).setValue(record.leadName);
  sheet.getRange(rowNumber, colMap['BD']).setValue(record.bd);
  sheet.getRange(rowNumber, colMap['Round']).setValue(record.round);
  sheet.getRange(rowNumber, colMap['Discipline']).setValue(record.discipline);
  sheet.getRange(rowNumber, colMap['Interview type']).setValue(record.interviewType);
  sheet.getRange(rowNumber, colMap['Event Id']).setValue(eventId);
}

function appendBlankRow(sheet, colMap) {
  var newRowNumber = sheet.getLastRow() + 1;
  sheet.getRange(newRowNumber, 1, 1, sheet.getLastColumn()).setValue('');
  CONFIG.CHECKBOX_COLUMNS.forEach(function (columnName) {
    sheet.getRange(newRowNumber, colMap[columnName]).insertCheckboxes();
  });
  return newRowNumber;
}

/**
 * Wipes every existing row and rebuilds from only the given events, so
 * the sheet reflects exactly the current date range. Verified Lead /
 * Remarks / Taken are preserved by Event Id for anything still present.
 * Cancelled events are simply not re-added. Excluded events are dropped.
 */
function getOrCreateManualDataStore() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var store = ss.getSheetByName('ManualDataStore');
  if (!store) {
    store = ss.insertSheet('ManualDataStore');
    store.appendRow(['Event Id', 'Verified Lead', 'Remarks', 'Taken']);
    store.hideSheet();
  }
  return store;
}

function loadManualDataStore(store) {
  var lastRow = store.getLastRow();
  var map = {};
  if (lastRow > 1) {
    var values = store.getRange(2, 1, lastRow - 1, 4).getValues();
    values.forEach(function (row) {
      if (row[0]) {
        map[row[0]] = { verifiedLead: row[1], remarks: row[2], taken: row[3] };
      }
    });
  }
  return map;
}

function saveManualDataStore(store, map) {
  var lastRow = store.getLastRow();
  if (lastRow > 1) {
    store.deleteRows(2, lastRow - 1);
  }
  Object.keys(map).forEach(function (eventId) {
    var v = map[eventId];
    store.appendRow([eventId, v.verifiedLead, v.remarks, v.taken]);
  });
}


function rebuildSheetForDateRange(normalizedEvents) {
  var sheet = getOrCreateSheet();
  var colMap = getColumnIndexMap(sheet);
  var store = getOrCreateManualDataStore();
  var manualByEventId = loadManualDataStore(store);

  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    var existing = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
    existing.forEach(function (row) {
      var eventId = row[colMap['Event Id'] - 1];
      if (eventId) {
        manualByEventId[eventId] = {
          verifiedLead: row[colMap['Verified Lead'] - 1],
          remarks: row[colMap['Remarks'] - 1],
          taken: row[colMap['Taken'] - 1]
        };
      }
    });
    sheet.deleteRows(2, lastRow - 1);
  }

  normalizedEvents.forEach(function (event) {
    if (event === null || event.cancelled) return;
    if (isExcluded(event.title)) return;

    var record = buildLeadRecord(event);
    var newRow = appendBlankRow(sheet, colMap);
    writeDerivedColumns(sheet, newRow, colMap, record, event.id);

    var preserved = manualByEventId[event.id];
    if (preserved) {
      sheet.getRange(newRow, colMap['Verified Lead']).setValue(preserved.verifiedLead);
      sheet.getRange(newRow, colMap['Remarks']).setValue(preserved.remarks);
      sheet.getRange(newRow, colMap['Taken']).setValue(preserved.taken);
    }
  });

  saveManualDataStore(store, manualByEventId);
}

// =============================================================
// ENTRY POINT — the only function you ever run manually
// =============================================================


/** Run this every time you want the sheet to show a date range. */
function runDateRangeSync() {
  var rawEvents = getEventsInManualRange();
  var normalizedEvents = rawEvents.map(normalizeEvent);
  rebuildSheetForDateRange(normalizedEvents);
}
