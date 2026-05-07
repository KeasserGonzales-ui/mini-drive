function getToken() {
  return localStorage.getItem("token");
}

function getUser() {
  return JSON.parse(localStorage.getItem("user") || "{}");
}

function logout() {
  localStorage.clear();
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

function requireAdmin() {
  const token = requireLogin();
  const user = getUser();

  if (!token) {
    return null;
  }

  if (user.role !== "admin" && user.role !== "superadmin") {
    alert("Admin access only");
    logout();
    return null;
  }

  return { token, user };
}

function checkTokenOrLogout() {
  const token = getToken();

  if (!token) {
    logout();
    return;
  }

  fetch("/api/admin/test", {
    headers: {
      Authorization: "Bearer " + token,
    },
  })
    .then((res) => {
      if (!res.ok) {
        logout();
      }
    })
    .catch(() => logout());
}