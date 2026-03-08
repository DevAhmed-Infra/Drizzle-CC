import { serial, pgTable, uuid, varchar } from 'drizzle-orm/pg-core';


export const UserTable = pgTable('user' , {
  id : uuid('id').primaryKey().defaultRandom(),
  // id2 : serial('id2').primaryKey()
  name : varchar('name' , {length : 255}).notNull()
} )