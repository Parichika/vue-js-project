// import_majors.js
const xlsx = require("xlsx");
const mysql = require("mysql");
const path = require("path");

const FILE = path.join(__dirname, "MFU_School_Major.xlsx");

// === MySQL ===
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "counselling-queue",
});

const UPSERT_SQL = `
  INSERT INTO major_map (major_code, program_th, program_en, faculty_th, faculty_en)
  VALUES (?, ?, ?, ?, ?)
  ON DUPLICATE KEY UPDATE
    program_th = VALUES(program_th),
    program_en = VALUES(program_en),
    faculty_th = VALUES(faculty_th),
    faculty_en = VALUES(faculty_en)
`;

db.connect(async (err) => {
  if (err) throw err;
  console.log("DB connected");
  try {
    await run();
  } catch (e) {
    console.error(e);
  } finally {
    db.end();
  }
});

function isStructuredHeaderRow(obj) {
  if (!obj) return false;
  const keys = Object.keys(obj).map((k) => k.toLowerCase().trim());
  return [
    "major_code",
    "program_th",
    "program_en",
    "faculty_th",
    "faculty_en",
  ].every((k) => keys.includes(k));
}

async function run() {
  const wb = xlsx.readFile(FILE, { cellDates: false });
  console.log("Sheets:", wb.SheetNames);

  let totalOK = 0,
    totalFail = 0;

  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];

    const rowsStructured = xlsx.utils.sheet_to_json(ws, {
      defval: "",
      raw: false,
    });
    let ok = 0,
      fail = 0;

    if (rowsStructured.length > 0 && isStructuredHeaderRow(rowsStructured[0])) {
      console.log(`[${name}] detected STRUCTURED columns`);

      for (const r of rowsStructured) {
        const major_code = String(r.major_code || "").trim();
        if (!/^\d{4}$/.test(major_code)) continue;

        const program_th = String(r.program_th || "").trim();
        const program_en = String(r.program_en || "").trim();
        const faculty_th = String(r.faculty_th || "").trim();
        const faculty_en = String(r.faculty_en || "").trim();

        await new Promise((resolve) => {
          db.query(
            UPSERT_SQL,
            [major_code, program_th, program_en, faculty_th, faculty_en],
            (e) => {
              if (e) {
                fail++;
                console.error("Insert fail:", major_code, e.message);
              } else {
                ok++;
              }
              resolve();
            }
          );
        });
      }

      console.log(`[${name}] done: ${ok} inserted/updated, ${fail} failed`);
      totalOK += ok;
      totalFail += fail;
      continue;
    }

    // “หัวสำนักวิชาเป็นบรรทัด + 4หลัก ชื่อไทย”
    const rowsArray = xlsx.utils.sheet_to_json(ws, {
      header: 1,
      defval: "",
      blankrows: false,
      raw: false,
    });

    if (rowsArray.length === 0) {
      console.log(`[${name}] empty sheet`);
      continue;
    }

    console.log(`[${name}] fallback to FACULTY-HEADER parser`);
    let currentFacultyTH = "",
      currentFacultyEN = "";

    for (const r of rowsArray) {
      const colA = String(r[0] || "").trim();
      const colB = String(r[1] || "").trim();
      if (!colA) continue;

      // แถวหัวสำนักวิชา
      if (/^สำนักวิชา/.test(colA)) {
        currentFacultyTH = colA;
        if (colB) currentFacultyEN = colB;
        continue;
      }

      // แถวสาขา: "dddd ชื่อไทย"
      const m = colA.match(/^(\d{4})\s+(.*)$/);
      if (m) {
        const major_code = m[1];
        const program_th = m[2].trim();
        const program_en = colB;

        await new Promise((resolve) => {
          db.query(
            UPSERT_SQL,
            [
              major_code,
              program_th,
              program_en,
              currentFacultyTH,
              currentFacultyEN,
            ],
            (e) => {
              if (e) {
                fail++;
                console.error("Insert fail:", major_code, e.message);
              } else {
                ok++;
              }
              resolve();
            }
          );
        });
      }
    }

    console.log(`[${name}] done: ${ok} inserted/updated, ${fail} failed`);
    totalOK += ok;
    totalFail += fail;
  }

  console.log(
    `All sheets done (${wb.SheetNames.length}): ${totalOK} inserted/updated, ${totalFail} failed`
  );
}
