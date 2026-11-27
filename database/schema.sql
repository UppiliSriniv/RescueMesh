-- RescueMesh MySQL Database Schema
-- Team NEXORA | Self-Healing, Communication-Aware Multi-Agent Rescue System

CREATE DATABASE IF NOT EXISTS rescuemesh_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE rescuemesh_db;

-- 1. Agents (Rover, Drone, Relay Nodes, Rescue Station)
CREATE TABLE IF NOT EXISTS agents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  agent_code VARCHAR(32) NOT NULL UNIQUE,
  name VARCHAR(64) NOT NULL,
  agent_type ENUM('STATION', 'ROVER', 'DRONE', 'RELAY') NOT NULL,
  status ENUM('ONLINE', 'OFFLINE', 'WARNING', 'CRITICAL', 'HOLD') NOT NULL DEFAULT 'ONLINE',
  comm_status ENUM('CONNECTED', 'DISCONNECTED', 'DEGRADED') NOT NULL DEFAULT 'CONNECTED',
  current_role ENUM('EXPLORER', 'RELAY', 'SUPPORT', 'STATION') NOT NULL DEFAULT 'EXPLORER',
  battery_pct DECIMAL(5,2) NOT NULL DEFAULT 100.00,
  signal_pct DECIMAL(5,2) NOT NULL DEFAULT 95.00,
  pos_x DECIMAL(7,2) NOT NULL DEFAULT 0.00,
  pos_y DECIMAL(7,2) NOT NULL DEFAULT 0.00,
  is_simulated BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Sensor Readings (Simulated / Hardware Telemetry)
CREATE TABLE IF NOT EXISTS sensor_readings (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  agent_code VARCHAR(32) NOT NULL,
  sensor_key VARCHAR(32) NOT NULL,
  sensor_name VARCHAR(64) NOT NULL,
  reading_value DECIMAL(10,3) NOT NULL,
  unit VARCHAR(16) NOT NULL,
  connection_status ENUM('ONLINE', 'OFFLINE', 'WARNING') NOT NULL DEFAULT 'ONLINE',
  is_simulated BOOLEAN NOT NULL DEFAULT TRUE,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sensor_time (sensor_key, recorded_at)
);

-- 3. Network Nodes
CREATE TABLE IF NOT EXISTS network_nodes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  node_code VARCHAR(32) NOT NULL UNIQUE,
  label VARCHAR(64) NOT NULL,
  node_type ENUM('STATION', 'ROVER', 'DRONE', 'RELAY') NOT NULL,
  status ENUM('ONLINE', 'OFFLINE', 'WARNING', 'HOLD') NOT NULL DEFAULT 'ONLINE',
  packet_delivery_pct DECIMAL(5,2) NOT NULL DEFAULT 98.00,
  buffered_packets INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 4. Communication Links
CREATE TABLE IF NOT EXISTS communication_links (
  id INT AUTO_INCREMENT PRIMARY KEY,
  link_code VARCHAR(32) NOT NULL UNIQUE,
  source_node VARCHAR(32) NOT NULL,
  target_node VARCHAR(32) NOT NULL,
  link_status ENUM('ACTIVE', 'BACKUP', 'FAILED') NOT NULL DEFAULT 'ACTIVE',
  signal_quality INT NOT NULL DEFAULT 90,
  latency_ms INT NOT NULL DEFAULT 18,
  is_primary BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 5. Missions
CREATE TABLE IF NOT EXISTS missions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mission_code VARCHAR(32) NOT NULL UNIQUE,
  title VARCHAR(128) NOT NULL,
  environment_type VARCHAR(64) NOT NULL,
  mission_status ENUM('ACTIVE', 'HOLD', 'COMPLETED', 'ABORTED') NOT NULL DEFAULT 'ACTIVE',
  progress_pct DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 6. Mission Logs
CREATE TABLE IF NOT EXISTS mission_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  mission_code VARCHAR(32) NOT NULL,
  agent_name VARCHAR(64) NOT NULL,
  event_type VARCHAR(64) NOT NULL,
  comm_status VARCHAR(32) NOT NULL,
  mission_status VARCHAR(32) NOT NULL,
  severity ENUM('INFO', 'WARNING', 'CRITICAL', 'SUCCESS') NOT NULL DEFAULT 'INFO',
  description TEXT NOT NULL,
  is_simulated BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_logs_mission (mission_code, created_at)
);

