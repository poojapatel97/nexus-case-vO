// ============================================================================
// The Nexus Case - Drizzle ORM Schema
// For Amazon Aurora PostgreSQL
// ============================================================================

import {
  pgTable,
  pgEnum,
  serial,
  varchar,
  text,
  integer,
  timestamp,
  jsonb,
  index,
  foreignKey,
  unique,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ============================================================================
// ENUMS
// ============================================================================

export const userRoleEnum = pgEnum('user_role', [
  'admin',
  'attorney',
  'paralegal',
  'clerk',
  'client',
])

export const caseStatusEnum = pgEnum('case_status', ['pending', 'active', 'closed'])

export const casePriorityEnum = pgEnum('case_priority', ['low', 'medium', 'high'])

// ============================================================================
// TABLES
// ============================================================================

/**
 * Users table - Represents users in the system
 */
export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    role: userRoleEnum('role').default('paralegal').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    emailIdx: index('idx_users_email').on(table.email),
    roleIdx: index('idx_users_role').on(table.role),
    createdAtIdx: index('idx_users_created_at').on(table.createdAt),
  }),
)

/**
 * Cases table - Represents legal cases
 */
export const cases = pgTable(
  'cases',
  {
    id: serial('id').primaryKey(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description').notNull(),
    category: varchar('category', { length: 100 }).notNull(),
    status: caseStatusEnum('status').default('pending').notNull(),
    priority: casePriorityEnum('priority').default('medium').notNull(),
    assignedTo: integer('assigned_to'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    assignedToFk: foreignKey({
      columns: [table.assignedTo],
      foreignColumns: [users.id],
      name: 'fk_cases_assigned_to',
    }).onDelete('set null'),
    statusIdx: index('idx_cases_status').on(table.status),
    priorityIdx: index('idx_cases_priority').on(table.priority),
    assignedToIdx: index('idx_cases_assigned_to').on(table.assignedTo),
    categoryIdx: index('idx_cases_category').on(table.category),
    createdAtIdx: index('idx_cases_created_at').on(table.createdAt),
  }),
)

/**
 * Documents table - Represents documents associated with cases (stored in S3)
 */
export const documents = pgTable(
  'documents',
  {
    id: serial('id').primaryKey(),
    caseId: integer('case_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    filePathS3: varchar('file_path_s3', { length: 500 }).notNull(),
    fileSize: integer('file_size').notNull(),
    uploadedAt: timestamp('uploaded_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    caseIdFk: foreignKey({
      columns: [table.caseId],
      foreignColumns: [cases.id],
      name: 'fk_documents_case_id',
    }).onDelete('cascade'),
    caseIdIdx: index('idx_documents_case_id').on(table.caseId),
    uploadedAtIdx: index('idx_documents_uploaded_at').on(table.uploadedAt),
  }),
)

/**
 * Audit logs table - Tracks changes to cases and documents
 */
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: serial('id').primaryKey(),
    caseId: integer('case_id'),
    userId: integer('user_id'),
    action: varchar('action', { length: 50 }).notNull(),
    entityType: varchar('entity_type', { length: 50 }).notNull(),
    entityId: integer('entity_id').notNull(),
    changes: jsonb('changes'),
    ipAddress: varchar('ip_address', { length: 45 }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    caseIdFk: foreignKey({
      columns: [table.caseId],
      foreignColumns: [cases.id],
      name: 'fk_audit_logs_case_id',
    }).onDelete('set null'),
    userIdFk: foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'fk_audit_logs_user_id',
    }).onDelete('set null'),
    caseIdIdx: index('idx_audit_logs_case_id').on(table.caseId),
    userIdIdx: index('idx_audit_logs_user_id').on(table.userId),
    createdAtIdx: index('idx_audit_logs_created_at').on(table.createdAt),
    entityIdx: index('idx_audit_logs_entity').on(table.entityType, table.entityId),
  }),
)

// ============================================================================
// RELATIONS
// ============================================================================

export const usersRelations = relations(users, ({ many }) => ({
  assignedCases: many(cases, { relationName: 'assignedTo' }),
  auditLogs: many(auditLogs),
}))

export const casesRelations = relations(cases, ({ one, many }) => ({
  assignee: one(users, {
    fields: [cases.assignedTo],
    references: [users.id],
    relationName: 'assignedTo',
  }),
  documents: many(documents),
  auditLogs: many(auditLogs),
}))

export const documentsRelations = relations(documents, ({ one }) => ({
  case: one(cases, {
    fields: [documents.caseId],
    references: [cases.id],
  }),
}))

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  case: one(cases, {
    fields: [auditLogs.caseId],
    references: [cases.id],
  }),
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}))

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

export type Case = typeof cases.$inferSelect
export type NewCase = typeof cases.$inferInsert

export type Document = typeof documents.$inferSelect
export type NewDocument = typeof documents.$inferInsert

export type AuditLog = typeof auditLogs.$inferSelect
export type NewAuditLog = typeof auditLogs.$inferInsert
