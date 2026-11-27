/* RescueMesh Sensor Monitoring & GPS-Denied Tunnel Mapping */

(function () {
  RescueMesh.renderAppShell("sensors.html", "Sensors & GPS-Denied Mapping");

  let trendChart = null;
  let blockNorth = false;
  let blockSouth = false;

  function renderSensors() {
    const state = RescueMesh.loadState();
    const now = RescueMesh.formatNow();
    const gas = state.sensors.filter((s) => s.category === "gas");
    const other = state.sensors.filter((s) => s.category !== "gas");

    document.getElementById("gasSensorsGrid").innerHTML = gas.map((s) => `
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span class="badge badge-sim">SIMULATED DATA</span>
          <span class="badge ${RescueMesh.statusBadgeClass(s.status)}">${s.status}</span>
        </div>
        <div class="fw-700 mt-2">${s.name}</div>
        <div class="kpi-value mt-1">${s.value} <span class="text-xs text-muted">${s.unit}</span></div>
        <div class="text-xs text-muted mt-1">Updated: ${now.split(" ")[1]}</div>
        <div class="text-xs text-muted mt-1">Calibration: Pending spec</div>
      </div>
    `).join("");

    document.getElementById("otherSensorsGrid").innerHTML = other.map((s) => `
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span class="badge badge-sim">SIMULATED DATA</span>
          <span class="badge ${RescueMesh.statusBadgeClass(s.status)}">${s.status}</span>
        </div>
        <div class="fw-700 mt-2">${s.name}</div>
        <div class="kpi-value mt-1">${s.value} <span class="text-xs text-muted">${s.unit}</span></div>
        <div class="text-xs text-muted mt-1">Updated: ${now.split(" ")[1]}</div>
      </div>
    `).join("");

    const select = document.getElementById("trendSensorSelect");
    if (!select.options.length) {
      select.innerHTML = state.sensors.map((s) => `<option value="${s.key}">${s.name} (${s.unit})</option>`).join("");
      select.addEventListener("change", () => updateTrendChart(RescueMesh.loadState()));
    }

    updateTrendChart(state);
    RescueMesh.syncHeaderIndicators();
  }

  function updateTrendChart(state) {
    if (typeof Chart === "undefined") return;
    const key = document.getElementById("trendSensorSelect").value || "ch4";
    const sensor = state.sensors.find((s) => s.key === key) || state.sensors[0];
    const labels = sensor.history.map((_, idx) => `T-${sensor.history.length - 1 - idx}`);

    const canvas = document.getElementById("sensorTrendChart");
    if (!trendChart) {
      trendChart = new Chart(canvas, {
        type: "line",
        data: {
          labels,
          datasets: [{
            label: `${sensor.name} (Simulated)`,
            data: sensor.history,
            borderColor: "#06b6d4",
            backgroundColor: "rgba(6,182,212,0.16)",
            fill: true,
            tension: 0.3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false
        }
      });
    } else {
      trendChart.data.labels = labels;
      trendChart.data.datasets[0].label = `${sensor.name} (Simulated)`;
      trendChart.data.datasets[0].data = sensor.history;
      trendChart.update("none");
    }
  }

  function updateSlamMap() {
    document.getElementById("slamBlockNorth").style.display = blockNorth ? "block" : "none";
    document.getElementById("slamBlockSouth").style.display = blockSouth ? "block" : "none";

    const routeLine = document.getElementById("slamRouteLine");
    const statusEl = document.getElementById("slamRouteStatus");

    if (!blockNorth) {
      routeLine.setAttribute("points", "60,170 210,170 210,85 470,85 555,170");
      routeLine.setAttribute("stroke", "#10b981");
      statusEl.textContent = "FEASIBLE (North Corridor)";
      statusEl.style.color = "var(--status-green)";
    } else if (!blockSouth) {
      routeLine.setAttribute("points", "60,170 210,170 210,255 470,255 555,170");
      routeLine.setAttribute("stroke", "#f59e0b");
      statusEl.textContent = "REPLANNED (South Alternate Drift — Higher Risk)";
      statusEl.style.color = "var(--status-orange)";
    } else {
      routeLine.setAttribute("points", "60,170 210,170");
      routeLine.setAttribute("stroke", "#ef4444");
      statusEl.textContent = "HOLD (No Feasible Alternate Route)";
      statusEl.style.color = "var(--status-red)";
    }
  }

  document.getElementById("refreshSensorsBtn").addEventListener("click", () => {
    const state = RescueMesh.loadState();
    RescueMesh.tickSensors(state);
    renderSensors();
    RescueMesh.showToast("Simulated sensor tick sampled.", "info");
  });

  document.getElementById("blockNorthBtn").addEventListener("click", () => {
    blockNorth = !blockNorth;
    updateSlamMap();
    const state = RescueMesh.loadState();
    RescueMesh.addLog(state, {
      agent: "SLAM Planner",
      eventType: blockNorth ? "Path blocked -> Replan" : "North path cleared",
      commStatus: state.agents["ROVER-01"].comm,
      missionStatus: blockNorth && blockSouth ? "HOLD" : "ACTIVE",
      severity: blockNorth ? "WARNING" : "INFO",
      description: blockNorth && blockSouth
        ? "North & South corridors blocked; no feasible path exists -> HOLD."
        : blockNorth ? "North drift blocked; replanned via South drift." : "North drift cleared."
    });
    RescueMesh.showToast(blockNorth && blockSouth ? "All paths blocked -> HOLD" : "Simulated route map updated.", blockNorth ? "warning" : "success");
  });

  document.getElementById("blockSouthBtn").addEventListener("click", () => {
    blockSouth = !blockSouth;
    updateSlamMap();
    RescueMesh.showToast(blockNorth && blockSouth ? "No feasible route -> HOLD" : "South drift blockage toggled.", blockSouth ? "warning" : "info");
  });

  document.getElementById("resetMapBtn").addEventListener("click", () => {
    blockNorth = false;
    blockSouth = false;
    updateSlamMap();
    RescueMesh.showToast("Tunnel simulation blockages cleared.", "success");
  });

  renderSensors();
  updateSlamMap();

  setInterval(() => {
    const state = RescueMesh.loadState();
    if (!state.liveDemoRunning) return;
    RescueMesh.tickSensors(state);
    renderSensors();
  }, 3500);
})();
