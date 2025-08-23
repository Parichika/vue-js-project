const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
const dayjs = require("dayjs");

const app = express();
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
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
    console.error("DB Error:", err);
  } else {
    console.log("Connected to MySQL");
  }
});

/* =========================
 *  สร้างการจอง (POST)
 * ========================= */
app.post("/api/appointments", (req, res) => {
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
 *  staff รับเคส / ปฏิเสธเคส
 * ========================= */
app.put("/api/appointments/:id/assign", (req, res) => {
  const appointmentID = req.params.id;
  const { staff_ID } = req.body;

  if (!staff_ID) return res.status(400).json({ error: "Missing staff_ID" });

  db.query(
    "UPDATE appointment SET staff_ID = ?, status = 'approved' WHERE appointment_ID = ?",
    [staff_ID, appointmentID],
    (err) => {
      if (err) return res.status(500).json({ error: err });
      res.json({ message: "รับเคสสำเร็จ", appointmentID });
    }
  );
});
app.put("/api/appointments/:id/reject", (req, res) => {
  const appointmentID = req.params.id;
  // รองรับทั้งสองชื่อ เพื่อกันพลาดจาก front ที่ส่งมาไม่ตรง
  const staff_ID = req.body.staff_ID;
  const reasonRaw = req.body.reject_reason ?? req.body.reason;
  const reason = (reasonRaw || "").trim();

  console.log("PUT /reject", { appointmentID, staff_ID, reason });

  if (!staff_ID) return res.status(400).json({ error: "Missing staff_ID" });
  if (!reason)   return res.status(400).json({ error: "Missing reject reason" });

  const sql = `
    UPDATE appointment 
    SET status = 'rejected',
        staff_ID = ?,
        reject_reason = ?
    WHERE appointment_ID = ?
  `;
  db.query(sql, [staff_ID, reason, appointmentID], (err, result) => {
    if (err) {
      console.error("Reject update error:", err);
      return res.status(500).json({ error: "DB error" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Appointment not found" });
    }
    // ส่งค่ากลับมาดูให้ชัดว่า reason ถูกบันทึก
    res.json({ message: "ปฏิเสธเคสสำเร็จ", appointmentID, reject_reason: reason });
  });
});





/* =========================
 *  รายการจอง (staff ดู pending)
 * ========================= */
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
      a.full_name,
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

/* =========================
 *  สถานะการจองของ user
 * ========================= */
app.get("/api/appointments/status", (req, res) => {
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
app.put("/api/appointments/:id/cancel", (req, res) => {
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


/* =========================
 *  ประวัติ (approved / rejected / completed / cancelled)
 * ========================= */
app.get("/api/history", (req, res) => {
  const { staff_ID, role } = req.query;
  if (!role) {
    return res.status(400).json({ error: "Missing role" });
  }

  let sql;
  let values = [];

  if (role === "admin") {

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
        a.full_name,
        p.place_name,
        st.service_type
      FROM appointment a
      LEFT JOIN place p ON a.place_ID = p.place_ID
      LEFT JOIN service_type st ON a.service_ID = st.service_ID
      WHERE a.status IN ('approved','rejected','completed','cancelled')
      ORDER BY a.appointment_ID DESC
    `;
  } else if (staff_ID) {
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
        a.full_name,
        p.place_name,
        st.service_type
      FROM appointment a
      LEFT JOIN place p ON a.place_ID = p.place_ID
      LEFT JOIN service_type st ON a.service_ID = st.service_ID
      WHERE a.staff_ID = ? 
        AND a.status IN ('approved','rejected','completed')
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

/* =========================
 *  ปิดเคส + บันทึกสรุปคำแนะนำ (เก็บในตาราง appointment)
 * ========================= */
app.post("/api/appointments/complete", (req, res) => {
  const { appointment_ID, advice_detail } = req.body;

  if (!appointment_ID || !advice_detail) {
    return res.status(400).json({ error: "Missing data" });
  }

  const sql = `
    UPDATE appointment
    SET status = 'completed',
        appointment_summary = ?
    WHERE appointment_ID = ?
  `;

  db.query(sql, [advice_detail, appointment_ID], (err, result) => {
    if (err) {
      console.error("Update failed:", err);
      return res.status(500).json({ error: "Update failed" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Appointment not found" });
    }
    res.json({ message: "Completed successfully" });
  });
});


/* =========================
 *  Dashboard Summary
 * ========================= */
app.get("/api/dashboard", (req, res) => {
  const { period } = req.query;

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
    ${whereClause ? `AND ${whereClause.replace("WHERE ", "")}` : ""}
    GROUP BY st.service_ID
  `;

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

/* =========================
 *  Place APIs
 * ========================= */
app.put("/api/places/:id/status", (req, res) => {
  const placeId = req.params.id;
  const { status } = req.body;

  if (!status || !["open", "closed"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  db.query(
    "UPDATE place SET place_status = ? WHERE place_ID = ?",
    [status, placeId],
    (err) => {
      if (err) {
        console.error("Error updating place_status:", err);
        return res.status(500).json({ error: "Database error" });
      }
      res.json({ message: "สถานะถูกอัปเดตแล้ว" });
    }
  );
});

// GET ดึง staff ทั้งหมด
app.get("/api/staff", (req, res) => {
  db.query(
    "SELECT first_name, last_name, email, phone_number, staff_status, role FROM staff",
    (err, results) => {
      if (err) {
        console.error("Error fetching staff:", err);
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

// API Staff เปิดปิดเพิ่ม 
// POST เพิ่ม staff ใหม่
app.post("/api/staff", (req, res) => {
  const { first_name, last_name, email, phone_number, role } = req.body;

  console.log("เพิ่ม staff:", {
    first_name,
    last_name,
    email,
    phone_number,
    role,
  });

  if (!first_name || !last_name || !email || !role) {
    console.error("Missing fields:", { first_name, last_name, email, role });
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
        console.error("Error adding staff:", err);
        return res.status(500).json({ error: "Database error" });
      }

      res.json({
        message: "เพิ่ม staff สำเร็จ",
        staff_ID: result.insertId,
      });
    }
  );
});

//อัปเดตสถานะ staff
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
        console.error("Error updating staff status:", err);
        return res.status(500).json({ error: "Database error" });
      }

      res.json({ message: "อัปเดตสถานะเรียบร้อย" });
    }
  );
});

// GET ดึง staff ทั้งหมด
app.get("/api/staff", (req, res) => {
  db.query(
    "SELECT first_name, last_name, email, phone_number, staff_status, role FROM staff",
    (err, results) => {
      if (err) {
        console.error("Error fetching staff:", err);
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
      console.error("Failed to insert place:", err);
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

/* =========================
 *  Search
 * ========================= */
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
      a.full_name,
      p.place_name,
      st.service_type
    FROM appointment a
    LEFT JOIN place p ON a.place_ID = p.place_ID
    LEFT JOIN service_type st ON a.service_ID = st.service_ID
    WHERE 
      a.full_name LIKE ? OR
      a.user_email LIKE ?
    ORDER BY a.appointment_ID DESC
  `;

  const searchTerm = `%${keyword}%`;
  db.query(searchQuery, [searchTerm, searchTerm], (err, results) => {
    if (err) {
      console.error("Error searching appointments:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(results);
  });
});

/* =========================
 *  Login
 * ========================= */
app.post("/api/login", (req, res) => {
  console.log("เข้าถึง /api/login แล้ว");
  let { email } = req.body;
  console.log("Email received:", email);

  if (!email) {
    return res.status(400).json({ error: "Missing email" });
  }

  email = email.trim().toLowerCase();

  db.query("SELECT * FROM staff WHERE email = ?", [email], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    if (results.length > 0) {
      const staff = results[0];
      if (staff.staff_status !== "active") {
        return res.status(403).json({ error: "บัญชีถูกปิดการใช้งาน" });
      }
      return res.json({
        message: "เข้าสู่ระบบเจ้าหน้าที่",
        staff_ID: staff.staff_ID,
        role: staff.role,
        name: `${staff.first_name} ${staff.last_name}`,
      });
    }

    if (email.endsWith("@lamduan.mfu.ac.th")) {
      return res.json({
        message: "เข้าสู่ระบบนักศึกษา",
        role: "student",
        name: email.split("@")[0],
      });
    }

    return res.status(401).json({ error: "ไม่อนุญาตให้เข้าใช้งาน" });
  });
});

/* =========================
 *  Start server
 * ========================= */
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
  console.log("API ready for appointments");
});
