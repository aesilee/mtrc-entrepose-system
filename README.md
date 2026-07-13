<<<<<<< HEAD
# MTRC ENTREPOSE Information System

Web-Based Patient Monitoring and Case Management Information System for the
ENTREPOSE Program at Malinao Treatment and Rehabilitation Center.

Stack: React (Vite) · Node.js + Express · MySQL

## Folder structure

```
mtrc-entrepose-system/
├── backend/          Node.js + Express API
├── frontend/         React (Vite) client
├── database/         schema.sql
└── README.md
```

## 1. Prerequisites

- Node.js 18+ and npm
- MySQL 8 (MySQL Workbench optional, but you already use it per the proposal)
- VS Code
- Git + a GitHub account

## 2. Set up the database

```sql
CREATE DATABASE mtrc_entrepose;
```

Then, from the `database/` folder:

```bash
mysql -u root -p mtrc_entrepose < schema.sql
```

(or open `schema.sql` in MySQL Workbench and run it against `mtrc_entrepose`).

## 3. Set up the backend

```bash
cd backend
cp .env.example .env
# edit .env: set DB_PASSWORD to your MySQL password, and a real JWT_SECRET
npm install
npm run seed:admin     # creates the first ICT Admin login
npm run dev            # starts the API on http://localhost:5000
```

`npm run seed:admin` reads `SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD` from
`.env` and creates that one account directly in the database. Every other
account (admitting, case managers, HIM staff, more ICT admins) gets created
afterward through the User Management screen — that's the whole point of
building it first.

## 4. Set up the frontend

In a second terminal:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev             # starts the app on http://localhost:5173
```

Open http://localhost:5173, log in with the seeded ICT Admin account, and
you'll land on the Dashboard. The sidebar for an ICT Admin includes
**User Management** — use it to create the admitting personnel, case
manager, and HIM staff accounts your five interview respondents represent.

## 5. Push it to GitHub

```bash
cd mtrc-entrepose-system
git init
git add .
git commit -m "Initial scaffold: login + role-based user management"
```

Create an empty repository on GitHub (no README/gitignore, so it doesn't
conflict), then:

```bash
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

`.env` is already excluded by `.gitignore`, so credentials never get
committed — each teammate copies `.env.example` to `.env` locally instead.

## 6. What's next (cascading down)

With Login + User Management working end to end, the natural next modules
(matching the proposal's chapters) are:

1. **Client Profiling** — patient registration + profile view (backend table,
   routes, and the Admitting Personnel storyboard screen).
2. **Attendance Monitoring** — session logging + missed-session flagging.
3. **Case Management** — progress notes tied to a client + case manager.
4. **Dashboard analytics** — replace the placeholder dashboard with the real
   summary cards once #1 and #2 have real data to summarize.
5. **Reports & Certificates** — built last since they read from everything
   above.

Each of those can follow the same pattern already set up here: a MySQL
table → an Express controller/route protected by `requireRole(...)` →
a React page wrapped in `<AppShell>` and added to `App.jsx`.
=======
# mtrc-entrepose-system
>>>>>>> ec3ead984f00560791d9ff3ac298774f5b09271e
