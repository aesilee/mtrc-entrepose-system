/**
 * Optional co-handled caseload: case-manager user IDs listed in SHARED_CASELOAD_CM_IDS (comma-separated,
 * e.g. "3,14" in backend/.env) see and handle each other's patients. Empty or unset = no sharing,
 * so a fresh database never inherits another installation's user IDs.
 */
export function sharedCaseloadIds() {
  return String(process.env.SHARED_CASELOAD_CM_IDS || "")
    .split(",")
    .map((v) => Number(v.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
}

/** IDs whose patients this case manager may handle (always includes themself). */
export function caseloadIdsFor(userId) {
  const id = Number(userId);
  const shared = sharedCaseloadIds();
  return shared.includes(id) ? shared : [id];
}
