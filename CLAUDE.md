# CLAUDE.md

> Enterprise Engineering Guide for AI Coding Assistants

## Purpose

This repository uses **NestJS** for the backend and **Next.js (App Router)** for the frontend.

Before making any change, the AI assistant **must read this file completely** and follow every rule.

After reading this guide, read [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md) completely to understand the repository's current architecture, implementation status, and local workflow.

The primary goal is to produce **production-ready, scalable, secure, maintainable, and high-performance software**.

---

# Core Principles

- Think before coding.
- Understand the entire feature.
- Never assume requirements.
- Ask questions if requirements are ambiguous.
- Reuse existing code whenever possible.
- Prefer maintainability over cleverness.
- Keep backward compatibility unless explicitly instructed.
- Follow SOLID, DRY, KISS.
- Optimize for long-term maintainability.

---

# Tech Stack

## Backend

- NestJS
- TypeScript
- MongoDB (Mongoose) and/or PostgreSQL (Prisma)
- Redis
- BullMQ
- JWT
- Swagger

## Frontend

- Next.js App Router
- React
- TypeScript
- TanStack Query
- Tailwind CSS

---

# NestJS Standards

## Architecture

Always use feature modules.

Feature/

- module
- controller
- service
- repository
- dto
- entities/schema
- interfaces
- decorators
- guards
- interceptors
- pipes
- filters
- tests

Controllers:

- Receive requests
- Call services
- Return responses

Never place business logic in controllers.

Services contain business logic.

Repositories handle database access.

Always use dependency injection.

Never instantiate services manually.

---

## DTO

Always validate requests with DTOs.

Use:

- class-validator
- class-transformer
- ValidationPipe

Never accept raw request bodies.

---

## Validation

Validate:

- body
- params
- query
- headers when necessary

Reject invalid requests early.

---

## Guards

Authentication:

- JWT Guard

Authorization:

- Roles Guard
- Permission Guard

Never authorize inside controllers.

---

## Exception Handling

Use a global exception filter.

Never expose stack traces.

Always return consistent API responses.

---

## Interceptors

Use for:

- logging
- serialization
- response transformation
- caching
- timeout

---

## Swagger

Every endpoint should include:

- summary
- description
- request dto
- response dto
- authentication
- error responses

---

# Next.js Standards

Use App Router.

Prefer Server Components.

Use Client Components only when required.

Use:

- dynamic imports
- Suspense
- lazy loading
- metadata API
- image optimization

Use TanStack Query for client-side server state.

Avoid unnecessary client fetching.

---

# TypeScript

Always enable strict typing.

Avoid any.

Use interfaces, utility types, generics.

No disabled lint rules unless justified.

---

# Database

Always optimize queries.

Use:

- indexes
- select/projection
- filtering
- sorting
- pagination

Never fetch unused fields.

MongoDB:

- lean()
- indexes
- aggregation only when needed

Prisma:

- select
- minimal include
- transactions

Avoid N+1 queries.

---

# Pagination

Prefer cursor pagination.

Fallback to offset pagination.

---

# Performance

Assume:

- millions of users
- millions of records

Optimize:

- CPU
- memory
- network
- database

Use Promise.all() where independent.

---

# Redis

Cache expensive reads.

Never cache mutable data without invalidation.

---

# BullMQ

Move heavy jobs to queues:

- emails
- notifications
- reports
- image processing

---

# Security

Always:

- validate input
- sanitize input
- protect JWT secrets
- use environment variables
- implement RBAC
- prevent SQL/NoSQL injection
- prevent XSS
- configure CORS
- rate limit sensitive APIs

Never commit secrets.

---

# Logging

Use NestJS Logger or Pino.

Never log:

- passwords
- tokens
- secrets

---

# REST API

Use predictable endpoints.

Return:

```json
{
  "success": true,
  "message": "Success",
  "data": {},
  "meta": {}
}
```

---

# Folder Structure

Keep feature-first organization.

Do not create random folders.

---

# Testing

Write unit tests for business logic.

Write integration tests for APIs.

---

# Docker

Use multi-stage builds.

Small images.

Non-root user when possible.

---

# CI/CD

Before merge:

- lint
- tests
- build
- typecheck

must pass.

---

# AI Workflow

Before coding:

1. Read the existing module.
2. Understand architecture.
3. Search for reusable code.
4. Design implementation.
5. Consider edge cases.
6. Optimize queries.
7. Consider indexing.
8. Consider security.
9. Write code.
10. Self-review.
11. Ensure lint/build/typecheck pass.

---

# Final Checklist

- Clean Architecture
- NestJS conventions
- Next.js best practices
- Strict TypeScript
- DTO validation
- Repository pattern
- Optimized queries
- Proper indexes
- Pagination
- Security
- Logging
- Swagger updated
- Tests updated
- Production ready

---

# Final Rule

Always behave like a Senior Staff Software Engineer.

Do not optimize for speed of writing.

Optimize for correctness, scalability, maintainability, and long-term engineering quality.
