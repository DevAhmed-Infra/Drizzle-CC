# Drizzle Setup Guide: CommonJS & ES Modules (PostgreSQL + MySQL)

This guide shows how to install and configure **Drizzle ORM** for both **CommonJS** and **ES Modules** projects, targeting:

- **PostgreSQL** (recommended for most production backends)
- **MySQL** (via `mysql2`)

It mirrors the structure of a typical “Prisma setup” guide, but for Drizzle.

Official Drizzle docs (primary sources):
- Database connection overview: https://orm.drizzle.team/docs/connect-overview
- PostgreSQL get started: https://orm.drizzle.team/docs/get-started-postgresql
- MySQL get started: https://orm.drizzle.team/docs/get-started-mysql
- Migrations overview: https://orm.drizzle.team/docs/migrations
- Drizzle config file: https://orm.drizzle.team/docs/drizzle-config-file
- Schema declaration: https://orm.drizzle.team/docs/sql-schema-declaration

---

## Prerequisites

- Node.js 16+
- npm/yarn/pnpm
- A running database:
  - PostgreSQL 12+ **or**
  - MySQL 8.0+
- Database + user created

---

## Choose Your Module System

Decide early. It affects:

- `package.json` (`"type"`)
- `tsconfig.json` (`compilerOptions.module`)
- Whether you can use **top-level `await`** easily

- **CommonJS**: `require`, `module.exports` (`"type": "commonjs"`)
- **ES Modules**: `import`, `export` (`"type": "module"`)

---

## Installation

### 1) Install Drizzle + drivers

#### PostgreSQL (node-postgres `pg`)
```bash
npm i drizzle-orm pg
npm i -D drizzle-kit @types/pg
```

#### PostgreSQL (optional alternative: `postgres.js`)
```bash
npm i drizzle-orm postgres
npm i -D drizzle-kit
```

#### MySQL (`mysql2`)
```bash
npm i drizzle-orm mysql2
npm i -D drizzle-kit
```

#### Environment variables
```bash
npm i dotenv
```

Official refs:
- Postgres: https://orm.drizzle.team/docs/get-started-postgresql
- MySQL: https://orm.drizzle.team/docs/get-started-mysql

---

## Project Configuration

### 1) `package.json`

#### CommonJS
```json
{
  "type": "commonjs",
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:pull": "drizzle-kit pull",
    "db:studio": "drizzle-kit studio"
  }
}
```

#### ES Modules
```json
{
  "type": "module",
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:pull": "drizzle-kit pull",
    "db:studio": "drizzle-kit studio"
  }
}
```

Notes:
- These scripts work the same in CommonJS and ESM.
- You can keep shorter aliases (`generate`, `migrate`) if you prefer.

---

### 2) `tsconfig.json`

#### CommonJS (safe default)
```json
{
  "compilerOptions": {
    "target": "ES2021",
    "module": "commonjs",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

#### ES Modules (top-level await friendly)
```json
{
  "compilerOptions": {
    "target": "ES2021",
    "module": "ES2022",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

Production tip:
- If you’re on CommonJS and see TypeScript errors for top-level `await`, wrap DB scripts in `async function main()`.

---

### 3) Drizzle Kit configuration (`drizzle.config.ts`)

Create a `drizzle.config.ts` at project root.

#### PostgreSQL
```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

#### MySQL
```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "mysql",
  schema: "./src/db/schema.ts",
  out: "./drizzle/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

Official docs:
- https://orm.drizzle.team/docs/drizzle-config-file

---

### 4) Environment variables (`.env`)

#### PostgreSQL
```env
DATABASE_URL="postgresql://username:password@localhost:5432/mydatabase"
```

#### MySQL
```env
DATABASE_URL="mysql://username:password@localhost:3306/mydatabase"
```

Production best practices:
- Never commit `.env`.
- Validate env vars at runtime on boot.

---

### 5) Schema file (`src/db/schema.ts`)

#### PostgreSQL example
```ts
import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

#### MySQL example
```ts
import { mysqlTable, serial, varchar, datetime } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  createdAt: datetime("created_at").notNull(),
});
```

Official schema docs:
- https://orm.drizzle.team/docs/sql-schema-declaration

---

## Usage Examples

## 1) PostgreSQL Database Connection

### CommonJS (node-postgres + Pool)
```ts
import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("Missing DATABASE_URL");

