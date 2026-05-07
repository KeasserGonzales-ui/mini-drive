exports.testAuth = (req, res) => {
  res.send("✅ Auth Controller Working");
};

exports.helloAuth = (req, res) => {
  res.json({
    message: "🚀 Hello from Auth Controller",
    status: "success",
  });
};