const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
const dayjs = require("dayjs");
const user = require('./server/user')

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/user', user)

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// connect MySQL
const db = mysql.createConnection({
  host: "localhost",
  user: "counselling",
  password: "uW9Zlc]pX3!PHlak",
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
 * staff รับเคส / ปฏิเสธเคส
 * ========================= */
app.put("/api/admin/appointments/assign/:id", (req, res) => {
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

app.put("/api/admin/appointments/reject/:id", (req, res) => {
  const appointmentID = req.params.id;
  // รองรับทั้งสองชื่อ เพื่อกันพลาดจาก front ที่ส่งมาไม่ตรง
  const staff_ID = req.body.staff_ID;
  const reasonRaw = req.body.reject_reason ?? req.body.reason;
  const reason = (reasonRaw || "").trim();

  console.log("PUT /reject", { appointmentID, staff_ID, reason });

  if (!staff_ID) return res.status(400).json({ error: "Missing staff_ID" });
  if (!reason) return res.status(400).json({ error: "Missing reject reason" });

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
    res.json({
      message: "ปฏิเสธเคสสำเร็จ",
      appointmentID,
      reject_reason: reason,
    });
  });
});

/* =========================
 * รายการจอง (staff ดู pending)
 * ========================= */
app.get("/api/admin/appointments", (req, res) => {
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
      p.place_ID,
      p.place_name_th,
      p.place_name_en,
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
 * สถานะการจองของ user
 * ========================= */
app.get("/api/user/appointments/status", (req, res) => {
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
      p.place_ID,
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
 * ยกเลิกการจอง (ไม่เก็บเหตุผล)
 * ========================= */
app.put("/api/user/appointments/cancel/:id", (req, res) => {
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
app.get("/api/admin/history", (req, res) => {
  const { staff_ID, role } = req.query;
  if (!role) return res.status(400).json({ error: "Missing role" });

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
        a.staff_ID,
        CASE 
          WHEN a.staff_ID = ? THEN a.appointment_summary
          ELSE NULL
        END AS appointment_summary,
        p.place_name_th,
        p.place_name_en,
        st.service_type
      FROM appointment a
      LEFT JOIN place p ON a.place_ID = p.place_ID
      LEFT JOIN service_type st ON a.service_ID = st.service_ID
      WHERE a.status IN ('approved','rejected','completed','cancelled')
      ORDER BY a.appointment_ID DESC
    `;
    values = [Number(staff_ID) || 0];
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
        a.staff_ID,
        a.appointment_summary,
        p.place_ID,
        p.place_name_th,
        p.place_name_en,
        st.service_type
      FROM appointment a
      LEFT JOIN place p ON a.place_ID = p.place_ID
      LEFT JOIN service_type st ON a.service_ID = st.service_ID
      WHERE a.staff_ID = ?
        AND a.status IN ('approved','rejected','completed','cancelled')
      ORDER BY a.appointment_ID DESC
    `;
    values = [Number(staff_ID) || 0];
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
app.post("/api/admin/appointments/complete", (req, res) => {
  const { appointment_ID, advice_detail, staff_ID } = req.body;

  if (!appointment_ID || !advice_detail || !staff_ID) {
    return res.status(400).json({ error: "Missing data" });
  }

  const sql = `
    UPDATE appointment
    SET status = 'completed',
        appointment_summary = ?
    WHERE appointment_ID = ? AND staff_ID = ?
  `;

  db.query(
    sql,
    [advice_detail, Number(appointment_ID), Number(staff_ID)],
    (err, result) => {
      if (err) return res.status(500).json({ error: "Update failed" });
      if (result.affectedRows === 0) {
        return res
          .status(403)
          .json({ error: "Permission denied or not found" });
      }
      res.json({ message: "Completed successfully" });
    }
  );
});

/* =========================
 *  Dashboard Summary
 * ========================= */
app.get("/api/admin/dashboard", (req, res) => {
  const { period, startDate: qsStart, endDate: qsEnd } = req.query;

  let whereClause = "";
  const params = [];
  const today = dayjs();

  // 1) ถ้ามี start/end จาก query ให้ใช้ก่อน
  if (qsStart && qsEnd) {
    whereClause = "WHERE a.date BETWEEN ? AND ?";
    params.push(qsStart, qsEnd);
  }

  // 2) ถ้าไม่มี ให้ใช้ period แทน
  else if (period && period !== "ทั้งหมด") {
    let startDate, endDate;
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

  const dateWhere = whereClause ? whereClause : "WHERE 1=1";

  // แยกชั้นปีตามสูตร: (ปีการศึกษาไทยปัจจุบัน − intakeYY) + 1
  const byYearQuery = `
    SELECT year, COUNT(*) AS count
    FROM (
      SELECT
        CASE
          WHEN currYY < intakeYY THEN NULL
          ELSE LEAST(GREATEST((currYY - intakeYY) + 1, 1), 4)
        END AS year
      FROM (
        SELECT 
          CAST(SUBSTRING(a.student_id,1,2) AS UNSIGNED) AS intakeYY,
          MOD((YEAR(CURDATE()) + 543 - (MONTH(CURDATE()) < 8)), 100) AS currYY
        FROM appointment a
        ${dateWhere}
          AND a.status NOT IN ('rejected','cancelled')
          AND a.student_id REGEXP '^[0-9]{10}$'
      ) s
    ) x
    WHERE year IS NOT NULL
    GROUP BY year
    ORDER BY year
  `;

  const byFacultyQuery = `
    SELECT 
      mm.faculty_th,
      mm.faculty_en,
      COUNT(*) AS count
    FROM appointment a
    JOIN major_map mm
      ON mm.major_code = SUBSTRING(a.student_id, 4, 4)
    ${dateWhere}
      AND a.status NOT IN ('rejected','cancelled')
      AND a.student_id REGEXP '^[0-9]{10}$'
    GROUP BY mm.faculty_th, mm.faculty_en
    ORDER BY count DESC
  `;

  // === Run queries ===
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

              db.query(byYearQuery, params, (err7, yearResult) => {
                if (err7) return res.status(500).json({ error: err7 });

                // byFaculty
                db.query(byFacultyQuery, params, (errF, facultyResult) => {
                  if (errF) return res.status(500).json({ error: errF });

                  res.json({
                    summary: summaryResult[0],
                    serviceTypes: allServices,
                    completedTypes: completedServices,
                    byDay: dayResult,
                    byTime: timeResult,
                    monthlyTrend: trendResult,
                    byFaculty: facultyResult,
                    byYear: yearResult,
                  });
                });
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
app.put("/api/admin/places/status/:id", (req, res) => {
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

// GET ดึง staff ทั้งหมด (ส่งชื่อ 2 ภาษาออกไป)
app.get("/api/admin/staff", (req, res) => {
  const sql = `
    SELECT staff_ID, email, phone_number, role, staff_status,
           first_name_th, last_name_th, first_name_en, last_name_en
    FROM staff
  `;
  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json({ error: "Database error" });
    const staffList = rows.map((s) => ({
      email: s.email,
      phone: s.phone_number,
      role: s.role,
      active: s.staff_status === "active",
      first_name_th: s.first_name_th,
      last_name_th: s.last_name_th,
      first_name_en: s.first_name_en,
      last_name_en: s.last_name_en,
    }));
    res.json(staffList);
  });
});

// API Staff เปิดปิดเพิ่ม
// POST เพิ่ม staff ใหม่ (รับชื่อ 2 ภาษา)
app.post("/api/admin/staff", (req, res) => {
  const {
    first_name_th,
    last_name_th,
    first_name_en,
    last_name_en,
    email,
    phone_number,
    role,
  } = req.body;
  if (
    !email ||
    (!first_name_th && !first_name_en) ||
    (!last_name_th && !last_name_en)
  ) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  const sql = `
    INSERT INTO staff
      (first_name_th, last_name_th, first_name_en, last_name_en, email, phone_number, role, staff_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
  `;
  db.query(
    sql,
    [
      first_name_th,
      last_name_th,
      first_name_en,
      last_name_en,
      email,
      phone_number,
      role || "staff",
    ],
    (err, result) => {
      if (err) return res.status(500).json({ error: "Database error" });
      res.json({ message: "เพิ่ม staff สำเร็จ", staff_ID: result.insertId });
    }
  );
});

//อัปเดตสถานะ staff
app.put("/api/admin/staff/status", (req, res) => {
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

app.get("/api/admin/places", (req, res) => {
  db.query("SELECT * FROM place", (err, results) => {
    if (err) return res.status(500).json({ error: err });
    const formatted = results.map((p) => ({
      place_ID: p.place_ID,
      name_th: p.place_name_th,
      name_en: p.place_name_en,
      target_group: p.target_group,
      place_status: p.place_status,
    }));
    res.json(formatted);
  });
});

app.post("/api/admin/places", (req, res) => {
  const { name_th, name_en, target } = req.body;

  if (!name_th && !name_en) {
    return res.status(400).json({ error: "Missing name" });
  }
  if (!target) {
    return res.status(400).json({ error: "Missing target group" });
  }

  const sql = `
    INSERT INTO place (place_name_th, place_name_en, place_status, target_group)
    VALUES (?, ?, 'open', ?)
  `;

  db.query(sql, [name_th || "", name_en || "", target], (err, result) => {
    if (err) {
      console.error("Failed to insert place:", err);
      return res.status(500).json({ error: "Database error" });
    }

    res.json({
      message: "เพิ่มสถานที่สำเร็จ",
      place_ID: result.insertId,
      name_th,
      name_en,
      target,
      place_status: "open",
    });
  });
});

/* =========================
 *  Search
 * ========================= */
app.get("/api/admin/search", (req, res) => {
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
      p.place_ID,
      p.place_name_th,
      p.place_name_en,
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

  email = String(email).trim().toLowerCase();

  const sql = `
    SELECT 
      staff_ID,
      role,
      staff_status,
      email,
      phone_number,
     first_name_th,
     last_name_th,
     first_name_en,
     last_name_en
    FROM staff
    WHERE email = ?
    LIMIT 1
  `;

  db.query(sql, [email], (err, rows) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    if (rows.length > 0) {
      const s = rows[0];
      if (s.staff_status !== "active") {
        return res.status(403).json({ error: "บัญชีถูกปิดการใช้งาน" });
      }

      // ประกอบชื่อ 2 ภาษา + ชื่อ fallback (คง field name เดิมไว้เพื่อ backward-compat)
      const name_th = [s.first_name_th, s.last_name_th]
        .filter(Boolean)
        .join(" ")
        .trim();
      const name_en = [s.first_name_en, s.last_name_en]
        .filter(Boolean)
        .join(" ")
        .trim();
      const legacy_name = name_th || name_en || ""; // name เดิม ไว้ให้โค้ดเก่ายังใช้ได้
      return res.json({
        message: "เข้าสู่ระบบเจ้าหน้าที่",
        staff_ID: s.staff_ID,
        role: s.role,
        email: s.email,
        phone_number: s.phone_number || null,
        name: legacy_name,
        name_th, // ชื่อไทย
        name_en, // ชื่ออังกฤษ
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
