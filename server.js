const express = require("express");
const mysql = require("mysql");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// connect MySQL
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "counselling-queue",
});

db.connect((err) => {
  if (err) {
    console.error("❌ DB Error:", err);
  } else {
    console.log("✅ Connected to MySQL");
  }
});

// API: สร้างการจอง
app.post("/api/appointments", (req, res) => {
  console.log("📥 POST /api/appointments called");
  console.log("🔎 Body =", req.body);

  const {
    date,
    time,
    phone,
    serviceType,
    otherService,
    channel,
    nationality,
    email,
  } = req.body;

  if (!email || !date || !time || !channel || !phone) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // หา place_ID
  db.query(
    "SELECT place_ID FROM place WHERE place_name = ? LIMIT 1",
    [channel],
    (err, placeResults) => {
      if (err || placeResults.length === 0) {
        return res.status(500).json({ error: "ไม่พบสถานที่" });
      }

      const place_ID = placeResults[0].place_ID;

      // ตรวจสอบซ้ำ
      db.query(
        "SELECT * FROM appointment WHERE date = ? AND time = ? AND place_ID = ?",
        [date, time, place_ID],
        (err, existing) => {
          if (err) return res.status(500).json({ error: err });
          if (existing.length > 0) {
            return res.status(409).json({ error: "Slot นี้ถูกจองแล้ว" });
          }

          // ✅ ใช้ serviceMap แทนการ query
          const serviceMap = {
            life: 1, // ขอรับการปรึกษาด้านการใช้ชีวิตฯ
            study: 2, // ขอรับการปรึกษาด้านการเรียน
            emotion: 3, // ระบายความรู้สึกต่างๆ
          };

          const service_ID = serviceMap[serviceType] || null;

          saveAppointment(
            {
              email,
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

// ฟังก์ชันบันทึกการจอง
function saveAppointment(
  { date, time, phone, service_ID, otherService, place_ID, nationality, email },
  res
) {
  console.log("📧 Email inside saveAppointment =", email);
  const sql = `
    INSERT INTO appointment (
      user_email, staff_ID, date, time,
      service_ID, other_type, place_ID, phone_number,
      status, nationality
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    email,
    null,
    date,
    time,
    service_ID,
    otherService || "",
    place_ID,
    phone,
    "pending",
    nationality,
  ];

  console.log("📝 Saving appointment:", values);

  db.query(sql, values, (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: "จองสำเร็จ", appointmentID: result.insertId });
  });
}

// ดึงเวลาที่ถูกจองแล้ว
app.get("/api/appointments/occupied", (req, res) => {
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
        "SELECT time FROM appointment WHERE date = ? AND place_ID = ?",
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

// staff รับเคส
app.put("/api/appointments/:id/assign", (req, res) => {
  const appointmentID = req.params.id;
  const { staff_ID } = req.body;
  if (!staff_ID) return res.status(400).json({ error: "Missing staff_ID" });

  db.query(
    "UPDATE appointment SET staff_ID = ? WHERE appointment_ID = ?",
    [staff_ID, appointmentID],
    (err, result) => {
      if (err) return res.status(500).json({ error: err });
      res.json({ message: "รับเคสสำเร็จ", appointmentID });
    }
  );
});

// ดึงรายการจองทั้งหมด (admin/staff ใช้)
app.get("/api/appointments", (req, res) => {
  db.query(
    `SELECT a.*, s.first_name, s.last_name
     FROM appointment a
     LEFT JOIN staff s ON a.staff_ID = s.staff_ID`,
    (err, results) => {
      if (err) return res.status(500).json({ error: err });
      res.json(results);
    }
  );
});

app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.url}`);
  next();
});

// API login
app.post("/api/login", (req, res) => {
  console.log("📥 เข้าถึง /api/login แล้ว");
  let { email } = req.body;
  console.log("📩 Email received:", email);

  if (!email) {
    console.log("❌ ไม่มี email ส่งมาใน body");
    return res.status(400).json({ error: "Missing email" });
  }

  email = email.trim().toLowerCase();

  db.query("SELECT * FROM staff WHERE email = ?", [email], (err, results) => {
    if (err) {
      console.error("❌ Database error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    if (results.length > 0) {
      const staff = results[0];
      console.log("✅ พบใน staff:", staff);
      return res.json({
        message: "เข้าสู่ระบบเจ้าหน้าที่",
        staff_ID: staff.staff_ID,
        role: staff.role,
        name: `${staff.first_name} ${staff.last_name}`,
      });
    }

    if (email.endsWith("@lamduan.mfu.ac.th")) {
      console.log("✅ อีเมลนักศึกษา:", email);
      return res.json({
        message: "เข้าสู่ระบบนักศึกษา",
        role: "student",
        name: email.split("@")[0],
      });
    }

    console.log("❌ ไม่อนุญาตให้เข้าใช้งาน:", email);
    return res.status(401).json({ error: "ไม่อนุญาตให้เข้าใช้งาน" });
  });
});

// เริ่มต้นเซิร์ฟเวอร์
app.listen(3000, () => {
  console.log("🚀 Server running on http://localhost:3000");
  console.log("✅ API ready for appointments");
});
