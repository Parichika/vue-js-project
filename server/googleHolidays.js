// server/googleHolidays.js
const { google } = require("googleapis");
const dayjs = require("dayjs");

// Calendar ID วันหยุดราชการไทย
const HOLIDAY_CAL_ID = "en.th.official#holiday@group.v.calendar.google.com";

// Load service account from .env
const serviceAccount = {
  type: "service_account",
  project_id: process.env.GOOGLE_PROJECT_ID,
  private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
  private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  client_email: process.env.GOOGLE_CLIENT_EMAIL,
  client_id: process.env.GOOGLE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/calendar-holiday-service%40counselling-queue-mfu.iam.gserviceaccount.com",
  universe_domain: "googleapis.com",
};

// Create JWT auth client
const auth = new google.auth.JWT(
  serviceAccount.client_email,
  null,
  serviceAccount.private_key,
  ["https://www.googleapis.com/auth/calendar.readonly"]
);

const calendar = google.calendar({ version: "v3", auth });

/**
 * ดึงวันหยุดจาก Google Calendar ตามปีที่ต้องการ
 * คืนค่าเป็น array ของ string 'YYYY-MM-DD'
 */
async function fetchGoogleHolidaysForYear(year) {
  const timeMin = dayjs(`${year}-01-01`).startOf("day").toISOString();
  const timeMax = dayjs(`${year}-12-31`).endOf("day").toISOString();

  const res = await calendar.events.list({
    calendarId: HOLIDAY_CAL_ID,
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: "startTime",
  });

  const events = res.data.items || [];

  return events
    .map((ev) => {
      // กรณี all-day event
      const start = ev.start?.date || ev.start?.dateTime;
      if (!start) return null;
      return {
        date: dayjs(start).format("YYYY-MM-DD"),
        summary: ev.summary || "",
      };
    })
    .filter(Boolean);
}

module.exports = { fetchGoogleHolidaysForYear };
