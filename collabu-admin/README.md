# CollabU Admin Panel

A separate React + Vite app that provides full platform administration for CollabU.
Deployed independently at `admin.collabu.vercel.app`.

---

## What the Admin Can Do

| Section    | Actions |
|------------|---------|
| Dashboard  | Live stats (users, projects, tasks, posts) + 14-day charts |
| Users      | List, search, filter, view detail, ban/unban, promote to admin, reset password, delete |
| Projects   | List, search, filter by status, change status, delete |
| Posts      | Browse all feed posts, remove inappropriate content |
| Broadcast  | Send a notification to every active user at once |

---

## Folder Structure

```
collabu-admin/
├── index.html
├── package.json
├── vite.config.js
├── .env.example
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── index.css
    ├── services/
    │   ├── api.js           ← all API calls to backend /admin/* endpoints
    │   ├── AuthContext.jsx  ← admin session (token stored in localStorage)
    │   └── ToastContext.jsx ← toast notifications
    ├── components/
    │   ├── Sidebar.jsx
    │   └── UI.jsx           ← Avatar, Badge, Spinner, Pagination, ConfirmModal…
    └── pages/
        ├── Login.jsx
        ├── Dashboard.jsx
        ├── Users.jsx
        ├── UserDetail.jsx
        ├── Projects.jsx
        ├── Posts.jsx
        └── Broadcast.jsx
```

---

## Local Development

### 1. Install dependencies

```bash
cd collabu-admin
npm install
```

### 2. Create your .env file

```bash
cp .env.example .env
```

Edit `.env`:
```
VITE_API_URL=http://localhost:5000/api
```

### 3. Make sure the backend has ADMIN_URL set

In your backend `.env`:
```
ADMIN_URL=http://localhost:5174
```

### 4. Run the dev server

```bash
npm run dev
# → http://localhost:5174
```

---

## Creating Your First Admin Account

The admin panel login only works for accounts with `is_admin = True`.
You need to set this manually the first time via the database.

### Option A — SQLite (local dev)

```bash
cd backend
python3
```
```python
from app import create_app
from models import db
from models.user import User

app = create_app()
with app.app_context():
    user = User.query.filter_by(email="your@email.com").first()
    user.is_admin = True
    db.session.commit()
    print("Done!")
```

### Option B — Neon (production PostgreSQL)

Open the Neon console → SQL Editor, run:
```sql
UPDATE users SET is_admin = TRUE WHERE email = 'your@email.com';
```

### Option C — Render shell

In your Render dashboard → your backend service → **Shell** tab:
```bash
python3 -c "
from app import create_app
from models import db
from models.user import User
app = create_app()
with app.app_context():
    u = User.query.filter_by(email='your@email.com').first()
    u.is_admin = True
    db.session.commit()
    print('Done')
"
```

After this, you can log in at the admin panel with that account's email + password.
You can then promote other admins from within the panel (Users → ★ button).

---

## Deploying to Vercel (admin.collabu.vercel.app)

### 1. Push to GitHub

Create a **separate repo** (or subfolder) for `collabu-admin` and push it.

### 2. Import on Vercel

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import the `collabu-admin` repo
3. Framework preset: **Vite**
4. Root directory: `.` (or wherever your package.json is)

### 3. Set environment variable

In Vercel project settings → **Environment Variables**:
```
VITE_API_URL = https://your-backend.onrender.com/api
```

### 4. Set custom domain

In Vercel project settings → **Domains**:
- Add `admin.collabu.vercel.app` (or your custom domain)

### 5. Update backend environment on Render

In Render → your backend service → **Environment**:
```
ADMIN_URL = https://admin.collabu.vercel.app
```

Then redeploy the backend so it picks up the new CORS origin.

---

## Backend Changes Required

The admin panel adds these things to the backend:

### New fields on User model
- `is_admin` (Boolean, default False) — grants admin panel access
- `is_banned` (Boolean, default False) — blocks login

These are added automatically by `db.create_all()` on first run.
If your database already exists (production), run this SQL once:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE;
```

Or on SQLite (which doesn't support IF NOT EXISTS):
```sql
ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0;
ALTER TABLE users ADD COLUMN is_banned BOOLEAN DEFAULT 0;
```

### New blueprint: `routes/admin.py`
All endpoints are under `/api/admin/*` and require a valid JWT + `is_admin = True`.

### Updated CORS
`app.py` now reads `ADMIN_URL` from env and adds it to the allowed origins list.

---

## Security Notes

- The admin panel is a **completely separate Vercel deployment** — students cannot
  access it unless they know the URL and have an admin account.
- All `/api/admin/*` endpoints on the backend verify `is_admin = True` server-side.
  Even if someone finds the URL, they cannot do anything without a valid admin JWT.
- Never share the admin URL publicly.
- Consider adding a strong password to your admin account specifically.
