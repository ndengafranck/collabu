"""
Admin API blueprint.
All routes require a valid JWT **and** is_admin=True on the user.
Mount under /api/admin in app.py.
"""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db
from models.user import User
from models.project import Project
from models.collaboration import Collaboration
from models.task import Task
from models.post import Post
from models.notification import Notification
from services.auth_service import hash_password
from datetime import datetime, timedelta
from sqlalchemy import func

admin_bp = Blueprint("admin", __name__)

# ── Guard decorator ───────────────────────────────────────────────────────────

def admin_required(fn):
    """Decorator: JWT required + user must be admin."""
    from functools import wraps
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        uid  = int(get_jwt_identity())
        user = User.query.get(uid)
        if not user or not user.is_admin:
            return jsonify({"error": "Admin access required."}), 403
        return fn(*args, **kwargs)
    return wrapper

# ── Dashboard stats ───────────────────────────────────────────────────────────

@admin_bp.route("/admin/stats", methods=["GET"])
@admin_required
def get_stats():
    now   = datetime.utcnow()
    day7  = now - timedelta(days=7)
    day30 = now - timedelta(days=30)

    total_users    = User.query.count()
    new_users_7d   = User.query.filter(User.created_at >= day7).count()
    new_users_30d  = User.query.filter(User.created_at >= day30).count()
    banned_users   = User.query.filter_by(is_banned=True).count()
    admin_users    = User.query.filter_by(is_admin=True).count()

    total_projects  = Project.query.count()
    active_projects = Project.query.filter_by(status="active").count()
    new_proj_7d     = Project.query.filter(Project.created_at >= day7).count()

    total_collabs   = Collaboration.query.filter_by(status="accepted").count()
    pending_collabs = Collaboration.query.filter_by(status="pending").count()

    total_tasks     = Task.query.count()
    done_tasks      = Task.query.filter_by(status="done").count()

    total_posts     = Post.query.count()
    new_posts_7d    = Post.query.filter(Post.created_at >= day7).count()

    # Daily signups for last 14 days
    signups_chart = []
    for i in range(13, -1, -1):
        day_start = now - timedelta(days=i+1)
        day_end   = now - timedelta(days=i)
        count = User.query.filter(
            User.created_at >= day_start,
            User.created_at < day_end
        ).count()
        signups_chart.append({
            "date":  day_start.strftime("%b %d"),
            "count": count,
        })

    # Project creation last 14 days
    projects_chart = []
    for i in range(13, -1, -1):
        day_start = now - timedelta(days=i+1)
        day_end   = now - timedelta(days=i)
        count = Project.query.filter(
            Project.created_at >= day_start,
            Project.created_at < day_end
        ).count()
        projects_chart.append({
            "date":  day_start.strftime("%b %d"),
            "count": count,
        })

    return jsonify({
        "users": {
            "total": total_users, "new_7d": new_users_7d,
            "new_30d": new_users_30d, "banned": banned_users, "admins": admin_users,
        },
        "projects": {
            "total": total_projects, "active": active_projects, "new_7d": new_proj_7d,
        },
        "collaborations": {"accepted": total_collabs, "pending": pending_collabs},
        "tasks":  {"total": total_tasks, "done": done_tasks},
        "posts":  {"total": total_posts, "new_7d": new_posts_7d},
        "charts": {"signups": signups_chart, "projects": projects_chart},
    }), 200

# ── Users ─────────────────────────────────────────────────────────────────────

@admin_bp.route("/admin/users", methods=["GET"])
@admin_required
def list_users():
    page     = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    search   = request.args.get("q", "").strip()
    filter_  = request.args.get("filter", "all")  # all | banned | admin

    q = User.query
    if search:
        like = f"%{search}%"
        q = q.filter((User.name.ilike(like)) | (User.email.ilike(like)))
    if filter_ == "banned":
        q = q.filter_by(is_banned=True)
    elif filter_ == "admin":
        q = q.filter_by(is_admin=True)

    q = q.order_by(User.created_at.desc())
    pag = q.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        "users":   [_user_dict(u) for u in pag.items],
        "total":   pag.total,
        "pages":   pag.pages,
        "page":    page,
    }), 200

@admin_bp.route("/admin/users/<int:uid>", methods=["GET"])
@admin_required
def get_user(uid):
    u = User.query.get_or_404(uid)
    d = _user_dict(u)
    d["projects_owned"]  = [p.to_dict(include_owner=False) for p in u.projects_owned]
    d["collaborations"]  = [
        {"project_id": c.project_id, "project_title": c.project.title, "status": c.status, "role": c.role}
        for c in u.collaborations
    ]
    return jsonify({"user": d}), 200

