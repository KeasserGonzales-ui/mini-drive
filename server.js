require("dotenv").config();

const express = require("express");
const authRoutes = require("./routes/authRoutes");
const fileRoutes = require("./routes/fileRoutes");
const adminRoutes = require("./routes/adminRoutes");
const loggerMiddleware = require("./middleware/loggerMiddleware");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("./config/db");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(loggerMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/auth", authRoutes);
app.use("/files", fileRoutes);
app.use("/api/admin", adminRoutes);

const publicDir = path.join(__dirname, "public");
const uploadsDir = path.join(__dirname, "uploads");

if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir);
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

app.use(express.static(publicDir));

function ensureUploadedAtColumn() {
  db.query(
    `
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'files'
    AND COLUMN_NAME = 'uploaded_at'
    `,
    (err, rows) => {
      if (err) return console.error("❌ Column check error:", err.message);

      if (rows.length === 0) {
        db.query(
          "ALTER TABLE files ADD COLUMN uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
          (err) => {
            if (err) return console.error("❌ Add uploaded_at error:", err.message);
            console.log("✅ uploaded_at column added to files table");
          }
        );
      } else {
        console.log("✅ uploaded_at column already exists");
      }
    }
  );
}

/* =========================
   ACTIVITY LOG AUTOMATION
========================= */
function logActivity(user, action, fileName = null, details = null) {
  if (!user) return;

  const sql = `
    INSERT INTO activity_logs 
    (user_id, username, email, role, action, file_name, details)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    user.id || null,
    user.name || user.username || null,
    user.email || null,
    user.role || null,
    action,
    fileName,
    details,
  ];

  db.query(sql, params, (err) => {
    if (err) {
      console.error("❌ Activity log error:", err.message);
    }
  });
}

app.get("/", (req, res) => {
  res.redirect("/login.html");
});

const verifyToken = (req, res, next) => {
  let authHeader = req.headers.authorization;

  if (!authHeader && req.query.token) {
    authHeader = "Bearer " + req.query.token;
  }

  if (!authHeader) {
    return res.status(403).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ message: "Invalid token" });
    req.user = decoded;
    next();
  });
};

const isSuperAdmin = (req, res, next) => {
  if (req.user.role !== "superadmin") {
    return res.status(403).json({ message: "Super Admin only" });
  }
  next();
};

function isAdminRole(user) {
  return user.role === "admin" || user.role === "superadmin";
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


app.get("/api/admin/test", verifyToken, isSuperAdmin, (req, res) => {
  res.json({
    message: "Welcome Super Admin 🔥",
    admin: req.user,
  });
});

app.get("/api/admin/stats", verifyToken, isSuperAdmin, (req, res) => {
  db.query("SELECT COUNT(*) AS totalUsers FROM users", (err, userRows) => {
    if (err) return res.status(500).json({ error: err.message });

    db.query("SELECT COUNT(*) AS totalFiles FROM files", (err, fileRows) => {
      if (err) return res.status(500).json({ error: err.message });

      res.json({
        totalUsers: userRows[0].totalUsers,
        totalFiles: fileRows[0].totalFiles,
      });
    });
  });
});

app.get("/api/admin/users", verifyToken, isSuperAdmin, (req, res) => {
  db.query(
    "SELECT id, name, email, role FROM users ORDER BY id DESC",
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

app.put("/api/admin/users/:id/role", verifyToken, isSuperAdmin, (req, res) => {
  const userId = Number(req.params.id);
  const role = req.body.role;

  if (!userId) {
    return res.status(400).json({ message: "Invalid user ID" });
  }

  if (!["user", "admin"].includes(role)) {
    return res.status(400).json({
      message: "Invalid role. You can only assign user or admin.",
    });
  }

  db.query("SELECT id, name, email, role FROM users WHERE id = ?", [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const targetUser = rows[0];
    const oldRole = targetUser.role;

    if (oldRole === "superadmin") {
      return res.status(403).json({
        message: "❌ Cannot change Super Admin role",
      });
    }

    db.query("UPDATE users SET role = ? WHERE id = ?", [role, userId], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });

      logActivity(
        req.user,
        "ROLE_UPDATE",
        null,
        `Changed ${targetUser.email} role from ${oldRole} to ${role}`
      );

      res.json({
        message: "✅ User role updated successfully",
        userId,
        role,
        affectedRows: result.affectedRows,
        changedRows: result.changedRows,
      });
    });
  });
});

app.delete("/api/admin/users/:id", verifyToken, isSuperAdmin, (req, res) => {
  const userId = Number(req.params.id);

  if (userId === Number(req.user.id)) {
    return res.status(400).json({ message: "You cannot delete your own account" });
  }

  db.query("SELECT id, name, email, role FROM users WHERE id = ?", [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const targetUser = rows[0];

    if (targetUser.role === "superadmin") {
      return res.status(403).json({
        message: "❌ Cannot delete Super Admin account",
      });
    }

    db.query("DELETE FROM files WHERE user_id = ?", [userId], (err) => {
      if (err) return res.status(500).json({ error: err.message });

      db.query("DELETE FROM users WHERE id = ?", [userId], (err) => {
        if (err) return res.status(500).json({ error: err.message });

        logActivity(
          req.user,
          "DELETE_USER",
          null,
          `Deleted user account: ${targetUser.email}`
        );

        res.json({ message: "User deleted", userId });
      });
    });
  });
});

app.get("/api/admin/files", verifyToken, (req, res) => {
  const user = req.user;
  const isAdminUser = isAdminRole(user);

  const search = req.query.search ? req.query.search.trim() : "";
  const visibility = req.query.visibility || "all";
  const sort = req.query.sort === "oldest" ? "ASC" : "DESC";

  let sql = `
    SELECT
      files.id,
      files.filename,
      files.original_name,
      files.user_id,
      files.visibility,
      files.uploaded_at,
      DATE_FORMAT(files.uploaded_at, '%M %d, %Y %h:%i %p') AS uploaded_date,
      users.name AS owner_name,
      users.email AS owner_email
    FROM files
    LEFT JOIN users ON files.user_id = users.id
    WHERE 1 = 1
  `;

  const params = [];

  if (!isAdminUser) {
    sql += " AND (files.user_id = ? OR files.visibility = 'public')";
    params.push(user.id);
  }

  if (search !== "") {
    sql += " AND (files.original_name LIKE ? OR files.filename LIKE ? OR users.name LIKE ? OR users.email LIKE ?)";
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (visibility === "public" || visibility === "private") {
    sql += " AND files.visibility = ?";
    params.push(visibility);
  }

  sql += ` ORDER BY files.uploaded_at ${sort}, files.id ${sort}`;

  db.query(sql, params, (err, rows) => {
    if (err) {
      console.error("Files query error:", err);
      return res.status(500).json({ error: err.message });
    }

    res.json(rows);
  });
});

/* =========================
   SUPERADMIN ONLY LOGS API
========================= */
app.get("/api/activity-logs", verifyToken, isSuperAdmin, (req, res) => {
  db.query(
    `
    SELECT
      id,
      user_id,
      username,
      email,
      role,
      action,
      file_name,
      details,
      created_at,
      DATE_FORMAT(created_at, '%M %d, %Y %h:%i %p') AS activity_date
    FROM activity_logs
    ORDER BY created_at DESC, id DESC
    LIMIT 100
    `,
    (err, rows) => {
      if (err) {
        console.error("Activity logs query error:", err);
        return res.status(500).json({ error: err.message });
      }

      res.json(rows);
    }
  );
});

app.get("/debug/files", verifyToken, (req, res) => {
  db.query(
    `
    SELECT
      files.*,
      DATE_FORMAT(files.uploaded_at, '%M %d, %Y %h:%i %p') AS uploaded_date
    FROM files
    ORDER BY files.uploaded_at DESC, files.id DESC
    `,
    (err, rows) => {
      if (err) return res.json({ error: err.message });
      res.json(rows);
    }
  );
});

app.get("/debug/users", verifyToken, isSuperAdmin, (req, res) => {
  db.query("SELECT id, name, email, role FROM users ORDER BY id DESC", (err, rows) => {
    if (err) return res.json({ error: err.message });
    res.json(rows);
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📁 Public folder: ${publicDir}`);
  console.log(`📁 Uploads folder: ${uploadsDir}`);
  ensureUploadedAtColumn();
});