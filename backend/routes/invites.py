from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db
from models.invite import ProjectInvite
from models.project import Project
from models.collaboration import Collaboration
from datetime import datetime, timedelta

invites_bp = Blueprint("invites", __name__)

# ── Create invite link ────────────────────────────────────────────────────────

@invites_bp.route("/projects/<int:pid>/invites", methods=["POST"])
@jwt_required()
def create_invite(pid):
    uid = int(get_jwt_identity())
    p = Project.query.get_or_404(pid)

    # Only owner or leads can create invite links
    if p.owner_id != uid:
        collab = Collaboration.query.filter_by(project_id=pid, user_id=uid, status="accepted").first()
        if not collab or collab.role != "Lead":
            return jsonify({"error": "Only the project owner or leads can create invite links."}), 403

    d = request.get_json() or {}
    expires_hours = d.get("expires_hours")   # e.g. 24, 72, 168 — None = never
    max_uses      = d.get("max_uses")         # e.g. 10 — None = unlimited

    invite = ProjectInvite(
        project_id = pid,
        created_by = uid,
        expires_at = datetime.utcnow() + timedelta(hours=expires_hours) if expires_hours else None,
        max_uses   = max_uses,
    )
    db.session.add(invite)
    db.session.commit()
    return jsonify({"invite": invite.to_dict()}), 201

# ── List invite links for a project ──────────────────────────────────────────

@invites_bp.route("/projects/<int:pid>/invites", methods=["GET"])
@jwt_required()
def list_invites(pid):
    uid = int(get_jwt_identity())
    p = Project.query.get_or_404(pid)
    if p.owner_id != uid:
        collab = Collaboration.query.filter_by(project_id=pid, user_id=uid, status="accepted").first()
        if not collab or collab.role != "Lead":
            return jsonify({"error": "Only the project owner or leads can view invite links."}), 403
    invites = ProjectInvite.query.filter_by(project_id=pid).order_by(ProjectInvite.created_at.desc()).all()
    return jsonify({"invites": [i.to_dict() for i in invites]}), 200

# ── Deactivate an invite link ─────────────────────────────────────────────────

@invites_bp.route("/invites/<int:iid>/deactivate", methods=["PATCH"])
@jwt_required()
def deactivate_invite(iid):
    uid = int(get_jwt_identity())
    invite = ProjectInvite.query.get_or_404(iid)
    p = Project.query.get_or_404(invite.project_id)
    if p.owner_id != uid:
        collab = Collaboration.query.filter_by(project_id=invite.project_id, user_id=uid, status="accepted").first()
        if not collab or collab.role != "Lead":
            return jsonify({"error": "Not authorized."}), 403
    invite.is_active = False
    db.session.commit()
    return jsonify({"invite": invite.to_dict()}), 200

# ── Preview invite (public — no auth needed) ─────────────────────────────────

@invites_bp.route("/invites/<token>/preview", methods=["GET"])
def preview_invite(token):
    invite = ProjectInvite.query.filter_by(token=token).first()
    if not invite:
        return jsonify({"error": "Invalid invite link."}), 404
    valid, reason = invite.is_valid()
    if not valid:
        return jsonify({"error": reason}), 410
    return jsonify({
        "project": {"id": invite.project.id, "title": invite.project.title, "description": invite.project.description},
        "valid": True,
    }), 200

# ── Accept invite (logged-in user joins via link) ─────────────────────────────

@invites_bp.route("/invites/<token>/accept", methods=["POST"])
@jwt_required()
def accept_invite(token):
    uid = int(get_jwt_identity())
    invite = ProjectInvite.query.filter_by(token=token).first()
    if not invite:
        return jsonify({"error": "Invalid invite link."}), 404
    valid, reason = invite.is_valid()
    if not valid:
        return jsonify({"error": reason}), 410

    pid = invite.project_id
    p   = Project.query.get_or_404(pid)

    # Already owner
    if p.owner_id == uid:
        return jsonify({"message": "You are the project owner.", "project_id": pid}), 200

    existing = Collaboration.query.filter_by(project_id=pid, user_id=uid).first()
    if existing:
        if existing.status == "accepted":
            return jsonify({"message": "You are already a member.", "project_id": pid}), 200
        # Upgrade pending/rejected to accepted via invite
        existing.status = "accepted"
        invite.use_count += 1
        db.session.commit()
        return jsonify({"message": "Joined project!", "project_id": pid}), 200

    # Create collaboration as accepted directly (invite bypasses pending)
    collab = Collaboration(
        project_id = pid,
        user_id    = uid,
        status     = "accepted",
        role       = "Collaborator",
    )
    db.session.add(collab)
    invite.use_count += 1
    db.session.commit()
    return jsonify({"message": "Joined project!", "project_id": pid}), 200