@admin_bp.route("/admin/users/<int:uid>", methods=["PATCH"])
@admin_required
def update_user(uid):
    me = int(get_jwt_identity())
    u  = User.query.get_or_404(uid)
    d  = request.get_json() or {}

    if "is_banned" in d:
        if uid == me:
            return jsonify({"error": "You cannot ban yourself."}), 400
        u.is_banned = bool(d["is_banned"])
    if "is_admin" in d:
        if uid == me:
            return jsonify({"error": "You cannot change your own admin status."}), 400
        u.is_admin = bool(d["is_admin"])
    if "name" in d and d["name"].strip():
        u.name = d["name"].strip()
    if "password" in d and d["password"]:
        u.password_hash = hash_password(d["password"])

    db.session.commit()
    return jsonify({"user": _user_dict(u)}), 200

@admin_bp.route("/admin/users/<int:uid>", methods=["DELETE"])
@admin_required
def delete_user(uid):
    me = int(get_jwt_identity())
    if uid == me:
        return jsonify({"error": "You cannot delete yourself."}), 400
    u = User.query.get_or_404(uid)
    db.session.delete(u)
    db.session.commit()
    return jsonify({"message": "User deleted."}), 200

# ── Projects ──────────────────────────────────────────────────────────────────

@admin_bp.route("/admin/projects", methods=["GET"])
@admin_required
def list_projects():
    page     = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    search   = request.args.get("q", "").strip()
    status   = request.args.get("status", "")

    q = Project.query
    if search:
        q = q.filter(Project.title.ilike(f"%{search}%"))
    if status:
        q = q.filter_by(status=status)

    q = q.order_by(Project.created_at.desc())
    pag = q.paginate(page=page, per_page=per_page, error_out=False)

    result = []
    for p in pag.items:
        d = p.to_dict()
        d["member_count"]  = Collaboration.query.filter_by(project_id=p.id, status="accepted").count()
        d["task_count"]    = Task.query.filter_by(project_id=p.id).count()
        result.append(d)

    return jsonify({"projects": result, "total": pag.total, "pages": pag.pages, "page": page}), 200

@admin_bp.route("/admin/projects/<int:pid>", methods=["PATCH"])
@admin_required
def update_project(pid):
    p = Project.query.get_or_404(pid)
    d = request.get_json() or {}
    if "status" in d and d["status"] in ("active", "completed", "paused"):
        p.status = d["status"]
    if "title" in d and d["title"].strip():
        p.title = d["title"].strip()
    db.session.commit()
    return jsonify({"project": p.to_dict()}), 200

@admin_bp.route("/admin/projects/<int:pid>", methods=["DELETE"])
@admin_required
def delete_project(pid):
    p = Project.query.get_or_404(pid)
    db.session.delete(p)
    db.session.commit()
    return jsonify({"message": "Project deleted."}), 200

# ── Posts moderation ──────────────────────────────────────────────────────────

@admin_bp.route("/admin/posts", methods=["GET"])
@admin_required
def list_posts():
    page     = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    pag      = Post.query.order_by(Post.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({"posts": [p.to_dict() for p in pag.items], "total": pag.total, "pages": pag.pages, "page": page}), 200

@admin_bp.route("/admin/posts/<int:pid>", methods=["DELETE"])
@admin_required
def delete_post(pid):
    p = Post.query.get_or_404(pid)
    db.session.delete(p)
    db.session.commit()
    return jsonify({"message": "Post deleted."}), 200

# ── Broadcast notification ────────────────────────────────────────────────────

@admin_bp.route("/admin/notify-all", methods=["POST"])
@admin_required
def notify_all():
    d     = request.get_json() or {}
    title = d.get("title", "").strip()
    body  = d.get("body", "").strip()
    link  = d.get("link", "")
    if not title:
        return jsonify({"error": "Title is required."}), 400

    users = User.query.filter_by(is_banned=False).all()
    for u in users:
        n = Notification(
            user_id=u.id, type="admin_broadcast",
            title=title, body=body, link=link,
        )
        db.session.add(n)
    db.session.commit()
    return jsonify({"message": f"Notification sent to {len(users)} users."}), 200

# ── Admin login (returns JWT, separate from user login) ───────────────────────

@admin_bp.route("/admin/login", methods=["POST"])
def admin_login():
    from flask_jwt_extended import create_access_token, create_refresh_token
    from services.auth_service import check_password
    d        = request.get_json() or {}
    email    = d.get("email", "").strip().lower()
    password = d.get("password", "")
    user     = User.query.filter_by(email=email).first()
    if not user or not check_password(password, user.password_hash):
        return jsonify({"error": "Invalid credentials."}), 401
    if not user.is_admin:
        return jsonify({"error": "Not an admin account."}), 403
    if user.is_banned:
        return jsonify({"error": "Account is banned."}), 403
    access  = create_access_token(identity=str(user.id))
    refresh = create_refresh_token(identity=str(user.id))
    return jsonify({"token": access, "refresh_token": refresh, "user": _user_dict(user)}), 200

# ── Helper ────────────────────────────────────────────────────────────────────

def _user_dict(u):
    d = u.to_dict()
    d["projects_count"] = len(u.projects_owned)
    d["collabs_count"]  = Collaboration.query.filter_by(user_id=u.id, status="accepted").count()
    return d
