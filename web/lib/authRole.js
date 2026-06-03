function normalizeRole(role) {
  return String(role || "").trim().toLowerCase();
}

function isAdminRole(role) {
  const normalizedRole = normalizeRole(role);
  return normalizedRole === "admin" || normalizedRole === "quan_tri";
}

module.exports = {
  isAdminRole,
  normalizeRole,
};
