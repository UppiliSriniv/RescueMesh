"""REST API endpoints for RescueMesh Mission Control."""

from flask import Blueprint, jsonify, request
from database import db_manager
from models import sim_store

api_bp = Blueprint("api", __name__, url_prefix="/api")


@api_bp.get("/health")
def health():
    return jsonify({
        "status": "ok",
        "service": "RescueMesh Backend API",
        "hardware_connected": False,
        "simulation_mode": True,
        **db_manager.status(),
    })


@api_bp.get("/dashboard")
def get_dashboard():
    sensors = sim_store.tick_sensors()
    agents_list = list(sim_store.agents.values())
    online_count = sum(1 for a in agents_list if a["status"] == "ONLINE")
    return jsonify({
        "simulation_mode": True,
        "hardware_connected": False,
        "database": db_manager.status(),
        "mission": sim_store.mission,
        "network_mode": sim_store.network_mode,
        "buffered_packets": sim_store.buffered_packets,
        "summary": {
            "active_agents": online_count,
            "total_agents": len(agents_list),
            "network_status": "CONNECTED" if sim_store.network_mode != "HOLD" else "HOLD",
            "rover_battery": sim_store.agents["ROVER-01"]["battery_pct"],
            "drone_battery": sim_store.agents["DRONE-01"]["battery_pct"],
            "active_mission": sim_store.mission["mission_code"],
            "alerts_count": sum(1 for l in sim_store.logs[:10] if l["severity"] in ("WARNING", "CRITICAL")),
        },
        "agents": agents_list,
        "sensors": sensors,
        "recent_logs": sim_store.logs[:8],
    })


@api_bp.get("/agents")
def get_agents():
    return jsonify({
        "simulation_mode": True,
        "agents": list(sim_store.agents.values()),
    })


@api_bp.get("/sensors")
def get_sensors():
    return jsonify({
        "simulation_mode": True,
        "label": "SIMULATED DATA",
        "disclaimer": "Simulated readings only. Thresholds are not calibrated for mine-safety certification.",
        "sensors": sim_store.tick_sensors(),
    })


@api_bp.get("/network")
def get_network():
    return jsonify({
        "simulation_mode": True,
        "network_mode": sim_store.network_mode,
        "buffered_packets": sim_store.buffered_packets,
        "seq_id": sim_store.seq_id,
        "nodes": list(sim_store.agents.values()),
        "links": sim_store.links,
    })


@api_bp.get("/missions")
def get_missions():
    return jsonify({
        "simulation_mode": True,
        "missions": [sim_store.mission],
    })


@api_bp.get("/logs")
def get_logs():
    return jsonify({
        "simulation_mode": True,
        "logs": sim_store.logs,
    })


@api_bp.post("/rover/command")
def rover_command():
    payload = request.get_json(silent=True) or {}
    cmd = str(payload.get("command", "STOP")).upper()
    speed = int(payload.get("speed", sim_store.agents["ROVER-01"]["speed"]))

    if sim_store.network_mode == "HOLD" and cmd != "STOP":
        return jsonify({
            "accepted": False,
            "simulation_mode": True,
            "message": "Mission in HOLD state: remote rover commands blocked while all communication links are down. Local buffering active.",
        }), 409

    rover = sim_store.agents["ROVER-01"]
    rover["speed"] = 0 if cmd == "STOP" else max(10, min(100, speed))
    rover["movement_status"] = "STOPPED" if cmd == "STOP" else f"MOVING_{cmd}"
    sim_store.seq_id += 1

    entry = sim_store.add_log(
        agent="Ground Rover R1",
        event_type="Simulated rover command",
        comm_status=rover["comm_status"],
        mission_status=sim_store.mission["mission_status"],
        severity="WARNING" if cmd == "STOP" else "INFO",
        description=f"UI demo command '{cmd}' (speed {rover['speed']}%) acknowledged (SEQ {sim_store.seq_id}).",
    )
    db_manager.log_event(entry)

    return jsonify({
        "accepted": True,
        "simulation_mode": True,
        "message": f"Simulated Rover command '{cmd}' executed in demonstration mode.",
        "rover": rover,
        "log": entry,
    })


@api_bp.post("/drone/command")
def drone_command():
    payload = request.get_json(silent=True) or {}
    action = str(payload.get("action", "HOLD")).upper()

    if sim_store.network_mode == "HOLD" and action not in ("LAND", "RETURN_SAFE"):
        return jsonify({
            "accepted": False,
            "simulation_mode": True,
            "message": "Mission in HOLD state: drone remains in safe local state while links are unavailable.",
        }), 409

    drone = sim_store.agents["DRONE-01"]
    if action == "TAKEOFF":
        drone["flight_status"] = "AIRBORNE"
    elif action == "LAND":
        drone["flight_status"] = "LANDED"
    elif action == "RETURN_SAFE":
        drone["flight_status"] = "RETURNING_SAFE"
    elif action == "TOGGLE_RELAY":
        drone["relay_mode"] = not drone["relay_mode"]
        drone["current_role"] = "RELAY" if drone["relay_mode"] else "SUPPORT"

    sim_store.seq_id += 1
    entry = sim_store.add_log(
        agent="Aerial Drone D1",
        event_type="Simulated drone action",
        comm_status=drone["comm_status"],
        mission_status=sim_store.mission["mission_status"],
        severity="INFO",
        description=f"UI demo drone action '{action}' processed (flight={drone['flight_status']}, relay={drone['relay_mode']}).",
    )
    db_manager.log_event(entry)

    return jsonify({
        "accepted": True,
        "simulation_mode": True,
        "message": f"Simulated Drone action '{action}' applied.",
        "drone": drone,
        "log": entry,
    })


