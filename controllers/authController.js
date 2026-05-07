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

  res.json({
    message: "✅ POST request working",
    email,
    password,
  });
};