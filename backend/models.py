"""In-memory demonstration state and simulation logic for RescueMesh.

Used automatically when MySQL is not configured or unreachable, and also
provides simulated telemetry generators clearly labeled as simulated data.
"""

from datetime import datetime, timezone
import random


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")


class SimulationStore:
    """Holds mutable demonstration state for agents, network, sensors, and logs."""

    def __init__(self) -> None:
        self.reset()

    def reset(self) -> None:
        self.mission = {
            "mission_code": "RM-SIM-001",
            "title": "Sector-B Underground Tunnel Survey (Simulated)",
            "environment_type": "Underground Mine Drift",
            "mission_status": "ACTIVE",
            "progress_pct": 42,
            "is_simulated": True,
        }
        self.network_mode = "NORMAL"  # NORMAL | REROUTED | HOLD
        self.buffered_packets = 0
        self.seq_id = 1042

        self.agents = {
            "STATION-01": {
                "agent_code": "STATION-01",
                "name": "Rescue Station",
                "agent_type": "STATION",
                "status": "ONLINE",
                "comm_status": "CONNECTED",
                "current_role": "STATION",
                "battery_pct": 100,
                "signal_pct": 100,
                "movement_status": "FIXED",
                "speed": 0,
            },
            "ROVER-01": {
                "agent_code": "ROVER-01",
                "name": "Ground Rover R1",
                "agent_type": "ROVER",
                "status": "ONLINE",
                "comm_status": "CONNECTED",
                "current_role": "EXPLORER",
                "battery_pct": 84,
                "signal_pct": 88,
                "movement_status": "IDLE",
                "speed": 45,
                "lidar_distance_m": 2.4,
            },
            "DRONE-01": {
                "agent_code": "DRONE-01",
                "name": "Aerial Drone D1",
                "agent_type": "DRONE",
                "status": "ONLINE",
                "comm_status": "CONNECTED",
                "current_role": "SUPPORT",
                "battery_pct": 78,
                "signal_pct": 91,
                "flight_status": "LANDED",
                "relay_mode": False,
            },
            "RELAY-01": {
                "agent_code": "RELAY-01",
                "name": "Relay Node 1",
                "agent_type": "RELAY",
                "status": "ONLINE",
                "comm_status": "CONNECTED",
                "current_role": "RELAY",
                "battery_pct": 89,
                "signal_pct": 93,
            },
            "RELAY-02": {
                "agent_code": "RELAY-02",
                "name": "Relay Node 2",
                "agent_type": "RELAY",
                "status": "ONLINE",
                "comm_status": "CONNECTED",
                "current_role": "SUPPORT",
                "battery_pct": 92,
                "signal_pct": 90,
            },
        }

        self.links = [
            {"link_code": "L-ST-R1", "source": "STATION-01", "target": "RELAY-01", "status": "ACTIVE", "quality": 94, "latency_ms": 12},
            {"link_code": "L-R1-RV", "source": "RELAY-01", "target": "ROVER-01", "status": "ACTIVE", "quality": 88, "latency_ms": 18},
            {"link_code": "L-ST-DR", "source": "STATION-01", "target": "DRONE-01", "status": "BACKUP", "quality": 91, "latency_ms": 15},
            {"link_code": "L-DR-RV", "source": "DRONE-01", "target": "ROVER-01", "status": "BACKUP", "quality": 86, "latency_ms": 21},
            {"link_code": "L-ST-R2", "source": "STATION-01", "target": "RELAY-02", "status": "BACKUP", "quality": 89, "latency_ms": 16},
            {"link_code": "L-R2-RV", "source": "RELAY-02", "target": "ROVER-01", "status": "BACKUP", "quality": 83, "latency_ms": 24},
        ]

        self.sensors = [
            {"key": "ch4", "name": "CH4 - Methane", "category": "gas", "value": 0.42, "unit": "% LEL (sim)", "status": "ONLINE"},
            {"key": "co", "name": "CO - Carbon Monoxide", "category": "gas", "value": 12.0, "unit": "ppm (sim)", "status": "ONLINE"},
            {"key": "co2", "name": "CO2 - Carbon Dioxide", "category": "gas", "value": 640.0, "unit": "ppm (sim)", "status": "ONLINE"},
            {"key": "o2", "name": "O2 - Oxygen", "category": "gas", "value": 20.6, "unit": "% vol (sim)", "status": "ONLINE"},
            {"key": "h2s", "name": "H2S - Hydrogen Sulfide", "category": "gas", "value": 1.2, "unit": "ppm (sim)", "status": "ONLINE"},
            {"key": "temp", "name": "Temperature", "category": "env", "value": 27.4, "unit": "°C", "status": "ONLINE"},
            {"key": "humidity", "name": "Humidity", "category": "env", "value": 68.0, "unit": "% RH", "status": "ONLINE"},
            {"key": "dust", "name": "Dust / Smoke", "category": "env", "value": 48.0, "unit": "µg/m³", "status": "ONLINE"},
            {"key": "lidar", "name": "LiDAR Distance", "category": "kinematic", "value": 2.4, "unit": "m", "status": "ONLINE"},
            {"key": "imu", "name": "IMU / Tilt", "category": "kinematic", "value": 3.1, "unit": "deg", "status": "ONLINE"},
            {"key": "vibration", "name": "Vibration", "category": "kinematic", "value": 0.18, "unit": "g RMS", "status": "ONLINE"},
        ]

        self.logs = [
            {
                "id": 1,
                "mission_code": "RM-SIM-001",
                "timestamp": utc_now_iso(),
                "agent": "Rescue Station",
                "event_type": "Mission started",
                "comm_status": "CONNECTED",
                "mission_status": "ACTIVE",
                "severity": "INFO",
                "description": "Initialized RescueMesh simulated underground mission RM-SIM-001.",
                "is_simulated": True,
            },
            {
                "id": 2,
                "mission_code": "RM-SIM-001",
                "timestamp": utc_now_iso(),
                "agent": "Ground Rover R1",
                "event_type": "Rover connected",
                "comm_status": "CONNECTED",
                "mission_status": "ACTIVE",
                "severity": "SUCCESS",
                "description": "Ground Rover R1 connected via Relay Node 1 (SEQ 1041, ACK confirmed).",
                "is_simulated": True,
            },
            {
                "id": 3,
                "mission_code": "RM-SIM-001",
                "timestamp": utc_now_iso(),
                "agent": "Aerial Drone D1",
                "event_type": "Drone standby ready",
                "comm_status": "CONNECTED",
                "mission_status": "ACTIVE",
                "severity": "INFO",
                "description": "Aerial Drone D1 ready in SUPPORT role for aerial inspection or relay handover.",
                "is_simulated": True,
            },
        ]

    def add_log(self, agent: str, event_type: str, comm_status: str, mission_status: str, severity: str, description: str) -> dict:
        entry = {
            "id": len(self.logs) + 1,
            "mission_code": self.mission["mission_code"],
            "timestamp": utc_now_iso(),
            "agent": agent,
            "event_type": event_type,
            "comm_status": comm_status,
            "mission_status": mission_status,
            "severity": severity,
            "description": description,
            "is_simulated": True,
        }
        self.logs.insert(0, entry)
        return entry

    def tick_sensors(self) -> list:
        jitter_map = {
            "ch4": (0.04, 0.05, 3.0, 2),
            "co": (1.5, 0.0, 80.0, 1),
            "co2": (12.0, 380.0, 2500.0, 0),
            "o2": (0.15, 17.5, 21.2, 2),
            "h2s": (0.2, 0.0, 15.0, 2),
            "temp": (0.3, 18.0, 42.0, 1),
            "humidity": (1.2, 30.0, 95.0, 1),
            "dust": (4.0, 10.0, 250.0, 1),
            "lidar": (0.25, 0.35, 12.0, 2),
            "imu": (0.6, 0.0, 22.0, 1),
            "vibration": (0.04, 0.02, 1.5, 2),
        }
        now = utc_now_iso()
        for sensor in self.sensors:
            delta, min_v, max_v, decimals = jitter_map[sensor["key"]]
            next_val = sensor["value"] + random.uniform(-delta, delta)
            sensor["value"] = round(max(min_v, min(max_v, next_val)), decimals)
            sensor["updated_at"] = now
            sensor["is_simulated"] = True
        return self.sensors


sim_store = SimulationStore()
