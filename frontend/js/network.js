/* RescueMesh Interactive Self-Healing Mesh Network & Dynamic Role Assignment */

(function () {
  RescueMesh.renderAppShell("network.html", "Self-Healing Mesh & Dynamic Roles");

  const NODE_COORDS = {
    "STATION-01": { x: 85, y: 170, label: "Rescue Station" },
    "RELAY-01": { x: 245, y: 170, label: "Relay Node 1" },
    "RELAY-02": { x: 395, y: 265, label: "Relay Node 2" },
    "DRONE-01": { x: 325, y: 72, label: "Aerial Drone D1" },
    "ROVER-01": { x: 545, y: 170, label: "Ground Rover R1" }
  };

  function getLinksFromState(state) {
    const mode = state.networkMode;
    const droneRelay = state.agents["DRONE-01"].role === "RELAY" || mode === "REROUTED";
    const r2Relay = state.agents["RELAY-02"].role === "RELAY";

    if (mode === "HOLD") {
      return [
        { id: "L-ST-R1", from: "STATION-01", to: "RELAY-01", status: "FAILED", quality: 0, latency: "--" },
        { id: "L-R1-RV", from: "RELAY-01", to: "ROVER-01", status: "FAILED", quality: 0, latency: "--" },
        { id: "L-ST-DR", from: "STATION-01", to: "DRONE-01", status: "FAILED", quality: 0, latency: "--" },
        { id: "L-DR-RV", from: "DRONE-01", to: "ROVER-01", status: "FAILED", quality: 0, latency: "--" },
        { id: "L-ST-R2", from: "STATION-01", to: "RELAY-02", status: "FAILED", quality: 0, latency: "--" },
        { id: "L-R2-RV", from: "RELAY-02", to: "ROVER-01", status: "FAILED", quality: 0, latency: "--" }
      ];
    }

    if (mode === "REROUTED") {
      return [
        { id: "L-ST-R1", from: "STATION-01", to: "RELAY-01", status: "FAILED", quality: 0, latency: "--" },
        { id: "L-R1-RV", from: "RELAY-01", to: "ROVER-01", status: "FAILED", quality: 0, latency: "--" },
        { id: "L-ST-DR", from: "STATION-01", to: "DRONE-01", status: droneRelay ? "REROUTED" : "BACKUP", quality: 90, latency: "16 ms" },
        { id: "L-DR-RV", from: "DRONE-01", to: "ROVER-01", status: droneRelay ? "REROUTED" : "BACKUP", quality: 87, latency: "20 ms" },
        { id: "L-ST-R2", from: "STATION-01", to: "RELAY-02", status: r2Relay ? "REROUTED" : "BACKUP", quality: 89, latency: "17 ms" },
        { id: "L-R2-RV", from: "RELAY-02", to: "ROVER-01", status: r2Relay ? "REROUTED" : "BACKUP", quality: 84, latency: "23 ms" }
      ];
    }

    return [
      { id: "L-ST-R1", from: "STATION-01", to: "RELAY-01", status: "ACTIVE", quality: 94, latency: "12 ms" },
      { id: "L-R1-RV", from: "RELAY-01", to: "ROVER-01", status: "ACTIVE", quality: 88, latency: "18 ms" },
      { id: "L-ST-DR", from: "STATION-01", to: "DRONE-01", status: droneRelay ? "ACTIVE" : "BACKUP", quality: 91, latency: "15 ms" },
      { id: "L-DR-RV", from: "DRONE-01", to: "ROVER-01", status: droneRelay ? "ACTIVE" : "BACKUP", quality: 86, latency: "21 ms" },
      { id: "L-ST-R2", from: "STATION-01", to: "RELAY-02", status: r2Relay ? "ACTIVE" : "BACKUP", quality: 89, latency: "16 ms" },
      { id: "L-R2-RV", from: "RELAY-02", to: "ROVER-01", status: r2Relay ? "ACTIVE" : "BACKUP", quality: 83, latency: "24 ms" }
    ];
  }

  function renderMesh() {
    const state = RescueMesh.loadState();
    const links = getLinksFromState(state);
    const linksLayer = document.getElementById("meshLinksLayer");
    const nodesLayer = document.getElementById("meshNodesLayer");

    linksLayer.innerHTML = links.map((lnk) => {
      const p1 = NODE_COORDS[lnk.from];
      const p2 = NODE_COORDS[lnk.to];
      const cls = lnk.status === "ACTIVE" ? "link-active"
        : lnk.status === "REROUTED" ? "link-rerouted"
        : lnk.status === "FAILED" ? "link-failed"
        : "link-backup";
      const mx = (p1.x + p2.x) / 2;
      const my = (p1.y + p2.y) / 2;
      return `
        <line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" class="${cls}"/>
        ${lnk.status === "FAILED" ? `<text x="${mx}" y="${my - 4}" text-anchor="middle" fill="#ef4444" font-size="11" font-weight="bold">✕</text>` : ""}
      `;
    }).join("");

    nodesLayer.innerHTML = Object.entries(NODE_COORDS).map(([code, pos]) => {
      const agent = state.agents[code];
      const fill = agent.status === "ONLINE" ? "#11243f" : agent.status === "WARNING" ? "#3b270b" : "#3a1219";
      const stroke = agent.status === "ONLINE" ? "#10b981" : agent.status === "WARNING" ? "#f59e0b" : "#ef4444";
      return `
        <g transform="translate(${pos.x},${pos.y})">
          <circle r="27" fill="${fill}" stroke="${stroke}" stroke-width="2.5"/>
          <text y="-3" text-anchor="middle" fill="#e2e8f0" font-size="9.5" font-weight="700" font-family="monospace">${code.split("-")[0]}</text>
          <text y="10" text-anchor="middle" fill="#38bdf8" font-size="8" font-family="monospace">${agent.role}</text>
          <text y="42" text-anchor="middle" fill="#cbd5e1" font-size="10" font-family="sans-serif">${pos.label}</text>
        </g>
      `;
    }).join("");

    // Metrics & Table
    const routeEl = document.getElementById("netActiveRoute");
    const pdrEl = document.getElementById("netPdr");
    const bufEl = document.getElementById("netBufferCount");
    const holdEl = document.getElementById("netHoldState");
    const msgEl = document.getElementById("netStatusMessage");

    if (state.networkMode === "HOLD") {
      routeEl.textContent = "NONE — All communication paths unavailable";
      pdrEl.textContent = "0.0% (HOLD)";
      msgEl.textContent = "Communication lost across all hops. Edge units buffering locally in Store-and-Forward queue and holding position safely.";
    } else if (state.networkMode === "REROUTED") {
      const activeRelay = state.agents["RELAY-02"].role === "RELAY" ? "Relay Node 2" : "Aerial Drone D1";
      routeEl.textContent = `Rover → ${activeRelay} → Rescue Station (Alternate)`;
      pdrEl.textContent = "94.8%";
      msgEl.textContent = `Primary link failed; self-healing restored route via ${activeRelay} (conditional on alternate path & battery reserve).`;
    } else {
      routeEl.textContent = "Rover → Relay Node 1 → Rescue Station";
      pdrEl.textContent = "98.4%";
      msgEl.textContent = "Primary multi-hop ground relay route operating normally with application ACKs.";
    }

    bufEl.textContent = `${state.bufferedPackets} pkts`;
    holdEl.textContent = `Mission State: ${state.mission.mission_status}`;
    document.getElementById("netAckInfo").textContent = `SEQ #${state.seqId} • App ACKs ${state.networkMode === "HOLD" ? "Paused" : "Confirmed"}`;

    document.getElementById("meshLinksTable").innerHTML = links.map((l) => `
      <tr>
        <td class="mono">${l.id}</td>
        <td>${NODE_COORDS[l.from].label}</td>
        <td>${NODE_COORDS[l.to].label}</td>
        <td><span class="badge ${RescueMesh.statusBadgeClass(l.status)}">${l.status}</span></td>
        <td class="mono">${l.quality}%</td>
        <td class="mono">${l.latency}</td>
      </tr>
    `).join("");

    renderRoleCards(state);
    RescueMesh.syncHeaderIndicators();
  }

  function renderRoleCards(state) {
    const codes = ["ROVER-01", "DRONE-01", "RELAY-01", "RELAY-02"];
    document.getElementById("roleCardsGrid").innerHTML = codes.map((code) => {
      const a = state.agents[code];
      return `
        <div class="card" style="background:var(--bg-secondary);">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong>${a.name}</strong>
            <span class="badge ${RescueMesh.statusBadgeClass(a.status)}">${a.status}</span>
          </div>
          <div class="mt-2">Current Role: <span class="badge badge-role">${a.role}</span></div>
          <div class="text-xs text-muted mt-2">Battery (Sim): <strong class="mono">${a.battery}%</strong> • Signal: <strong class="mono">${a.signal}%</strong></div>
          <div class="progress-track mt-1"><div class="progress-fill" style="width:${a.battery}%; background:${a.battery < 30 ? "var(--status-orange)" : "var(--accent-cyan)"}"></div></div>
        </div>
      `;
    }).join("");
  }

  // Button: Simulate Link Failure
  document.getElementById("simLinkFailBtn").addEventListener("click", () => {
    const state = RescueMesh.loadState();
    state.networkMode = "REROUTED";
    state.mission.mission_status = "ACTIVE";
    state.agents["RELAY-01"].status = "WARNING";
    state.agents["RELAY-01"].comm = "DISCONNECTED";
    state.agents["DRONE-01"].role = "RELAY";
    state.agents["DRONE-01"].relayMode = true;
    state.agents["DRONE-01"].flight = "AIRBORNE (SIM)";
    state.agents["ROVER-01"].status = "ONLINE";
    state.agents["ROVER-01"].comm = "CONNECTED";

    RescueMesh.addLog(state, {
      agent: "Relay Node 1",
      eventType: "Communication link lost",
      commStatus: "DISCONNECTED",
      missionStatus: "ACTIVE",
      severity: "WARNING",
      description: "Primary link Rover <-> Relay Node 1 failed. Searching for available alternate path."
    });
    RescueMesh.addLog(state, {
      agent: "Aerial Drone D1",
      eventType: "Alternate route established",
      commStatus: "CONNECTED",
      missionStatus: "ACTIVE",
      severity: "SUCCESS",
      description: "Aerial Drone D1 assumed RELAY role; path Rover -> Drone -> Rescue Station active."
    });

    RescueMesh.tryApi("/api/network/simulate-failure", "POST", { mode: "SINGLE_LINK" });
    RescueMesh.showToast("Link failure simulated: Aerial Drone D1 established alternate route.", "warning");
    renderMesh();
  });

  // Button: Simulate Complete Network Loss
  document.getElementById("simCompleteLossBtn").addEventListener("click", () => {
    const state = RescueMesh.loadState();
    state.networkMode = "HOLD";
    state.mission.mission_status = "HOLD";
    state.bufferedPackets += 14;
    ["ROVER-01", "DRONE-01", "RELAY-01", "RELAY-02"].forEach((c) => {
      state.agents[c].comm = "DISCONNECTED";
    });
    state.agents["ROVER-01"].status = "HOLD";
    state.agents["ROVER-01"].movement = "HOLD_LOCAL_BUFFER";

    RescueMesh.addLog(state, {
      agent: "Ground Rover R1",
      eventType: "Data buffered locally",
      commStatus: "DISCONNECTED",
      missionStatus: "HOLD",
      severity: "WARNING",
      description: "All communication paths lost. Local Store-and-Forward buffer storing telemetry."
    });
    RescueMesh.addLog(state, {
      agent: "Mesh Network",
      eventType: "Mission entered HOLD",
      commStatus: "DISCONNECTED",
      missionStatus: "HOLD",
      severity: "CRITICAL",
      description: "No physical alternate path available. System entered safe HOLD state."
    });

    RescueMesh.tryApi("/api/network/simulate-failure", "POST", { mode: "COMPLETE_LOSS" });
    RescueMesh.showToast("Complete network loss: local buffering active & mission entered HOLD.", "error");
    renderMesh();
  });

  // Button: Restore Network
  function handleRestore() {
    const state = RescueMesh.loadState();
    const flushed = state.bufferedPackets;
    state.networkMode = "NORMAL";
    state.mission.mission_status = "ACTIVE";
    state.bufferedPackets = 0;
    ["ROVER-01", "DRONE-01", "RELAY-01", "RELAY-02"].forEach((c) => {
      state.agents[c].status = "ONLINE";
      state.agents[c].comm = "CONNECTED";
    });
    state.agents["ROVER-01"].role = "EXPLORER";
    state.agents["ROVER-01"].movement = "IDLE";
    state.agents["DRONE-01"].role = "SUPPORT";
    state.agents["DRONE-01"].relayMode = false;
    state.agents["RELAY-01"].role = "RELAY";
    state.agents["RELAY-02"].role = "SUPPORT";
    state.agents["DRONE-01"].battery = 78;
    state.agents["RELAY-02"].battery = 92;

    RescueMesh.addLog(state, {
      agent: "Mesh Network",
      eventType: "Network restored",
      commStatus: "CONNECTED",
      missionStatus: "ACTIVE",
      severity: "SUCCESS",
      description: `Primary mesh restored. Flushed ${flushed} locally buffered packet(s) with ACK confirmation.`
    });

    RescueMesh.tryApi("/api/network/restore", "POST");
    RescueMesh.showToast(`Network restored. Flushed ${flushed} buffered packet(s).`, "success");
    renderMesh();
  }

  document.getElementById("restoreNetBtn").addEventListener("click", handleRestore);
  document.getElementById("bannerRestoreBtn").addEventListener("click", handleRestore);

  // Low-Battery Relay Handover Simulation
  document.getElementById("simLowBatHandoverBtn").addEventListener("click", () => {
    const state = RescueMesh.loadState();
    if (state.networkMode === "HOLD") {
      RescueMesh.showToast("Restore network first before simulating relay handover.", "error");
      return;
    }

    const hoBanner = document.getElementById("handoverVisual");
    document.getElementById("hoFromName").textContent = "Aerial Drone D1 (22% bat)";
    document.getElementById("hoToName").textContent = "Relay Node 2 (92% bat)";
    hoBanner.style.display = "flex";
    hoBanner.classList.add("handover-pulse");

    state.agents["DRONE-01"].battery = 22;
    state.agents["DRONE-01"].status = "WARNING";
    state.agents["DRONE-01"].role = "SUPPORT";
    state.agents["DRONE-01"].relayMode = false;
    state.agents["RELAY-02"].role = "RELAY";
    state.agents["RELAY-02"].status = "ONLINE";
    state.networkMode = "REROUTED";

    RescueMesh.addLog(state, {
      agent: "Aerial Drone D1 -> Relay Node 2",
      eventType: "Relay role transferred",
      commStatus: "CONNECTED",
      missionStatus: state.mission.mission_status,
      severity: "WARNING",
      description: "Low-battery warning on Aerial Drone D1 (22%). Confirmed Relay Node 2 (92%) and transferred RELAY role."
    });

    RescueMesh.tryApi("/api/roles/handover", "POST", { from_agent: "DRONE-01", to_agent: "RELAY-02" });
    RescueMesh.showToast("Low-battery warning: Relay role transferred to Relay Node 2.", "warning");
    renderMesh();

    setTimeout(() => {
      hoBanner.classList.remove("handover-pulse");
    }, 3200);
  });

  // Manual Role Assignment
  document.getElementById("assignRoleBtn").addEventListener("click", () => {
    const agentCode = document.getElementById("roleAgentSelect").value;
    const newRole = document.getElementById("roleTargetSelect").value;
    const state = RescueMesh.loadState();
    const agent = state.agents[agentCode];
    const prev = agent.role;
    agent.role = newRole;
    if (agentCode === "DRONE-01") agent.relayMode = newRole === "RELAY";

    RescueMesh.addLog(state, {
      agent: agent.name,
      eventType: "Relay role transferred",
      commStatus: agent.comm,
      missionStatus: state.mission.mission_status,
      severity: "INFO",
      description: `Simulated role change for ${agent.name}: ${prev} -> ${newRole}.`
    });
    RescueMesh.showToast(`${agent.name} assigned role: ${newRole}`, "success");
    renderMesh();
  });

  renderMesh();
  window.addEventListener("rescuemesh:statechange", renderMesh);
})();
