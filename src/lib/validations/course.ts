import { z } from "zod";

export const courseSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  longDescription: z.string().optional(),
  thumbnail: z.string().url().optional().or(z.literal("")),
  isPaid: z.boolean().default(false),
  price: z.number().min(0).optional().nullable(),
  category: z.string().optional(),
  level: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  duration: z.number().int().min(0).optional().nullable(),
});

// Module/lesson types authors can choose when adding content
export const MODULE_TYPES = ["lesson", "quiz", "video", "feedback"] as const;
export type ModuleType = (typeof MODULE_TYPES)[number];

export const moduleSchema = z.object({
  title: z.string().min(1, "Title is required"),
  type: z.enum(MODULE_TYPES).optional().default("lesson"),
  content: z.record(z.string(), z.unknown()).optional(),
  order: z.number().int().min(0).default(0),
  duration: z.number().int().min(0).optional().nullable(),
});

export const quizSchema = z.object({
  title: z.string().optional(),
  questions: z.array(
    z.object({
      question: z.string(),
      options: z.array(z.string()),
      correctIndex: z.number().int().min(0),
    })
  ),
  passingScore: z.number().min(0).max(100).optional(),
});

export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
});

export type CourseInput = z.infer<typeof courseSchema>;
export type ModuleInput = z.infer<typeof moduleSchema>;
export type QuizInput = z.infer<typeof quizSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
