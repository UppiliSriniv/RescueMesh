# RescueMesh — Self-Healing, Communication-Aware Multi-Agent Rescue System

**Team NEXORA** | Category: **Mobility (Drones)**

Team Members:
- Vimal Prakashan S
- Uppili Srinivasan P
- Kishore S
- Princy Thebural H
- Mohithaa N

---

## Project Overview

RescueMesh is a cooperative multi-agent rescue system designed for underground mines, tunnels, collapsed structures, and other GPS-denied environments. It treats **exploration and connectivity as ONE problem**, combining a ground-based wheeled rover, an aerial drone, wireless relay nodes, environmental sensors, GPS-denied SLAM mapping, and store-and-forward fallback.

### Key Safety & Demonstration Rules
- **Simulated Mode Clearly Labeled:** All live telemetry, gas readings, camera previews, and route maps in this web interface are **simulated** unless connected to calibrated physical hardware.
- **No Uncalibrated Safety Claims:** Gas, vibration, and tilt readings do not certify mine safety or structural roof stability. Thermal/RGB previews do not confirm survivor life status.
- **Conditional Self-Healing:** Link recovery requires an available physical alternate path, a suitable agent, and sufficient battery reserve. When all routes fail, the system buffers data locally and enters a safe **HOLD** state.
- **ESP-NOW Note:** ESP-NOW does not automatically provide multi-hop mesh routing; application-level routing, ACKs, sequence IDs, retries, and duplicate suppression must be implemented explicitly.

---

## Folder Structure

```text
RescueMesh/
├── frontend/
│   ├── index.html              # Landing page & problem overview
│   ├── dashboard.html          # RescueMesh Mission Control (Operator Dashboard)
│   ├── mission-control.html    # Simulated Rover/Drone controls & Camera previews
│   ├── network.html            # Self-Healing Mesh Topology & Dynamic Role Handover
│   ├── sensors.html            # Simulated Gas/Env Sensors & GPS-Denied SLAM Map
│   ├── reports.html            # Mission Logs, Filters, CSV Export & Demo Charts
│   ├── architecture.html       # 10-Layer Architecture, Tech Stack & 6-Phase Roadmap
│   ├── team.html               # Team NEXORA member cards
│   ├── css/style.css           # Industrial dark/light design system
│   ├── js/                     # app.js, dashboard.js, controls.js, network.js, sensors.js, reports.js
│   └── assets/logo.svg         # RescueMesh SVG logo
├── backend/
│   ├── app.py                  # Flask server & static frontend host
│   ├── config.py               # Environment & MySQL config
│   ├── database.py             # MySQL adapter with automatic demo fallback
│   ├── models.py               # Simulation state & telemetry store
│   ├── routes/api.py           # REST API endpoints (/api/*)
│   └── requirements.txt
├── database/
│   └── schema.sql              # MySQL schema + demonstration seed data
└── README.md
```

---

## How to Run

### Option 1: Run Frontend Directly (No Backend Required)
1. Open `frontend/index.html` directly in any modern browser (Chrome, Edge, Firefox), **or** serve the `frontend/` directory with a local static server:
   ```bash
   cd frontend
   python -m http.server 8080
   ```
2. Visit `http://localhost:8080`. All interactive controls, mesh failure simulations, dynamic role handovers, sensor charts, SLAM replanning, and CSV log exports work in local demonstration mode using `localStorage`.

### Option 2: Run Full Stack with Flask Backend (Recommended)
1. Install Python dependencies:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```
2. Start the Flask server:
   ```bash
   python app.py
   ```
3. Open `http://localhost:5000` in your browser.
   - If MySQL is not configured, the Flask backend automatically runs in **local demonstration mode** without crashing.

### Option 3: Connect MySQL Database
1. Start MySQL and import the schema:
   ```bash
   mysql -u root -p < database/schema.sql
   ```
2. Set environment variables before launching `python backend/app.py`:
   ```bash
   set MYSQL_HOST=localhost
   set MYSQL_PORT=3306
   set MYSQL_USER=root
   set MYSQL_PASSWORD=your_password
   set MYSQL_DATABASE=rescuemesh_db
   python backend/app.py
   ```
3. Check `GET /api/health` to confirm `"mysql_connected": true`.

### Option 4: Deploy on Vercel
The project includes [vercel.json](vercel.json), [api/index.py](api/index.py), and root [requirements.txt](requirements.txt) to host both `frontend/` and the Flask `/api/*` endpoints on Vercel:
```bash
npx vercel --prod
```
*(Or push this repository to GitHub and import it in the Vercel Dashboard with the root directory set to `RescueMesh`.)*

---

## REST API Endpoints

- `GET /api/health` — Backend & database mode status
- `GET /api/dashboard` — Summary KPIs, agents, simulated sensors, recent logs
- `GET /api/agents` — Current agent states and roles
- `GET /api/sensors` — Simulated sensor channels
- `GET /api/network` — Mesh nodes, links, sequence ID, and buffer count
- `GET /api/missions` — Active mission metadata
- `GET /api/logs` — Mission event log history
- `POST /api/rover/command` — Simulated rover directional/STOP command
- `POST /api/drone/command` — Simulated drone takeoff/land/return/relay command
- `POST /api/network/simulate-failure` — Single-link or complete-network-loss simulation
- `POST /api/network/restore` — Restore primary route and flush local buffer
- `POST /api/roles/handover` — Dynamic relay role handover

---

## Adding Physical Hardware Integration Later

1. **Rover / Edge ROS 2 Bridge:** Forward ROS 2 telemetry topics (odometry, battery, LiDAR distance, calibrated gas readings) from the Raspberry Pi gateway to `POST /api/sensors` or a dedicated WebSocket/MQTT ingest service, setting `is_simulated = False`.
2. **Command Watchdog Safety:** Keep the independent MCU timeout watchdog active on the rover so stale or disconnected dashboard commands automatically halt drive motors.
3. **Separate Video Channel:** Stream physical RGB/thermal feeds over the dedicated Wi-Fi RTSP/WebRTC endpoint and switch the camera badge from `DEMONSTRATION PREVIEW` to `LIVE HARDWARE FEED` only when a verified hardware stream is connected.
