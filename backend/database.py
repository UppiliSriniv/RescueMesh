"""Database adapter for RescueMesh.

Connects to MySQL when mysql-connector-python and a configured MySQL server are
available. Falls back cleanly to in-memory SimulationStore if unavailable.
"""

from typing import Optional
from config import Config

try:
    import mysql.connector  # type: ignore
    MYSQL_DRIVER_AVAILABLE = True
except ImportError:
    mysql = None
    MYSQL_DRIVER_AVAILABLE = False


class DatabaseManager:
    def __init__(self) -> None:
        self.mode = "simulation"
        self.last_error: Optional[str] = None
        self._check_connection()

    def _get_connection(self):
        if not MYSQL_DRIVER_AVAILABLE:
            raise RuntimeError("mysql-connector-python is not installed")
        return mysql.connector.connect(
            host=Config.MYSQL_HOST,
            port=Config.MYSQL_PORT,
            user=Config.MYSQL_USER,
            password=Config.MYSQL_PASSWORD,
            database=Config.MYSQL_DATABASE,
            connection_timeout=2,
        )

    def _check_connection(self) -> None:
        try:
            conn = self._get_connection()
            conn.close()
            self.mode = "mysql"
            self.last_error = None
        except Exception as exc:
            self.mode = "simulation"
            self.last_error = str(exc)

    def status(self) -> dict:
        return {
            "storage_mode": self.mode,
            "mysql_connected": self.mode == "mysql",
            "note": "Using local demonstration store (simulated mode)" if self.mode != "mysql" else "Connected to MySQL",
        }

    def log_event(self, entry: dict) -> None:
        if self.mode != "mysql":
            return
        try:
            conn = self._get_connection()
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO mission_logs
                (mission_code, agent_name, event_type, comm_status, mission_status, severity, description, is_simulated)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    entry["mission_code"],
                    entry["agent"],
                    entry["event_type"],
                    entry["comm_status"],
                    entry["mission_status"],
                    entry["severity"],
                    entry["description"],
                    entry.get("is_simulated", True),
                ),
            )
            conn.commit()
            cursor.close()
            conn.close()
        except Exception:
            # Never break the demonstration API if DB drops mid-session
            self.mode = "simulation"


db_manager = DatabaseManager()
