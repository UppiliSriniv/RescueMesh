/* RescueMesh Operator Dashboard Logic */

(function () {
  RescueMesh.renderAppShell("dashboard.html", "RescueMesh Mission Control");

  let batteryChart = null;
  let progressChart = null;
  let intervalId = null;

  function renderDashboard() {
    const state = RescueMesh.loadState();
    const agents = Object.values(state.agents);
    const onlineCount = agents.filter((a) => a.status === "ONLINE").length;
    const alertsCount = state.logs.slice(0, 12).filter((l) => l.severity === "WARNING" || l.severity === "CRITICAL").length;

    const rover = state.agents["ROVER-01"];
    const drone = state.agents["DRONE-01"];
    const r1 = state.agents["RELAY-01"];
    const r2 = state.agents["RELAY-02"];

    document.getElementById("kpiActiveAgents").textContent = `${onlineCount} / ${agents.length}`;
    const netEl = document.getElementById("kpiNetworkStatus");
    netEl.textContent = state.networkMode === "HOLD" ? "HOLD" : state.networkMode === "REROUTED" ? "REROUTED" : "CONNECTED";
    netEl.style.color = state.networkMode === "HOLD" ? "var(--status-red)" : state.networkMode === "REROUTED" ? "var(--status-orange)" : "var(--status-green)";

    document.getElementById("kpiRoverBattery").textContent = `${rover.battery}%`;
    document.getElementById("kpiDroneBattery").textContent = `${drone.battery}%`;
    document.getElementById("kpiMissionCode").textContent = state.mission.mission_code;
    document.getElementById("kpiMissionStatus").textContent = state.mission.mission_status;
    document.getElementById("kpiAlertsCount").textContent = alertsCount;

    // 1. Rover Status
    const roverBadge = document.getElementById("dashRoverBadge");
    roverBadge.className = `badge ${RescueMesh.statusBadgeClass(rover.status)}`;
    roverBadge.textContent = rover.status;
    document.getElementById("dashRoverBody").innerHTML = `
      <div>Role: <span class="badge badge-role">${rover.role}</span></div>
      <div class="mt-1">Comm: <strong class="mono">${rover.comm}</strong></div>
      <div class="mt-1">Movement: <strong class="mono">${rover.movement}</strong></div>
      <div class="mt-1">LiDAR (sim): <strong class="mono">${rover.lidar} m</strong></div>
      <div class="mt-2">Battery (${rover.battery}%)</div>
      <div class="progress-track mt-1"><div class="progress-fill" style="width:${rover.battery}%"></div></div>
    `;

    // 2. Drone Status
    const droneBadge = document.getElementById("dashDroneBadge");
    droneBadge.className = `badge ${RescueMesh.statusBadgeClass(drone.status)}`;
    droneBadge.textContent = drone.status;
    document.getElementById("dashDroneBody").innerHTML = `
      <div>Role: <span class="badge badge-role">${drone.role}</span></div>
      <div class="mt-1">Comm: <strong class="mono">${drone.comm}</strong></div>
      <div class="mt-1">Flight: <strong class="mono">${drone.flight}</strong></div>
      <div class="mt-1">Relay Mode: <strong class="mono">${drone.relayMode ? "ACTIVE" : "STANDBY"}</strong></div>
      <div class="mt-2">Battery (${drone.battery}%)</div>
      <div class="progress-track mt-1"><div class="progress-fill" style="width:${drone.battery}%; background:var(--accent-blue);"></div></div>
    `;

    // 3. Relay Node Status
    document.getElementById("dashRelayBody").innerHTML = [r1, r2].map((node) => `
      <div style="padding:0.55rem 0; border-bottom:1px solid var(--border-color);">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <strong>${node.name}</strong>
          <span class="badge ${RescueMesh.statusBadgeClass(node.status)}">${node.status}</span>
        </div>
        <div class="text-xs text-muted mt-1">
          Role: <span class="mono">${node.role}</span> • Signal: <span class="mono">${node.signal}%</span> • Bat: <span class="mono">${node.battery}%</span>
        </div>
      </div>
    `).join("");

    // 4. Communication Network Health
    const activeRoute = state.networkMode === "HOLD"
      ? "UNAVAILABLE — Local Store-and-Forward HOLD"
      : state.networkMode === "REROUTED"
        ? "Rover → Aerial Drone D1 → Rescue Station (Alternate Route)"
        : "Rover → Relay Node 1 → Rescue Station (Primary Route)";
    document.getElementById("dashNetworkBody").innerHTML = `
      <div class="mb-2">Active Path: <strong class="mono">${activeRoute}</strong></div>
      <div class="grid grid-3">
        <div class="kpi-card">
          <span class="kpi-label">Packet SEQ</span>
          <span class="kpi-value" style="font-size:1.15rem;">#${state.seqId}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Local Buffer</span>
          <span class="kpi-value" style="font-size:1.15rem;">${state.bufferedPackets} pkts</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Delivery Mode</span>
          <span class="kpi-value" style="font-size:1.05rem;">${state.networkMode}</span>
        </div>
      </div>
    `;

    // 5. Environmental Sensors Snapshot (first 6 sensors)
    document.getElementById("dashSensorsGrid").innerHTML = state.sensors.slice(0, 6).map((s) => `
      <div class="kpi-card" style="padding:0.7rem;">
        <span class="kpi-label" style="font-size:0.68rem;">${s.name}</span>
        <span class="kpi-value" style="font-size:1.15rem;">${s.value}</span>
        <span class="kpi-sub">${s.unit}</span>
      </div>
    `).join("");

    // 6. Recent Mission Events
    document.getElementById("dashEventsTable").innerHTML = state.logs.slice(0, 7).map((log) => `
      <tr>
        <td class="mono text-xs">${log.timestamp}</td>
        <td>${log.agent}</td>
        <td>${log.eventType}</td>
        <td><span class="badge ${RescueMesh.statusBadgeClass(log.commStatus)}">${log.commStatus}</span></td>
        <td><span class="badge ${RescueMesh.statusBadgeClass(log.missionStatus)}">${log.missionStatus}</span></td>
        <td class="text-sm text-muted">${log.description}</td>
      </tr>
    `).join("");

    updateCharts(state);
    RescueMesh.syncHeaderIndicators();
  }

  function updateCharts(state) {
    if (typeof Chart === "undefined") return;
    const batLabels = ["Station", "Rover R1", "Drone D1", "Relay 1", "Relay 2"];
    const batValues = [
      state.agents["STATION-01"].battery,
      state.agents["ROVER-01"].battery,
      state.agents["DRONE-01"].battery,
      state.agents["RELAY-01"].battery,
      state.agents["RELAY-02"].battery
    ];

    const batCanvas = document.getElementById("batteryChart");
    if (batCanvas) {
      if (!batteryChart) {
        batteryChart = new Chart(batCanvas, {
          type: "bar",
          data: {
            labels: batLabels,
            datasets: [{
              label: "Simulated Battery (%)",
              data: batValues,
              backgroundColor: ["#10b981", "#06b6d4", "#3b82f6", "#14b8a6", "#14b8a6"],
              borderRadius: 6
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { min: 0, max: 100 } },
            plugins: { legend: { display: false } }
          }
        });
      } else {
        batteryChart.data.datasets[0].data = batValues;
        batteryChart.update("none");
      }
    }

    const progCanvas = document.getElementById("progressChart");
    const done = state.mission.progress_pct;
    const remaining = Math.max(0, 100 - done);
    if (progCanvas) {
      if (!progressChart) {
        progressChart = new Chart(progCanvas, {
          type: "doughnut",
          data: {
            labels: ["Explored Sector (Sim)", "Remaining Sector"],
            datasets: [{
              data: [done, remaining],
              backgroundColor: ["#06b6d4", "rgba(148,163,184,0.2)"],
              borderWidth: 0
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "68%"
          }
        });
      } else {
        progressChart.data.datasets[0].data = [done, remaining];
        progressChart.update("none");
      }
    }
  }

  function startSimulationLoop() {
    if (intervalId) clearInterval(intervalId);
    intervalId = setInterval(() => {
      const state = RescueMesh.loadState();
      if (!state.liveDemoRunning) return;
      RescueMesh.tickSensors(state);
      renderDashboard();
    }, 3000);
  }

  const toggleBtn = document.getElementById("toggleSimBtn");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      const state = RescueMesh.loadState();
      state.liveDemoRunning = !state.liveDemoRunning;
      RescueMesh.saveState(state);
      toggleBtn.textContent = state.liveDemoRunning ? "Pause Live Updates" : "Resume Live Updates";
      RescueMesh.showToast(state.liveDemoRunning ? "Simulated live updates resumed." : "Simulated live updates paused.", "info");
    });
  }

  const resetBtn = document.getElementById("resetDemoBtn");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      RescueMesh.resetState();
      RescueMesh.tryApi("/api/network/restore", "POST");
      renderDashboard();
      RescueMesh.showToast("Demonstration state reset to baseline.", "success");
    });
  }

  renderDashboard();
  startSimulationLoop();
  window.addEventListener("rescuemesh:statechange", renderDashboard);
})();
