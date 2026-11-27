"""Configuration settings for the RescueMesh Flask backend."""

import os


class Config:
    SECRET_KEY = os.environ.get("RESCUEMESH_SECRET_KEY", "rescuemesh-demo-dev-key")
    DEBUG = os.environ.get("FLASK_DEBUG", "1") == "1"
    PORT = int(os.environ.get("PORT", 5000))

    # MySQL configuration (optional - falls back to in-memory simulation mode if unavailable)
    MYSQL_HOST = os.environ.get("MYSQL_HOST", "localhost")
    MYSQL_PORT = int(os.environ.get("MYSQL_PORT", 3306))
    MYSQL_USER = os.environ.get("MYSQL_USER", "root")
    MYSQL_PASSWORD = os.environ.get("MYSQL_PASSWORD", "")
    MYSQL_DATABASE = os.environ.get("MYSQL_DATABASE", "rescuemesh_db")
