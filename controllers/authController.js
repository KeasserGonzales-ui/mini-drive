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
  const { email } = req.body;

  const token = jwt.sign(
    {
      email,
      role: "test",
    },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  res.json({
    message: "✅ Login test successful",
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

  if (!email || !password) {
    return res.status(400).json({
      message: "Email and password are required",
    });
  }

  db.query(
    "SELECT id, name, email, password, role FROM users WHERE email = ?",
    [email],
    async (err, results) => {
      if (err) {
        return res.status(500).json({
          message: "Login query failed",
          error: err.message,
        });
      }

      if (results.length === 0) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      const user = results[0];

      const match = await bcrypt.compare(password, user.password);

      if (!match) {
        return res.status(401).json({
          message: "Wrong password",
        });
      }

      const token = jwt.sign(
        {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      res.json({
        message: "Login successful",
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
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
      (err, result) => {
        if (err) {
          return res.status(500).json({
            message: "Register failed",
            error: err.message,
          });
        }

        res.status(201).json({
          message: "User registered successfully",
          user: {
            id: result.insertId,
            name,
            email,
            role: "user",
          },
        });
      }
    );
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};