/**
 * Academic Institution Management System — seed script.
 *
 * Replaces ALL existing knowledge articles, media assets, and admin settings
 * with academic-domain data. Run this for a fresh academic deployment:
 *
 *   npm run db:seed:academic
 */

import { db } from "./db";
import { knowledgeArticles, mediaAssets, adminSettings, widgetConfigs } from "@shared/schema";
import { count, isNull, sql } from "drizzle-orm";
import { generateEmbedding } from "./openai";

const articles = [
  {
    title: "Institution Management System — Overview",
    content: "Our Institution Management System (IMS) is an all-in-one platform for schools, colleges, and universities. It covers admissions, academics, fees, exams, attendance, and reporting in a single unified dashboard. The system is cloud-based, accessible from any device, and designed to reduce administrative workload while improving student and faculty experience. Key modules include: Admissions & Enrollment, Course Management, Student Portal, Faculty Portal, Fee Management, Exam & Results, and Analytics. The platform supports institutions of all sizes — from 100 to 50,000+ students.",
    category: "overview",
    tags: ["ims", "platform", "overview", "features", "cloud"],
  },
  {
    title: "Online Admissions & Enrollment",
    content: "The admissions module allows prospective students to apply online via a customizable application form. Institutions can configure eligibility criteria, required documents, and intake capacity per program. Applications are tracked through stages: Submitted → Under Review → Shortlisted → Admitted → Enrolled. Automated email and SMS notifications keep applicants informed at every step. Merit lists, waiting lists, and interview scheduling are all handled within the system. Document verification can be done digitally, and offer letters are generated automatically upon admission approval.",
    category: "admissions",
    tags: ["admissions", "enrollment", "application", "online", "merit"],
  },
  {
    title: "Course Catalog & Scheduling",
    content: "The course management module lets administrators define programs, departments, semesters, and individual courses. Each course has attributes: credit hours, syllabus, prerequisites, faculty assignment, and maximum enrollment. The timetable builder automatically resolves conflicts and generates clash-free schedules for classrooms, faculty, and student groups. Elective courses can be offered with student preference submission and auto-allotment based on capacity. Curriculum mapping ensures courses align with accreditation requirements (NBA, NAAC, UGC, etc.).",
    category: "courses",
    tags: ["courses", "timetable", "curriculum", "schedule", "program"],
  },
  {
    title: "Student Portal & Attendance",
    content: "Students access the portal via web or mobile app to view their timetable, attendance, grades, fee dues, and exam schedule. Attendance can be marked by faculty via the mobile app (GPS-verified for field classes) or using biometric integration. Daily attendance SMS/email alerts are sent to parents when attendance falls below the configured threshold. Students can apply for leave online, which goes through faculty and admin approval. The portal also supports downloading hall tickets, grade cards, and provisional certificates.",
    category: "students",
    tags: ["student", "portal", "attendance", "mobile", "biometric", "leave"],
  },
  {
    title: "Faculty Portal & Grade Management",
    content: "Faculty members use the portal to mark attendance, upload study materials, post assignments, and enter internal assessment marks. The grading module supports both absolute and relative grading schemes. Marks are entered in structured formats — internal assessment, mid-term, end-term — and the system auto-calculates final grades based on the configured weightage. Result moderation and re-evaluation workflows are built in. Faculty can also track their own workload, leave balance, and payroll summary from the same portal.",
    category: "faculty",
    tags: ["faculty", "grading", "marks", "assignments", "portal"],
  },
  {
    title: "Fee Structure & Online Payments",
    content: "The fee module supports complex fee structures: program fees, semester fees, hostel fees, transport fees, and one-time charges. Fee schedules are configured with due dates and late fine rules. Students receive automated fee reminders via SMS and email. Online payment is supported through integrated payment gateways (Razorpay, PayU, PayTM). Fee receipts are generated instantly after payment. The finance dashboard gives institution administrators a real-time view of collections, outstanding dues, and payment trends. Concession and scholarship management is also handled within this module.",
    category: "fees",
    tags: ["fees", "payment", "razorpay", "scholarship", "concession", "receipt"],
  },
  {
    title: "Exam Scheduling & Hall Tickets",
    content: "The examination module manages the full exam lifecycle: scheduling, seating arrangement, hall ticket generation, result entry, and publication. Exam timetables are published to students through the portal and app. Hall tickets are generated automatically based on attendance eligibility criteria — students who don't meet the minimum attendance threshold are flagged. Seating plans are generated with anti-malpractice spacing. After exams, faculty enter marks online, and results are published after moderation approval. Grade cards and transcripts can be downloaded directly by students.",
    category: "exams",
    tags: ["exams", "hall ticket", "results", "timetable", "seating", "grade card"],
  },
  {
    title: "Analytics & Progress Reports",
    content: "The analytics module provides institution-wide dashboards for administrators and drill-down reports for heads of department. Key reports include: attendance summary (student-wise, subject-wise, department-wise), academic performance trends, fee collection summary, exam pass/fail analysis, and enrollment statistics. Reports can be exported as PDF or Excel. Custom report builder allows institutions to create ad-hoc reports without IT support. NAAC and NBA accreditation reports can be auto-generated from the system data.",
    category: "reports",
    tags: ["analytics", "reports", "naac", "nba", "dashboard", "excel"],
  },
  {
    title: "LMS, SMS & ERP Integrations",
    content: "The IMS integrates with popular Learning Management Systems (Moodle, Google Classroom, Microsoft Teams) for seamless content delivery. Two-way SMS and email notification integration supports Twilio, MSG91, and SendGrid. ERP integrations (Tally, SAP, QuickBooks) are available for financial data sync. API access is provided for custom integrations with existing institutional systems. Single Sign-On (SSO) via Google Workspace or Microsoft Azure AD is supported so students and faculty use one login for all tools.",
    category: "integrations",
    tags: ["lms", "moodle", "google classroom", "sso", "api", "tally", "erp"],
  },
  {
    title: "Frequently Asked Questions",
    content: "Q: How long does implementation take? A: Typical go-live for a new institution is 4–6 weeks including data migration, configuration, and staff training.\n\nQ: Is the system cloud-hosted or on-premise? A: Both options are available. Cloud hosting (AWS/Azure) is recommended for most institutions; on-premise deployment is available for institutions with strict data residency requirements.\n\nQ: What is the pricing model? A: Pricing is based on student count and selected modules. Contact our team for a customized quote.\n\nQ: Is there a mobile app? A: Yes, iOS and Android apps are available for students, faculty, and parents.\n\nQ: Can we migrate data from our existing system? A: Yes, we support data migration from Excel, CSV, and most popular legacy systems.\n\nQ: Is training provided? A: Yes, online and on-site training sessions are included in the implementation package.",
    category: "faq",
    tags: ["faq", "pricing", "implementation", "training", "migration", "mobile app"],
  },
];

