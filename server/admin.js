const express = require("express");
const dayjs = require("dayjs");
const { verifyToken, verifyRole } = require("./auth");
const ExcelJS = require("exceljs");

module.exports = (db) => {
  const router = express.Router();

  router.use(verifyToken);
  router.use(verifyRole("admin", "staff"));

  /* =========================
   *  staff รับเคส
   * ========================= */
  router.put("/appointments/assign/:id", (req, res) => {
    const appointmentID = Number(req.params.id);
    const staff_ID = req.user?.staff_ID;
    if (!Number.isInteger(appointmentID) || appointmentID <= 0)
      return res.status(400).json({ error: "Invalid appointment_ID" });
    if (!staff_ID) return res.status(403).json({ error: "No staff in token" });

    db.query(
      "UPDATE appointment SET staff_ID = ?, status = 'approved' WHERE appointment_ID = ? AND status = 'pending'",
      [staff_ID, appointmentID],
      (err, result) => {
        if (err) return res.status(500).json({ error: "DB error" });
        if (result.affectedRows === 0)
          return res
            .status(409)
            .json({ error: "Cannot assign: not found or not pending" });
        res.json({ message: "assigned", appointmentID, staff_ID });
      }
    );
  });

  /* =========================
   *  staff ปฏิเสธเคส
   * ========================= */
  router.put("/appointments/reject/:id", (req, res) => {
    const appointmentID = Number(req.params.id);
    const staff_ID = req.user?.staff_ID;
    const reason = String(req.body?.reject_reason || "").trim();
    if (!Number.isInteger(appointmentID) || appointmentID <= 0)
      return res.status(400).json({ error: "Invalid appointment_ID" });
    if (!staff_ID) return res.status(403).json({ error: "No staff in token" });
    if (!reason)
      return res.status(400).json({ error: "Missing reject_reason" });

    db.query(
      "UPDATE appointment SET status = 'rejected', staff_ID = ?, reject_reason = ? WHERE appointment_ID = ? AND status IN ('pending','approved')",
      [staff_ID, reason, appointmentID],
      (err, result) => {
        if (err) return res.status(500).json({ error: "DB error" });
        if (result.affectedRows === 0)
          return res
            .status(409)
            .json({ error: "Cannot reject: not found or already finalized" });
        res.json({
          message: "rejected",
          appointmentID,
          staff_ID,
          reject_reason: reason,
        });
      }
    );
  });

  /* =========================
   *  รายการจองที่ pending
   * ========================= */
  router.get("/appointments", (req, res) => {
    const sql = `
      SELECT a.appointment_ID, a.date, a.time, a.status,
             a.service_ID, a.other_type, a.phone_number,
             a.user_email, a.full_name,
             p.place_ID, p.place_name_th, p.place_name_en,
             st.service_type
      FROM appointment a
      LEFT JOIN place p ON a.place_ID = p.place_ID
      LEFT JOIN service_type st ON a.service_ID = st.service_ID
      WHERE a.status = 'pending'
      ORDER BY a.appointment_ID DESC
    `;
    db.query(sql, (err, results) => {
      if (err) return res.status(500).json({ error: err });
      res.json(results);
    });
  });

  /* =========================
   *  ประวัติการจอง
   * ========================= */
  router.get("/history", (req, res) => {
    const role = req.user?.role;
    const staff_ID = req.user?.staff_ID;

    let sql, params;

    if (role === "admin") {
      sql = `
      SELECT 
        a.*,
        p.place_name_th, 
        p.place_name_en, 
        st.service_type,
        sf.first_name_th  AS staff_first_name_th,
        sf.last_name_th   AS staff_last_name_th,
        sf.first_name_en  AS staff_first_name_en,
        sf.last_name_en   AS staff_last_name_en,
        sf.email          AS staff_email
      FROM appointment a
      LEFT JOIN place p        ON a.place_ID = p.place_ID
      LEFT JOIN service_type st ON a.service_ID = st.service_ID
      LEFT JOIN staff sf       ON a.staff_ID = sf.staff_ID
      WHERE a.status IN ('approved','rejected','completed','cancelled')
      ORDER BY a.appointment_ID DESC
    `;
      params = [];
    } else if (role === "staff") {
      sql = `
      SELECT 
        a.*,
        p.place_name_th, 
        p.place_name_en, 
        st.service_type,
        sf.first_name_th  AS staff_first_name_th,
        sf.last_name_th   AS staff_last_name_th,
        sf.first_name_en  AS staff_first_name_en,
        sf.last_name_en   AS staff_last_name_en,
        sf.email          AS staff_email
      FROM appointment a
      LEFT JOIN place p        ON a.place_ID = p.place_ID
      LEFT JOIN service_type st ON a.service_ID = st.service_ID
      LEFT JOIN staff sf       ON a.staff_ID = sf.staff_ID
      WHERE a.staff_ID = ?
        AND a.status IN ('approved','rejected','completed','cancelled')
      ORDER BY a.appointment_ID DESC
    `;
      params = [staff_ID];
    } else {
      return res.status(403).json({ error: "Forbidden" });
    }

    db.query(sql, params, (err, rows) => {
      if (err) return res.status(500).json({ error: "DB error" });
      res.json(rows || []);
    });
  });

  /* =========================
   *  ปิดเคส (complete)
   * ========================= */
  router.post("/appointments/complete", (req, res) => {
    const { appointment_ID, advice_detail } = req.body;
    const tokenStaffId = req.user?.staff_ID; // จาก token
    const role = req.user?.role;

    if (!appointment_ID || !advice_detail) {
      return res.status(400).json({ error: "Missing data" });
    }
    if (!tokenStaffId) {
      return res.status(403).json({ error: "No staff in token" });
    }

    const sql = `
      UPDATE appointment
      SET status = 'completed', appointment_summary = ?
      WHERE appointment_ID = ? AND staff_ID = ?
    `;
    const params = [advice_detail, appointment_ID, tokenStaffId];
    db.query(sql, params, (err, result) => {
      if (err) return res.status(500).json({ error: "Update failed" });
      if (result.affectedRows === 0) {
        return res
          .status(403)
          .json({ error: "Permission denied or not found" });
      }
      res.json({ message: "Completed successfully" });
    });
  });

  /* =========================
   *  Dashboard Summary
   * ========================= */
  router.get("/dashboard", (req, res) => {
    const { period, startDate, endDate } = req.query;
    const role = req.user?.role;
    const staff_ID = req.user?.staff_ID;

    let where = "WHERE 1=1";
    const params = [];

    // ---- filter ตามวันที่เหมือนเดิม ----
    if (startDate && endDate) {
      where += " AND a.date BETWEEN ? AND ?";
      params.push(startDate, endDate);
    } else if (period && period !== "ทั้งหมด") {
      const today = dayjs();
      let s, e;
      switch (period) {
        case "สัปดาห์นี้":
          s = today.startOf("week");
          e = today.endOf("week");
          break;
        case "สัปดาห์ที่ผ่านมา":
          s = today.subtract(1, "week").startOf("week");
          e = today.subtract(1, "week").endOf("week");
          break;
        case "เดือนนี้":
          s = today.startOf("month");
          e = today.endOf("month");
          break;
        case "เดือนที่ผ่านมา":
          s = today.subtract(1, "month").startOf("month");
          e = today.subtract(1, "month").endOf("month");
          break;
        case "ปีนี้ (จนถึงปัจจุบัน)":
          s = today.startOf("year");
          e = today;
          break;
      }
      if (s && e) {
        where += " AND a.date BETWEEN ? AND ?";
        params.push(s.format("YYYY-MM-DD"), e.format("YYYY-MM-DD"));
      }
    }

    // 🔹 ถ้าเป็น staff ให้สรุปเฉพาะเคสของตัวเอง
    if (role === "staff" && staff_ID) {
      where += " AND a.staff_ID = ?";
      params.push(staff_ID);
    }
    // 🔹 ถ้าเป็น admin ไม่ต้องใส่เงื่อนไข staff -> เห็นทุกเคสเหมือนเดิม

    const summaryQuery = `
      SELECT 
        COUNT(*) AS total,
        SUM(a.status = 'pending')   AS pending,
        SUM(a.status = 'approved')  AS approved,
        SUM(a.status = 'rejected')  AS rejected,
        SUM(a.status = 'completed') AS completed,
        SUM(a.status = 'cancelled') AS cancelled
      FROM appointment a
      ${where}
    `;

    const serviceTypeQuery = `
      SELECT 
        st.service_type,
        COUNT(a.appointment_ID)     AS count,
        SUM(a.status = 'completed') AS countCompleted
      FROM service_type st
      LEFT JOIN appointment a ON st.service_ID = a.service_ID
      ${where.replace("WHERE", "AND")}
      GROUP BY st.service_type
    `;

    const byDayQuery = `
      SELECT DAYNAME(a.date) AS day, COUNT(*) AS count
      FROM appointment a
      ${where}
      GROUP BY day
    `;

    const byTimeQuery = `
      SELECT a.time, COUNT(*) AS count
      FROM appointment a
      ${where}
      GROUP BY a.time
      ORDER BY a.time ASC
    `;

    const monthlyTrendQuery = `
      SELECT MONTH(a.date) AS month, st.service_type, COUNT(*) AS count
      FROM appointment a
      LEFT JOIN service_type st ON a.service_ID = st.service_ID
      ${where} AND YEAR(a.date) = YEAR(CURDATE())
      GROUP BY month, st.service_type
      ORDER BY month
    `;

    const byFacultyQuery = `
      SELECT 
        mm.faculty_th,
        mm.faculty_en,
        COUNT(a.appointment_ID) AS count
      FROM appointment a
      LEFT JOIN major_map mm
        ON a.student_code IS NOT NULL
        AND a.student_code <> ''
        AND mm.major_code = SUBSTRING(a.student_code, 4, 4)
      ${where}
      GROUP BY mm.faculty_th, mm.faculty_en
      ORDER BY count DESC
    `;

    const byYearQuery = `
      SELECT
        CASE
          WHEN a.student_code IS NULL OR a.student_code = '' THEN NULL
          ELSE
            (
              ((YEAR(CURDATE()) + 43) % 100)
              - CAST(SUBSTRING(a.student_code, 1, 2) AS UNSIGNED)
              + 1
            )
        END AS \`year\`,
        COUNT(a.appointment_ID) AS count
      FROM appointment a
      ${where}
      GROUP BY \`year\`
      HAVING \`year\` BETWEEN 1 AND 4
      ORDER BY \`year\`;
    `;

    db.query(summaryQuery, params, (e1, summary) => {
      if (e1) return res.status(500).json({ error: "DB error: summary" });

      db.query(serviceTypeQuery, params, (e2, byType) => {
        if (e2) return res.status(500).json({ error: "DB error: serviceType" });

        db.query(byDayQuery, params, (e3, byDay) => {
          if (e3) return res.status(500).json({ error: "DB error: byDay" });

          db.query(byTimeQuery, params, (e4, byTime) => {
            if (e4) return res.status(500).json({ error: "DB error: byTime" });

            db.query(monthlyTrendQuery, params, (e5, trend) => {
              if (e5) return res.status(500).json({ error: "DB error: trend" });

              db.query(byFacultyQuery, params, (e6, byFacultyRows) => {
                const byFaculty = e6 ? [] : byFacultyRows || [];

                db.query(byYearQuery, params, (e7, byYearRows) => {
                  const byYear = e7 ? [] : byYearRows || [];

                  res.set("Cache-Control", "no-store");
                  return res.json({
                    summary: summary?.[0] || {
                      total: 0,
                      pending: 0,
                      approved: 0,
                      rejected: 0,
                      completed: 0,
                      cancelled: 0,
                    },
                    serviceTypes: byType || [],
                    byDay: byDay || [],
                    byTime: byTime || [],
                    monthlyTrend: trend || [],
                    byFaculty: byFaculty || [],
                    byYear: byYear || [],
                  });
                });
              });
            });
          });
        });
      });
    });
  });

  /* ======================
   *  Dashboard Exel
   * ====================== */
  router.get("/dashboard/xlsx", async (req, res) => {
    const { period, startDate, endDate } = req.query;

    let where = "WHERE 1=1";
    const params = [];

    // ==== filter วันที่ เหมือนเดิม ====
    if (startDate && endDate) {
      where += " AND a.date BETWEEN ? AND ?";
      params.push(startDate, endDate);
    } else if (period && period !== "ทั้งหมด") {
      const today = dayjs();
      let s, e;
      switch (period) {
        case "สัปดาห์นี้":
          s = today.startOf("week");
          e = today.endOf("week");
          break;
        case "สัปดาห์ที่ผ่านมา":
          s = today.subtract(1, "week").startOf("week");
          e = today.subtract(1, "week").endOf("week");
          break;
        case "เดือนนี้":
          s = today.startOf("month");
          e = today.endOf("month");
          break;
        case "เดือนที่ผ่านมา":
          s = today.subtract(1, "month").startOf("month");
          e = today.subtract(1, "month").endOf("month");
          break;
        case "ปีนี้ (จนถึงปัจจุบัน)":
          s = today.startOf("year");
          e = today;
          break;
      }
      if (s && e) {
        where += " AND a.date BETWEEN ? AND ?";
        params.push(s.format("YYYY-MM-DD"), e.format("YYYY-MM-DD"));
      }
    }

    const sql = `
    SELECT
      a.appointment_ID,
      a.date,
      a.time,
      a.status,
      a.user_email,
      a.student_code,
      a.nationality,
      a.appointment_summary,
      st.service_type,
      s.faculty_th,
      s.faculty_en
    FROM appointment a
    LEFT JOIN student s
      ON s.email = a.user_email
      OR (
        a.student_code IS NOT NULL
        AND a.student_code <> ''
        AND s.email LIKE CONCAT(a.student_code, '%')
      )
    LEFT JOIN service_type st ON a.service_ID = st.service_ID
    ${where}
    ORDER BY a.date, a.time, a.appointment_ID
  `;

    const extractStudentCode = (email) => {
      if (!email) return "";
      const m = String(email).match(/(\d{8,12})/);
      return m ? m[1] : "";
    };

    db.query(sql, params, async (err, rows) => {
      if (err) {
        console.error("XLSX ERROR:", err);
        return res.status(500).json({ error: "DB error: detail xlsx" });
      }

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Dashboard");

      // กำหนดคอลัมน์ + ความกว้าง (ระยะห่างคอลัมน์)
      sheet.columns = [
        { header: "ประเภทผู้ใช้บริการ", key: "userType", width: 18 },
        { header: "รหัสนักศึกษา", key: "studentCode", width: 16 },
        { header: "สำนักวิชา", key: "faculty", width: 30 },
        { header: "วันที่รับบริการ", key: "date", width: 14 },
        { header: "ประเภทบริการ", key: "serviceType", width: 32 },
        { header: "สถานะ", key: "status", width: 18 },
        { header: "สรุปคำแนะนำ", key: "summary", width: 80 },
      ];

      // เติมข้อมูลแถว ๆ
      rows.forEach((r) => {
        const natRaw = (r.nationality || "").toLowerCase();
        let userType = "";
        if (/thai|ไทย/.test(natRaw)) userType = "นักศึกษาไทย";
        else if (natRaw) userType = "นักศึกษาต่างชาติ";

        let statusLabel = "";
        if (["pending", "approved"].includes(r.status))
          statusLabel = "อยู่ระหว่างให้คำปรึกษา";
        else if (["completed", "rejected", "cancelled"].includes(r.status))
          statusLabel = "ยุติการให้คำปรึกษา";

        const dateStr = r.date ? dayjs(r.date).format("YYYY-MM-DD") : "";

        sheet.addRow({
          userType,
          studentCode: extractStudentCode(r.user_email),
          faculty: r.faculty_th || r.faculty_en || "",
          date: dateStr,
          serviceType: r.service_type || "",
          status: statusLabel,
          summary: r.appointment_summary || "",
        });
      });

      // styling หัวตาราง
      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.alignment = { vertical: "middle", horizontal: "center" };
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE0E0E0" },
        };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });

      // styling แถวข้อมูล
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        row.alignment = { vertical: "top", wrapText: true };
        row.eachCell((cell) => {
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        });
      });

      // ส่งไฟล์ออก
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="consultation_summary_${dayjs().format(
          "YYYYMMDD"
        )}.xlsx"`
      );

      await workbook.xlsx.write(res);
      res.end();
    });
  });

  /* =========================
   *  GET ดึง staff ทั้งหมด (ส่งชื่อ 2 ภาษาออกไป)
   * ========================= */
  router.get("/staff", (req, res) => {
    const sql = `
    SELECT staff_ID, email, phone_number, role, staff_status,
           first_name_th, last_name_th, first_name_en, last_name_en
    FROM staff
    ORDER BY staff_ID ASC
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

  /* =========================
   *  POST เพิ่ม staff ใหม่ (รับชื่อ 2 ภาษา)
   * ========================= */
  router.post("/staff/add", (req, res) => {
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

  /* =========================
   *  อัปเดตสถานะ staff
   * ========================= */
  router.put("/staff/status", (req, res) => {
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

  /* =========================
   *  สถานที่ (Place APIs)
   * ========================= */
  router.get("/places", (req, res) => {
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

  router.post("/places/add", (req, res) => {
    const { name_th, name_en, target } = req.body;
    if (!name_th && !name_en)
      return res.status(400).json({ error: "Missing name" });
    if (!target) return res.status(400).json({ error: "Missing target group" });

    const sql = `
      INSERT INTO place (place_name_th, place_name_en, place_status, target_group)
      VALUES (?, ?, 'open', ?)
    `;
    db.query(sql, [name_th || "", name_en || "", target], (err, result) => {
      if (err) return res.status(500).json({ error: err });
      res.json({ message: "เพิ่มสถานที่สำเร็จ", place_ID: result.insertId });
    });
  });

  router.put("/places/status/:id", (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!status || !["open", "closed"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    db.query(
      "UPDATE place SET place_status = ? WHERE place_ID = ?",
      [status, id],
      (err) => {
        if (err) return res.status(500).json({ error: "Database error" });
        res.json({ message: "สถานะถูกอัปเดตแล้ว" });
      }
    );
  });

  /* =========================
   *  ค้นหา
   * ========================= */
  router.get("/search", (req, res) => {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: "Missing search keyword" });

    const term = `%${q}%`;
    const sql = `
      SELECT a.appointment_ID, a.date, a.time, a.status, a.full_name,
             p.place_name_th, p.place_name_en, st.service_type
      FROM appointment a
      LEFT JOIN place p ON a.place_ID = p.place_ID
      LEFT JOIN service_type st ON a.service_ID = st.service_ID
      WHERE a.full_name LIKE ? OR a.user_email LIKE ?
    `;
    db.query(sql, [term, term], (err, results) => {
      if (err) return res.status(500).json({ error: err });
      res.json(results);
    });
  });

  return router;
};