-- 7. Role Assignments
CREATE TABLE IF NOT EXISTS role_assignments (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  agent_code VARCHAR(32) NOT NULL,
  previous_role ENUM('EXPLORER', 'RELAY', 'SUPPORT', 'STATION') NULL,
  new_role ENUM('EXPLORER', 'RELAY', 'SUPPORT', 'STATION') NOT NULL,
  reason VARCHAR(255) NOT NULL,
  replaced_agent_code VARCHAR(32) NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial demonstration data
INSERT IGNORE INTO missions (mission_code, title, environment_type, mission_status, progress_pct)
VALUES ('RM-SIM-001', 'Sector-B Underground Tunnel Survey (Simulated)', 'Underground Mine Drift', 'ACTIVE', 42.00);

INSERT IGNORE INTO agents (agent_code, name, agent_type, status, comm_status, current_role, battery_pct, signal_pct, pos_x, pos_y, is_simulated)
VALUES
  ('STATION-01', 'Rescue Station', 'STATION', 'ONLINE', 'CONNECTED', 'STATION', 100.00, 100.00, 10.00, 50.00, TRUE),
  ('ROVER-01', 'Ground Rover R1', 'ROVER', 'ONLINE', 'CONNECTED', 'EXPLORER', 84.00, 88.00, 72.00, 52.00, TRUE),
  ('DRONE-01', 'Aerial Drone D1', 'DRONE', 'ONLINE', 'CONNECTED', 'SUPPORT', 78.00, 91.00, 48.00, 26.00, TRUE),
  ('RELAY-01', 'Relay Node 1', 'RELAY', 'ONLINE', 'CONNECTED', 'RELAY', 89.00, 93.00, 34.00, 54.00, TRUE),
  ('RELAY-02', 'Relay Node 2', 'RELAY', 'ONLINE', 'CONNECTED', 'RELAY', 92.00, 90.00, 55.00, 72.00, TRUE);

INSERT IGNORE INTO network_nodes (node_code, label, node_type, status, packet_delivery_pct, buffered_packets)
VALUES
  ('STATION-01', 'Rescue Station', 'STATION', 'ONLINE', 99.50, 0),
  ('ROVER-01', 'Rover', 'ROVER', 'ONLINE', 97.20, 0),
  ('DRONE-01', 'Drone', 'DRONE', 'ONLINE', 98.10, 0),
  ('RELAY-01', 'Relay Node 1', 'RELAY', 'ONLINE', 98.80, 0),
  ('RELAY-02', 'Relay Node 2', 'RELAY', 'ONLINE', 97.90, 0);

INSERT IGNORE INTO communication_links (link_code, source_node, target_node, link_status, signal_quality, latency_ms, is_primary)
VALUES
  ('L-ST-R1', 'STATION-01', 'RELAY-01', 'ACTIVE', 94, 12, TRUE),
  ('L-R1-RV', 'RELAY-01', 'ROVER-01', 'ACTIVE', 88, 18, TRUE),
  ('L-ST-DR', 'STATION-01', 'DRONE-01', 'BACKUP', 91, 15, FALSE),
  ('L-DR-RV', 'DRONE-01', 'ROVER-01', 'BACKUP', 86, 21, FALSE),
  ('L-ST-R2', 'STATION-01', 'RELAY-02', 'BACKUP', 89, 16, FALSE),
  ('L-R2-RV', 'RELAY-02', 'ROVER-01', 'BACKUP', 83, 24, FALSE);

INSERT IGNORE INTO mission_logs (mission_code, agent_name, event_type, comm_status, mission_status, severity, description, is_simulated)
VALUES
  ('RM-SIM-001', 'Rescue Station', 'Mission started', 'CONNECTED', 'ACTIVE', 'INFO', 'Initialized RescueMesh simulated underground mission RM-SIM-001.', TRUE),
  ('RM-SIM-001', 'Ground Rover R1', 'Rover connected', 'CONNECTED', 'ACTIVE', 'SUCCESS', 'Ground Rover R1 established telemetry link via Relay Node 1.', TRUE),
  ('RM-SIM-001', 'Aerial Drone D1', 'Drone standby ready', 'CONNECTED', 'ACTIVE', 'INFO', 'Aerial Drone D1 positioned in SUPPORT role for rapid relay takeover.', TRUE);
