// ============================================================
//  PER-MACHINE CONFIGURATION  —  edit before loading extension
// ============================================================

export const CONFIG = {
  // Change this to a unique number for every PC in the lab (1–99)
  WORKSTATION_NUMBER: 22,

  // PieSocket credentials
  PIESOCKET_API_KEY: "RqBtHOA9dF0XciTCLHYRuY4LMAh7BnXtMtuOPFqF",
  PIESOCKET_CLUSTER: "free.blr2",
  PIESOCKET_CHANNEL: "lab-manager-001",   // must match admin panel

  // How often the extension announces itself (seconds)
  HEARTBEAT_INTERVAL_SEC: 10,

  // After this many seconds of silence an admin-panel session
  // marks the workstation offline
  OFFLINE_THRESHOLD_SEC: 20,
};
