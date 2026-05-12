const multer = require("multer");
const path = require("path");
const fs = require("fs");
const db = require("../config/db");
const logActivity = require("../utils/activityLogger");

const uploadsDir = path.join(__dirname, "../uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },

  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, "-");
    cb(null, `${Date.now()}-${safeName}`);
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

  if (visibility !== "public" && visibility !== "private") {
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

      logActivity({
        user_id: req.user.id,
        username: req.user.name || req.user.username,
        email: req.user.email,
        role: req.user.role,
        action: "UPLOAD_FILE",
        file_name: req.file.filename,
        details: `Uploaded ${req.file.originalname} as ${visibility}`,
      });

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
  const filePath = path.join(uploadsDir, filename);

  db.query(
    "SELECT * FROM files WHERE filename = ?",
    [filename],
    (err, rows) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).send("Database error");
      }

      if (rows.length === 0) {
        return res.status(404).send("File not found");
      }

      const file = rows[0];

      const isOwner = Number(file.user_id) === Number(req.user.id);

      const isAdminUser =
        req.user.role === "admin" ||
        req.user.role === "superadmin";

      if (file.visibility === "public" || isOwner || isAdminUser) {
        if (!fs.existsSync(filePath)) {
          return res.status(404).send("File missing from uploads folder");
        }

        return res.download(filePath, file.original_name);
      }

      return res.status(403).send("Access denied");
    }
  );
};

exports.shareFile = (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(uploadsDir, filename);

  db.query(
    "SELECT * FROM files WHERE filename = ?",
    [filename],
    (err, rows) => {
      if (err) {
        console.error("Database error:", err);
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

      return res.sendFile(filePath);
    }
  );
};

exports.shareFileToUser = (req, res) => {
  const { fileId, email } = req.body;
  const ownerId = req.user.id;

  if (!fileId || !email) {
    return res.status(400).json({
      message: "fileId and email are required",
    });
  }

  db.query(
    "SELECT * FROM files WHERE id = ? AND user_id = ?",
    [fileId, ownerId],
    (err, files) => {
      if (err) {
        console.error("Database file check error:", err);

        return res.status(500).json({
          message: "Database file check error",
        });
      }

      if (files.length === 0) {
        return res.status(403).json({
          message: "You can only share your own files",
        });
      }

      const file = files[0];

      db.query(
        "SELECT id, name, email FROM users WHERE email = ?",
        [email],
        (err, users) => {
          if (err) {
            console.error("Database user check error:", err);

            return res.status(500).json({
              message: "Database user check error",
            });
          }

          if (users.length === 0) {
            return res.status(404).json({
              message: "User not found",
            });
          }

          const sharedUser = users[0];

          if (Number(sharedUser.id) === Number(ownerId)) {
            return res.status(400).json({
              message: "You cannot share a file with yourself",
            });
          }

          db.query(
            `
            INSERT INTO shared_files
            (file_id, owner_id, shared_with_user_id)
            VALUES (?, ?, ?)
            `,
            [fileId, ownerId, sharedUser.id],
            (err) => {
              if (err) {
                if (err.code === "ER_DUP_ENTRY") {
                  return res.status(409).json({
                    message: "File already shared with this user",
                  });
                }

                console.error("Database share insert error:", err);

                return res.status(500).json({
                  message: "Database share insert error",
                });
              }

              logActivity({
                user_id: req.user.id,
                username: req.user.name || req.user.username,
                email: req.user.email,
                role: req.user.role,
                action: "SHARE_FILE",
                file_name: file.filename,
                details: `Shared ${file.original_name} with ${sharedUser.email}`,
              });

              res.json({
                message: "✅ File shared successfully",
                sharedWith: sharedUser.email,
                file: file.original_name,
              });
            }
          );
        }
      );
    }
  );
};

exports.deleteFile = (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(uploadsDir, filename);

  const isAdminUser =
    req.user.role === "admin" ||
    req.user.role === "superadmin";

  const selectSql = isAdminUser
    ? "SELECT * FROM files WHERE filename = ?"
    : "SELECT * FROM files WHERE filename = ? AND user_id = ?";

  const selectParams = isAdminUser
    ? [filename]
    : [filename, req.user.id];

  db.query(selectSql, selectParams, (err, results) => {
    if (err) {
      console.error("Database select error:", err);

      return res.status(500).json({
        message: "Database select error",
      });
    }

    if (results.length === 0) {
      return res.status(403).json({
        message: "You cannot delete this file",
      });
    }

    const file = results[0];

    db.query(
      "DELETE FROM files WHERE filename = ?",
      [filename],
      (err) => {
        if (err) {
          console.error("Database delete error:", err);

          return res.status(500).json({
            message: "Database delete error",
          });
        }

        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }

        logActivity({
          user_id: req.user.id,
          username: req.user.name || req.user.username,
          email: req.user.email,
          role: req.user.role,
          action: "DELETE_FILE",
          file_name: filename,
          details: `Deleted file owned by user_id ${file.user_id}`,
        });

        res.json({
          message: "✅ File deleted successfully",
        });
      }
    );
  });
};

exports.getFiles = (req, res) => {
  db.query(
    "SELECT * FROM files WHERE user_id = ? ORDER BY uploaded_at DESC",
    [req.user.id],
    (err, rows) => {
      if (err) {
        console.error("Database error:", err);

        return res.status(500).json({
          message: "Database error",
        });
      }

      res.json(rows);
    }
  );
};