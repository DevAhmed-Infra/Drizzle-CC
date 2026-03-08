# Drizzle Production Guide: From Zero to FAANG-Level Mastery (PostgreSQL + MySQL)

This guide is a **production-first, junior-friendly, senior-approved** reference for using **Drizzle ORM** in Node.js + TypeScript.

- **Databases:** PostgreSQL, MySQL
- **What you get:** typed schema, typed queries, controllable SQL, migration strategy, production patterns
- **What you won’t get:** hidden magic. Drizzle is explicit by design.

Official docs (keep these handy):

- Drizzle docs: https://orm.drizzle.team/
- Database connections: https://orm.drizzle.team/docs/connect-overview
- Migrations overview: https://orm.drizzle.team/docs/migrations
- Schema declaration: https://orm.drizzle.team/docs/sql-schema-declaration
- Drizzle Kit overview: https://orm.drizzle.team/docs/kit-overview
- PostgreSQL get started: https://orm.drizzle.team/docs/get-started-postgresql
- MySQL get started: https://orm.drizzle.team/docs/get-started-mysql

---

## Table of Contents

- [Introduction](#introduction)
- [Project Setup](#project-setup)
- [Drizzle Setup](#drizzle-setup)
- [Package Scripts (DX)](#package-scripts-dx)
- [Configuration: drizzle.config.ts](#configuration-drizzleconfigts)
- [Basic Schema Setup (Postgres + MySQL)](#basic-schema-setup-postgres--mysql)
- [Model Fields (Types + Constraints)](#model-fields-types--constraints)
- [Relationships (1:1, 1:N, N:M)](#relationships-11-1n-nm)
- [Indexes, Unique Constraints, Naming](#indexes-unique-constraints-naming)
- [Enums](#enums)
- [Migrations in Production (generate vs migrate vs push vs pull)](#migrations-in-production-generate-vs-migrate-vs-push-vs-pull)
- [Running Migrations in Code (Recommended)](#running-migrations-in-code-recommended)
- [Database Connections (pool vs serverless)](#database-connections-pool-vs-serverless)
- [Typed Queries vs Runtime Validation](#typed-queries-vs-runtime-validation)
- [CRUD: Create (Insert)](#crud-create-insert)
- [CRUD: Read (Select)](#crud-read-select)
- [Advanced Filtering + Joins](#advanced-filtering--joins)
- [Relational Queries (RQB) vs Joins](#relational-queries-rqb-vs-joins)
- [Transactions](#transactions)
- [Performance Patterns](#performance-patterns)
- [Error Handling (Production Pattern)](#error-handling-production-pattern)
- [CRUD: Update](#crud-update)
- [CRUD: Delete](#crud-delete)
- [Schema Advanced](#schema-advanced)
- [Real Project Walkthrough (Service Layer + Express API)](#real-project-walkthrough-service-layer--express-api)
- [Testing Strategy](#testing-strategy)
- [Deployment (Docker + CI/CD)](#deployment-docker--cicd)
- [Edge / Serverless Guidance](#edge--serverless-guidance)
- [Production Checklist](#production-checklist)

---

## Introduction

### What is Drizzle?

Drizzle is a **TypeScript-first ORM** that gives you:

- **Schema in TypeScript** (tables, constraints, relations)
- A **typed query builder** that compiles to SQL
- The ability to drop down to **raw SQL** when needed
- A migrations workflow via **drizzle-kit**

### Why Drizzle matters in production

- **Type safety:** rename fields safely, avoid “stringly-typed” queries
- **Predictability:** no hidden query generation surprises
- **Performance control:** you can shape SQL and data selection explicitly
- **Portability:** supports multiple drivers and databases

---

## Project Setup

### Prerequisites

```bash
node --version
npm --version
```

### Recommended structure

```txt
my-drizzle-project/
  drizzle/
    migrations/
  src/
    db/
      index.ts
      schema/
        index.ts
        users.ts
        posts.ts
    services/
      user.service.ts
    server.ts
  drizzle.config.ts
  .env
  package.json
  tsconfig.json
```

Why split schema files?

- Scales cleanly as your schema grows
- Easier code ownership and reviews

Drizzle supports both single file and multi-file schemas. If you use multiple files, **re-export everything** from one `schema/index.ts` so drizzle-kit can import it.

Official guidance on schema organization:

- https://orm.drizzle.team/docs/sql-schema-declaration#organize-your-schema-files

---

## Drizzle Setup

## 5-Minute Quickstart (This Repo: PostgreSQL + `pg` + CommonJS)

If you only read one section, read this.

### Step 0: Create `.env`

```env
DATABASE_URL="postgresql://user:pass@localhost:5432/drizzle_cc"
```

### Step 1: Install

```bash
npm i
```

### Step 2: Define your schema

This repo already has:

- `src/db/schema.ts` (schema)
- `src/db/index.ts` (db connection)

Example (already similar to your current file):

```ts
import { pgTable, uuid, varchar } from "drizzle-orm/pg-core";

export const UserTable = pgTable("user", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
});
```

### Step 3: Generate + run migrations

Your `package.json` already includes these scripts:

```bash
npm run generate
npm run migrate
```

This uses `drizzle.config.ts`.

### Step 4: Use `db` in your code

`src/db/index.ts` exports `db`.

```ts
import { db } from "./src/db";
import { UserTable } from "./src/db/schema";

const users = await db.select().from(UserTable);
console.log(users);
```

If you’re using CommonJS (`"type": "commonjs"`), avoid top-level `await` unless your TS config/runtime supports it. Prefer wrapping in `async function main()`.

---

### Install (choose your database)

#### PostgreSQL (recommended for most production backends)

```bash
npm i drizzle-orm pg
npm i -D drizzle-kit @types/pg
```

#### MySQL (via `mysql2`)

```bash
npm i drizzle-orm mysql2
npm i -D drizzle-kit
```

Optional (env loading in local dev):

```bash
npm i dotenv
```

### Environment variables

`.env`:

PostgreSQL:

```env
DATABASE_URL="postgresql://user:pass@localhost:5432/app"
```

MySQL:

```env
DATABASE_URL="mysql://user:pass@localhost:3306/app"
```

Production best practice:

- **Fail fast** if `DATABASE_URL` is missing
- Use a real secrets manager in prod

---

## Package Scripts (DX)

This repo currently has:

```json
{
  "scripts": {
    "dev": "nodemon main.ts",
    "generate": "drizzle-kit generate",
    "migrate": "drizzle-kit migrate"
  }
}
```

Optional (more explicit aliases, recommended for teams):

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:pull": "drizzle-kit pull",
    "db:studio": "drizzle-kit studio",
    "generate": "drizzle-kit generate",
    "migrate": "drizzle-kit migrate"
  }
}
```

Notes:

- `generate` creates SQL migration files.
- `migrate` applies existing migration files.
- `push` is a faster schema-sync workflow (best for prototyping).
- `pull` is for database-first projects.

---

## Configuration: drizzle.config.ts

You’ll typically have **one** dialect per repo. (If you truly need both Postgres and MySQL in one codebase, treat them as separate modules/repos.)

### PostgreSQL example

```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema",
  out: "./drizzle/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

Production tip:

- If you need extra fields on the relationship (e.g., `createdAt`, `addedBy`), add them to the join table.

### MySQL example

```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "mysql",
  schema: "./src/db/schema",
  out: "./drizzle/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

Production warning:

- `process.env.DATABASE_URL!` is compile-time only. Your runtime code should validate env vars.

Official docs:

- https://orm.drizzle.team/docs/drizzle-config-file

---

## Basic Schema Setup (Postgres + MySQL)

### Postgres schema example

`src/db/schema/users.ts`:

```ts
import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  boolean,
  index,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    name: varchar("name", { length: 120 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    emailIdx: index("users_email_idx").on(t.email),
  }),
);
```

### MySQL schema example

`src/db/schema/users.mysql.ts` (example naming; in real projects you typically pick one DB per repo):

```ts
import {
  mysqlTable,
  varchar,
  datetime,
  boolean,
  serial,
  index,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable(
  "users",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    name: varchar("name", { length: 120 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: datetime("created_at").notNull(),
  },
  (t) => ({
    emailIdx: index("users_email_idx").on(t.email),
  }),
);
```

### Schema entrypoint

`src/db/schema/index.ts`:

```ts
export * from "./users";
// export * from "./posts";
```

Official schema docs:

- https://orm.drizzle.team/docs/sql-schema-declaration

---

## Model Fields (Types + Constraints)

This section mirrors what juniors typically need to ship real apps.

### Core concepts

- **TypeScript type** is inferred from your schema and the query.
- **DB constraints** live in schema: `notNull`, `unique`, indexes, FK references.

### Postgres: common field types

```ts
import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  numeric,
  boolean,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";

export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  sku: varchar("sku", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  stock: integer("stock").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  metadata: jsonb("metadata").$type<{ color?: string; tags?: string[] }>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
```

### MySQL: common field types

```ts
import {
  mysqlTable,
  serial,
  varchar,
  text,
  int,
  decimal,
  boolean,
  json,
  datetime,
} from "drizzle-orm/mysql-core";

export const products = mysqlTable("products", {
  id: serial("id").primaryKey(),
  sku: varchar("sku", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  stock: int("stock").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  metadata: json("metadata").$type<{ color?: string; tags?: string[] }>(),
  createdAt: datetime("created_at").notNull(),
});
```

Official docs:

- Postgres column types: https://orm.drizzle.team/docs/column-types/pg
- MySQL column types: https://orm.drizzle.team/docs/column-types/mysql

---

## Relationships (1:1, 1:N, N:M)

Relationships in Drizzle are usually expressed in two layers:

- **Foreign keys** (real DB constraints)
- **Relations** (a TypeScript helper layer for relational queries)

Official docs:

- Relations: https://orm.drizzle.team/docs/relations

### 1:N example (User -> Posts)

Postgres schema example:

```ts
import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
});

export const posts = pgTable("posts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 200 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.userId],
    references: [users.id],
  }),
}));
```

### N:M example (Posts <-> Tags)

Tip: use a join table for N:M.

```ts
import { pgTable, uuid, varchar, primaryKey } from "drizzle-orm/pg-core";

export const tags = pgTable("tags", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 64 }).notNull().unique(),
});

export const postTags = pgTable(
  "post_tags",
  {
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.postId, t.tagId] }),
  }),
);
```

---

## Indexes, Unique Constraints, Naming

Production rules of thumb:

- Index **every foreign key** (`user_id`, `post_id`, etc.)
- Index fields used in `where`, `orderBy`, and joins
- Add `unique()` for real business uniqueness (email, sku)

Official docs:

- Indexes & constraints: https://orm.drizzle.team/docs/indexes-constraints

---

## Enums

### Postgres enums

```ts
import { pgEnum, pgTable, uuid } from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["admin", "member", "viewer"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  role: userRole("role").notNull().default("member"),
});
```

### MySQL enums

```ts
import { mysqlTable, serial, mysqlEnum } from "drizzle-orm/mysql-core";

export const userRole = mysqlEnum("user_role", ["admin", "member", "viewer"]);

export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  role: userRole("role").notNull().default("member"),
});
```

---

## Migrations in Production (generate vs migrate vs push vs pull)

Drizzle supports both **database-first** and **code-first** workflows.

### The four core commands (what they actually mean)

| Command                | Workflow style            | What it does                                    | When to use                                                     |
| ---------------------- | ------------------------- | ----------------------------------------------- | --------------------------------------------------------------- |
| `drizzle-kit pull`     | Database-first            | Reads DB schema and generates TS schema         | You already manage schema/migrations elsewhere                  |
| `drizzle-kit push`     | Code-first (no SQL files) | Applies schema changes directly                 | Rapid prototyping (can be prod, but requires strong discipline) |
| `drizzle-kit generate` | Code-first                | Generates SQL migration files from schema diffs | Teams + production review + CI/CD                               |
| `drizzle-kit migrate`  | Code-first                | Applies generated migrations to the DB          | Deployment step                                                 |

Official migration docs:

- https://orm.drizzle.team/docs/migrations

### Recommended production workflow (teams)

1. Update schema in TypeScript
2. Run `drizzle-kit generate`
3. Review migration SQL
4. Commit migrations
5. Deploy
6. Run `drizzle-kit migrate` in CI/CD

Diagram:

```txt
schema (TS) change
   |
   v
drizzle-kit generate  -> creates ./drizzle/migrations/<timestamp>/*
   |
   v
CI/CD: drizzle-kit migrate  -> applies unapplied migrations
```

### `drizzle.config.ts`

Use `defineConfig` and set the dialect.

Postgres:

```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema",
  out: "./drizzle/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

Production warning:

- `process.env.DATABASE_URL!` is compile-time only. Add runtime checks in your app/migration runner.

---

## Running Migrations in Code (Recommended)

In production, it’s common to:

- keep migration files in git
- run migrations from a controlled script during deploy

Drizzle provides a migrator helper per driver.

### PostgreSQL (node-postgres) migrator

```ts
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

async function main() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) throw new Error("Missing DATABASE_URL");

  const db = drizzle(DATABASE_URL);
  await migrate(db, { migrationsFolder: "./drizzle/migrations" });
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
```

Notes:

- Put this in a dedicated script (e.g. `src/db/migrate.ts`) and run it in CI/CD.
- If you use an existing `Pool`, pass it via `drizzle({ client: pool })`.

### MySQL migrator note

For MySQL, Drizzle docs strongly encourage using a **single client connection** for migrations (not a pool). See:

- https://orm.drizzle.team/docs/get-started-mysql

---

## Database Connections (pool vs serverless)

### PostgreSQL drivers you’ll see in Drizzle

| Driver                   | Drizzle package             | Use when                            | Notes                                                   |
| ------------------------ | --------------------------- | ----------------------------------- | ------------------------------------------------------- |
| `pg` (node-postgres)     | `drizzle-orm/node-postgres` | Long-running Node servers           | Use `Pool` for pooling                                  |
| `postgres` (postgres.js) | `drizzle-orm/postgres-js`   | Serverless-ish / function execution | Different ergonomics; avoid per-request client creation |

Official Postgres setup examples:

- node-postgres: https://orm.drizzle.team/docs/get-started-postgresql
- postgres.js: https://orm.drizzle.team/docs/get-started-postgresql

### PostgreSQL: Node server with Pool (recommended for Express/Nest/Fastify)

`src/db/index.ts`:

```ts
import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("Missing DATABASE_URL");

const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

export const db = drizzle({ client: pool, schema, casing: "snake_case" });
```

Notes:

- `casing: "snake_case"` reduces alias boilerplate when your DB uses `snake_case` and TS uses `camelCase`.
- Official casing docs: https://orm.drizzle.team/docs/sql-schema-declaration#camel-and-snake-casing

### PostgreSQL: serverless-ish setup (postgres.js)

```ts
import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("Missing DATABASE_URL");

const client = postgres(DATABASE_URL);
export const db = drizzle({ client, schema });
```

### MySQL: mysql2 (client vs pool)

Drizzle recommends `mysql2`.

```ts
import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("Missing DATABASE_URL");

// For migrations, Drizzle docs strongly encourage a single client connection.
const connection = await mysql.createConnection(DATABASE_URL);
export const db = drizzle({ client: connection, schema });
```

For regular app queries, you may use a pool if it matches your workload:

```ts
import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";

const pool = mysql.createPool(process.env.DATABASE_URL!);
export const db = drizzle({ client: pool });
```

Official MySQL setup:

- https://orm.drizzle.team/docs/get-started-mysql

---

## Typed Queries vs Runtime Validation

### What Drizzle types guarantee

- Your code is consistent with your schema and query shapes
- Refactors are safer (rename columns, select shapes)

### What Drizzle types do NOT guarantee

- Incoming request bodies are valid at runtime

Production pattern:

- Validate inputs with `zod` (or similar)
- Then call Drizzle with validated data

Example (runtime validation + typed insert):

```ts
import { z } from "zod";
import { db } from "./db";
import { users } from "./db/schema";

const CreateUser = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(120),
});

const input = CreateUser.parse(req.body);
const [created] = await db.insert(users).values(input).returning();
```

---

## CRUD: Create (Insert)

```ts
import { db } from "./db";
import { users } from "./db/schema";

const [created] = await db
  .insert(users)
  .values({
    email: "jane@company.com",
    name: "Jane Doe",
  })
  .returning();

console.log(created);
```

Best practices:

- Use `.returning()` when you need generated IDs (Postgres supports it; MySQL support depends on driver/features)
- Prefer immutable identifiers (`id`) instead of mutable business fields

Bulk insert:

```ts
await db.insert(users).values([
  { email: "a@company.com", name: "A" },
  { email: "b@company.com", name: "B" },
]);
```

### Insert + conflict handling (PostgreSQL)

In production, you often need idempotent writes.

```ts
import { db } from "./db";
import { users } from "./db/schema";

await db
  .insert(users)
  .values({ email: "jane@company.com", name: "Jane" })
  .onConflictDoNothing();
```

Official docs:

- Insert: https://orm.drizzle.team/docs/insert

---

## CRUD: Read (Select)

### Basic select

```ts
import { db } from "./db";
import { users } from "./db/schema";
import { desc } from "drizzle-orm";

const rows = await db
  .select()
  .from(users)
  .orderBy(desc(users.createdAt))
  .limit(50);
```

### Select a specific shape (recommended)

````ts
import { db } from "./db";
import { users } from "./db/schema";
import { eq } from "drizzle-orm";

const [user] = await db
  .select({
    id: users.id,
    email: users.email,
    name: users.name,
  })
  .from(users)
  .where(eq(users.email, "jane@company.com"));

Pagination (offset-based):

```ts
const page = 1;
const pageSize = 20;

const rows = await db
  .select()
  .from(users)
  .limit(pageSize)
  .offset((page - 1) * pageSize);
```

Official docs:
- Select: https://orm.drizzle.team/docs/select

---

## Advanced Filtering + Joins

```ts
import { and, eq } from "drizzle-orm";
import { db } from "./db";
import { users } from "./db/schema";

const activeJane = await db
  .select()
  .from(users)
  .where(and(eq(users.isActive, true), eq(users.email, "jane@company.com")));
```

Raw SQL escape hatch:

```ts
import { sql } from "drizzle-orm";
import { db } from "./db";

const result = await db.execute(sql`select 1 as ok`);
```

### Advanced filtering patterns

```ts
import { and, or, eq, ilike, inArray, isNull, gt } from "drizzle-orm";
import { db } from "./db";
import { users } from "./db/schema";

const rows = await db
  .select()
  .from(users)
  .where(
    and(
      eq(users.isActive, true),
      or(ilike(users.email, "%@company.com"), isNull(users.createdAt)),
      inArray(users.email, ["a@company.com", "b@company.com"]),
      gt(users.createdAt, new Date("2025-01-01")),
    ),
  );
```

Join example:

```ts
import { eq, desc } from "drizzle-orm";
import { db } from "./db";
import { users, posts } from "./db/schema";

const rows = await db
  .select({
    userId: users.id,
    email: users.email,
    postId: posts.id,
    title: posts.title,
  })
  .from(users)
  .leftJoin(posts, eq(posts.userId, users.id))
  .orderBy(desc(posts.createdAt));
```

Official docs:
- Operators/filters: https://orm.drizzle.team/docs/operators
- Joins: https://orm.drizzle.team/docs/joins
- SQL tag: https://orm.drizzle.team/docs/sql

---

## Relational Queries (RQB) vs Joins

If you define `relations(...)`, Drizzle can fetch nested data using **relational queries**.

When to use what:

- **Joins**: you want precise SQL shape, custom select, performance control
- **RQB**: you want nested object results with relations

Official docs:
- Relational Queries (RQB): https://orm.drizzle.team/docs/rqb

Example (RQB-style nested fetching):
```ts
import { db } from "./db";
import { users } from "./db/schema";
import { eq } from "drizzle-orm";

const user = await db.query.users.findFirst({
  where: eq(users.email, "jane@company.com"),
  with: {
    posts: true,
  },
});
```

---

## Transactions

Use transactions for multi-step writes that must succeed or fail together.

```ts
import { db } from "./db";
import { users } from "./db/schema";

await db.transaction(async (tx) => {
  await tx.insert(users).values({ email: "x@company.com", name: "X" });
  await tx.insert(users).values({ email: "y@company.com", name: "Y" });
});
```

Production tips:

- Keep transactions short.
- Don’t do network calls inside a transaction.

Official docs:
- Transactions: https://orm.drizzle.team/docs/transactions

---

## Connect Existing Relationships (Typical App Pattern)

Unlike Prisma, Drizzle doesn’t have a `connect` API. You “connect” by inserting/updating **foreign key fields**.

Example: create a post for an existing user:
```ts
import { db } from "./db";
import { posts, users } from "./db/schema";
import { eq } from "drizzle-orm";

const [author] = await db.select().from(users).where(eq(users.email, "jane@company.com"));
if (!author) throw new Error("Author not found");

await db.insert(posts).values({
  userId: author.id,
  title: "Hello Drizzle",
});
```

Production tip:
- Wrap multi-step “lookup then insert” flows in a transaction if correctness depends on it.

---

## Performance Patterns

High-signal production patterns:

- **Select only what you need** using `.select({ ... })`
- **Add indexes** for hot paths
- **Avoid N+1** by using joins or relational queries
- **Batch** operations when possible

Official docs (advanced topics):
- Batch: https://orm.drizzle.team/docs/batch
- Dynamic query building: https://orm.drizzle.team/docs/dynamic-query-building

### Avoiding the N+1 problem

Bad pattern (N+1):
- Fetch users
- Loop users and fetch posts per user

Better patterns:
- One query with a join
- Or RQB with relations

---

## Error Handling (Production Pattern)

Drizzle will surface driver errors (e.g. unique constraint violations) via the underlying driver.

Production pattern:

- Map driver errors into app-level errors
- Return consistent API responses

Example skeleton:

```ts
export class DatabaseError extends Error {
  constructor(
    message: string,
    public cause?: unknown,
  ) {
    super(message);
    this.name = "DatabaseError";
  }
}

export function toDatabaseError(err: unknown): DatabaseError {
  return new DatabaseError("Database operation failed", err);
}
```

Production tip:
- Log the original driver error **internally** (structured logs), but return a safe message to clients.

---

## Testing Strategy

Minimum viable production testing:

- Unit test service logic
- Integration test DB queries against a real database (Docker)

Guidelines:

- Use a separate `DATABASE_URL_TEST`
- Clean up tables between tests (or run tests in a transaction and roll back)

Production tip:
- Run migrations on the test database at the start of the test suite.

---

## Deployment (Docker + CI/CD)

### Local development with Docker (Postgres)

`docker-compose.yml` snippet:

```yaml
version: "3.8"
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: app
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

### Local development with Docker (MySQL)

```yaml
version: "3.8"
services:
  mysql:
    image: mysql:8
    environment:
      MYSQL_DATABASE: app
      MYSQL_USER: app
      MYSQL_PASSWORD: app
      MYSQL_ROOT_PASSWORD: root
    ports:
      - "3306:3306"
    volumes:
      - mysqldata:/var/lib/mysql

volumes:
  mysqldata:
```

### CI/CD migrations (recommended)

- Build
- Run tests
- Run `drizzle-kit migrate` (or your migration script)
- Deploy app

Production tip:
- Prefer running migrations as a separate deployment phase/job (so you can stop the deploy if migrations fail).

---

## Edge / Serverless Guidance

Reality check:

- Many “edge” runtimes don’t allow TCP sockets to Postgres/MySQL.
- “Serverless Node” (AWS Lambda Node runtime, etc.) is different from “Edge”.

Practical production patterns:

- **Edge:** route DB traffic through a serverful API or use an edge-compatible DB connector
- **Serverless Node:** prefer drivers that won’t create a new pool per invocation; reuse clients when the platform allows it

Official connection overview:

- https://orm.drizzle.team/docs/connect-overview

---

## Production Checklist

- [ ] **Environment variables**: fail fast, no secrets in logs
- [ ] **Connection strategy**: pool for serverful, avoid pool-per-request in serverless
- [ ] **Migration strategy**: generate + review + commit; migrate in CI/CD
- [ ] **Indexes**: add indexes for common filters and foreign keys
- [ ] **Transactions**: use for multi-step writes
- [ ] **Runtime validation**: validate external inputs (zod)
- [ ] **Observability**: log slow queries, track DB errors
````
