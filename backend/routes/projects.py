from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db
from models.project import Project
from models.collaboration import Collaboration
from models.user import User
from services.project_service import (
    is_valid_github_url, extract_repo_name, is_valid_methodology, task_columns_for_methodology
)
from services.auth_service import skills_match
from services.github_service import add_collaborator
from services.encryption import decrypt
from socket_events import broadcast_join_request
from services.upload_service import save_file
from services.notification_service import notify
from models.notification import (
    NOTIF_JOIN_REQUEST, NOTIF_JOIN_ACCEPTED,
    NOTIF_JOIN_REJECTED, NOTIF_NEW_MEMBER,
)

projects_bp = Blueprint("projects", __name__)

@projects_bp.route("/projects", methods=["POST"])
@jwt_required()
def create_project():
    uid = int(get_jwt_identity())
    d   = request.get_json()
    title            = d.get("title","").strip()
    description      = d.get("description","").strip()
    required_skills  = d.get("required_skills","").strip()
    github_repo_link = d.get("github_repo_link","").strip()
    methodology      = d.get("methodology","Agile").strip()
    if not title or not description or not github_repo_link:
        return jsonify({"error": "Title, description, and GitHub repo link are required."}), 400
    if not is_valid_github_url(github_repo_link):
        return jsonify({"error": "Invalid GitHub repository URL."}), 400
    if not is_valid_methodology(methodology):
        return jsonify({"error": "Invalid methodology."}), 400
    project = Project(
        title=title, description=description, required_skills=required_skills,
        github_repo_link=github_repo_link, github_repo_name=extract_repo_name(github_repo_link),
        methodology=methodology, owner_id=uid,
    )
    db.session.add(project)
    db.session.commit()
    return jsonify({"project": project.to_dict()}), 201

