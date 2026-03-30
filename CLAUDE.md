# Developer and AI Agent Guidelines — Insurance CRM

This file serves as the **Source of Truth** for any developer or AI agent working on this project.

## 🛠️ Database Architecture & Migrations

**Prisma is the only source of truth.** Never manually modify the database.

### 🔄 The "Golden Workflow" (Syncing Changes)
1.  **Modify:** Change the model in `server/prisma/schema.prisma`.
2.  **Sync:** From the **root folder**, run one of the following:

    Option A (Fast Dev Sync):
    ```powershell
    npm run db:migrate
    ```

    Option B (Gold Standard for Features):
    ```powershell
    npm run db:migrate:name your_feature_name
    ```

### 🆘 Handling "Drift" (Mismatched Maps)...
If the database and code are out of sync (Drift detected):
1.  **Reset:** From the **root folder**, run:
    ```powershell
    npm run db:reset
    ```
    *(Note: This deletes local dev data, but fixes the "Translation" sync.)*

### 🚀 Production Deployment
**NEVER** use `migrate dev` or `db:reset` in production.
Use only:
```powershell
npm run db:deploy
```

---

## 🏗️ Project Structure
- **/server:** Node.js/Express with Prisma (PostgreSQL).
- **/client:** React frontend.
- **/prisma:** Location of the schema and migration history.

## 📜 Key Commands
- `npm run dev`: Starts both server and client together.
- `npm run db:migrate`: Fast sync schema change to DB (Auto-names).
- `npm run db:migrate:name`: Sync schema change with a custom name (Gold Standard).
- `npm run db:deploy`: Syncs schema change to DB (Prod).
- `npm run db:reset`: Fixes drift issues (Dev).
- `npm run db:generate`: Rebuilds the Prisma Translator (Client).

---

For detailed database strategies, refer to the **[DATABASE.md](file:///g:/Godivatech/Prakash/Analyzer/tech/Insurance_2/insurance_application/DATABASE.md)** file.
