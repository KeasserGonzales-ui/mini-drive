const jwt = require("jsonwebtoken");

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