import {
  pgTable,
  uuid,
  varchar,
  integer,
  pgEnum,
  index,
  uniqueIndex,
  boolean,
  real,
  timestamp,
  primaryKey,
} from "drizzle-orm/pg-core";

export const UserRole = pgEnum("userRole", ["ADMIN", "BASIC"]);

export const UserTable = pgTable(
  "user",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // id2 : serial('id2').primaryKey()
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    age: integer("age").notNull(),
    role: UserRole("userRole").default("BASIC").notNull(),
  },
  (table) => ({
    emailIndex: uniqueIndex("emailIndex").on(table.email),
    uniqueNameAndAge: uniqueIndex("uniqueNameAndAge").on(table.name, table.age),
  }),
);

export const UserPrefrencesTable = pgTable("userPrefrences", {
  id: uuid("id").primaryKey().defaultRandom(),
  emailUpdates: boolean("emailUpdates").notNull().default(false),
  userId: uuid("userId")
    .references(() => UserTable.id, { onDelete: "cascade" })
    .notNull(),
});

export const PostTable = pgTable("post", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  averageNumber: real("averageNumber").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  authorId: uuid("authorId")
    .references(() => UserTable.id, { onDelete: "cascade" })
    .notNull(),
});

export const CategoryTable = pgTable("category", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
});

export const postCategoryTable = pgTable(
  "postCategory",
  {
    postId: uuid("postId")
      .references(() => PostTable.id, { onDelete: "cascade" })
      .notNull(),
    categoryId: uuid("categoryId")
      .references(() => CategoryTable.id, { onDelete: "cascade" })
      .notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.postId, table.categoryId] }),
  }),
);