@projects_bp.route("/projects/<int:pid>/cover", methods=["POST"])
@jwt_required()
def upload_cover(pid):
    uid     = int(get_jwt_identity())
    project = Project.query.get_or_404(pid)
    if project.owner_id != uid:
        return jsonify({"error": "Not authorized."}), 403
    if "cover" not in request.files:
        return jsonify({"error": "No file provided."}), 400
    try:
        info = save_file(request.files["cover"], subfolder="projects")
        if info["type"] != "image":
            return jsonify({"error": "Cover must be an image."}), 400
        project.cover_image_url = info["url"]
        db.session.commit()
        return jsonify({"cover_image_url": info["url"]}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

@projects_bp.route("/projects", methods=["GET"])
@jwt_required()
def get_projects():
    projects = Project.query.order_by(Project.created_at.desc()).all()
    return jsonify({"projects": [p.to_dict() for p in projects]}), 200

@projects_bp.route("/projects/<int:pid>", methods=["GET"])
@jwt_required()
def get_project(pid):
    p    = Project.query.get_or_404(pid)
    data = p.to_dict()
    data["columns"]          = task_columns_for_methodology(p.methodology)
    data["collaborators"]    = [c.to_dict() for c in p.collaborations if c.status=="accepted"]
    data["pending_requests"] = [c.to_dict() for c in p.collaborations if c.status=="pending"]
    return jsonify({"project": data}), 200

@projects_bp.route("/projects/<int:pid>", methods=["PATCH"])
@jwt_required()
def update_project(pid):
    uid = int(get_jwt_identity())
    p   = Project.query.get_or_404(pid)
    if p.owner_id != uid:
        return jsonify({"error": "Not authorized."}), 403
    d = request.get_json()
    if "title"           in d: p.title           = d["title"]
    if "description"     in d: p.description     = d["description"]
    if "required_skills" in d: p.required_skills = d["required_skills"]
    if "status"          in d: p.status          = d["status"]
    if "methodology"     in d and is_valid_methodology(d["methodology"]):
        p.methodology = d["methodology"]
    db.session.commit()
    return jsonify({"project": p.to_dict()}), 200

# ── Join request — also tries GitHub add immediately ─────────────────────────

@projects_bp.route("/projects/<int:pid>/join", methods=["POST"])
@jwt_required()
def join_project(pid):
    uid  = int(get_jwt_identity())
    p    = Project.query.get_or_404(pid)
    user = User.query.get(uid)
    if p.owner_id == uid:
        return jsonify({"error": "You own this project."}), 400
    existing = Collaboration.query.filter_by(project_id=pid, user_id=uid).first()
    if existing:
        return jsonify({"error": "Request already exists.", "status": existing.status}), 409

    matched = skills_match(user.skills or "", p.required_skills or "")
    collab  = Collaboration(project_id=pid, user_id=uid, status="pending",
                            matched_skills=",".join(matched))
    db.session.add(collab)
    db.session.commit()
    broadcast_join_request(pid, collab.to_dict())   # ← real-time notify owner

    # Notify the project owner about the join request
    notify(
        user_id=p.owner_id,
        type=NOTIF_JOIN_REQUEST,
        title=f"{user.name} wants to join '{p.title}'",
        body=f"Matched skills: {', '.join(matched)}" if matched else "No skill overlap — review their profile.",
        link=f"/projects/{pid}",
        actor_id=uid,
    )

    # Immediately try to add to GitHub as pending collaborator invite
    # Uses the owner's PAT
    owner    = User.query.get(p.owner_id)
    gh_result = {"ok": False, "error": "Skipped"}
    if owner and owner.github_pat and p.github_repo_name and user.github_username:
        gh_result = add_collaborator(p.github_repo_name, user.github_username, decrypt(owner.github_pat))
        if gh_result["ok"]:
            collab.github_added = True
            db.session.commit()

    return jsonify({
        "message": "Join request sent.",
        "collaboration": collab.to_dict(),
        "matched_skills": matched,
        "github": gh_result,
    }), 201

# ── Accept / reject ───────────────────────────────────────────────────────────

@projects_bp.route("/projects/<int:pid>/accept", methods=["POST"])
@jwt_required()
def accept_request(pid):
    owner_uid = int(get_jwt_identity())
    p = Project.query.get_or_404(pid)
    if p.owner_id != owner_uid:
        return jsonify({"error": "Only the project owner can do this."}), 403
    d          = request.get_json()
    target_uid = d.get("user_id")
    action     = d.get("action", "accept")
    collab     = Collaboration.query.filter_by(project_id=pid, user_id=target_uid).first()
    if not collab:
        return jsonify({"error": "Collaboration request not found."}), 404

    if action == "accept":
        collab.status = "accepted"
        # Try GitHub add again in case it wasn't done on join
        gh_result = {"ok": False, "error": "Skipped"}
        if not collab.github_added:
            owner       = User.query.get(owner_uid)
            target_user = User.query.get(target_uid)
            if owner and owner.github_pat and p.github_repo_name and target_user and target_user.github_username:
                gh_result = add_collaborator(p.github_repo_name, target_user.github_username, decrypt(owner.github_pat))
                if gh_result["ok"]:
                    collab.github_added = True
        db.session.commit()

        # Notify the accepted collaborator
        notify(
            user_id=target_uid,
            type=NOTIF_JOIN_ACCEPTED,
            title=f"You're in! Welcome to '{p.title}'",
            body="Your join request was accepted. Head to the project to get started.",
            link=f"/projects/{pid}",
            actor_id=owner_uid,
        )
        return jsonify({"message": "Accepted.", "collaboration": collab.to_dict(), "github": gh_result}), 200
    elif action == "reject":
        collab.status = "rejected"
        db.session.commit()

        # Notify the rejected collaborator
        notify(
            user_id=target_uid,
            type=NOTIF_JOIN_REJECTED,
            title=f"Update on your request for '{p.title}'",
            body="The project owner has reviewed your request.",
            link=f"/projects/{pid}",
            actor_id=owner_uid,
        )
        return jsonify({"message": "Rejected.", "collaboration": collab.to_dict()}), 200
    return jsonify({"error": "Invalid action."}), 400


# ── Promote / demote collaborator to lead ────────────────────────────────────

@projects_bp.route("/projects/<int:pid>/collaborators/<int:uid>/role", methods=["PATCH"])
@jwt_required()
def set_collaborator_role(pid, uid):
    owner_id = int(get_jwt_identity())
    p = Project.query.get_or_404(pid)
    if p.owner_id != owner_id:
        return jsonify({"error": "Only the project owner can change roles."}), 403
    collab = Collaboration.query.filter_by(project_id=pid, user_id=uid, status="accepted").first()
    if not collab:
        return jsonify({"error": "Accepted collaborator not found."}), 404
    d = request.get_json()
    role = d.get("role", "Collaborator")
    if role not in ("Lead", "Collaborator"):
        return jsonify({"error": "Role must be Lead or Collaborator."}), 400
    collab.role = role
    db.session.commit()
    return jsonify({"collaboration": collab.to_dict()}), 200
