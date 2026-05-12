from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db
from models.task import Task
from models.task_comment import TaskComment
from models.project import Project
from models.collaboration import Collaboration
from models.user import User
from services.notification_service import notify
from models.notification import NOTIF_TASK_ASSIGNED, NOTIF_TASK_UPDATED

tasks_bp = Blueprint("tasks", __name__)

def get_project_and_check(pid, uid, owner_only=False):
    """Returns (project, error_response). error_response is None if OK."""
    p = Project.query.get(pid)
    if not p:
        return None, ({"error": "Project not found."}, 404)
    is_owner = p.owner_id == uid
    collab = Collaboration.query.filter_by(project_id=pid, user_id=uid, status="accepted").first()
    is_member = is_owner or bool(collab)
    is_lead = is_owner or (collab and collab.role == "Lead")
    if owner_only and not is_owner:
        return None, ({"error": "Only the project owner can do this."}, 403)
    if not is_member:
        return None, ({"error": "Not a project member."}, 403)
    p._is_owner = is_owner
    p._is_lead  = is_lead
    return p, None

# ── GET tasks ─────────────────────────────────────────────────────────────────

@tasks_bp.route("/projects/<int:pid>/tasks", methods=["GET"])
@jwt_required()
def get_tasks(pid):
    uid = int(get_jwt_identity())
    p, err = get_project_and_check(pid, uid)
    if err: return jsonify(err[0]), err[1]
    all_tasks = Task.query.filter_by(project_id=pid).order_by(Task.status, Task.position).all()
    # Owners and Leads see all tasks; regular collaborators only see tasks they created or are assigned
    if p._is_lead:
        tasks = all_tasks
    else:
        tasks = [t for t in all_tasks if t.created_by == uid or t.assignee_id == uid]
    return jsonify({"tasks": [t.to_dict() for t in tasks]}), 200

# ── CREATE task — owner only ──────────────────────────────────────────────────

@tasks_bp.route("/projects/<int:pid>/tasks", methods=["POST"])
@jwt_required()
def create_task(pid):
    uid = int(get_jwt_identity())
    p, err = get_project_and_check(pid, uid)
    if err: return jsonify(err[0]), err[1]
    if not p._is_lead:
        return jsonify({"error": "Only the project owner or leads can create tasks."}), 403
    d     = request.get_json()
    title = (d.get("title") or "").strip()
    if not title: return jsonify({"error": "Title is required."}), 400

    assignee_id = d.get("assignee_id")
    if assignee_id:
        # Must be owner or accepted collaborator
        is_valid_assignee = (assignee_id == p.owner_id) or bool(
            Collaboration.query.filter_by(project_id=pid, user_id=assignee_id, status="accepted").first()
        )
        if not is_valid_assignee:
            return jsonify({"error": "Assignee is not a project member."}), 400

    count = Task.query.filter_by(project_id=pid, status=d.get("status","todo")).count()
    task  = Task(
        project_id=pid, title=title,
        description=d.get("description",""),
        status=d.get("status","todo"),
        priority=d.get("priority","medium"),
        required_skill=d.get("required_skill",""),
        assignee_id=assignee_id,
        created_by=uid,
        position=count,
    )
    if d.get("due_date"):
        from datetime import datetime
        try: task.due_date = datetime.fromisoformat(d["due_date"])
        except: pass
    db.session.add(task)
    db.session.commit()

    # Notify the assignee (if not the creator)
    if assignee_id and assignee_id != uid:
        notify(
            user_id=assignee_id,
            type=NOTIF_TASK_ASSIGNED,
            title=f"New task assigned to you: '{title}'",
            body=f"In project {p.title}. Priority: {d.get('priority','medium')}.",
            link=f"/projects/{pid}/board",
            actor_id=uid,
        )

    return jsonify({"task": task.to_dict()}), 201

# ── UPDATE task ───────────────────────────────────────────────────────────────

