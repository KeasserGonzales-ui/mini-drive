const adminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  if (req.user.role !== "admin" && req.user.role !== "superadmin") {
    return res.status(403).json({
      message: "Admin access only",
    });
  }

  next();
};

const superAdminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  if (req.user.role !== "superadmin") {
    return res.status(403).json({
      message: "Superadmin access only",
    });
  }

  next();
};

module.exports = {
  adminOnly,
  superAdminOnly,
};