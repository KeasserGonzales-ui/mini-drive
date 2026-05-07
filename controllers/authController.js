const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const db = require("../config/db");

exports.testAuth = (req, res) => {
  res.send("✅ Auth Controller Working");
};

exports.helloAuth = (req, res) => {
  res.json({
    message: "🚀 Hello from Auth Controller",
    status: "success",
  });
};

exports.loginTest = (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      message: "❌ Email and password are required",
    });
  }

  const token = jwt.sign(
    { email },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  res.json({
    message: "✅ Login successful",
    token,
  });
};

exports.profile = (req, res) => {
  res.json({
    message: "🔐 Protected profile accessed",
    user: req.user,
  });
};

exports.login = (req, res) => {
  const { email, password } = req.body;

  db.query(
    "SELECT * FROM users WHERE email = ?",
    [email],
    async (err, results) => {
      if (err) {
        return res.status(500).json({
          error: err.message,
        });
      }

      if (results.length === 0) {
        return res.json({
          message: "User not found",
        });
      }

      const user = results[0];

      const match = await bcrypt.compare(
        password,
        user.password
      );

      if (!match) {
        return res.json({
          message: "Wrong password",
        });
      }

      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.name,
        },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      res.json({
        message: "Login OK",
        token,
        user,
      });
    }
  );
};
exports.register = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      message: "Name, email, and password are required",
    });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    db.query(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
      [name, email, hashedPassword, "user"],
      (err) => {
        if (err) {
          return res.status(500).json({
            error: err.message,
          });
        }

        res.json({
          message: "✅ User created by Super Admin",
          role: "user",
        });
      }
    );
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};