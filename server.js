const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { signAccess, verifyToken } = require("./server/auth");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cookieParser());

// ---- CORS (from .env) ----
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, cb) {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

// app.use((req, res, next) => {
//   console.log(`${req.method} ${req.url}`);
//   next();
// });

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME,
});

db.connect((err) => {
  if (err) console.error("DB Error:", err);
  else console.log("Connected to MySQL");
});

const user = require("./server/user")(db);
const admin = require("./server/admin")(db);

app.use("/api/user", user);
app.use("/api/admin", admin);

app.get("/api/me", verifyToken, (req, res) => {
  res.json({
    role: req.user.role || null,
    staff_ID: req.user.staff_ID || null,
    email: req.user.email || null,
  });
});

/* ---------- Login ---------- */
app.post("/api/login", (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Missing email" });

  const sql =
    "SELECT staff_ID, role, staff_status, email FROM staff WHERE email = ? LIMIT 1";
  db.query(sql, [email], (err, rows) => {
    if (err) return res.status(500).json({ error: "Database error" });

    if (rows.length > 0) {
      const s = rows[0];
      if (s.staff_status !== "active") {
        return res.status(403).json({ error: "บัญชีถูกปิดการใช้งาน" });
      }

      const payload = { staff_ID: s.staff_ID, role: s.role, email: s.email };
      const token = signAccess(payload);

      // set cookie httpOnly
      res.cookie("access_token", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        maxAge: 15 * 60 * 1000,
      });

      return res.json({ message: "เข้าสู่ระบบสำเร็จ", role: s.role });
    }

    if (email.endsWith("@lamduan.mfu.ac.th")) {
      const token = signAccess({ role: "student", email });
      res.cookie("access_token", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        maxAge: 15 * 60 * 1000,
      });
      return res.json({ message: "เข้าสู่ระบบนักศึกษา", role: "student" });
    }

    return res.status(401).json({ error: "ไม่อนุญาตให้เข้าใช้งาน" });
  });
});

/* ---------- route check token ---------- */
app.get("/api/protected", verifyToken, (req, res) => {
  res.json({ message: "Access granted", user: req.user });
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
