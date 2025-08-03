const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
const dayjs = require("dayjs");

const app = express();
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.url}`);
  next();
});

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
    name,
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
        "SELECT * FROM appointment WHERE date = ? AND time = ? AND place_ID = ? AND status NOT IN ('rejected', 'cancelled')",
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
            other: 4
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
              name,
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
  {
    date,
    time,
    phone,
    service_ID,
    otherService,
    place_ID,
    nationality,
    email,
    name,
  },
  res
) {
  console.log("📧 Email inside saveAppointment =", email);
  const sql = `
    INSERT INTO appointment (
      user_email, staff_ID, date, time,
      service_ID, other_type, place_ID, phone_number,
      status, nationality,name
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)
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
    name,
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

  console.log("📥 รับเคส appointmentID =", appointmentID);
  console.log("👤 โดย staff_ID =", staff_ID);

  if (!staff_ID) return res.status(400).json({ error: "Missing staff_ID" });

  db.query(
    "UPDATE appointment SET staff_ID = ?, status = 'approved' WHERE appointment_ID = ?",
    [staff_ID, appointmentID],
    (err, result) => {
      if (err) return res.status(500).json({ error: err });
      res.json({ message: "รับเคสสำเร็จ", appointmentID });
    }
  );
});

// เจ้าหน้าที่ปฏิเสธเคส
app.put("/api/appointments/:id/reject", (req, res) => {
  const appointmentID = req.params.id;
  const { staff_ID } = req.body;

  if (!staff_ID) return res.status(400).json({ error: "Missing staff_ID" });

  const sql = `
    UPDATE appointment 
    SET status = 'rejected', staff_ID = ? 
    WHERE appointment_ID = ?
  `;

  db.query(sql, [staff_ID, appointmentID], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: "ปฏิเสธเคสสำเร็จ", appointmentID });
  });
});

