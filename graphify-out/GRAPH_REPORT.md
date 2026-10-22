# Graph Report - aml-dashboard  (2026-10-22)

## Corpus Check
- 5 files · ~145,755 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2272 nodes · 7919 edges · 103 communities (97 shown, 6 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 146 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Prisma client and repositories
- Criteria to SQL where
- API env and main
- App pages and workflow designer
- Network entity queries
- Workflow step nodes
- Imports and reports API
- Customer and case creation
- Alert and customer detail pages
- Alert and customer list pages
- Admin mutations and transitions
- Admin and news pages
- API app and auth middleware
- Locale layout and proxy
- Case members hooks
- Cases service and SLA check
- Case pages
- Web dependencies
- Case queries
- Alert queries
- Auth handlers and sessions
- Mutation hooks
- Scheduled job runners
- Case documents and comments
- Import entity
- Web package config
- Logout and language switch
- Shared case form schemas
- Drafts
- Import mapping and news audience
- Jobs and rules pages
- My work and workflow canvas
- API package config
- Network repository
- Seed data
- Admin entity
- Notification entity
- Shared views and SLA
- Network page
- Workflow queries
- Inspector and onboarding steps
- Root package config
- Session queries
- Web tsconfig
- API dependencies
- Scheduler
- UI components config
- My work and reference entities
- News entity
- Overview entity and logo
- Report entity
- Command palette
- Workflows API module
- News detail and badges
- Job entity
- News editor
- Rich text and popover
- Product brief and domain
- API dev dependencies
- Admin API module
- Workflow page
- Customer entity
- Shared workflow engine
- Turbo pipeline
- Rule entity
- Feature catalogue
- Content and locale rules
- Shared package config
- Base tsconfig
- Architecture and rule builder
- Login page
- Web dev dependencies
- Sheet component
- Stack and database decisions
- API scripts
- Seed random helpers
- Shared form tests
- Theme toggle
- Badge and tabs
- Signed-in layout
- Live updates socket client
- Case private note
- Preferences sections
- Fonts and visual style
- Access and release scope
- IBAN and geo helpers
- API tsconfig
- Help page
- Profile section
- Logo concept
- Workflow models and four-eyes
- Missing keys script
- Realtime server
- Case creation wizard
- Web scripts
- Logo dark variant
- Shared tsconfig
- API app middleware
- Prettier config
- Import page
- Prisma config
- Tsup config

## God Nodes (most connected - your core abstractions)
1. `cn()` - 165 edges
2. `useLocale()` - 136 edges
3. `react` - 108 edges
4. `Button()` - 106 edges
5. `formatNumber()` - 102 edges
6. `react-i18next` - 88 edges
7. `Panel()` - 81 edges
8. `request()` - 70 edges
9. `PanelHeader()` - 65 edges
10. `useHref()` - 65 edges

## Surprising Connections (you probably didn't know these)
- `Release Status (Releases 1-5)` --semantically_similar_to--> `Release Status Table (commits per release)`  [INFERRED] [semantically similar]
  README.md → docs/handover.md
- `pnpm workspace and allowBuilds` --implements--> `Technical Decisions`  [INFERRED]
  pnpm-workspace.yaml → docs/tech-decisions.md
- `CustomerProfilePage()` --calls--> `formatIban()`  [EXTRACTED]
  apps/web/src/pages/customer-profile/ui/customer-profile-page.tsx → packages/shared/src/geo.ts
- `WorkflowPage()` --calls--> `validateWorkflow()`  [EXTRACTED]
  apps/web/src/pages/workflow/ui/workflow-page.tsx → packages/shared/src/workflow.ts
- `useLocale()` --calls--> `isLocale()`  [EXTRACTED]
  apps/web/src/shared/i18n/use-locale.ts → packages/shared/src/locale.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Self-hosted fonts and their OFL licenses** — docs_decisions_font_choices, apps_web_src_shared_assets_fonts_huninn_ofl, apps_web_src_shared_assets_fonts_geist_mono_ofl, apps_web_src_shared_assets_fonts_vazirmatn_ofl [EXTRACTED 0.95]
- **Server-side layered access enforcement (permission, region, clearance)** — docs_brief_access_model, docs_handover_architecture, docs_handover_network_module, docs_brief_postgres, readme_demo_accounts [INFERRED 0.85]
- **Workflow model B: designer, shared engine, versioning, My work inbox** — docs_brief_workflow_model_b, docs_tech_decisions_workflow_designer, docs_handover_shared_workflow_engine, docs_brief_workflow_versioning, docs_brief_my_work_inbox [INFERRED 0.85]
- **Five-language and RTL support** — docs_brief_content_and_locale_rules, docs_brief_five_languages_rtl, docs_tech_decisions_i18next, docs_handover_release_5_languages, docs_tech_decisions_tailwind_theme_tokens [INFERRED 0.85]

## Communities (103 total, 6 thin omitted)

### Community 0 - "Prisma client and repositories"
Cohesion: 0.06
Nodes (55): Db, alertFilterWhere(), AlertsRepository, createAlertsRepository(), dbError(), sortable, AlertsService, createAlertsService() (+47 more)

### Community 1 - "Criteria to SQL where"
Cohesion: 0.07
Nodes (38): conditionToWhere(), criteriaToWhere(), num(), pair(), Where, Page(), valueText(), transactionKeys (+30 more)

### Community 2 - "API env and main"
Cohesion: 0.07
Nodes (46): Env, envSchema, loadEnv(), app, auth, cases, db, deps (+38 more)

### Community 3 - "App pages and workflow designer"
Cohesion: 0.13
Nodes (44): Page(), Page(), WorkflowDesigner(), BranchesSection(), ClearanceSection(), RolesSection(), History(), statusClass (+36 more)

### Community 4 - "Network entity queries"
Cohesion: 0.06
Nodes (45): networkKeys, useFeaturedCustomer(), getFeaturedCustomer(), getNetwork(), getNetworkPath(), qs(), baseOptions(), ChartColors (+37 more)

### Community 5 - "Workflow step nodes"
Cohesion: 0.06
Nodes (38): SYMBOL, VALUE_NAMESPACE, categoryStrip, StepNodeData, StepNodeType, TransitionEdgeData, TransitionEdgeType, addStep() (+30 more)

### Community 6 - "Imports and reports API"
Cohesion: 0.05
Nodes (35): dbError(), FX_TO_EUR, Issue, Lookup, bounds(), createReportsRepository(), dbError(), n() (+27 more)

### Community 7 - "Customer and case creation"
Cohesion: 0.08
Nodes (32): Page(), useCreateCase(), checkEmail(), checkIban(), useAutosaveDraft(), useDeleteDraft(), useDraft(), CaseWizard() (+24 more)

### Community 8 - "Alert and customer detail pages"
Cohesion: 0.10
Nodes (27): Detail(), Page(), Page(), Profile(), Edit(), Page(), Detail(), Page() (+19 more)

### Community 9 - "Alert and customer list pages"
Cohesion: 0.08
Nodes (28): Page(), Page(), nextConfig, AlertsPage(), fromParams(), toParams(), CustomersPage(), quick (+20 more)

### Community 10 - "Admin mutations and transitions"
Cohesion: 0.15
Nodes (35): useInvalidate(), useRenameClearance(), useSaveBranch(), useSaveRolePermissions(), useSaveUser(), TransitionDialog(), EditKycDialog(), cronPresets (+27 more)

### Community 11 - "Admin and news pages"
Cohesion: 0.11
Nodes (26): Page(), Edit(), Page(), Page(), Page(), Page(), Page(), useNews() (+18 more)

### Community 12 - "API app and auth middleware"
Cohesion: 0.11
Nodes (23): createApp(), appWith(), dbError(), kindSchema, saveSchema, createHealthHandlers(), HealthHandlers, createHealthRepository() (+15 more)

### Community 13 - "Locale layout and proxy"
Cohesion: 0.07
Nodes (24): instant, LocaleLayout(), metadata, config, pickLocale(), proxy(), makeQueryClient(), Providers() (+16 more)

### Community 14 - "Case members hooks"
Cohesion: 0.15
Nodes (33): useReference(), AlertFilters(), AlertFilterValues, Chip(), toggle(), BasicsStep(), PartiesStep(), PartyAccounts() (+25 more)

### Community 15 - "Cases service and SLA check"
Cohesion: 0.08
Nodes (24): runSlaCheck(), CasesRepository, caseFacts(), CasesService, CommentSource, createCasesService(), notFound(), RowSource (+16 more)

### Community 16 - "Case pages"
Cohesion: 0.12
Nodes (23): Detail(), Page(), Page(), CaseStatusBadge(), DueLabel(), OPEN_STATES, priorityClass, PriorityLabel() (+15 more)

### Community 17 - "Web dependencies"
Cohesion: 0.05
Nodes (40): dependencies, @aml/shared, class-variance-authority, clsx, cmdk, cn, cron-parser, @dagrejs/dagre (+32 more)

### Community 18 - "Case queries"
Cohesion: 0.09
Nodes (32): casesQueryOptions(), useAddCaseMember(), useAddComment(), useCase(), useCaseBoard(), useCaseMutation(), useCases(), useComments() (+24 more)

### Community 19 - "Alert queries"
Cohesion: 0.07
Nodes (27): alertKeys, alertsQueryOptions(), useAlert(), useAlerts(), useDecideAlert(), decideAlert(), getAlert(), queryAlerts() (+19 more)

### Community 20 - "Auth handlers and sessions"
Cohesion: 0.10
Nodes (25): AuthHandlers, meta(), createRequireAuth(), SESSION_COOKIE, AuthRepository, createAuthRepository(), dbError(), userInclude (+17 more)

### Community 21 - "Mutation hooks"
Cohesion: 0.09
Nodes (16): useSaveRule(), recommendations, Action, toValues(), deviceOf(), PasswordForm, PasswordPanel(), buttonVariants (+8 more)

### Community 22 - "Scheduled job runners"
Cohesion: 0.09
Nodes (24): createJobRunner(), Ctx, nextCodes(), OPEN, RISK_SCORE, runKycExpiry(), runNewsNotify(), runRules() (+16 more)

### Community 23 - "Case documents and comments"
Cohesion: 0.12
Nodes (18): useUploadDocument(), documentUrl(), uploadCaseDocument(), Body(), CaseComments(), Composer(), escape(), mentionsIn() (+10 more)

### Community 24 - "Import entity"
Cohesion: 0.13
Nodes (23): commitImport(), discardImport(), getImports(), importKeys, useCommitImport(), useDiscardImport(), useImports(), useInvalidate() (+15 more)

### Community 25 - "Web package config"
Cohesion: 0.07
Nodes (27): eslintConfig, @aml/shared, cron-parser, @types/node, typescript, zod, name, private (+19 more)

### Community 26 - "Logout and language switch"
Cohesion: 0.14
Nodes (19): useLogout(), LanguageSwitch(), localeNames, useChangeLocale(), initials(), UserMenu(), apiUrl(), setCookie() (+11 more)

### Community 27 - "Shared case form schemas"
Cohesion: 0.08
Nodes (28): caseBasicsSchema, caseCreateSchema, casePartiesSchema, casePartySchema, caseSteps, caseTransitionSchema, caseUpdateSchema, commentInputSchema (+20 more)

### Community 28 - "Drafts"
Cohesion: 0.12
Nodes (21): deleteDraft(), draftKeys, DraftKind, getDraft(), saveDraft(), changePassword(), deleteAvatar(), getMySettings() (+13 more)

### Community 29 - "Import mapping and news audience"
Cohesion: 0.12
Nodes (17): lookup, applyMapping(), validateRows(), audienceWhere(), createNewsModule(), dbError(), excerptOf(), postInclude (+9 more)

### Community 30 - "Jobs and rules pages"
Cohesion: 0.16
Nodes (15): Page(), Page(), JobCard(), JobsPage(), RunHistory(), RunStatus(), seconds(), statusClass (+7 more)

### Community 31 - "My work and workflow canvas"
Cohesion: 0.15
Nodes (19): Page(), useMyWorkLive(), useConditionText(), StepNode, TransitionEdge, CaseWorkflow(), edgeTypes, historyOf() (+11 more)

### Community 32 - "API package config"
Cohesion: 0.08
Nodes (23): @aml/shared, cron-parser, @types/node, typescript, zod, name, private, type (+15 more)

### Community 33 - "Network repository"
Cohesion: 0.14
Nodes (16): pathQuerySchema, createNetworkRepository(), dbError(), ExternalRow, NetworkRepository, NODE_LIMIT, Range, TransferRow (+8 more)

### Community 34 - "Seed data"
Cohesion: 0.09
Nodes (19): BRANCHES, companyName(), db, formatters, FX, GULF_FIRST, GULF_LAST, HIGH_RISK (+11 more)

### Community 35 - "Admin entity"
Cohesion: 0.11
Nodes (17): adminKeys, auditQueryOptions(), getAdminReference(), getAdminUsers(), put(), queryAudit(), renameClearance(), saveBranch() (+9 more)

### Community 36 - "Notification entity"
Cohesion: 0.16
Nodes (15): Filter, getNotifications(), markNotificationsRead(), notificationKeys, qs(), useLatestNotifications(), useMarkRead(), useNotificationsLive() (+7 more)

### Community 37 - "Shared views and SLA"
Cohesion: 0.10
Nodes (20): alertRowSchema, alertSlaHours, MyWork, CaseBoard, caseBoardSchema, caseDetailSchema, casePageSchema, casePriorities (+12 more)

### Community 38 - "Network page"
Cohesion: 0.16
Nodes (14): Page(), networkQueryOptions(), useNetwork(), useNetworkPath(), CustomerSearch(), day(), expandCenter(), Legend() (+6 more)

### Community 39 - "Workflow queries"
Cohesion: 0.15
Nodes (15): useCreateWorkflowDraft(), useDiscardWorkflowDraft(), useInvalidate(), useSaveWorkflowDraft(), workflowKeys, createWorkflowDraft(), discardWorkflowDraft(), getWorkflow() (+7 more)

### Community 40 - "Inspector and onboarding steps"
Cohesion: 0.18
Nodes (13): ProfileStep(), IdInput(), Roles(), Row(), StepInspector(), TransitionInspector(), VALUE_NAMESPACE, LEVELS (+5 more)

### Community 41 - "Root package config"
Cohesion: 0.10
Nodes (19): devDependencies, prettier, turbo, typescript, typescript, name, packageManager, private (+11 more)

### Community 42 - "Session queries"
Cohesion: 0.17
Nodes (15): sessionKeys, useLogin(), useMe(), useRevokeOtherSessions(), useRevokeSession(), useSessions(), getMe(), getSessions() (+7 more)

### Community 43 - "Web tsconfig"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 44 - "API dependencies"
Cohesion: 0.11
Nodes (18): dependencies, @aml/shared, argon2, cookie, cookie-parser, cors, cron-parser, exceljs (+10 more)

### Community 45 - "Scheduler"
Cohesion: 0.15
Nodes (14): JobKey, JobRunner, createScheduler(), ScheduledJob, Scheduler, createJobsModule(), dbError(), nextRun() (+6 more)

### Community 46 - "UI components config"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+9 more)

### Community 47 - "My work and reference entities"
Cohesion: 0.12
Nodes (12): getMyWork(), myWorkKeys, useMyWork(), getReference(), referenceKeys, search(), searchKeys, useSearch() (+4 more)

### Community 48 - "News entity"
Cohesion: 0.16
Nodes (15): createNews(), deleteNews(), getNews(), getNewsPost(), markNewsRead(), newsKeys, updateNews(), uploaded (+7 more)

### Community 49 - "Overview entity and logo"
Cohesion: 0.20
Nodes (12): getOverview(), overviewKeys, useOverview(), LogoMark(), Tooltip(), TooltipContent(), TooltipTrigger(), SidebarState (+4 more)

### Community 50 - "Report entity"
Cohesion: 0.18
Nodes (13): exportReports(), getReports(), qs(), reportKeys, useExportReports(), useReports(), uploadAvatar(), download() (+5 more)

### Community 51 - "Command palette"
Cohesion: 0.18
Nodes (13): PaletteState, usePaletteStore, allPages, CommandPalette(), Entry, Group(), PaletteTrigger(), CURRENT_RELEASE (+5 more)

### Community 52 - "Workflows API module"
Cohesion: 0.13
Nodes (12): createWorkflowsRepository(), createWorkflowsService(), dbError(), OPEN, Repo, toRow(), versionSelect, VersionSource (+4 more)

### Community 53 - "News detail and badges"
Cohesion: 0.27
Nodes (11): Detail(), Page(), NewsStateBadge(), PinnedBadge(), ReadMeter(), stateClass, NewsCard(), fileSize() (+3 more)

### Community 54 - "Job entity"
Cohesion: 0.16
Nodes (13): getJobRuns(), getJobs(), jobKeys, runJob(), updateJob(), useInvalidate(), useJobRuns(), useJobs() (+5 more)

### Community 55 - "News editor"
Cohesion: 0.23
Nodes (12): NewsEditor(), toIso(), toLocalInput(), Upload, errorAt(), ErrorSummary(), Field(), fieldId() (+4 more)

### Community 56 - "Rich text and popover"
Cohesion: 0.20
Nodes (13): Item(), Props, RichText(), Tool(), Popover(), PopoverContent(), PopoverDescription(), PopoverHeader() (+5 more)

### Community 57 - "Product brief and domain"
Cohesion: 0.16
Nodes (16): AML Dashboard Brief, AML Domain Basics (placement, layering, integration, KYC, SAR), Data Model (main entities), Global UI (sidebar, quick access, command palette, notifications), Monitoring Workflow (rules to alerts to cases to SAR), Not in Scope (support chat, config-driven form builder), Roles (analyst, supervisor, compliance manager, system admin), Known Environment Quirks (+8 more)

### Community 58 - "API dev dependencies"
Cohesion: 0.13
Nodes (15): devDependencies, @faker-js/faker, prisma, supertest, tsup, tsx, @types/cookie-parser, @types/cors (+7 more)

### Community 59 - "Admin API module"
Cohesion: 0.17
Nodes (10): audit(), createAdminModule(), dbError(), guardRolePermissions(), toUser(), userSelect, AdminUser, branchInputSchema (+2 more)

### Community 60 - "Workflow page"
Cohesion: 0.19
Nodes (6): Page(), usePublishWorkflow(), useWorkflow(), useWorkflowVersion(), statusClass, WorkflowPage()

### Community 61 - "Customer entity"
Cohesion: 0.18
Nodes (12): codeSchema, createCustomer(), customerKeys, customersQueryOptions(), getCustomer(), queryCustomers(), updateKyc(), useCreateCustomer() (+4 more)

### Community 62 - "Shared workflow engine"
Cohesion: 0.15
Nodes (14): Actor, AvailableTransition, BlockReason, compare(), ConditionField, conditionMatches(), LocalizedText, reach() (+6 more)

### Community 63 - "Turbo pipeline"
Cohesion: 0.13
Nodes (14): dependsOn, outputs, cache, persistent, dependsOn, $schema, tasks, build (+6 more)

### Community 64 - "Rule entity"
Cohesion: 0.15
Nodes (10): codeSchema, createRule(), getRule(), getRules(), ruleKeys, updateRule(), useRules(), RuleForm (+2 more)

### Community 65 - "Feature catalogue"
Cohesion: 0.16
Nodes (12): Account Network Graph (Sigma.js, Bloom style), News (rich text, audience, publish/expiry, read receipts), Pages List (16 pages), Highcharts Module Registration Order (shared/ui/chart.tsx), Network Module (WITH RECURSIVE walk, shortest path, masking), Preferences Applied (digits, density, start page, quick access), Release 4 Completion (news, jobs, import, reports, settings, admin, palette), Account Graph: Sigma.js 4 on graphology (ForceAtlas2, Louvain) (+4 more)

### Community 66 - "Content and locale rules"
Cohesion: 0.16
Nodes (9): Five Languages with RTL (en, de, tr, ar, fa), Tables: TanStack Table (headless, server sorting/paging), Missing Translation Keys Check (scripts/i18n-missing-keys.py), Release 5 Languages (de, tr, ar locale files, Arabic plurals), Visual Look (Figma blue palette, graphite dark theme), Translations with i18next (locale in URL), shadcn/ui in shared/ui, Tailwind with Figma Theme Tokens and Logical Classes (+1 more)

### Community 67 - "Shared package config"
Cohesion: 0.14
Nodes (13): dependencies, zod, devDependencies, typescript, exports, typescript, zod, name (+5 more)

### Community 68 - "Base tsconfig"
Cohesion: 0.14
Nodes (13): compilerOptions, esModuleInterop, exactOptionalPropertyTypes, forceConsistentCasingInFileNames, isolatedModules, lib, module, moduleResolution (+5 more)

### Community 69 - "Architecture and rule builder"
Cohesion: 0.17
Nodes (12): Next.js agent rules (breaking-change warning), AND/OR Rule Builder, Forms (React Hook Form + Zod, multi-step, recursive rule builder), Architecture in One Page, AND/OR Criteria Search (criteria.ts, criteria-to-where.ts), Deterministic Seed (faker seed 42, money-mule rings), Prisma Migration Workflow (migrate diff + deploy), Socket.IO Rooms and Stored-then-pushed Notifications (+4 more)

### Community 70 - "Login page"
Cohesion: 0.24
Nodes (5): Page(), settingsKeys, demoAccounts, LoginPage(), LoginInput

### Community 71 - "Web dev dependencies"
Cohesion: 0.18
Nodes (11): devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/turbopack, @tanstack/react-query-devtools, @types/node, @types/papaparse (+3 more)

### Community 72 - "Sheet component"
Cohesion: 0.22
Nodes (7): SheetContent(), SheetDescription(), SheetFooter(), SheetHeader(), SheetOverlay(), SheetPortal(), SheetTitle()

### Community 73 - "Stack and database decisions"
Cohesion: 0.22
Nodes (9): Local Postgres 17 service (docker-compose), Postgres (over MongoDB), Open item: replace temporary Persian font, Remaining Ideas (not planned), Sessions (aml_session cookie, SHA-256 token, argon2), Deployment (Docker Compose, Nginx, certbot, GitHub Actions), Quality (Vitest, Playwright, ESLint, Prettier), Technical Decisions (+1 more)

### Community 74 - "API scripts"
Cohesion: 0.20
Nodes (10): scripts, build, db:generate, db:migrate, db:reset, db:seed, dev, start (+2 more)

### Community 75 - "Seed random helpers"
Cohesion: 0.47
Nodes (10): between(), chance(), clampNow(), lognormal(), main(), partsIn(), randomTime(), sameDay() (+2 more)

### Community 77 - "Theme toggle"
Cohesion: 0.33
Nodes (6): options, ThemeToggle(), noopSubscribe(), useMounted(), AppBar(), next-themes

### Community 78 - "Badge and tabs"
Cohesion: 0.24
Nodes (8): Badge(), badgeVariants, Tabs(), TabsContent(), TabsList(), tabsListVariants, TabsTrigger(), class-variance-authority

### Community 79 - "Signed-in layout"
Cohesion: 0.39
Nodes (5): SignedInLayout(), useMySettings(), setDigitPreference(), TooltipProvider(), AppLayout()

### Community 80 - "Live updates socket client"
Cohesion: 0.31
Nodes (5): useCaseLive(), caseKeys, getSocket(), API_URL, socket.io-client

### Community 81 - "Case private note"
Cohesion: 0.31
Nodes (5): useNote(), useSaveNote(), getNote(), saveNote(), CaseNote()

### Community 82 - "Preferences sections"
Cohesion: 0.39
Nodes (7): usePreferences(), allPages, AppearanceSection(), NotificationsSection(), Row(), SaveState(), usePreference()

### Community 83 - "Fonts and visual style"
Cohesion: 0.22
Nodes (9): Geist Mono OFL license, Huninn OFL license, Vazirmatn OFL license, Blue palette and Vaulto-inspired visual style, Dashboard layout (sidebar, app bar, insight titles), Decisions and open items, Figma variable collections for light and dark, Font choices (Huninn, Geist Mono, Vazirmatn) (+1 more)

### Community 84 - "Access and release scope"
Cohesion: 0.22
Nodes (7): Case Collaboration (members, threaded comments, mentions, private notes), Release 1: core, visual impact, Release 2: complex forms, Release 3: graph and workflow, Release 4: completion, Release 5: remaining languages, Release plan

### Community 85 - "IBAN and geo helpers"
Cohesion: 0.38
Nodes (6): iban(), CountryCode, highRiskCountries, ibanFrom(), lettersToDigits(), mod97()

### Community 86 - "API tsconfig"
Cohesion: 0.29
Nodes (6): compilerOptions, noEmit, types, extends, include, ../../tsconfig.base.json

### Community 87 - "Help page"
Cohesion: 0.43
Nodes (4): Page(), ACCESS, HelpPage(), SHORTCUTS

### Community 88 - "Profile section"
Cohesion: 0.57
Nodes (6): useDeleteAvatar(), useSetMe(), useUpdateProfile(), useUploadAvatar(), initials(), ProfileSection()

### Community 89 - "Logo concept"
Cohesion: 0.43
Nodes (7): AML logo mark (36x36 SVG app icon), Anti-money-laundering transaction monitoring, Blue and white color palette, Three graduated blue nodes on the path (#8DB8EC, #A9C9F0, #C6DCF5), Zigzag signal path polyline (light blue to white gradient, round caps), Target ring with white center dot at upper right (r6 ring #5B9BE0, r3 white dot), Rounded tile background (navy gradient #003F88 to #00296B, rx 10, faint white border)

### Community 90 - "Workflow models and four-eyes"
Cohesion: 0.48
Nodes (6): My Work Inbox (SLA deadlines), Workflow Model A: Fixed Approval Chain, Workflow Model B: React Flow Workflow Designer, Workflow Versioning (open cases keep their version), Shared Workflow Engine (packages/shared/src/workflow.ts), Workflow Designer: React Flow with Pure Shared Engine

### Community 92 - "Realtime server"
Cohesion: 0.33
Nodes (4): createRealtime(), Deps, cookie, socket.io

### Community 93 - "Case creation wizard"
Cohesion: 0.60
Nodes (3): Page(), Wizard(), CaseNewPage()

### Community 94 - "Web scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, lint, start, typecheck

### Community 95 - "Logo dark variant"
Cohesion: 0.40
Nodes (6): AML logo mark (dark variant), Navy and light-blue palette, Path node dots, Zigzag transaction path, Target ring with white core, Rounded navy gradient tile

### Community 96 - "Shared tsconfig"
Cohesion: 0.33
Nodes (5): compilerOptions, noEmit, extends, include, ../../tsconfig.base.json

### Community 97 - "API app middleware"
Cohesion: 0.40
Nodes (4): AppDeps, cookie-parser, cors, helmet

### Community 98 - "Prettier config"
Cohesion: 0.40
Nodes (4): printWidth, semi, singleQuote, trailingComma

## Knowledge Gaps
- **511 isolated node(s):** `Preset`, `CustomersService`, `Row`, `DayRow`, `OverviewService` (+506 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 668 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Mutation hooks` to `Criteria to SQL where`, `App pages and workflow designer`, `Network entity queries`, `Workflow step nodes`, `Customer and case creation`, `Alert and customer detail pages`, `Alert and customer list pages`, `Admin mutations and transitions`, `Admin and news pages`, `Locale layout and proxy`, `Case members hooks`, `Case pages`, `Case documents and comments`, `Import entity`, `Web package config`, `Logout and language switch`, `Drafts`, `Jobs and rules pages`, `My work and workflow canvas`, `Notification entity`, `Network page`, `Inspector and onboarding steps`, `My work and reference entities`, `Overview entity and logo`, `Command palette`, `News detail and badges`, `News editor`, `Rich text and popover`, `Workflow page`, `Login page`, `Sheet component`, `Theme toggle`, `Badge and tabs`, `Signed-in layout`, `Live updates socket client`, `Case private note`, `Preferences sections`, `Help page`, `Profile section`, `Case creation wizard`, `Import page`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **What connects `Preset`, `CustomersService`, `Row` to the rest of the system?**
  _511 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Prisma client and repositories` be split into smaller, more focused modules?**
  _Cohesion score 0.06327160493827161 - nodes in this community are weakly interconnected._
- **Why does `dependencies` connect `Web dependencies` to `Web package config`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Should `Criteria to SQL where` be split into smaller, more focused modules?**
  _Cohesion score 0.06557377049180328 - nodes in this community are weakly interconnected._
- **Why does `cn()` connect `Admin and news pages` to `Criteria to SQL where`, `App pages and workflow designer`, `Workflow step nodes`, `Customer and case creation`, `Alert and customer detail pages`, `Alert and customer list pages`, `Admin mutations and transitions`, `Case members hooks`, `Case pages`, `Alert queries`, `Mutation hooks`, `Case documents and comments`, `Import entity`, `Logout and language switch`, `Jobs and rules pages`, `My work and workflow canvas`, `Notification entity`, `Network page`, `Inspector and onboarding steps`, `Overview entity and logo`, `Command palette`, `News detail and badges`, `News editor`, `Rich text and popover`, `Workflow page`, `Sheet component`, `Badge and tabs`, `Preferences sections`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Should `API env and main` be split into smaller, more focused modules?**
  _Cohesion score 0.07486338797814207 - nodes in this community are weakly interconnected._