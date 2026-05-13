from gevent import monkey
monkey.patch_all()

# ── Load .env FIRST — before any module that reads os.getenv() at import time ──
from dotenv import load_dotenv
load_dotenv()

from flask import Flask, send_from_directory, jsonify, abort
from flask_cors import CORS
from flask_jwt_extended import JWTManager, verify_jwt_in_request
from flask_jwt_extended.exceptions import NoAuthorizationError
from datetime import timedelta
from flask_migrate import Migrate
import os

from models import db
from socket_events import socketio
from routes.auth         import auth_bp
from routes.projects     import projects_bp
from routes.users        import users_bp
from routes.tasks        import tasks_bp
from routes.github       import github_bp
from routes.chat         import chat_bp
from routes.posts        import posts_bp
from routes.global_posts import gp_bp
from routes.notifications import notifications_bp
from routes.push          import push_bp
from routes.invites       import invites_bp
from routes.admin         import admin_bp

import cloudinary
migrate = Migrate()
def create_app():
    app = Flask(__name__)

    # ── Core secrets ─────────────────────────────────────────────────────────
    # In production (FLASK_ENV=production), missing secrets cause a hard fail.
    # In development, insecure fallbacks are used with a warning.
    is_production = os.getenv("FLASK_ENV") == "production"
    secret_key    = os.getenv("SECRET_KEY", "")
    jwt_secret    = os.getenv("JWT_SECRET_KEY", "")
    if is_production:
        if not secret_key or not jwt_secret:
            raise RuntimeError(
                "SECRET_KEY and JWT_SECRET_KEY must be set in production. "
                "Generate them with: python -c \"import secrets; print(secrets.token_hex(32))\""
            )
    else:
        import warnings
        if not secret_key:
            secret_key = "dev-secret-not-for-production"
            warnings.warn("SECRET_KEY not set — using insecure dev default", RuntimeWarning)
        if not jwt_secret:
            jwt_secret = "dev-jwt-not-for-production"
            warnings.warn("JWT_SECRET_KEY not set — using insecure dev default", RuntimeWarning)
    app.config["SECRET_KEY"]     = secret_key
    app.config["JWT_SECRET_KEY"] = jwt_secret

    # ── JWT — expires in N days (default 7) ──────────────────────────────────
    expires_days = int(os.getenv("JWT_EXPIRES_DAYS", "7"))
    app.config["JWT_ACCESS_TOKEN_EXPIRES"]  = timedelta(days=expires_days)
    app.config["JWT_REFRESH_TOKEN_EXPIRES"] = timedelta(days=30)

    # ── Database — PostgreSQL in prod, SQLite for local dev ───────────────────
    db_url = os.getenv("DATABASE_URL", "sqlite:///student_collab.db")
    # Render gives "postgres://" — SQLAlchemy needs "postgresql://"
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
    app.config["SQLALCHEMY_DATABASE_URI"]        = db_url
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["SQLALCHEMY_ENGINE_OPTIONS"]      = {
        "pool_pre_ping": True,           # auto-reconnect dropped connections
        "pool_recycle":  300,            # recycle connections every 5 min
    }

    # ── Uploads ───────────────────────────────────────────────────────────────
    # app.config["UPLOAD_FOLDER"]        = os.path.join(
    #     os.getcwd(), os.getenv("UPLOAD_FOLDER", "uploads")
    # )
    # max_mb = int(os.getenv("MAX_UPLOAD_MB", "50"))
    # app.config["MAX_CONTENT_LENGTH"]   = max_mb * 1024 * 1024

    # for sub in ["avatars", "projects", "chat", "posts"]:
    #     os.makedirs(os.path.join(app.config["UPLOAD_FOLDER"], sub), exist_ok=True)
    
    # cloudinary config
    cloudinary.config(
        cloud_name = os.getenv("CLOUD_NAME"),
        api_key    = os.getenv("CLOUD_API_KEY"),
        api_secret = os.getenv("CLOUD_SECRET"),
        secure     = True
    )
    

    # ── CORS — reads allowed origins from env (main frontend + admin panel) ────
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
    admin_url    = os.getenv("ADMIN_URL",    "http://localhost:5174").rstrip("/")
    allowed_origins = [frontend_url, admin_url]
    CORS(app,
         origins=allowed_origins,
         supports_credentials=True,
         allow_headers=["Content-Type", "Authorization"],
         methods=["GET","POST","PATCH","PUT","DELETE","OPTIONS"])

    # ── Extensions ────────────────────────────────────────────────────────────
    JWTManager(app)
    db.init_app(app)
    migrate.init_app(app,db)
    socketio.init_app(app, cors_allowed_origins=frontend_url)

    # ── Blueprints ────────────────────────────────────────────────────────────
    for bp in [auth_bp, projects_bp, users_bp, tasks_bp,
               github_bp, chat_bp, posts_bp, gp_bp, notifications_bp, push_bp, invites_bp, admin_bp]:
        app.register_blueprint(bp, url_prefix="/api")

    # ── Protected static file serving ─────────────────────────────────────────
    # Require valid JWT to access uploaded files
    @app.route("/uploads/<path:filename>")
    def uploaded_file(filename):
        try:
            verify_jwt_in_request()
        except Exception:
            return jsonify({"error": "Authentication required."}), 401
        # Prevent path traversal
        safe = os.path.normpath(filename)
        if safe.startswith(".."):
            abort(400)
        return send_from_directory(app.config["UPLOAD_FOLDER"], safe)

    # ── Global error handlers ──────────────────────────────────────────────────
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Resource not found."}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({"error": "Method not allowed."}), 405

    @app.errorhandler(413)
    def too_large(e):
        return jsonify({"error": f"File too large. Maximum is {max_mb} MB."}), 413

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({"error": "Internal server error."}), 500

    # ── Health check ───────────────────────────────────────────────────────────
    @app.route("/health")
    def health():
        return jsonify({"status": "ok", "env": os.getenv("FLASK_ENV","development")}), 200

    # ── Create tables ──────────────────────────────────────────────────────────
    with app.app_context():
        db.create_all()

    return app


app = create_app()

if __name__ == "__main__":
    is_prod = os.getenv("FLASK_ENV") == "production"
    socketio.run(
        app,
        debug=not is_prod,
        host="0.0.0.0",
        port=int(os.getenv("PORT", 5000)),
    )
