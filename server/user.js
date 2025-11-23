const express = require("express");
const { verifyToken } = require("./auth");
const dayjs = require("dayjs");
const {
  getThaiHolidaysFromDBOrGoogle,
  isThaiHoliday,
} = require("./holidayService");

const MAX_USERS_PER_SLOT = (() => {
  const n = parseInt(process.env.MAX_USERS_PER_SLOT || "1", 10);
  return Number.isInteger(n) && n > 0 ? n : 1;
})();

module.exports = (db) => {
  const router = express.Router();

  router.use(verifyToken);

  // ------------------------
  // Helper: upsert student
  // ------------------------
  function upsertStudentFromEmail(db, email, cb) {
    const m = String(email).match(/(\d{8,12})/);
    if (!m) return cb();

    const studentCode = m[1];
    const majorCode = studentCode.substring(3, 7);

    // ---- คำนวณชั้นปีแบบ MFU ----
    const yy = parseInt(studentCode.substring(0, 2), 10); // ปีเข้า เช่น 65

    const currentYY = (new Date().getFullYear() + 43) % 100;
    let studyYear = currentYY - yy + 1;
    if (studyYear < 1 || studyYear > 4) studyYear = null;

    // ---- ดึงสำนักวิชาจาก major_map ----
    const facSql =
      "SELECT faculty_th, faculty_en FROM major_map WHERE major_code = ?";
    db.query(facSql, [majorCode], (err, rows) => {
      if (err) return cb(err);

      const fTh = rows[0]?.faculty_th || null;
      const fEn = rows[0]?.faculty_en || null;

      const sql = `
      INSERT INTO student (email, study_year, faculty_th, faculty_en)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        study_year = VALUES(study_year),
        faculty_th = VALUES(faculty_th),
        faculty_en = VALUES(faculty_en)
    `;
      db.query(sql, [email, studyYear, fTh, fEn], cb);
    });
  }

  /* =========================
   *  สร้างการจอง (POST)
   * ========================= */
  router.post("/appointments", async (req, res) => {
    console.log("POST /api/user/appointments called");
    console.log("Body =", req.body);

    const {
      date,
      time,
      phone,
      serviceType,
      otherService,
      nationality,
      email: bodyEmail, // email ที่มาจาก frontend (ถ้ามี)
      place_ID, // รับตรงจาก frontend
      name,
    } = req.body;

    // ใช้ email จาก token ก่อน ถ้าไม่มีค่อยใช้จาก body
    const email = req.user?.email || bodyEmail;

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!email || !date || !time || !phone || !place_ID) {
      console.log("Missing fields:", req.body);
      return res.status(400).json({ error: "Missing required fields" });
    }

    // ต้องจองล่วงหน้าอย่างน้อย 1 วัน (ห้ามจองวันเดียวกันหรือย้อนหลัง)
    const today = dayjs().startOf("day");
    const selectedDate = dayjs(date).startOf("day"); // ให้ dayjs แกะ ISO ให้เอง
    const tomorrow = today.add(1, "day");

    if (!selectedDate.isValid() || !selectedDate.isSame(tomorrow, "day")) {
      return res.status(400).json({
        error: "สามารถจองได้เฉพาะวันถัดไปเท่านั้น",
      });
    }

    // ใช้รูปแบบวันที่ที่ MySQL ต้องการ (YYYY-MM-DD) ให้เหมือนกันทุกที่
    const dateOnly = selectedDate.format("YYYY-MM-DD");

    // เสาร์-อาทิตย์
    const dow = selectedDate.day(); // 0 = Sunday, 6 = Saturday
    if (dow === 0 || dow === 6) {
      return res.status(400).json({
        error: "ไม่สามารถจองวันเสาร์-อาทิตย์ได้",
      });
    }

    // วันหยุดนักขัตฤกษ์ (ใช้ Google Calendar + cache DB)
    try {
      const isHoliday = await isThaiHoliday(
        db,
        selectedDate.format("YYYY-MM-DD")
      );
      if (isHoliday) {
        return res.status(400).json({
          error: "ไม่สามารถจองในวันหยุดนักขัตฤกษ์ได้",
        });
      }
    } catch (e) {
      console.error("holiday check error:", e);
    }

    // สร้างชื่อที่จะใช้บันทึกลง DB
    let full_name =
      // จาก token (ตอน signAccess ให้ใส่ name มาด้วย เช่น ชื่อจาก Google)
      req.user?.name ||
      // หรือจาก body (กรณีอยากส่งชื่อ display name แยกมา)
      name ||
      null;

    // ดึง student_code จาก email
    const student_code = (() => {
      const m = String(email).match(/(\d{8,12})/); // ปรับช่วงตัวเลขได้ตามรูปแบบรหัส นศ.
      return m ? m[1] : null;
    })();

    upsertStudentFromEmail(db, email, (stuErr) => {
      if (stuErr) {
        console.error("student upsert error:", stuErr);
      }

      // ตรวจ slot ซ้ำแบบรองรับหลายคน / slot
      db.query(
        `
          SELECT COUNT(*) AS used_count
          FROM appointment
          WHERE date = ?
            AND time = ?
            AND place_ID = ?
            AND status NOT IN ('rejected','cancelled')
        `,
        [dateOnly, time, place_ID],
        (err, rows) => {
          if (err) {
            console.error("Check slot error:", err);
            return res.status(500).json({ error: "Database error" });
          }

          const used = rows?.[0]?.used_count || 0;

          if (used >= MAX_USERS_PER_SLOT) {
            return res.status(409).json({ error: "Slot นี้ถูกจองเต็มแล้ว" });
          }

          // ถ้ายังไม่เต็ม → ค่อย INSERT
          const serviceMap = { life: 1, study: 2, emotion: 3, other: 4 };
          const service_ID = serviceMap[serviceType] || null;

          const sql = `
            INSERT INTO appointment (
              user_email,
              student_code,
              full_name,
              phone_number,
              date,
              time,
              staff_ID,
              service_ID,
              other_type,
              place_ID,
              nationality,
              status,
              appointment_summary
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;

          const values = [
            email,
            student_code,
            full_name,
            phone,
            dateOnly,
            time,
            null, // staff_ID ยังไม่ assign
            service_ID,
            otherService || "",
            place_ID,
            nationality,
            "pending",
            "",
          ];

          db.query(sql, values, (err2, result) => {
            if (err2) {
              console.error("Insert error:", err2);
              return res.status(500).json({ error: err2 });
            }
            res.json({ message: "จองสำเร็จ", appointmentID: result.insertId });
          });
        }
      );
    });
  });

  /* =========================
   *  สถานที่ (Place APIs)
   * ========================= */
  router.get("/places", (req, res) => {
    const sql = `
    SELECT place_ID, place_name_th, place_name_en, target_group, place_status
    FROM place
  `;
    db.query(sql, (err, rows) => {
      if (err) return res.status(500).json({ error: "Database error" });
      const formatted = rows.map((p) => ({
        place_ID: p.place_ID,
        name_th: p.place_name_th,
        name_en: p.place_name_en,
        target_group: p.target_group,
        place_status: p.place_status,
      }));
      res.json(formatted);
    });
  });

  /* =========================
   *  เวลาที่ถูกจองแล้ว (GET)
   * ========================= */
  router.get("/appointments/occupied", (req, res) => {
    console.log("GET /api/user/appointments/occupied =", req.query);

    const { date, place_ID } = req.query;

    if (!date || !place_ID) {
      return res.status(400).json({ error: "Missing date or place_ID" });
    }

    const sql = `
    SELECT time, COUNT(*) AS used_count
    FROM appointment
    WHERE date = ?
      AND place_ID = ?
      AND status NOT IN ('rejected','cancelled')
    GROUP BY time
    HAVING used_count >= ?
  `;

    db.query(sql, [date, place_ID, MAX_USERS_PER_SLOT], (err, results) => {
      if (err) {
        console.error("Error fetching occupied:", err);
        return res.status(500).json({ error: "Database error" });
      }
      // ส่งเฉพาะ time ที่เต็มแล้ว
      const times = results.map((r) => r.time);
      res.json(times);
    });
  });

  /* =========================
   *  สถานะการจองของ user
   * ========================= */
  router.get("/appointments/status", (req, res) => {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ error: "Missing email" });
    }

    const sql = `
      SELECT 
        a.appointment_ID,
        a.date,
        a.time,
        a.status,
        a.service_ID,
        a.reject_reason,
        p.place_name_th,
        p.place_name_en,
        a.other_type,
        st.service_type,
        s.first_name_th,
        s.last_name_th,
        s.first_name_en,
        s.last_name_en
      FROM appointment a
      LEFT JOIN place p ON a.place_ID = p.place_ID
      LEFT JOIN service_type st ON a.service_ID = st.service_ID
      LEFT JOIN staff s ON a.staff_ID = s.staff_ID
      WHERE a.user_email = ?
      ORDER BY a.appointment_ID DESC
    `;

    db.query(sql, [email], (err, results) => {
      if (err) return res.status(500).json({ error: err });
      res.json(results);
    });
  });

  /* =========================
   *  ยกเลิกการจอง
   * ========================= */
  router.put("/appointments/cancel/:id", (req, res) => {
    const appointmentId = Number(req.params.id);

    if (!Number.isInteger(appointmentId) || appointmentId <= 0) {
      return res.status(400).json({ error: "appointment_ID ไม่ถูกต้อง" });
    }

    const updateSql = `
    UPDATE appointment
    SET status = 'cancelled'
    WHERE appointment_ID = ?
  `;

    db.query(updateSql, [appointmentId], (err, result) => {
      if (err) {
        console.error("Error during cancellation update:", err);
        return res
          .status(500)
          .json({ error: "เกิดข้อผิดพลาดในการอัปเดตสถานะ" });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "ไม่พบนัดหมายที่ต้องการยกเลิก" });
      }

      res.json({ message: "Appointment cancelled" });
    });
  });

  /* =========================
   *  list วันหยุดไทยของปี (ใช้กับ calendar frontend)
   * ========================= */
  router.get("/holidays", async (req, res) => {
    try {
      const year = Number(req.query.year || dayjs().year());
      if (!year || Number.isNaN(year)) {
        return res.status(400).json({ error: "Invalid year" });
      }

      const dates = await getThaiHolidaysFromDBOrGoogle(db, year);
      res.json(dates); // ['2025-01-01', '2025-04-13', ...]
    } catch (err) {
      console.error("Error /holidays:", err);
      res.status(500).json({ error: "Failed to fetch holidays" });
    }
  });

  return router;
};
