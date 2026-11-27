/* RescueMesh Shared Frontend State, Layout Shell & Helpers
   Works seamlessly both with the Flask REST API and in standalone static demo mode. */

(function () {
  const STORAGE_KEY = "rescuemesh_state_v1";
  const THEME_KEY = "rescuemesh_theme";

  const DEFAULT_STATE = {
    mission: {
      mission_code: "RM-SIM-001",
      title: "Sector-B Underground Tunnel Survey (Simulated)",
      mission_status: "ACTIVE",
      progress_pct: 42
    },
    networkMode: "NORMAL", // NORMAL | REROUTED | HOLD
    bufferedPackets: 0,
    seqId: 1042,
    liveDemoRunning: true,
    apiConnected: false,
    agents: {
      "STATION-01": { code: "STATION-01", name: "Rescue Station", type: "STATION", status: "ONLINE", comm: "CONNECTED", role: "STATION", battery: 100, signal: 100 },
      "ROVER-01": { code: "ROVER-01", name: "Ground Rover R1", type: "ROVER", status: "ONLINE", comm: "CONNECTED", role: "EXPLORER", battery: 84, signal: 88, movement: "IDLE", speed: 45, lidar: 2.4 },
      "DRONE-01": { code: "DRONE-01", name: "Aerial Drone D1", type: "DRONE", status: "ONLINE", comm: "CONNECTED", role: "SUPPORT", battery: 78, signal: 91, flight: "LANDED", relayMode: false },
      "RELAY-01": { code: "RELAY-01", name: "Relay Node 1", type: "RELAY", status: "ONLINE", comm: "CONNECTED", role: "RELAY", battery: 89, signal: 93 },
      "RELAY-02": { code: "RELAY-02", name: "Relay Node 2", type: "RELAY", status: "ONLINE", comm: "CONNECTED", role: "SUPPORT", battery: 92, signal: 90 }
    },
    sensors: [
      { key: "ch4", name: "CH4 - Methane", category: "gas", value: 0.42, unit: "% LEL (sim)", status: "ONLINE", history: [0.38, 0.40, 0.41, 0.39, 0.43, 0.42] },
      { key: "co", name: "CO - Carbon Monoxide", category: "gas", value: 12.0, unit: "ppm (sim)", status: "ONLINE", history: [10.5, 11.2, 11.8, 12.4, 11.9, 12.0] },
      { key: "co2", name: "CO2 - Carbon Dioxide", category: "gas", value: 640, unit: "ppm (sim)", status: "ONLINE", history: [610, 625, 632, 628, 638, 640] },
      { key: "o2", name: "O2 - Oxygen", category: "gas", value: 20.6, unit: "% vol (sim)", status: "ONLINE", history: [20.8, 20.7, 20.7, 20.6, 20.6, 20.6] },
      { key: "h2s", name: "H2S - Hydrogen Sulfide", category: "gas", value: 1.2, unit: "ppm (sim)", status: "ONLINE", history: [1.0, 1.1, 1.1, 1.3, 1.2, 1.2] },
      { key: "temp", name: "Temperature", category: "env", value: 27.4, unit: "°C", status: "ONLINE", history: [26.8, 27.0, 27.1, 27.3, 27.2, 27.4] },
      { key: "humidity", name: "Humidity", category: "env", value: 68.0, unit: "% RH", status: "ONLINE", history: [66.5, 67.0, 67.4, 67.8, 68.2, 68.0] },
      { key: "dust", name: "Dust / Smoke", category: "env", value: 48.0, unit: "µg/m³", status: "ONLINE", history: [42, 44, 49, 47, 50, 48] },
      { key: "lidar", name: "LiDAR Distance", category: "kinematic", value: 2.4, unit: "m", status: "ONLINE", history: [2.8, 2.7, 2.6, 2.5, 2.3, 2.4] },
      { key: "imu", name: "IMU / Tilt", category: "kinematic", value: 3.1, unit: "deg", status: "ONLINE", history: [2.4, 2.8, 3.0, 3.5, 2.9, 3.1] },
      { key: "vibration", name: "Vibration", category: "kinematic", value: 0.18, unit: "g RMS", status: "ONLINE", history: [0.14, 0.16, 0.19, 0.17, 0.20, 0.18] }
    ],
    logs: [
      { id: 1, missionId: "RM-SIM-001", timestamp: "2026-11-27 12:40:10", agent: "Rescue Station", eventType: "Mission started", commStatus: "CONNECTED", missionStatus: "ACTIVE", severity: "INFO", description: "Initialized RescueMesh simulated underground mission RM-SIM-001." },
      { id: 2, missionId: "RM-SIM-001", timestamp: "2026-11-27 12:41:02", agent: "Ground Rover R1", eventType: "Rover connected", commStatus: "CONNECTED", missionStatus: "ACTIVE", severity: "SUCCESS", description: "Ground Rover R1 established telemetry link via Relay Node 1 (SEQ 1039)." },
      { id: 3, missionId: "RM-SIM-001", timestamp: "2026-11-27 12:43:18", agent: "Aerial Drone D1", eventType: "Drone relay activated", commStatus: "CONNECTED", missionStatus: "ACTIVE", severity: "INFO", description: "Aerial Drone D1 verified standby relay coverage for Sector-B drift." },
      { id: 4, missionId: "RM-SIM-001", timestamp: "2026-11-27 12:45:44", agent: "Relay Node 1", eventType: "Communication link lost", commStatus: "DISCONNECTED", missionStatus: "ACTIVE", severity: "WARNING", description: "Simulated attenuation drop on R1-Rover link; failover evaluation triggered." },
      { id: 5, missionId: "RM-SIM-001", timestamp: "2026-11-27 12:45:47", agent: "Aerial Drone D1", eventType: "Alternate route established", commStatus: "CONNECTED", missionStatus: "ACTIVE", severity: "SUCCESS", description: "Alternate path Rover -> Drone -> Rescue Station confirmed with ACK." },
      { id: 6, missionId: "RM-SIM-001", timestamp: "2026-11-27 12:48:20", agent: "Relay Node 2", eventType: "Relay role transferred", commStatus: "CONNECTED", missionStatus: "ACTIVE", severity: "INFO", description: "Relay role handed over to Relay Node 2 after battery reserve check." },
      { id: 7, missionId: "RM-SIM-001", timestamp: "2026-11-27 12:51:05", agent: "Ground Rover R1", eventType: "Data buffered locally", commStatus: "DISCONNECTED", missionStatus: "HOLD", severity: "WARNING", description: "Simulated total outage test: packets stored in local SD ring buffer." },
      { id: 8, missionId: "RM-SIM-001", timestamp: "2026-11-27 12:51:12", agent: "Ground Rover R1", eventType: "Mission entered HOLD", commStatus: "DISCONNECTED", missionStatus: "HOLD", severity: "CRITICAL", description: "Drive watchdog placed Rover in safe HOLD while all routes unavailable." },
      { id: 9, missionId: "RM-SIM-001", timestamp: "2026-11-27 12:52:30", agent: "Mesh Network", eventType: "Network restored", commStatus: "CONNECTED", missionStatus: "ACTIVE", severity: "SUCCESS", description: "Primary route restored; locally buffered telemetry flushed without duplicates." }
    ]
  };

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return clone(DEFAULT_STATE);
      const parsed = JSON.parse(raw);
      return Object.assign(clone(DEFAULT_STATE), parsed);
    } catch {
      return clone(DEFAULT_STATE);
    }
  }

  let shellInitialized = false;
  let themeInitialized = false;

  function notifyStateChange() {
    window.dispatchEvent(new CustomEvent("rescuemesh:statechange"));
  }

  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors in restricted browsers
    }
    notifyStateChange();
  }

  function formatNow() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  function statusBadgeClass(status) {
    const s = String(status || "").toUpperCase();
    if (["ONLINE", "CONNECTED", "ACTIVE", "SUCCESS"].includes(s)) return "badge-online";
    if (["WARNING", "HOLD", "REROUTED", "DEGRADED", "BACKUP"].includes(s)) return "badge-warning";
    if (["CRITICAL", "OFFLINE", "DISCONNECTED", "FAILED"].includes(s)) return "badge-critical";
    return "badge-info";
  }

  function showToast(message, type = "info") {
    let container = document.getElementById("toastContainer");
    if (!container) {
      container = document.createElement("div");
      container.id = "toastContainer";
      container.className = "toast-container";
      document.body.appendChild(container);
    }
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 3800);
  }

  function addLog(state, { agent, eventType, commStatus, missionStatus, severity, description }) {
    const nextId = state.logs.length ? Math.max(...state.logs.map((l) => l.id)) + 1 : 1;
    const entry = {
      id: nextId,
      missionId: state.mission.mission_code,
      timestamp: formatNow(),
      agent,
      eventType,
      commStatus,
      missionStatus,
      severity,
      description
    };
    state.logs.unshift(entry);
    if (state.logs.length > 80) state.logs.pop();
    saveState(state);
    return entry;
  }

  function tickSensors(state) {
    const bounds = {
      ch4: [0.05, 0.05, 2.5, 2],
      co: [1.5, 0, 50, 1],
      co2: [12, 400, 1800, 0],
      o2: [0.12, 18.2, 21.1, 2],
      h2s: [0.2, 0, 10, 2],
      temp: [0.3, 19, 39, 1],
      humidity: [1.0, 35, 92, 1],
      dust: [3.5, 12, 190, 1],
      lidar: [0.25, 0.4, 9.5, 2],
      imu: [0.5, 0.2, 18, 1],
      vibration: [0.03, 0.04, 1.2, 2]
    };
    state.sensors.forEach((s) => {
      const [delta, minV, maxV, dec] = bounds[s.key] || [0.2, 0, 100, 1];
      const next = Math.max(minV, Math.min(maxV, s.value + (Math.random() * 2 - 1) * delta));
      s.value = Number(next.toFixed(dec));
      s.history = [...s.history.slice(-11), s.value];
    });
    state.agents["ROVER-01"].lidar = state.sensors.find((s) => s.key === "lidar").value;
    if (state.networkMode === "HOLD") {
      state.bufferedPackets += 1;
    }
    saveState(state);
  }

  async function tryApi(path, method = "GET", body = null) {
    if (window.location.protocol === "file:") return null;
    try {
      const opts = { method, headers: { "Content-Type": "application/json" } };
      if (body) opts.body = JSON.stringify(body);
      const res = await fetch(path, opts);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // ignore
    }
    const btn = document.getElementById("themeToggleBtn");
    if (btn) btn.textContent = theme === "light" ? "Dark Mode" : "Light Mode";
  }

  function initTheme() {
    let saved = "dark";
    try {
      saved = localStorage.getItem(THEME_KEY) || "dark";
    } catch {
      saved = "dark";
    }
    applyTheme(saved);
    if (themeInitialized) return;
    themeInitialized = true;
    const btn = document.getElementById("themeToggleBtn");
    if (btn) {
      btn.addEventListener("click", () => {
        const cur = document.documentElement.getAttribute("data-theme") || "dark";
        applyTheme(cur === "dark" ? "light" : "dark");
      });
    }
  }

  const NAV_ITEMS = [
    { href: "index.html", anchor: "#home", label: "Home Overview", group: "Project" },
    { href: "dashboard.html", anchor: "#dashboard", label: "Mission Control", group: "Operations" },
    { href: "mission-control.html", anchor: "#mission-control", label: "Rover, Drone & Cams", group: "Operations" },
    { href: "network.html", anchor: "#network", label: "Mesh & Dynamic Roles", group: "Operations" },
    { href: "sensors.html", anchor: "#sensors", label: "Sensors & SLAM Map", group: "Operations" },
    { href: "reports.html", anchor: "#reports", label: "Mission Logs & Reports", group: "Operations" },
    { href: "architecture.html", anchor: "#architecture", label: "Architecture & Stack", group: "Engineering" },
    { href: "team.html", anchor: "#team", label: "Team NEXORA", group: "Engineering" }
  ];

  function renderAppShell(activePage, pageTitle) {
    if (shellInitialized) return;
    shellInitialized = true;
    const isUnified = document.body && document.body.dataset.unifiedApp === "true";

    const sidebar = document.getElementById("appSidebar");
    const topbar = document.getElementById("appTopbar");
    if (sidebar) {
      let currentGroup = "";
      const linksHtml = NAV_ITEMS.map((item) => {
        const groupHeader = item.group !== currentGroup
          ? `<div class="nav-section-label">${item.group}</div>`
          : "";
        currentGroup = item.group;
        const targetHref = isUnified ? item.anchor : item.href;
        const isActive = isUnified ? item.anchor === "#home" : item.href === activePage;
        return `${groupHeader}<a class="nav-link ${isActive ? "active" : ""}" href="${targetHref}">${item.label}</a>`;
      }).join("");

      sidebar.innerHTML = `
        <div class="sidebar-header">
          <a href="${isUnified ? "#home" : "index.html"}" class="brand-logo">
            <svg viewBox="0 0 44 44" fill="none" aria-hidden="true">
              <rect x="2" y="2" width="40" height="40" rx="10" fill="#0f1b30" stroke="#06b6d4" stroke-width="2"/>
              <path d="M12 31L22 13L32 31L22 24L12 31Z" stroke="#14b8a6" stroke-width="2" stroke-linejoin="round"/>
              <circle cx="22" cy="13" r="3.2" fill="#06b6d4"/>
              <circle cx="12" cy="31" r="3" fill="#3b82f6"/>
              <circle cx="32" cy="31" r="3" fill="#10b981"/>
            </svg>
            <span>RESCUEMESH<span class="brand-sub">TEAM NEXORA</span></span>
          </a>
        </div>
        <nav class="sidebar-nav">${linksHtml}</nav>
        <div class="sidebar-footer">
          <div class="fw-600">Mode: <span id="sidebarStorageMode" class="mono">Demo Simulation</span></div>
          <div class="text-xs text-muted mt-1">Hardware API: Not Connected</div>
        </div>
      `;
    }

    if (topbar) {
      topbar.innerHTML = `
        <div class="topbar-left">
          <button class="mobile-menu-btn" id="mobileMenuBtn" aria-label="Toggle Menu">&#9776;</button>
          <div class="topbar-title">${pageTitle}</div>
          <span class="badge badge-sim">Simulated Data</span>
        </div>
        <div class="topbar-actions">
          <span id="globalNetBadge" class="badge badge-online"><span class="badge-dot"></span>CONNECTED</span>
          <button id="themeToggleBtn" class="btn btn-sm" type="button">Light Mode</button>
        </div>
      `;
    }

    const menuBtn = document.getElementById("mobileMenuBtn");
    if (menuBtn && sidebar) {
      menuBtn.addEventListener("click", () => {
        sidebar.classList.toggle("open");
      });
      if (isUnified) {
        sidebar.querySelectorAll(".nav-link").forEach((lnk) => {
          lnk.addEventListener("click", () => {
            sidebar.classList.remove("open");
            sidebar.querySelectorAll(".nav-link").forEach((n) => n.classList.remove("active"));
            lnk.classList.add("active");
          });
        });
      }
    }

    initTheme();
    syncHeaderIndicators();

    // Probe optional Flask backend silently
    tryApi("/api/health").then((data) => {
      const modeEl = document.getElementById("sidebarStorageMode");
      if (data && modeEl) {
        modeEl.textContent = data.mysql_connected ? "Flask + MySQL" : "Flask Demo API";
      }
    });
  }

  function syncHeaderIndicators() {
    const state = loadState();
    const badge = document.getElementById("globalNetBadge");
    if (badge) {
      const mode = state.networkMode;
      badge.className = `badge ${mode === "HOLD" ? "badge-critical" : mode === "REROUTED" ? "badge-warning" : "badge-online"}`;
      badge.innerHTML = `<span class="badge-dot"></span>${mode === "HOLD" ? "HOLD (BUFFERED)" : mode === "REROUTED" ? "REROUTED" : "CONNECTED"}`;
    }
    const holdBanner = document.getElementById("globalHoldBanner");
    if (holdBanner) {
      holdBanner.classList.toggle("visible", state.networkMode === "HOLD");
      const countEl = holdBanner.querySelector("[data-buffer-count]");
      if (countEl) countEl.textContent = state.bufferedPackets;
    }
  }

  window.RescueMesh = {
    loadState,
    saveState,
    resetState: () => {
      const s = clone(DEFAULT_STATE);
      saveState(s);
      return s;
    },
    addLog,
    tickSensors,
    statusBadgeClass,
    showToast,
    tryApi,
    initTheme,
    renderAppShell,
    syncHeaderIndicators,
    formatNow
  };
})();
