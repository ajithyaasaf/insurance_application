# Database Workflow Guide

> This file explains how every developer on the team should manage the database.
> **Golden Rule: Never change the database manually. Always change `schema.prisma` first.**

---

## 🏛️ The Architecture (Simple Version)

```
schema.prisma  →  Migrations  →  Database
   (Your map)     (Your history)  (The actual building)
```

These 3 must ALWAYS be in sync. If they are not in sync, you get **drift**.

---

## 🧑‍💻 Developer Workflows

### 1. First time cloning the project
```powershell
# Step 1: Install all dependencies (this also auto-generates Prisma Client)
npm install
cd server
npm install
cd ..

# Step 2: Create and apply all migrations
npm run db:migrate

# Step 3: Seed initial data (admin user, etc.)
npm run db:seed

# Step 4: Start the app
npm run dev
```

### 2. You changed `schema.prisma` (added a new model/column)
```powershell
# OPTION A: Quick sync (auto-names the migration)
npm run db:migrate

# OPTION B: GOLD STANDARD (For major features)
npm run db:migrate:name add_dealer_table
```

### 3. You pulled colleague's code and they changed `schema.prisma`
```powershell
# Apply their new migration to your local DB
npm run db:deploy  # Safer choice when pulling code!
```

### 4. You see "Drift detected" error (DEV only)
```powershell
# WARNING: This deletes all data in your LOCAL database
npm run db:reset
```

### 5. Deploying to Production (NEVER use db:migrate in prod)
```powershell
# This applies only new migrations, never drops data
npm run db:deploy
```

---

## 📜 What Each Script Does

| Script | When to use | Safe in Prod? |
|---|---|---|
| `npm run db:generate` | After updating schema without migrating | ✅ |
| `npm run db:migrate` | Quick dev change (auto-names file) | ❌ Dev Only |
| `npm run db:migrate:name` | Major feature change (named file) | ❌ Dev Only |
| `npm run db:reset` | Local drift recovery | ❌ NEVER |
| `npm run db:deploy` | Deploy to production or pull colleagues code | ✅ Yes |
| `npm run db:seed` | Add initial/test data | ❌ Dev Only |
| `npm run db:setup` | First-time full setup | ❌ Dev Only |

---

## 🔴 What Happens If You Ignore Drift?

| Scenario | Consequence |
|---|---|
| Developer A adds `Dealer` table directly in DB | Developer B's app crashes because their DB doesn't have it |
| Production runs old schema | New API endpoints fail silently or throw 500 errors |
| `schema.prisma` and DB are different | Prisma TypeScript types will be wrong — TypeScript won't catch bugs |
| Manual DB change in production | Data is lost or corrupted on next deploy |

---

## ✅ The Rule of Thumb

```
You want to add a column?  → Edit schema.prisma → run db:migrate
You want to delete a column? → Edit schema.prisma → run db:migrate
NEVER open a DB GUI and change things directly.
```
