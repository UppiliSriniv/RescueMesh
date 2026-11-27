"""Flask application entry point for RescueMesh.

Serves the REST API (/api/*) and can optionally serve the static frontend files
so the full web application runs cleanly from a single command.
"""

from pathlib import Path
from flask import Flask, send_from_directory
from config import Config
from routes.api import api_bp

try:
    from flask_cors import CORS  # type: ignore
except ImportError:
    CORS = None

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"


def create_app() -> Flask:
    app = Flask(__name__, static_folder=str(FRONTEND_DIR), static_url_path="")
    app.config.from_object(Config)
    if CORS is not None:
        CORS(app)
    else:
        @app.after_request
        def add_cors_headers(response):
            response.headers["Access-Control-Allow-Origin"] = "*"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
            return response

    app.register_blueprint(api_bp)

    @app.get("/")
    def index():
        return send_from_directory(FRONTEND_DIR, "index.html")

    @app.get("/<path:filename>")
    def frontend_files(filename: str):
        target = FRONTEND_DIR / filename
        if target.is_file():
            return send_from_directory(FRONTEND_DIR, filename)
        return send_from_directory(FRONTEND_DIR, "index.html")

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=Config.PORT, debug=Config.DEBUG)
