/* RescueMesh Simulated Rover & Drone Mission Control */

(function () {
  RescueMesh.renderAppShell("mission-control.html", "Rover, Drone & Camera Control");

  function renderControls() {
    const state = RescueMesh.loadState();
    const rover = state.agents["ROVER-01"];
    const drone = state.agents["DRONE-01"];

    document.getElementById("mcRoverBat").textContent = `${rover.battery}%`;
    document.getElementById("mcRoverLidar").textContent = `${rover.lidar} m`;
    document.getElementById("mcRoverRole").textContent = rover.role;
    document.getElementById("mcRoverMove").textContent = rover.movement;
    document.getElementById("mcRoverComm").textContent = rover.comm;

    const rBadge = document.getElementById("mcRoverConn");
    rBadge.className = `badge ${RescueMesh.statusBadgeClass(rover.comm)}`;
    rBadge.textContent = rover.comm;

    document.getElementById("roverSpeedSlider").value = rover.speed;
    document.getElementById("roverSpeedVal").textContent = `${rover.speed}%`;

    document.getElementById("mcDroneBat").textContent = `${drone.battery}%`;
    document.getElementById("mcDroneFlight").textContent = drone.flight;
    document.getElementById("mcDroneRole").textContent = drone.role;
    document.getElementById("mcDroneComm").textContent = drone.comm;
    document.getElementById("mcDroneRelay").textContent = drone.relayMode ? "ON (RELAY)" : "OFF";

    const dBadge = document.getElementById("mcDroneStatus");
    dBadge.className = `badge ${RescueMesh.statusBadgeClass(drone.status)}`;
    dBadge.textContent = drone.status;

    document.getElementById("camRoverOverlay").textContent = `LIDAR: ${rover.lidar} m | MOVE: ${rover.movement}`;
    document.getElementById("camDroneOverlay").textContent = `FLIGHT: ${drone.flight} | ROLE: ${drone.role}`;

    RescueMesh.syncHeaderIndicators();
  }

  document.querySelectorAll("[data-rover-cmd]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const cmd = btn.getAttribute("data-rover-cmd");
      const state = RescueMesh.loadState();
      const speed = Number(document.getElementById("roverSpeedSlider").value);

      if (state.networkMode === "HOLD" && cmd !== "STOP") {
        RescueMesh.showToast("Mission in HOLD: remote rover movement blocked while network is offline.", "error");
        document.getElementById("roverFeedbackText").textContent = `BLOCKED (${cmd}) — Mission in HOLD`;
        return;
      }

      const rover = state.agents["ROVER-01"];
      rover.speed = cmd === "STOP" ? 0 : speed;
      rover.movement = cmd === "STOP" ? "STOPPED" : `SIM_${cmd} (${speed}%)`;
      state.seqId += 1;

      RescueMesh.addLog(state, {
        agent: "Ground Rover R1",
        eventType: cmd === "STOP" ? "Simulated Emergency STOP" : "Simulated Rover Command",
        commStatus: rover.comm,
        missionStatus: state.mission.mission_status,
        severity: cmd === "STOP" ? "WARNING" : "INFO",
        description: `UI demo command ${cmd} processed at ${rover.speed}% speed (SEQ ${state.seqId}).`
      });

      RescueMesh.tryApi("/api/rover/command", "POST", { command: cmd, speed });
      document.getElementById("roverFeedbackText").textContent = `${cmd} simulated (SEQ ${state.seqId})`;
      RescueMesh.showToast(cmd === "STOP" ? "STOP executed — simulated rover halted immediately." : `Simulated Rover: ${cmd} (${speed}%)`, cmd === "STOP" ? "warning" : "success");
      renderControls();
    });
  });

  const slider = document.getElementById("roverSpeedSlider");
  slider.addEventListener("input", () => {
    document.getElementById("roverSpeedVal").textContent = `${slider.value}%`;
    const state = RescueMesh.loadState();
    state.agents["ROVER-01"].speed = Number(slider.value);
    RescueMesh.saveState(state);
  });

  document.querySelectorAll("[data-drone-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.getAttribute("data-drone-action");
      const state = RescueMesh.loadState();
      const drone = state.agents["DRONE-01"];

      if (state.networkMode === "HOLD" && action !== "LAND" && action !== "RETURN_SAFE") {
        RescueMesh.showToast("Mission in HOLD: drone takeoff/relay blocked while all links are down.", "error");
        document.getElementById("droneFeedbackText").textContent = `BLOCKED (${action}) — Mission in HOLD`;
        return;
      }

      if (action === "TAKEOFF") drone.flight = "AIRBORNE (SIM)";
      if (action === "LAND") drone.flight = "LANDED";
      if (action === "RETURN_SAFE") drone.flight = "RETURNING_SAFE (SIM)";
      if (action === "TOGGLE_RELAY") {
        drone.relayMode = !drone.relayMode;
        drone.role = drone.relayMode ? "RELAY" : "SUPPORT";
      }

      state.seqId += 1;
      RescueMesh.addLog(state, {
        agent: "Aerial Drone D1",
        eventType: action === "TOGGLE_RELAY" ? "Drone relay mode toggled" : "Simulated Drone Action",
        commStatus: drone.comm,
        missionStatus: state.mission.mission_status,
        severity: "INFO",
        description: `UI demo drone action ${action} -> flight=${drone.flight}, role=${drone.role}.`
      });

      RescueMesh.tryApi("/api/drone/command", "POST", { action });
      document.getElementById("droneFeedbackText").textContent = `${action} simulated -> ${drone.flight}`;
      RescueMesh.showToast(`Simulated Drone: ${action}`, "success");
      renderControls();
    });
  });

  renderControls();
  window.addEventListener("rescuemesh:statechange", renderControls);
})();
