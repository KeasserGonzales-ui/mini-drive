const isSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "superadmin") {
    return res.status(403).json({
      message: "Super Admin only",
    });
  }

  next();
};

module.exports = {
  isSuperAdmin,
};