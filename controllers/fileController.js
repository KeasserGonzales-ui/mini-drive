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