// server/googleHolidays.js
const { google } = require('googleapis');
const dayjs = require('dayjs');
const path = require('path');

// path ไปที่ไฟล์ service account JSON
const KEYFILE = path.join(__dirname, 'keys', 'google-service-account.json');

// Calendar ID วันหยุดราชการไทย
const HOLIDAY_CAL_ID = 'en.th.official#holiday@group.v.calendar.google.com';

// สร้าง client ด้วย service account
const auth = new google.auth.GoogleAuth({
  keyFile: KEYFILE,
  scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
});

const calendar = google.calendar({ version: 'v3', auth });

/**
 * ดึงวันหยุดจาก Google Calendar ตามปีที่ต้องการ
 * คืนค่าเป็น array ของ string 'YYYY-MM-DD'
 */
async function fetchGoogleHolidaysForYear(year) {
  const timeMin = dayjs(`${year}-01-01`).startOf('day').toISOString();
  const timeMax = dayjs(`${year}-12-31`).endOf('day').toISOString();

  const res = await calendar.events.list({
    calendarId: HOLIDAY_CAL_ID,
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: 'startTime',
  });

  const events = res.data.items || [];

  return events
    .map((ev) => {
      // กรณี all-day event
      const start = ev.start?.date || ev.start?.dateTime;
      if (!start) return null;
      return {
        date: dayjs(start).format('YYYY-MM-DD'),
        summary: ev.summary || '',
      };
    })
    .filter(Boolean);
}

module.exports = { fetchGoogleHolidaysForYear };
