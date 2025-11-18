// server/auth.js
const jwt = require("jsonwebtoken");
require("dotenv").config();

const ACCESS_SECRET = process.env.ACCESS_SECRET || "supersecret";
const ACCESS_EXPIRE = "15m"; // อายุ token 15 นาที

// สร้าง token
function signAccess(payload) {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRE });
}

// Middleware ตรวจสอบ JWT จาก cookieฟ
function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  let token = null;

  // 1) ตรวจจาก cookie ก่อน
  if (req.cookies && req.cookies.access_token) {
    token = req.cookies.access_token;
  }
  // 2) เผื่อมี Bearer header
  else if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ error: "Missing token" });
  }

  jwt.verify(token, ACCESS_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: "Token expired or invalid" });
    }
    req.user = decoded;
    next();
  });
}

function verifyRole(...roles) {
  return (req, res, next) => {
    const role = req.user?.role;
    if (!role || !roles.includes(role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}

module.exports = { signAccess, verifyToken, verifyRole };
