function getToken() {
  return localStorage.getItem("token");
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch (error) {
    return {};
  }
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.replace("/login.html");
}

function requireLogin() {
  const token = getToken();

  if (!token) {
    window.location.replace("/login.html");
    return null;
  }

  return token;
}

function requireUser() {
  const token = requireLogin();
  const user = getUser();

  if (!token) return null;

  return { token, user };
}

function requireAdmin() {
  const token = requireLogin();
  const user = getUser();

  if (!token) return null;

  const role = String(user.role || "").toLowerCase();

  if (role !== "admin" && role !== "superadmin") {
    alert("Admin access only");
    window.location.replace("/drive.html");
    return null;
  }

  return { token, user };
}

function checkUserTokenOrLogout() {
  const token = getToken();

  if (!token) {
    logout();
    return;
  }

  fetch("/api/user/test", {
    headers: {
      Authorization: "Bearer " + token,
    },
  })
    .then((res) => {
      if (!res.ok) logout();
    })
    .catch(() => logout());
}

function checkAdminTokenOrLogout() {
  const token = getToken();
  const user = getUser();

  if (!token) {
    logout();
    return;
  }

  const role = String(user.role || "").toLowerCase();

  if (role !== "admin" && role !== "superadmin") {
    window.location.replace("/drive.html");
    return;
  }

  fetch("/api/admin/test", {
    headers: {
      Authorization: "Bearer " + token,
    },
  })
    .then((res) => {
      if (!res.ok) logout();
    })
    .catch(() => logout());
}