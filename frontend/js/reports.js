/* RescueMesh Mission Reports, Logs, Filtering & CSV Export */

(function () {
  RescueMesh.renderAppShell("reports.html", "Mission Reports & Event Logs");

  function getFilteredLogs() {
    const state = RescueMesh.loadState();
    const q = document.getElementById("logSearchInput").value.trim().toLowerCase();
    const agentF = document.getElementById("logAgentFilter").value;
    const statusF = document.getElementById("logStatusFilter").value;
    const dateF = document.getElementById("logDateFilter").value;

    return state.logs.filter((log) => {
      if (agentF !== "ALL" && log.agent !== agentF) return false;
      if (statusF !== "ALL" && log.missionStatus !== statusF && log.commStatus !== statusF) return false;
      if (dateF && !log.timestamp.startsWith(dateF)) return false;
      if (q) {
        const hay = `${log.missionId} ${log.agent} ${log.eventType} ${log.description}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  function renderTable() {
    const rows = getFilteredLogs();
    const tbody = document.getElementById("logsTableBody");
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No matching mission log entries.</td></tr>`;
      return;
    }
    tbody.innerHTML = rows.map((l) => `
      <tr>
        <td class="mono text-xs">${l.missionId}</td>
        <td class="mono text-xs">${l.timestamp}</td>
        <td>${l.agent}</td>
        <td><strong>${l.eventType}</strong></td>
        <td><span class="badge ${RescueMesh.statusBadgeClass(l.commStatus)}">${l.commStatus}</span></td>
        <td><span class="badge ${RescueMesh.statusBadgeClass(l.missionStatus)}">${l.missionStatus}</span></td>
        <td class="text-sm text-muted">${l.description}</td>
      </tr>
    `).join("");
    RescueMesh.syncHeaderIndicators();
  }

  function renderCharts() {
    if (typeof Chart === "undefined") return;
    new Chart(document.getElementById("repAvailabilityChart"), {
      type: "bar",
      data: {
        labels: ["Fixed Relay (Sim)", "RescueMesh (Sim)"],
        datasets: [{
          label: "Simulated Availability (%)",
          data: [68, 94],
          backgroundColor: ["#64748b", "#06b6d4"],
          borderRadius: 6
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 100 } } }
    });

    new Chart(document.getElementById("repPdrChart"), {
      type: "line",
      data: {
        labels: ["T1", "T2", "Failover", "T4", "Recovery", "T6"],
        datasets: [{
          label: "Packet Delivery Ratio % (Demo Only)",
          data: [99, 98, 72, 95, 97, 98],
          borderColor: "#10b981",
          backgroundColor: "rgba(16,185,129,0.16)",
          fill: true,
          tension: 0.3
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 100 } } }
    });

    const state = RescueMesh.loadState();
    new Chart(document.getElementById("repBatteryChart"), {
      type: "bar",
      data: {
        labels: ["Rover", "Drone", "Relay 1", "Relay 2"],
        datasets: [{
          label: "Remaining Battery % (Sim)",
          data: [
            state.agents["ROVER-01"].battery,
            state.agents["DRONE-01"].battery,
            state.agents["RELAY-01"].battery,
            state.agents["RELAY-02"].battery
          ],
          backgroundColor: ["#06b6d4", "#3b82f6", "#14b8a6", "#10b981"],
          borderRadius: 6
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 100 } } }
    });
  }

  document.getElementById("exportCsvBtn").addEventListener("click", () => {
    const rows = getFilteredLogs();
    const header = ["Mission ID", "Timestamp", "Agent", "Event Type", "Comm Status", "Mission Status", "Description"];
    const csvLines = [
      header.join(","),
      ...rows.map((r) => [
        r.missionId,
        r.timestamp,
        `"${String(r.agent).replace(/"/g, '""')}"`,
        `"${String(r.eventType).replace(/"/g, '""')}"`,
        r.commStatus,
        r.missionStatus,
        `"${String(r.description).replace(/"/g, '""')}"`
      ].join(","))
    ];
    const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rescuemesh_mission_logs_sim.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    RescueMesh.showToast(`Exported ${rows.length} log entries to CSV.`, "success");
  });

  const modal = document.getElementById("reportModal");
  document.getElementById("generateReportBtn").addEventListener("click", () => {
    const state = RescueMesh.loadState();
    const rows = getFilteredLogs();
    const holdEvents = rows.filter((r) => r.missionStatus === "HOLD").length;
    const recoverEvents = rows.filter((r) => r.eventType.toLowerCase().includes("route") || r.eventType.toLowerCase().includes("restored")).length;

    document.getElementById("reportModalBody").innerHTML = `
      <div class="sim-banner mb-2"><strong>SIMULATED DEMONSTRATION REPORT</strong> — Generated ${RescueMesh.formatNow()}</div>
      <p><strong>Project:</strong> RescueMesh (Team NEXORA)</p>
      <p><strong>Mission:</strong> ${state.mission.mission_code} — ${state.mission.title}</p>
      <p><strong>Current Network State:</strong> ${state.networkMode} | <strong>Buffered Packets:</strong> ${state.bufferedPackets}</p>
      <p><strong>Filtered Events:</strong> ${rows.length} | <strong>Recovery Events:</strong> ${recoverEvents} | <strong>HOLD Events:</strong> ${holdEvents}</p>
      <hr style="border-color:var(--border-color); margin:0.9rem 0;"/>
      <p class="text-xs text-muted">Note: All metrics in this report are generated in simulation mode for demonstration and must not be cited as field-validated experimental trials.</p>
    `;
    modal.classList.add("open");
  });

  document.getElementById("closeReportModal").addEventListener("click", () => modal.classList.remove("open"));
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.classList.remove("open"); });

  ["logSearchInput", "logAgentFilter", "logStatusFilter", "logDateFilter"].forEach((id) => {
    document.getElementById(id).addEventListener("input", renderTable);
    document.getElementById(id).addEventListener("change", renderTable);
  });

  renderTable();
  renderCharts();
  window.addEventListener("rescuemesh:statechange", renderTable);
})();
