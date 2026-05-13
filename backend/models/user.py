from models import db
from datetime import datetime

class User(db.Model):
    __tablename__ = "users"

    id               = db.Column(db.Integer, primary_key=True)
    name             = db.Column(db.String(120), nullable=False)
    email            = db.Column(db.String(200), unique=True, nullable=False)
    password_hash    = db.Column(db.String(200), nullable=False)
    skills           = db.Column(db.Text, default="")
    level            = db.Column(db.String(20), default="beginner")
    avatar_url       = db.Column(db.String(300), default="")
    bio              = db.Column(db.Text, default="")
    github_username  = db.Column(db.String(100), default="")
    github_pat       = db.Column(db.Text, default="")   # user's own Personal Access Token
    theme            = db.Column(db.String(20), default="dark")
    language         = db.Column(db.String(10), default="en")
    is_admin         = db.Column(db.Boolean, default=False)
    is_banned         = db.Column(db.Boolean, default=False)
    created_at       = db.Column(db.DateTime, default=datetime.utcnow)

    projects_owned  = db.relationship("Project", backref="owner", lazy=True)
    collaborations  = db.relationship("Collaboration", backref="user", lazy=True)
    assigned_tasks  = db.relationship("Task",foreign_keys="Task.assignee_id", backref="assignee", lazy=True)

    def to_dict(self, include_pat=False):
        d = {
            "id":              self.id,
            "name":            self.name,
            "email":           self.email,
            "skills":          self.skills,
            "level":           self.level,
            "avatar_url":      self.avatar_url,
            "bio":             self.bio,
            "github_username": self.github_username,
            "has_github_pat":  bool(self.github_pat),  # never expose the raw PAT
            "theme":           self.theme,
            "language":        self.language,
            "is_admin":        self.is_admin,
            "is_banned":        self.is_banned,
            "created_at":      self.created_at.isoformat(),
        }
        return d
