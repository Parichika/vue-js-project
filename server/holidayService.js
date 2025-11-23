// server/holidayService.js
const dayjs = require('dayjs');
const { fetchGoogleHolidaysForYear } = require('./googleHolidays');

/**
 * คืน array ของ date string 'YYYY-MM-DD' ของปีนั้น
 * ถ้า DB มีแล้ว → ดึงจาก DB
 * ถ้ายังไม่มี → ไปดึงจาก Google Calendar + insert ลง DB ก่อน แล้วค่อยคืนค่า
 */
async function getThaiHolidaysFromDBOrGoogle(db, year) {
  return new Promise((resolve, reject) => {
    db.query(
      'SELECT holiday_date FROM thai_holidays WHERE holiday_year = ?',
      [year],
      async (err, rows) => {
        if (err) return reject(err);

        if (rows.length > 0) {
          // มี cache แล้ว
          const dates = rows.map((r) => dayjs(r.holiday_date).format('YYYY-MM-DD'));
          return resolve(dates);
        }

        // ยังไม่มี cache → ดึงจาก Google
        try {
          const events = await fetchGoogleHolidaysForYear(year);

          if (events.length > 0) {
            const values = events.map((e) => [
              e.date,
              year,
              e.summary,
              'en.th.official#holiday@group.v.calendar.google.com',
            ]);

            db.query(
              `
              INSERT IGNORE INTO thai_holidays 
                (holiday_date, holiday_year, summary, calendar_id)
              VALUES ?
            `,
              [values],
              (err2) => {
                if (err2) return reject(err2);
                const dates = events.map((e) => e.date);
                resolve(dates);
              }
            );
          } else {
            resolve([]);
          }
        } catch (e) {
          reject(e);
        }
      }
    );
  });
}

// เช็คว่า dateYMD เป็นวันหยุดไทย (จาก DB/Google)?
async function isThaiHoliday(db, dateYMD) {
  const d = dayjs(dateYMD, 'YYYY-MM-DD', true);
  if (!d.isValid()) return false;
  const year = d.year();

  const dates = await getThaiHolidaysFromDBOrGoogle(db, year);
  const set = new Set(dates);
  return set.has(dateYMD);
}

module.exports = { getThaiHolidaysFromDBOrGoogle, isThaiHoliday };
