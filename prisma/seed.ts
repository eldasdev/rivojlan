/**
 * Seed script: creates sample users (admin, author, student) and sample courses.
 * Run with: npx prisma db seed
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashedAdmin = await bcrypt.hash("admin123", 12);
  const hashedAuthor = await bcrypt.hash("author123", 12);
  const hashedStudent = await bcrypt.hash("student123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@coursehub.dev" },
    update: {},
    create: {
      email: "admin@coursehub.dev",
      name: "Admin User",
      username: "admin",
      password: hashedAdmin,
      role: "ADMIN",
    },
  });
  console.log("Admin:", admin.email);

  const author = await prisma.user.upsert({
    where: { email: "author@coursehub.dev" },
    update: {},
    create: {
      email: "author@coursehub.dev",
      name: "Course Author",
      username: "author",
      password: hashedAuthor,
      role: "AUTHOR",
    },
  });
  console.log("Author:", author.email);

  const student = await prisma.user.upsert({
    where: { email: "student@coursehub.dev" },
    update: {},
    create: {
      email: "student@coursehub.dev",
      name: "Student User",
      username: "student",
      password: hashedStudent,
      role: "STUDENT",
    },
  });
  console.log("Student:", student.email);

  const course1 = await prisma.course.upsert({
    where: { slug: "introduction-to-react" },
    update: {},
    create: {
      title: "Introduction to React",
      slug: "introduction-to-react",
      description: "Learn React from scratch: components, hooks, and state.",
      longDescription: "<p>This course covers React fundamentals including JSX, components, hooks (useState, useEffect), and building a small app.</p>",
      category: "Web Development",
      level: "beginner",
      duration: 8,
      status: "PUBLISHED",
      isPaid: false,
      authorId: author.id,
      publishedAt: new Date(),
    },
  });

  const existingModules = await prisma.module.count({ where: { courseId: course1.id } });
  if (existingModules === 0) {
    await prisma.module.createMany({
      data: [
        {
          courseId: course1.id,
          title: "What is React?",
          order: 0,
          content: { type: "text", text: "React is a JavaScript library for building user interfaces." },
          duration: 10,
        },
        {
          courseId: course1.id,
          title: "Components and JSX",
          order: 1,
          content: { type: "text", text: "Learn how to create components and use JSX." },
          duration: 15,
        },
        {
          courseId: course1.id,
          title: "State and Hooks",
          order: 2,
          content: { type: "text", text: "useState and useEffect in depth." },
          duration: 20,
        },
      ],
    });
  }

  console.log("Course created: Introduction to React");

  const course2 = await prisma.course.upsert({
    where: { slug: "node-js-backend" },
    update: {},
    create: {
      title: "Node.js Backend Development",
      slug: "node-js-backend",
      description: "Build REST APIs and backends with Node.js and Express.",
      category: "Web Development",
      level: "intermediate",
      duration: 12,
      status: "PUBLISHED",
      isPaid: false,
      authorId: author.id,
      publishedAt: new Date(),
    },
  });
  const existingMods2 = await prisma.module.count({ where: { courseId: course2.id } });
  if (existingMods2 === 0) {
    await prisma.module.createMany({
      data: [
        { courseId: course2.id, title: "Setting up Node.js", order: 0, content: {} },
        { courseId: course2.id, title: "Express basics", order: 1, content: {} },
      ],
    });
  }
  console.log("Course created: Node.js Backend Development");

  await prisma.enrollment.upsert({
    where: {
      userId_courseId: { userId: student.id, courseId: course1.id },
    },
    update: {},
    create: {
      userId: student.id,
      courseId: course1.id,
      progress: 33,
    },
  });
  console.log("Enrollment: student enrolled in React course");

  console.log("Seed completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
