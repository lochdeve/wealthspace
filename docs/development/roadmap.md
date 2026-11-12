# Wealthspace — Development Roadmap

## 1. Product objective

Wealthspace is a personal finance and shared-expenses web application.

The goal is to help users manage personal finances, organize shared spaces, track expenses, distribute shared costs and understand balances between members.

The product will be developed as a modular monolith.

## 2. Current project status

### Technical foundation

- [x] pnpm monorepo
- [x] Next.js frontend bootstrap
- [x] NestJS backend bootstrap
- [x] PostgreSQL 17 configuration
- [x] Prisma schema and initial migration
- [x] Database integrity tests
- [x] GitHub Actions quality job
- [x] GitHub Actions database-integrity job
- [x] Initial product and architecture documentation
- [ ] Verify CI on GitHub after publishing commits
- [ ] Confirm proprietary license changes

### Backend

- [x] NestJS application bootstrap
- [x] Health endpoint
- [x] Prisma integration
- [x] Environment validation
- [x] Database health check
- [ ] Users module
- [x] Authentication module (register, login, session cookie, profile)
- [x] Registration (atomic user + PERSONAL space + OWNER membership)
- [x] Login and session management (JWT HttpOnly cookie)
- [x] Logout
- [x] Authenticated user profile (`GET /auth/me`)
- [x] JwtAuthGuard (base for protected routes)
- [x] List user spaces (ACTIVE memberships)
- [x] Space-scoped guard (`SpaceMembershipGuard`) for `GET /spaces/:spaceId`
- [x] Create shared space (`POST /spaces`)
- [x] Invitations (create, list, accept, reject, revoke)
- [x] Membership lifecycle (leave / remove)
- [x] Authorization tests for shared-space mutations
- [x] OpenAPI documentation (health + Swagger UI)

### Frontend

- [x] Next.js application bootstrap
- [x] Static landing page
- [x] API integration (client + CORS)
- [x] Registration page
- [x] Login page
- [x] Session management (cookie + `/auth/me`)
- [x] Protected routes (`(app)`)
- [x] Authenticated application layout
- [ ] End-to-end authentication flow against live API (optional CI)
- [x] Spaces list and create shared space UI
- [x] Space detail and invitation management (OWNER/ADMIN)
- [x] User pending invitations (accept / reject)
- [x] Active space selection (cookie + header switcher)
- [x] Membership leave/remove UI
- [x] Phase 5 accounts, categories and transactions UI (MVP)

## 3. Development phases

### Phase 0 — Project closure

- Verify Git status and remote.
- Publish initial commits when ready.
- Verify GitHub Actions.
- Finalize proprietary license.
- Verify local development environment.

### Phase 1 — Backend foundation

- Environment configuration and validation.
- PrismaService and PrismaModule.
- PostgreSQL connection lifecycle.
- Database connectivity checks.
- Integration tests for API and database.

### Phase 2 — Authentication and users

- Users module.
- Auth module.
- Registration with secure password hashing.
- Atomic creation of User, PERSONAL Space and OWNER Membership.
- Login.
- Secure session management.
- Logout.
- Authenticated profile endpoint.
- Authorization guards.
- Security and integration tests.
- OpenAPI documentation.

### Phase 3 — Frontend authentication

- API client.
- Registration and login forms.
- Form validation.
- Session handling.
- Logout.
- Protected routes.
- Authenticated application layout.
- End-to-end authentication tests.

### Phase 4 — Spaces and memberships

- Personal space.
- Shared spaces.
- Invitations.
- Membership lifecycle.
- Owner, Admin and Member roles.
- Active space selection.

### Phase 5 — Accounts and financial transactions

- Accounts.
- Categories.
- Income.
- Expenses.
- Transfers.
- Opening balances.
- Account archive.
- Transaction history and revisions.

### Phase 6 — Shared expenses and settlements

- Shared expense creation.
- Equal, percentage and custom splits.
- Participants and attribution.
- Net balances.
- Partial and full settlements.
- Historical revisions.

### Phase 7 — Budgets, reports and dashboards

- Personal dashboard.
- Shared dashboard.
- Global dashboard.
- Budgets.
- Search, filters and pagination.
- Multi-currency reports.
- Basic exports.

### Phase 8 — Production readiness

- Security review.
- Rate limiting.
- Logging and monitoring.
- Backup and restore procedures.
- Production migrations.
- E2E coverage.
- Deployment.
- Privacy policy and terms of service.

## 4. Execution rules

- Work on one deliverable at a time.
- Do not implement future phases prematurely.
- Preserve approved architecture and domain decisions.
- Do not change the Prisma schema without a concrete requirement.
- Add or update tests for every meaningful behavior.
- Run relevant quality checks before closing a deliverable.
- Keep commits small and focused.
- Never push without explicit approval.
- Update this roadmap and current-status.md when a deliverable is completed.

## 5. Definition of done

A deliverable is complete only when:

1. The implementation works.
2. Relevant tests pass.
3. Lint, typecheck and formatting checks pass where applicable.
4. No unrelated changes are included.
5. The implementation and relevant decisions are documented.
6. The next task is clearly identified.

## 6. Current priority

The next implementation task is merge Phase 5 web PR; then dashboards / SharedExpense or Phase 6 per roadmap.
