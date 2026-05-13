from models import db
from datetime import datetime
import secrets

class ProjectInvite(db.Model):
    __tablename__ = "project_invites"

    id         = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey("projects.id"), nullable=False)
    token      = db.Column(db.String(64), unique=True, nullable=False, default=lambda: secrets.token_urlsafe(32))
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=True)   # None = never expires
    max_uses   = db.Column(db.Integer, nullable=True)    # None = unlimited
    use_count  = db.Column(db.Integer, default=0)
    is_active  = db.Column(db.Boolean, default=True)

    project    = db.relationship("Project", backref="invites", lazy="joined")
    creator    = db.relationship("User", foreign_keys=[created_by])

    def is_valid(self):
        if not self.is_active:
            return False, "This invite link has been deactivated."
        if self.expires_at and datetime.utcnow() > self.expires_at:
            return False, "This invite link has expired."
        if self.max_uses and self.use_count >= self.max_uses:
            return False, "This invite link has reached its maximum uses."
        return True, None

    def to_dict(self):
        return {
            "id":         self.id,
            "project_id": self.project_id,
            "token":      self.token,
            "created_at": self.created_at.isoformat(),
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "max_uses":   self.max_uses,
            "use_count":  self.use_count,
            "is_active":  self.is_active,
            "project":    {"id": self.project.id, "title": self.project.title} if self.project else None,
        }