const defaultSettings = [
  {
    key: "bot_name",
    value: "Academic Assistant",
  },
  {
    key: "welcome_message",
    value: "Hi! I'm your Academic Assistant. I can help you with admissions, course information, fees, exams, and more. How can I assist you today?",
  },
  {
    key: "system_prompt",
    value: `You are a friendly and knowledgeable assistant for an Institution Management System (IMS) platform used by schools, colleges, and universities.

CRITICAL RULE — ONLY USE PROVIDED DATA:
- You MUST answer ONLY based on the knowledge base articles provided below under "Relevant Knowledge Base Articles".
- If the knowledge base does NOT contain the information needed to answer the question, respond with: "I'm sorry, I don't have that specific information right now. Please reach out to our support team for help."
- NEVER make up, guess, or invent information that is not in the provided articles.
- If the articles only partially cover the question, answer with what is available and suggest contacting the team for more details.`,
  },
  {
    key: "contact_phone",
    value: "",
  },
  {
    key: "contact_email",
    value: "",
  },
  {
    key: "openai_model",
    value: "gpt-4o-mini",
  },
];

async function ensureEmbeddings() {
  const articlesWithoutEmbeddings = await db
    .select()
    .from(knowledgeArticles)
    .where(isNull(knowledgeArticles.embedding));

  if (articlesWithoutEmbeddings.length === 0) return;

  let generated = 0;
  let firstError: string | null = null;
  for (const article of articlesWithoutEmbeddings) {
    try {
      const text = `${article.title} ${article.category} ${article.content}`;
      const embedding = await generateEmbedding(text);
      const vectorStr = `[${embedding.join(",")}]`;
      await db.execute(sql`UPDATE knowledge_articles SET embedding = ${vectorStr}::vector WHERE id = ${article.id}`);
      generated++;
    } catch (err: unknown) {
      if (!firstError) {
        firstError = err instanceof Error ? err.message : String(err);
      }
      if (firstError?.includes("No OpenAI API key")) break;
    }
  }
  if (generated > 0) {
    console.log(`Generated embeddings for ${generated}/${articlesWithoutEmbeddings.length} articles`);
  } else if (firstError) {
    console.log(`Embeddings skipped: ${firstError}`);
  }
}

async function seedAcademicDatabase() {
  console.log("Seeding academic knowledge base...");

  // Clear existing articles and media
  await db.delete(mediaAssets);
  await db.delete(knowledgeArticles);
  console.log("Cleared existing knowledge articles and media assets.");

  // Insert academic articles
  for (const article of articles) {
    await db.insert(knowledgeArticles).values(article);
  }
  console.log(`Inserted ${articles.length} academic knowledge articles.`);

  // Upsert settings (reset to academic defaults)
  for (const setting of defaultSettings) {
    await db
      .insert(adminSettings)
      .values(setting)
      .onConflictDoUpdate({
        target: adminSettings.key,
        set: { value: setting.value },
      });
  }
  console.log("Applied academic default settings.");

  // Upsert widget config
  const [existingWidget] = await db.select({ count: count() }).from(widgetConfigs);
  if (existingWidget.count === 0) {
    await db.insert(widgetConfigs).values({
      name: "Academic Widget",
      domain: "*",
      primaryColor: "#2563eb",
      welcomeMessage: "Hi! I'm your Academic Assistant. How can I help you today?",
      botName: "Academic Assistant",
      isActive: true,
    });
  } else {
    await db
      .update(widgetConfigs)
      .set({
        botName: "Academic Assistant",
        welcomeMessage: "Hi! I'm your Academic Assistant. How can I help you today?",
      });
  }

  await ensureEmbeddings();
  console.log("Academic database seeding complete!");
}

// Run when executed directly
seedAcademicDatabase()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Academic seed failed:", err);
    process.exit(1);
  });
