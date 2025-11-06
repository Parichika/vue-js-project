const express = require('express');

module.exports = (db) => {
  const router = express.Router();

  /* =========================
   *  สร้างการจอง (POST)
   * ========================= */
  router.post("/appointments", (req, res) => {
    console.log("POST /api/user/appointments called");
    console.log("Body =", req.body);

    const {
      full_name,
      date,
      time,
      phone,
      serviceType,
      otherService,
      nationality,
      email,
      place_ID // ✅ รับตรงจาก frontend
    } = req.body;

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!full_name || !email || !date || !time || !phone || !place_ID) {
      console.log("Missing fields:", req.body);
      return res.status(400).json({ error: "Missing required fields" });
    }

    // ตรวจ slot ซ้ำ (ยกเว้น rejected / cancelled)
    db.query(
      "SELECT 1 FROM appointment WHERE date = ? AND time = ? AND place_ID = ? AND status NOT IN ('rejected','cancelled')",
      [date, time, place_ID],
      (err, existing) => {
        if (err) return res.status(500).json({ error: err });
        if (existing.length > 0) {
          return res.status(409).json({ error: "Slot นี้ถูกจองแล้ว" });
        }

        const serviceMap = { life: 1, study: 2, emotion: 3, other: 4 };
        const service_ID = serviceMap[serviceType] || null;

        const sql = `
          INSERT INTO appointment (
            user_email,
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
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
          email,
          full_name,
          phone,
          date,
          time,
          null, // staff_ID ยังไม่ assign
          service_ID,
          otherService || "",
          place_ID,
          nationality,
          "pending",
          ""
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

  /* =========================
   *  เวลาที่ถูกจองแล้ว (GET)
   * ========================= */
  router.get("/appointments/occupied", (req, res) => {
    console.log("GET /api/user/appointments/occupied =", req.query);

    const { date, place_ID } = req.query;

    if (!date || !place_ID) {
      return res.status(400).json({ error: "Missing date or place_ID" });
    }

    db.query(
      "SELECT time FROM appointment WHERE date = ? AND place_ID = ? AND status NOT IN ('rejected','cancelled')",
      [date, place_ID],
      (err, results) => {
        if (err) {
          console.error("Error fetching occupied:", err);
          return res.status(500).json({ error: "Database error" });
        }
        const times = results.map((r) => r.time);
        res.json(times);
      }
    );
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
      return res.status(500).json({ error: "เกิดข้อผิดพลาดในการอัปเดตสถานะ" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "ไม่พบนัดหมายที่ต้องการยกเลิก" });
    }

    res.json({ message: "Appointment cancelled" });
  });
});

  return router;
};
