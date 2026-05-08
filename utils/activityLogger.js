const db = require("../config/db");

const logActivity = ({
  user_id = null,
  username = "Unknown",
  email = "Unknown",
  role = "user",
  action,
  file_name = null,
  details = null,
}) => {
  const query = `
    INSERT INTO activity_logs
    (
      user_id,
      username,
      email,
      role,
      action,
      file_name,
      details
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    query,
    [
      user_id,
      username,
      email,
      role,
      action,
      file_name,
      details,
    ],
    (err, result) => {
      if (err) {
        console.error(
          "❌ Activity log insert error:",
          err
        );
      } else {
        console.log(
          "✅ Activity logged:",
          action
        );
      }
    }
  );
};

module.exports = logActivity;