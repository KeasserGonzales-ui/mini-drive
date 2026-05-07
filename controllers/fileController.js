const multer = require("multer");
const path = require("path");
const fs = require("fs");
const db = require("../config/db");

const uploadsDir = path.join(__dirname, "../uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },

  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, "-");

    cb(null, Date.now() + "-" + safeName);
  },
});

const upload = multer({ storage });

exports.uploadMiddleware = upload.single("file");

exports.testFileController = (req, res) => {
  res.json({
    message: "📁 File Controller Working",
  });
};

exports.uploadFile = (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      message: "No file uploaded",
    });
  }

  let visibility = req.body.visibility;

  if (
    visibility !== "public" &&
    visibility !== "private"
  ) {
    visibility = "private";
  }

  db.query(
    `
    INSERT INTO files
    (filename, original_name, user_id, visibility, uploaded_at)
    VALUES (?, ?, ?, ?, NOW())
    `,
    [
      req.file.filename,
      req.file.originalname,
      req.user.id,
      visibility,
    ],
    (err) => {
      if (err) {
        console.error("Database error:", err);

        return res.status(500).json({
          message: "Database error",
        });
      }

      res.json({
        message: "✅ Upload successful",
        visibility,
        filename: req.file.filename,
      });
    }
  );
};
exports.getFile = (req, res) => {
  const filename = req.params.filename;

  const filePath = path.join(
    uploadsDir,
    filename
  );

  db.query(
    "SELECT * FROM files WHERE filename = ?",
    [filename],
    (err, rows) => {
      if (err) {
        return res
          .status(500)
          .send("Database error");
      }

      if (rows.length === 0) {
        return res
          .status(404)
          .send("File not found");
      }

      const file = rows[0];

      const isOwner =
        Number(file.user_id) ===
        Number(req.user.id);

      const isAdminUser =
        req.user.role === "admin" ||
        req.user.role === "superadmin";

      if (
        file.visibility === "public" ||
        isOwner ||
        isAdminUser
      ) {
        if (!fs.existsSync(filePath)) {
          return res
            .status(404)
            .send("File missing from uploads folder");
        }

        return res.sendFile(filePath);
      }

      return res
        .status(403)
        .send("Access denied");
    }
  );
};
exports.shareFile = (req, res) => {
  const filename = req.params.filename;

  const filePath = path.join(
    uploadsDir,
    filename
  );

  db.query(
    "SELECT * FROM files WHERE filename = ?",
    [filename],
    (err, rows) => {
      if (err) {
        return res.status(500).send("Database error");
      }

      if (rows.length === 0) {
        return res.status(404).send("File not found");
      }

      const file = rows[0];

      if (file.visibility !== "public") {
        return res.status(403).send("Private file cannot be shared");
      }

      if (!fs.existsSync(filePath)) {
        return res.status(404).send("File missing from uploads folder");
      }

      res.sendFile(filePath);
    }
  );
};