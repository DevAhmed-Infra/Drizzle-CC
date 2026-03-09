import { eq, desc } from "drizzle-orm";
import { db } from "../db/db";
import {
  UserTable,
  UserPrefrencesTable,
  PostTable,
  CategoryTable,
  postCategoryTable,
} from "../db/schema";


async function createUser(name: string, email: string, age: number) {
  console.log(`\n[CREATE] Adding user: ${name} (${email}), age ${age}`);

  const result = await db
    .insert(UserTable)
    .values({
      name,
      email,
      age,
      role: "BASIC",
    })
    .returning();

  const newUser = result[0];
  console.log("[CREATE] User created:", newUser);
  return newUser;
}

async function createUserPreferences(userId: string, emailUpdates: boolean) {
  console.log(`\n[CREATE PREFS] Setting preferences for user ${userId}`);

  const result = await db
    .insert(UserPrefrencesTable)
    .values({
      userId,
      emailUpdates,
    })
    .returning();

  const newPrefs = result[0];
  console.log("[CREATE PREFS] Preferences created:", newPrefs);
  return newPrefs;
}


async function createPost(title: string, authorId: string) {
  console.log(`\n[CREATE POST] Creating post "${title}" by author ${authorId}`);

  const result = await db
    .insert(PostTable)
    .values({
      title,
      authorId,
      averageNumber: 0,
    })
    .returning();

  const newPost = result[0];
  console.log("[CREATE POST] Post created:", newPost);
  return newPost;
}


async function createCategory(name: string) {
  console.log(`\n[CREATE CATEGORY] Adding category: ${name}`);

  const result = await db.insert(CategoryTable).values({ name }).returning();

  const newCategory = result[0];
  console.log("[CREATE CATEGORY] Category created:", newCategory);
  return newCategory;
}


async function linkPostToCategory(postId: string, categoryId: string) {
  console.log(`\n[LINK] Linking post ${postId} to category ${categoryId}`);

  const result = await db
    .insert(postCategoryTable)
    .values({ postId, categoryId })
    .returning();

  const link = result[0];
  console.log("[LINK] Post linked to category:", link);
  return link;
}


async function getAllUsers(limit = 10, offset = 0) {
  console.log(`\n[GET ALL] Fetching users (limit=${limit}, offset=${offset})`);

  const allUsers = await db
    .select()
    .from(UserTable)
    .limit(limit)
    .offset(offset);

  console.log("[GET ALL] Users found:", allUsers);
  return allUsers;
}


async function getUserById(id: string) {
  console.log(`\n[GET BY ID] Looking for user with id: ${id}`);

  const found = await db.select().from(UserTable).where(eq(UserTable.id, id));
  const user = found[0] || null;

  console.log("[GET BY ID] Result:", user);
  return user;
}


async function getPostsByAuthor(authorId: string) {
  console.log(`\n[GET POSTS] Fetching posts by author ${authorId}`);

  const posts = await db
    .select()
    .from(PostTable)
    .where(eq(PostTable.authorId, authorId))
    .orderBy(desc(PostTable.createdAt));

  console.log("[GET POSTS] Posts found:", posts);
  return posts;
}

async function updateUser(id: string, newName: string, newAge: number) {
  console.log(
    `\n[UPDATE] Updating user ${id} to name=${newName}, age=${newAge}`,
  );

  const result = await db
    .update(UserTable)
    .set({
      name: newName,
      age: newAge,
    })
    .where(eq(UserTable.id, id))
    .returning();

  const updatedUser = result[0];
  if (!updatedUser) {
    throw new Error("Update failed: user not found");
  }

  console.log("[UPDATE] User updated:", updatedUser);
  return updatedUser;
}


async function deleteUser(id: string) {
  console.log(`\n[DELETE] Removing user with id: ${id}`);

  // With cascade delete, this should now work
  const result = await db
    .delete(UserTable)
    .where(eq(UserTable.id, id))
    .returning();

  const deletedUser = result[0];
  if (!deletedUser) {
    throw new Error("Delete failed: user not found");
  }

  console.log("[DELETE] User deleted:", deletedUser);
  return deletedUser;
}


async function runDemo() {
  try {
    const user = await createUser(
      "Ahmed Arafa",
      "ahmed.arafa.final@example.com",
      28,
    );
    console.log("User created");

    await createUserPreferences(user.id, true);
    console.log(" Preferences created");

    const category = await createCategory("Technology");
    console.log(" Category created");

    const post = await createPost("Drizzle ORM Tutorial", user.id);
    console.log("Post created");

    await linkPostToCategory(post.id, category.id);
    console.log("Post linked to category");

    await getAllUsers();
    console.log("Retrieved all users");

    const foundUser = await getUserById(user.id);
    console.log(" Retrieved user:", foundUser?.name);

    const userPosts = await getPostsByAuthor(user.id);
    console.log(`Retrieved ${userPosts.length} posts`);

    await updateUser(user.id, "Ahmed Arafa Updated", 29);
    console.log(" User updated");

    await deleteUser(user.id);
    console.log("User deleted");

  } catch (error) {
    console.error("\nError:", (error as Error).message);
  }
}

// Run the demo
runDemo();