@api_bp.post("/network/simulate-failure")
def simulate_link_failure():
    payload = request.get_json(silent=True) or {}
    mode = str(payload.get("mode", "SINGLE_LINK")).upper()

    if mode == "COMPLETE_LOSS":
        sim_store.network_mode = "HOLD"
        sim_store.mission["mission_status"] = "HOLD"
        sim_store.buffered_packets += 14
        for link in sim_store.links:
            link["status"] = "FAILED"
            link["quality"] = 0
        for code in ("ROVER-01", "DRONE-01", "RELAY-01", "RELAY-02"):
            sim_store.agents[code]["comm_status"] = "DISCONNECTED"
        sim_store.agents["ROVER-01"]["status"] = "HOLD"
        sim_store.agents["ROVER-01"]["movement_status"] = "HOLD_LOCAL_BUFFER"

        entry = sim_store.add_log(
            agent="Mesh Network",
            event_type="Mission entered HOLD",
            comm_status="DISCONNECTED",
            mission_status="HOLD",
            severity="CRITICAL",
            description="All communication paths unavailable. Telemetry buffered locally; system entered safe HOLD state.",
        )
        db_manager.log_event(entry)
        return jsonify({
            "simulation_mode": True,
            "network_mode": sim_store.network_mode,
            "buffered_packets": sim_store.buffered_packets,
            "links": sim_store.links,
            "log": entry,
        })

    # Single link failure -> self-heal via Drone relay if available
    sim_store.network_mode = "REROUTED"
    for link in sim_store.links:
        if link["link_code"] in ("L-ST-R1", "L-R1-RV"):
            link["status"] = "FAILED"
            link["quality"] = 0
        elif link["link_code"] in ("L-ST-DR", "L-DR-RV"):
            link["status"] = "ACTIVE"
            link["quality"] = 89

    sim_store.agents["RELAY-01"]["status"] = "WARNING"
    sim_store.agents["RELAY-01"]["comm_status"] = "DISCONNECTED"
    sim_store.agents["DRONE-01"]["current_role"] = "RELAY"
    sim_store.agents["DRONE-01"]["relay_mode"] = True
    sim_store.agents["DRONE-01"]["flight_status"] = "AIRBORNE"

    e1 = sim_store.add_log(
        agent="Relay Node 1",
        event_type="Communication link lost",
        comm_status="DISCONNECTED",
        mission_status="ACTIVE",
        severity="WARNING",
        description="Primary ground link Rover <-> Relay Node 1 lost. Evaluating available alternate paths.",
    )
    e2 = sim_store.add_log(
        agent="Aerial Drone D1",
        event_type="Alternate route established",
        comm_status="CONNECTED",
        mission_status="ACTIVE",
        severity="SUCCESS",
        description="Aerial Drone D1 repositioned into RELAY role; path Rover -> Drone -> Rescue Station active.",
    )
    db_manager.log_event(e1)
    db_manager.log_event(e2)

    return jsonify({
        "simulation_mode": True,
        "network_mode": sim_store.network_mode,
        "links": sim_store.links,
        "agents": list(sim_store.agents.values()),
        "log": e2,
    })


@api_bp.post("/network/restore")
def restore_network():
    flushed = sim_store.buffered_packets
    sim_store.reset()
    entry = sim_store.add_log(
        agent="Mesh Network",
        event_type="Network restored",
        comm_status="CONNECTED",
        mission_status="ACTIVE",
        severity="SUCCESS",
        description=f"Primary mesh topology restored. Flushed {flushed} locally buffered packet(s) with ACK verification.",
    )
    db_manager.log_event(entry)
    return jsonify({
        "simulation_mode": True,
        "network_mode": sim_store.network_mode,
        "flushed_packets": flushed,
        "links": sim_store.links,
        "agents": list(sim_store.agents.values()),
        "log": entry,
    })


@api_bp.post("/roles/handover")
def role_handover():
    payload = request.get_json(silent=True) or {}
    from_agent = str(payload.get("from_agent", "DRONE-01"))
    to_agent = str(payload.get("to_agent", "RELAY-02"))
    reason = str(payload.get("reason", "Low battery relay handover simulation"))

    if from_agent not in sim_store.agents or to_agent not in sim_store.agents:
        return jsonify({"error": "Invalid agent code"}), 400

    sim_store.agents[from_agent]["current_role"] = "SUPPORT"
    sim_store.agents[from_agent]["battery_pct"] = min(sim_store.agents[from_agent]["battery_pct"], 22)
    sim_store.agents[from_agent]["status"] = "WARNING"

    sim_store.agents[to_agent]["current_role"] = "RELAY"
    sim_store.agents[to_agent]["status"] = "ONLINE"

    entry = sim_store.add_log(
        agent=f"{sim_store.agents[from_agent]['name']} -> {sim_store.agents[to_agent]['name']}",
        event_type="Relay role transferred",
        comm_status="CONNECTED",
        mission_status=sim_store.mission["mission_status"],
        severity="SUCCESS",
        description=f"Relay role transferred from {from_agent} to {to_agent} ({reason}).",
    )
    db_manager.log_event(entry)

    return jsonify({
        "simulation_mode": True,
        "agents": list(sim_store.agents.values()),
        "log": entry,
    })