// ดึงรายการจองทั้งหมด (admin/staff ใช้)
// ✅ ดึงรายการจองสำหรับ staff
app.get("/api/appointments", (req, res) => {
  const sql = `
    SELECT 
      a.appointment_ID,
      a.date,
      a.time,
      a.status,
      a.service_ID, 
      a.other_type,
      a.phone_number,
      a.user_email,
      a.name,
      p.place_name,
      st.service_type
    FROM appointment a
    LEFT JOIN place p ON a.place_ID = p.place_ID
    LEFT JOIN service_type st ON a.service_ID = st.service_ID
    WHERE a.status IN ('pending')
    ORDER BY a.appointment_ID DESC
  `;

  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

// ดึงสถานะการจองของ user
app.get("/api/appointments/status", (req, res) => {
  console.log("✅ Status endpoint called");
  console.log("📥 Query =", req.query);
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

app.put("/api/appointments/:id/cancel", (req, res) => {
  const appointmentId = req.params.id;
  const reason = req.body.reason || null;

  console.log("Cancel request received:", { appointmentId, reason });

  if (!appointmentId || appointmentId === "undefined") {
    return res.status(400).json({ error: "appointment_ID ไม่ถูกต้อง" });
  }

  if (!reason) {
    return res.status(400).json({ error: "กรุณากรอกเหตุผลในการยกเลิก" });
  }

  // อัปเดตสถานะการจองเป็น 'cancelled'
  const updateSql = `
    UPDATE appointment
    SET status = 'cancelled'
    WHERE appointment_ID = ?
  `;

  db.query(updateSql, [appointmentId], (err, result) => {
    if (err) {
      console.error("❌ Error during cancellation update:", err);
      return res.status(500).json({ error: "เกิดข้อผิดพลาดในการอัปเดตสถานะ" });
    }

    // แทรกเหตุผลการยกเลิกลงในตาราง cancel_appointment
    const insertSql = `
      INSERT INTO cancel_appointment (appointment_ID, cancel_reason)
      VALUES (?, ?)
    `;

    db.query(insertSql, [appointmentId, reason], (err2, result2) => {
      if (err2) {
        console.error("❌ Error during inserting cancel reason:", err2);
        return res
          .status(500)
          .json({ error: "เกิดข้อผิดพลาดในการบันทึกเหตุผล" });
      }

      res.json({ message: "Appointment cancelled and reason saved" });
    });
  });
});

// ✅ ดึงเฉพาะรายการที่ approved หรือ rejected สำหรับ staff คนที่ล็อกอิน
app.get("/api/history", (req, res) => {
  const { staff_ID, role } = req.query;

  if (!role) {
    return res.status(400).json({ error: "Missing role" });
  }

  let sql;
  let values;

  if (role === "admin") {
    // 🔍 admin ดูได้ทุกคน
    sql = `
      SELECT 
        a.appointment_ID,
        a.date,
        a.time,
        a.status,
        a.other_type,
        a.service_ID, 
        a.phone_number,
        a.user_email,
        a.name,
        p.place_name,
        st.service_type
      FROM appointment a
      LEFT JOIN place p ON a.place_ID = p.place_ID
      LEFT JOIN service_type st ON a.service_ID = st.service_ID
      WHERE a.status IN ('approved', 'rejected','completed')
      ORDER BY a.appointment_ID DESC
    `;
    values = [];
  } else if (staff_ID) {
    // 🔍 staff ดูเฉพาะของตัวเอง
    sql = `
      SELECT 
        a.appointment_ID,
        a.date,
        a.time,
        a.status,
        a.other_type,
        a.service_ID, 
        a.phone_number,
        a.user_email,
        a.name,
        p.place_name,
        st.service_type
      FROM appointment a
      LEFT JOIN place p ON a.place_ID = p.place_ID
      LEFT JOIN service_type st ON a.service_ID = st.service_ID
      WHERE a.staff_ID = ? AND a.status IN ('approved', 'rejected','completed')
      ORDER BY a.appointment_ID DESC
    `;
    values = [staff_ID];
  } else {
    return res.status(400).json({ error: "Missing staff_ID" });
  }

  db.query(sql, values, (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

// ✅ อัปเดตสถานะและคำแนะนำหลังให้คำปรึกษา
app.post("/api/appointments/complete", (req, res) => {
  const { appointment_ID, advice_detail } = req.body;

  if (!appointment_ID || !advice_detail) {
    return res.status(400).json({ error: "Missing data" });
  }

  const updateStatusQuery = `
    UPDATE appointment
    SET status = 'completed'
    WHERE appointment_ID = ?
  `;

  const insertSummaryQuery = `
    INSERT INTO appointment_summary (appointment_ID, advice_detail)
    VALUES (?, ?)
  `;

  db.beginTransaction((err) => {
    if (err) return res.status(500).json({ error: "Transaction error" });

    db.query(updateStatusQuery, [appointment_ID], (err1) => {
      if (err1)
        return db.rollback(() =>
          res.status(500).json({ error: "Update failed" })
        );

      db.query(insertSummaryQuery, [appointment_ID, advice_detail], (err2) => {
        if (err2)
          return db.rollback(() =>
            res.status(500).json({ error: "Insert failed" })
          );

        db.commit((err3) => {
          if (err3)
            return db.rollback(() =>
              res.status(500).json({ error: "Commit failed" })
            );
          res.json({ message: "Completed successfully" });
        });
      });
    });
  });
});

// ✅ รวมข้อมูลสรุปทั้งหมดสำหรับ dashboard
app.get("/api/dashboard", (req, res) => {
  const { period } = req.query;
  const dayjs = require("dayjs");

  let whereClause = "";
  let params = [];

  if (period && period !== "ทั้งหมด") {
    let startDate, endDate;
    const today = dayjs();

    switch (period) {
      case "สัปดาห์นี้":
        startDate = today.startOf("week");
        endDate = today.endOf("week");
        break;
      case "สัปดาห์ที่ผ่านมา":
        startDate = today.subtract(1, "week").startOf("week");
        endDate = today.subtract(1, "week").endOf("week");
        break;
      case "เดือนนี้":
        startDate = today.startOf("month");
        endDate = today.endOf("month");
        break;
      case "เดือนที่ผ่านมา":
        startDate = today.subtract(1, "month").startOf("month");
        endDate = today.subtract(1, "month").endOf("month");
        break;
      case "ปีนี้ (จนถึงปัจจุบัน)":
        startDate = today.startOf("year");
        endDate = today;
        break;
    }

    if (startDate && endDate) {
      whereClause = "WHERE a.date BETWEEN ? AND ?";
      params.push(startDate.format("YYYY-MM-DD"), endDate.format("YYYY-MM-DD"));
    }
  }

  const summaryQuery = `
    SELECT 
      COUNT(*) AS total,
      SUM(status = 'pending') AS pending,
      SUM(status = 'approved') AS approved,
      SUM(status = 'rejected') AS rejected,
      SUM(status = 'completed') AS completed,
      SUM(status = 'cancelled') AS cancelled
    FROM appointment a
    ${whereClause}
  `;

const serviceTypeQuery = `
  SELECT 
    st.service_type,
    COUNT(a.appointment_ID) AS count,
    SUM(a.status = 'completed') AS countCompleted
  FROM service_type st
  LEFT JOIN appointment a ON st.service_ID = a.service_ID
  ${whereClause ? `AND ${whereClause.replace('WHERE ', '')}` : ''}
  GROUP BY st.service_ID
`


  const completedServiceTypeQuery = `
    SELECT st.service_type, COUNT(*) as count
    FROM appointment a
    LEFT JOIN service_type st ON a.service_ID = st.service_ID
    ${
      whereClause
        ? whereClause + ' AND a.status = "completed"'
        : 'WHERE a.status = "completed"'
    }
    GROUP BY a.service_ID
  `;

  const byDayQuery = `
    SELECT DAYNAME(date) as day, COUNT(*) as count
    FROM appointment a
    ${whereClause}
    GROUP BY day
  `;

  const byTimeQuery = `
    SELECT time, COUNT(*) as count
    FROM appointment a
    ${whereClause}
    GROUP BY time
    ORDER BY time ASC
  `;

  const monthlyTrendQuery = `
    SELECT MONTH(date) AS month, st.service_type, COUNT(*) AS count
    FROM appointment a
    LEFT JOIN service_type st ON a.service_ID = st.service_ID
    WHERE YEAR(date) = YEAR(CURDATE())
    GROUP BY month, st.service_type
    ORDER BY month
  `;

  db.query(summaryQuery, params, (err1, summaryResult) => {
    if (err1) return res.status(500).json({ error: err1 });

    db.query(serviceTypeQuery, params, (err2, allServices) => {
      if (err2) return res.status(500).json({ error: err2 });

      db.query(completedServiceTypeQuery, params, (err3, completedServices) => {
        if (err3) return res.status(500).json({ error: err3 });

        db.query(byDayQuery, params, (err4, dayResult) => {
          if (err4) return res.status(500).json({ error: err4 });

          db.query(byTimeQuery, params, (err5, timeResult) => {
            if (err5) return res.status(500).json({ error: err5 });

            db.query(monthlyTrendQuery, params, (err6, trendResult) => {
              if (err6) return res.status(500).json({ error: err6 });

              res.json({
                summary: summaryResult[0],
                serviceTypes: allServices,
                completedTypes: completedServices,
                byDay: dayResult,
                byTime: timeResult,
                monthlyTrend: trendResult,
              });
            });
          });
        });
      });
    });
  });
});

// API Place------------face ทำ
app.put("/api/places/:id/status", (req, res) => {
  const placeId = req.params.id;
  const { status } = req.body;

  if (!status || !["open", "closed"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  db.query(
    "UPDATE place SET place_status = ? WHERE place_ID = ?",
    [status, placeId],
    (err, result) => {
      if (err) {
        console.error("❌ Error updating place_status:", err);
        return res.status(500).json({ error: "Database error" });
      }
      res.json({ message: "สถานะถูกอัปเดตแล้ว" });
    }
  );
});

app.get("/api/places", (req, res) => {
  db.query("SELECT * FROM place", (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

app.post("/api/places", (req, res) => {
  const { name, target } = req.body;

  if (!name || !target) {
    return res.status(400).json({ error: "Missing name or target" });
  }

  const sql = `
    INSERT INTO place (place_name, place_status, target_group)
    VALUES (?, ?, ?)
  `;

  db.query(sql, [name, "open", target], (err, result) => {
    if (err) {
      console.error("❌ Failed to insert place:", err);
      return res.status(500).json({ error: "Database error" });
    }

    res.json({
      message: "เพิ่มสถานที่สำเร็จ",
      place_ID: result.insertId,
      name,
      target,
      place_status: "open",
    });
  });
});


app.get("/api/search", (req, res) => {
  const keyword = req.query.q;

  if (!keyword) {
    return res.status(400).json({ error: "Missing search keyword" });
  }

  const searchQuery = `
    SELECT 
      a.appointment_ID,
      a.date,
      a.time,
      a.status,
      a.other_type,
      a.phone_number,
      a.user_email,
      a.name,
      p.place_name,
      st.service_type
    FROM appointment a
    LEFT JOIN place p ON a.place_ID = p.place_ID
    LEFT JOIN service_type st ON a.service_ID = st.service_ID
    WHERE 
      a.name LIKE ? OR
      a.user_email LIKE ?
    ORDER BY a.appointment_ID DESC
  `;

  const searchTerm = `%${keyword}%`;

  db.query(searchQuery, [searchTerm, searchTerm], (err, results) => {
    if (err) {
      console.error("❌ Error searching appointments:", err);
      return res.status(500).json({ error: "Database error" });
    }

    res.json(results);
  });
});

// API Staff เปิดปิดเพิ่ม face do-----------------------------
// ✅ POST เพิ่ม staff ใหม่
app.post("/api/staff", (req, res) => {
  const { first_name, last_name, email, phone_number, role } = req.body;

  console.log("📥 เพิ่ม staff:", {
    first_name,
    last_name,
    email,
    phone_number,
    role,
  });

  if (!first_name || !last_name || !email || !role) {
    console.error("❌ Missing fields:", { first_name, last_name, email, role });
    return res.status(400).json({ error: "Missing required fields" });
  }

  const sql = `
    INSERT INTO staff (first_name, last_name, email, phone_number, role, staff_status)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [first_name, last_name, email, phone_number, role, "active"],
    (err, result) => {
      if (err) {
        console.error("❌ Error adding staff:", err);
        return res.status(500).json({ error: "Database error" });
      }

      res.json({
        message: "เพิ่ม staff สำเร็จ",
        staff_ID: result.insertId,
      });
    }
  );
});

// ✅ PUT อัปเดตสถานะ staff
app.put("/api/staff/status", (req, res) => {
  const { email, status } = req.body;

  if (!email || !status) {
    return res.status(400).json({ error: "Missing email or status" });
  }

  db.query(
    "UPDATE staff SET staff_status = ? WHERE email = ?",
    [status, email],
    (err, result) => {
      if (err) {
        console.error("❌ Error updating staff status:", err);
        return res.status(500).json({ error: "Database error" });
      }

      res.json({ message: "อัปเดตสถานะเรียบร้อย" });
    }
  );
});

// ✅ GET ดึง staff ทั้งหมด
app.get("/api/staff", (req, res) => {
  db.query(
    "SELECT first_name, last_name, email, phone_number, staff_status, role FROM staff",
    (err, results) => {
      if (err) {
        console.error("❌ Error fetching staff:", err);
        return res.status(500).json({ error: "Database error" });
      }

      const staffList = results.map((s) => ({
        first_name: s.first_name,
        last_name: s.last_name,
        name: `${s.first_name} ${s.last_name}`,
        email: s.email,
        phone: s.phone_number,
        active: s.staff_status === "active",
        role: s.role,
      }));

      res.json(staffList);
    }
  );
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

            // face do---------------
      // 🔍 ตรวจสอบสถานะบัญชี
      if (staff.staff_status !== "active") {
        console.log("⛔ บัญชีถูกปิดการใช้งาน:", email);
        return res.status(403).json({ error: "บัญชีถูกปิดการใช้งาน" });
      }

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