@tasks_bp.route("/projects/<int:pid>/tasks/<int:tid>", methods=["PATCH"])
@jwt_required()
def update_task(pid, tid):
    uid = int(get_jwt_identity())
    p, err = get_project_and_check(pid, uid)
    if err: return jsonify(err[0]), err[1]
    task = Task.query.filter_by(id=tid, project_id=pid).first_or_404()

    # Leads can edit any task, plain collaborators only update status of their assigned tasks
    is_owner = p.owner_id == uid
    is_lead  = p._is_lead
    d = request.get_json()

    if not is_lead:
        # plain collaborators can only move tasks assigned to them
        if task.assignee_id != uid:
            return jsonify({"error": "You can only update tasks assigned to you."}), 403
        allowed = {"status", "position"}
        d = {k: v for k, v in d.items() if k in allowed}

    if "title"         in d: task.title         = d["title"]
    if "description"   in d: task.description   = d["description"]
    if "status"        in d: task.status        = d["status"]
    if "priority"      in d: task.priority      = d["priority"]
    if "required_skill"in d: task.required_skill= d["required_skill"]
    if "position"      in d: task.position      = d["position"]
    if "assignee_id"   in d and is_lead:
        aid = d["assignee_id"]
        if aid:
            valid = (aid == p.owner_id) or bool(
                Collaboration.query.filter_by(project_id=pid, user_id=aid, status="accepted").first())
            if not valid:
                return jsonify({"error": "Assignee is not a project member."}), 400
        old_assignee = task.assignee_id
        task.assignee_id = aid
        # Notify new assignee if they changed
        if aid and aid != old_assignee and aid != uid:
            notify(
                user_id=aid,
                type=NOTIF_TASK_ASSIGNED,
                title=f"Task assigned to you: '{task.title}'",
                body=f"In project {p.title}.",
                link=f"/projects/{pid}/board",
                actor_id=uid,
            )
    if "due_date" in d and is_lead:
        from datetime import datetime
        try: task.due_date = datetime.fromisoformat(d["due_date"]) if d["due_date"] else None
        except: pass

    db.session.commit()
    return jsonify({"task": task.to_dict()}), 200

# ── DELETE task — owner only ──────────────────────────────────────────────────

@tasks_bp.route("/projects/<int:pid>/tasks/<int:tid>", methods=["DELETE"])
@jwt_required()
def delete_task(pid, tid):
    uid  = int(get_jwt_identity())
    p, err = get_project_and_check(pid, uid, owner_only=True)
    if err: return jsonify(err[0]), err[1]
    task = Task.query.filter_by(id=tid, project_id=pid).first_or_404()
    db.session.delete(task)
    db.session.commit()
    return jsonify({"message": "Task deleted."}), 200

# ── Suggest assignees ────────────────────────────────────────────────────────

@tasks_bp.route("/projects/<int:pid>/tasks/suggest-assignees", methods=["POST"])
@jwt_required()
def suggest_assignees(pid):
    uid = int(get_jwt_identity())
    p, err = get_project_and_check(pid, uid)
    if err: return jsonify(err[0]), err[1]
    required_skill = (request.get_json().get("required_skill") or "").strip().lower()
    collabs  = Collaboration.query.filter_by(project_id=pid, status="accepted").all()
    members  = [p.owner] + [c.user for c in collabs if c.user]
    result   = []
    for m in members:
        skills_lower = [s.strip().lower() for s in (m.skills or "").split(",")]
        match = required_skill in skills_lower if required_skill else False
        result.append({"id": m.id, "name": m.name, "skills": m.skills,
                        "avatar_url": m.avatar_url, "match": match})
    result.sort(key=lambda x: not x["match"])
    return jsonify({"members": result}), 200

# ── Task comments ─────────────────────────────────────────────────────────────

@tasks_bp.route("/projects/<int:pid>/tasks/<int:tid>/comments", methods=["GET"])
@jwt_required()
def get_comments(pid, tid):
    uid = int(get_jwt_identity())
    _, err = get_project_and_check(pid, uid)
    if err: return jsonify(err[0]), err[1]
    comments = TaskComment.query.filter_by(task_id=tid, parent_id=None).order_by(TaskComment.created_at).all()
    return jsonify({"comments": [c.to_dict() for c in comments]}), 200

@tasks_bp.route("/projects/<int:pid>/tasks/<int:tid>/comments", methods=["POST"])
@jwt_required()
def add_comment(pid, tid):
    uid = int(get_jwt_identity())
    _, err = get_project_and_check(pid, uid)
    if err: return jsonify(err[0]), err[1]
    d    = request.get_json()
    body = (d.get("body") or "").strip()
    if not body: return jsonify({"error": "Body required."}), 400
    c = TaskComment(task_id=tid, user_id=uid, body=body, parent_id=d.get("parent_id"))
    db.session.add(c)
    db.session.commit()
    return jsonify({"comment": c.to_dict()}), 201

@tasks_bp.route("/projects/<int:pid>/tasks/comments/<int:cid>", methods=["DELETE"])
@jwt_required()
def delete_comment(pid, cid):
    uid = int(get_jwt_identity())
    c   = TaskComment.query.get_or_404(cid)
    if c.user_id != uid: return jsonify({"error": "Not authorized."}), 403
    db.session.delete(c)
    db.session.commit()
    return jsonify({"message": "Deleted."}), 200
