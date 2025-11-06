const express = require('express')
const router = express.Router()

/* =========================
 *  สร้างการจอง (POST)
 * ========================= */
router.post("/appointments", (req, res) => {
  console.log("POST /api/appointments called");
  console.log("Body =", req.body);

  const {
    full_name,
    date,
    time,
    phone,
    serviceType,
    otherService,
    channel,
    nationality,
    email,
  } = req.body;

  if (!full_name || !email || !date || !time || !channel || !phone) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // หา place_ID จากชื่อสถานที่
  db.query(
    "SELECT place_ID FROM place WHERE place_name = ? LIMIT 1",
    [channel],
    (err, placeResults) => {
      if (err || placeResults.length === 0) {
        return res.status(500).json({ error: "ไม่พบสถานที่" });
      }

      const place_ID = placeResults[0].place_ID;

      // ตรวจ slot ซ้ำ (ยกเว้น rejected / cancelled)
      db.query(
        "SELECT 1 FROM appointment WHERE date = ? AND time = ? AND place_ID = ? AND status NOT IN ('rejected','cancelled')",
        [date, time, place_ID],
        (err, existing) => {
          if (err) return res.status(500).json({ error: err });
          if (existing.length > 0) {
            return res.status(409).json({ error: "Slot นี้ถูกจองแล้ว" });
          }

          // map serviceType -> service_ID
          const serviceMap = { life: 1, study: 2, emotion: 3, other: 4 };
          const service_ID = serviceMap[serviceType] || null;

          saveAppointment(
            {
              email,
              full_name,
              date,
              time,
              phone,
              service_ID,
              otherService,
              place_ID,
              nationality,
            },
            res
          );
        }
      );
    }
  );
});

/* =========================
 *  บันทึกการจอง (ฟังก์ชัน)
 * ========================= */
function saveAppointment(
  {
    date,
    time,
    phone,
    service_ID,
    otherService,
    place_ID,
    nationality,
    email,
    full_name,
  },
  res
) {
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
    null,                 // staff_ID ยังไม่ assign
    service_ID,
    otherService || "",
    place_ID,
    nationality,
    "pending",
    "",                   // appointment_summary (ค่าว่างเริ่มต้น)
  ];

  console.log("Saving appointment:", values);
  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("Insert error:", err);
      return res.status(500).json({ error: err });
    }
    res.json({ message: "จองสำเร็จ", appointmentID: result.insertId });
  });
}

/* =========================
 *  เวลาที่ถูกจองแล้ว (GET)
 * ========================= */
router.get("/appointments/occupied", (req, res) => {
  const { date, place_name } = req.query;

  if (!date || !place_name) {
    return res.status(400).json({ error: "Missing date or place_name" });
  }

  db.query(
    "SELECT place_ID FROM place WHERE place_name = ? LIMIT 1",
    [place_name],
    (err, placeResults) => {
      if (err || placeResults.length === 0) {
        return res.status(500).json({ error: "ไม่พบสถานที่" });
      }

      const place_ID = placeResults[0].place_ID;
      db.query(
        "SELECT time FROM appointment WHERE date = ? AND place_ID = ? AND status NOT IN ('rejected','cancelled')",
        [date, place_ID],
        (err, results) => {
          if (err) return res.status(500).json({ error: err });
          const times = results.map((r) => r.time);
          res.json(times);
        }
      );
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
      p.place_name,
      a.other_type,
      st.service_type,
      s.first_name,
      s.last_name
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
 *  ยกเลิกการจอง (ไม่เก็บเหตุผล)
 * ========================= */
router.put("/appointments/:id/cancel", (req, res) => {
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

module.exports = router