const pool = new Pool({ connectionString: DATABASE_URL });

export const db = drizzle(pool, { schema });
```

### ES Modules (node-postgres + Pool)
```ts
import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("Missing DATABASE_URL");

const pool = new Pool({ connectionString: DATABASE_URL });

export const db = drizzle(pool, { schema });
```

Notes:
- The code is identical; module system mainly affects how you run the file.

Official reference:
- https://orm.drizzle.team/docs/get-started-postgresql

---

## 2) MySQL Database Connection

### CommonJS (mysql2)
```ts
import "dotenv/config";
import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "./schema";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("Missing DATABASE_URL");

// For migrations, Drizzle docs strongly encourage a single client connection.
const connection = await mysql.createConnection(DATABASE_URL);

export const db = drizzle({ client: connection, schema });
```

### ES Modules (mysql2)
```ts
import "dotenv/config";
import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "./schema";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("Missing DATABASE_URL");

const connection = await mysql.createConnection(DATABASE_URL);

export const db = drizzle({ client: connection, schema });
```

Official reference:
- https://orm.drizzle.team/docs/get-started-mysql

---

## 3) Basic Usage (Common for Both)

### CommonJS example (wrap in `main()`)
```ts
import "dotenv/config";
import { db } from "./db";
import { users } from "./schema";

async function main() {
  const rows = await db.select().from(users);
  console.log(rows);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
```

### ES Modules example (top-level await OK if your TS config supports it)
```ts
import "dotenv/config";
import { db } from "./db";
import { users } from "./schema";

const rows = await db.select().from(users);
console.log(rows);
```

---

## Migrations

Drizzle migrations are managed with **drizzle-kit**.

### Development workflow (code-first, team-friendly)
```bash
npm run db:generate
npm run db:migrate
```

### Alternative flows

- **`drizzle-kit push`**: push schema directly (fast prototyping)
- **`drizzle-kit pull`**: generate TS schema from an existing database (database-first)

Official docs:
- https://orm.drizzle.team/docs/migrations

---

## Troubleshooting

### 1) TypeScript: “Top-level await is not allowed”

- CommonJS projects often have `"module": "commonjs"`
- Fix:
  - Wrap scripts in `async function main()`
  - Or use ESM modules (`"type": "module"`, `module: "ES2022"`)

### 2) `DATABASE_URL` is undefined

- Ensure `.env` exists and is loaded:
  - `import "dotenv/config";`
- Add a runtime check:
  - `if (!process.env.DATABASE_URL) throw new Error("Missing DATABASE_URL")`

### 3) Too many connections in serverless

- In serverless functions, avoid creating a new pool/client per request.
- Prefer drivers/adapters suited for your runtime.

Official connection overview:
- https://orm.drizzle.team/docs/connect-overview

---

## Best Practices

### PostgreSQL
- Use a **Pool** in long-running Node servers.
- Add indexes for hot queries.

### MySQL
- Use `mysql2`.
- For migrations, prefer a **single client connection** (per Drizzle docs).

### General
- Keep schema under version control.
- Commit migration files.
- Validate inputs at runtime (e.g., `zod`).

---

## Next Steps

- Drizzle docs: https://orm.drizzle.team/
- Schema: https://orm.drizzle.team/docs/sql-schema-declaration
- Migrations: https://orm.drizzle.team/docs/migrations
- Querying:
  - Select: https://orm.drizzle.team/docs/select
  - Insert: https://orm.drizzle.team/docs/insert
  - Update: https://orm.drizzle.team/docs/update
  - Delete: https://orm.drizzle.team/docs/delete
  - Operators: https://orm.drizzle.team/docs/operators
