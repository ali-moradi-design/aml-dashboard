# Graph Report - aml-dashboard  (2026-10-17)

## Corpus Check
- 377 files · ~149,340 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 13 file(s) not represented in the graph (top: .woff2 6, .example 2, (none) 1)

## Summary
- 2247 nodes · 7912 edges · 98 communities (93 shown, 5 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 150 edges (avg confidence: 0.85)
- Token cost: 127,073 input · 0 output

## Community Hubs (Navigation)
- Web route pages
- API repositories and Prisma
- Docs, brand and design notes
- Admin and case mutations
- Web entity: customer
- Criteria to SQL where
- Locale layout and proxy
- Web entity: case
- Web feature: customer
- API app and auth handlers
- Web feature: import
- API module wiring
- Web dependencies
- Web shared: ui
- Shared: domain
- Scheduled job runners
- Web entity: notification
- API module: auth
- Web page: overview
- Project: ref
- Web feature: news
- Web shared: ui (2)
- API module: notifications
- Web feature: case
- Web shared: ui (3)
- Web widget: network
- Release 4 shared contracts
- API config and main
- Web entity: case (2)
- Shared: forms
- API module: cases
- API module: news
- Web entity: settings
- Web feature: case (2)
- Shared: workflow
- Command palette and help
- Web entity: workflow
- Web entity: workflow (2)
- Project: ref (2)
- API Prisma: seed
- Web entity: my
- Web entity: news
- Web shared: ui (4)
- Shared: views
- API module: network
- Web feature: workflow
- Project: package
- Web entity: admin
- Web entity: session
- Web config: tsconfig
- API config: package
- Web page: network
- Web config: components
- Web entity: network
- Web shared: api
- Web feature: workflow (2)
- Web entity: job
- Shared workflow engine
- Web page: jobs
- Web shared: ui (5)
- API config: package (2)
- Web page: customers
- Shared: index
- Project: turbo
- Web entity: news (2)
- Web entity: rule
- Web page: settings
- Project: packages
- Project: tsconfig
- API module: workflows
- API module: admin
- API module: imports
- Web page: login
- Web config: package
- Web entity: report
- Web shared: ui (6)
- API config: package (3)
- API Prisma: seed (2)
- Shared: index (2)
- Web page: settings (2)
- Web feature: theme
- Shared: geo
- Web page: transactions
- Web entity: case (3)
- Web feature: alert
- Web shared: ui (7)
- Shared: network
- API config: tsconfig
- Project: docs
- Project: scripts
- Web config: package (2)
- Project: docs (2)
- Project: packages (2)
- Project: ref (3)
- Project: prettierrc
- Web route: layout
- API Prisma: config
- API config: tsup

## God Nodes (most connected - your core abstractions)
1. `cn()` - 165 edges
2. `useLocale()` - 136 edges
3. `react` - 108 edges
4. `Button()` - 106 edges
5. `formatNumber()` - 102 edges
6. `react-i18next` - 88 edges
7. `Panel()` - 81 edges
8. `request()` - 70 edges
9. `useHref()` - 65 edges
10. `PanelHeader()` - 65 edges

## Surprising Connections (you probably didn't know these)
- `Release status checklist` --semantically_similar_to--> `Release status table with commits`  [INFERRED] [semantically similar]
  README.md → docs/handover.md
- `Light and dark CSS theme tokens` --semantically_similar_to--> `Theming with Tailwind tokens and next-themes`  [INFERRED] [semantically similar]
  design-preview/overview.html → docs/tech-decisions.md
- `Geist Mono OFL license` --references--> `Font choices (Huninn, Geist Mono, Vazirmatn)`  [INFERRED]
  apps/web/src/shared/assets/fonts/geist-mono/OFL.txt → docs/decisions.md
- `Huninn OFL license` --references--> `Font choices (Huninn, Geist Mono, Vazirmatn)`  [INFERRED]
  apps/web/src/shared/assets/fonts/huninn/OFL.txt → docs/decisions.md
- `Vazirmatn OFL license` --references--> `Font choices (Huninn, Geist Mono, Vazirmatn)`  [INFERRED]
  apps/web/src/shared/assets/fonts/vazirmatn/OFL.txt → docs/decisions.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Self-hosted fonts and their OFL licenses** — docs_decisions_font_choices, apps_web_src_shared_assets_fonts_huninn_ofl, apps_web_src_shared_assets_fonts_geist_mono_ofl, apps_web_src_shared_assets_fonts_vazirmatn_ofl [EXTRACTED 0.95]
- **One workflow engine drives designer, API, case page and My work** — docs_handover_workflow_engine, docs_tech_decisions_workflow_designer_tech, docs_brief_my_work_inbox, docs_brief_workflow_model_b [EXTRACTED 0.95]
- **Project documentation set read in order** — docs_handover_handover_notes, docs_brief_aml_brief, docs_releases_release_plan, docs_decisions_design_decisions, docs_tech_decisions_technical_decisions [EXTRACTED 0.95]

## Communities (98 total, 5 thin omitted)

### Community 0 - "Web route pages"
Cohesion: 0.06
Nodes (65): Detail(), Page(), Page(), Profile(), Edit(), Page(), Detail(), Page() (+57 more)

### Community 1 - "API repositories and Prisma"
Cohesion: 0.07
Nodes (53): alertFilterWhere(), AlertsRepository, createAlertsRepository(), dbError(), sortable, AlertsService, createAlertsService(), OPEN (+45 more)

### Community 2 - "Docs, brand and design notes"
Cohesion: 0.05
Nodes (63): Next.js agent rules (breaking-change warning), Geist Mono OFL license, Huninn OFL license, Vazirmatn OFL license, Overview design preview (static HTML), Light and dark CSS theme tokens, Local Postgres 17 service (docker-compose), Layered access model (permission, region, clearance, membership) (+55 more)

### Community 3 - "Admin and case mutations"
Cohesion: 0.12
Nodes (52): useInvalidate(), useRenameClearance(), useSaveBranch(), useSaveRolePermissions(), useSaveUser(), Sel(), CaseFindings(), TransitionDialog() (+44 more)

### Community 4 - "Web entity: customer"
Cohesion: 0.06
Nodes (40): Page(), Wizard(), Page(), codeSchema, createCustomer(), customerKeys, customersQueryOptions(), getCustomer() (+32 more)

### Community 5 - "Criteria to SQL where"
Cohesion: 0.07
Nodes (35): conditionToWhere(), criteriaToWhere(), num(), pair(), Where, valueText(), transactionKeys, transactionsQueryOptions() (+27 more)

### Community 6 - "Locale layout and proxy"
Cohesion: 0.07
Nodes (25): instant, LocaleLayout(), metadata, config, pickLocale(), proxy(), makeQueryClient(), Providers() (+17 more)

### Community 7 - "Web entity: case"
Cohesion: 0.12
Nodes (26): Detail(), Page(), Page(), RiskBadge(), useCaseBoard(), CaseStatusBadge(), DueLabel(), OPEN_STATES (+18 more)

### Community 8 - "Web feature: customer"
Cohesion: 0.11
Nodes (29): checkEmail(), checkIban(), BasicsStep(), F, PartiesStep(), PartyAccounts(), ScopeStep(), STEP_UI (+21 more)

### Community 9 - "API app and auth handlers"
Cohesion: 0.11
Nodes (24): createApp(), appWith(), AuthHandlers, meta(), SESSION_COOKIE, AuthService, createHealthHandlers(), HealthHandlers (+16 more)

### Community 10 - "Web feature: import"
Cohesion: 0.09
Nodes (28): Page(), commitImport(), discardImport(), getImports(), importKeys, useCommitImport(), useDiscardImport(), useImports() (+20 more)

### Community 11 - "API module wiring"
Cohesion: 0.14
Nodes (30): createAlertsHandlers(), createAlertsModule(), createAuthHandlers(), requirePermission(), createCasesModule(), createCustomersModule(), createDraftsModule(), createNetworkModule() (+22 more)

### Community 12 - "Web dependencies"
Cohesion: 0.05
Nodes (40): dependencies, @aml/shared, class-variance-authority, clsx, cmdk, cn, cron-parser, @dagrejs/dagre (+32 more)

### Community 13 - "Web shared: ui"
Cohesion: 0.13
Nodes (25): Page(), DecideAlertForm(), AdminPage(), Tab, TABS, BranchesSection(), ClearanceRow(), ClearanceSection() (+17 more)

### Community 14 - "Shared: domain"
Cohesion: 0.07
Nodes (28): alertKeys, alertsQueryOptions(), useAlert(), useAlerts(), useDecideAlert(), decideAlert(), getAlert(), queryAlerts() (+20 more)

### Community 15 - "Scheduled job runners"
Cohesion: 0.08
Nodes (25): createJobRunner(), Ctx, JobKey, JobRunner, nextCodes(), OPEN, RISK_SCORE, runKycExpiry() (+17 more)

### Community 16 - "Web entity: notification"
Cohesion: 0.12
Nodes (22): Page(), Page(), Filter, getNotifications(), markNotificationsRead(), notificationKeys, qs(), useLatestNotifications() (+14 more)

### Community 17 - "API module: auth"
Cohesion: 0.09
Nodes (23): createRequireAuth(), AuthRepository, createAuthRepository(), dbError(), userInclude, UserRecord, createAuthRouter(), createAuthService() (+15 more)

### Community 18 - "Web page: overview"
Cohesion: 0.15
Nodes (24): Page(), useNews(), AlertHeatmap(), AlertTrend(), ReviewFunnel(), RiskByBranch(), RulesBreakdown(), Kpi (+16 more)

### Community 19 - "Project: ref"
Cohesion: 0.07
Nodes (29): eslintConfig, @aml/shared, cron-parser, @types/node, typescript, zod, name, private (+21 more)

### Community 20 - "Web feature: news"
Cohesion: 0.12
Nodes (15): useSaveRule(), recommendations, NewsEditor(), toIso(), toLocalInput(), Upload, RuleForm(), toValues() (+7 more)

### Community 21 - "Web shared: ui (2)"
Cohesion: 0.14
Nodes (20): useLogout(), useMe(), useMySettings(), LanguageSwitch(), localeNames, useChangeLocale(), initials(), UserMenu() (+12 more)

### Community 22 - "API module: notifications"
Cohesion: 0.10
Nodes (20): createDb(), Db, caseScope(), dbError(), kindSchema, saveSchema, createNotifications(), Data (+12 more)

### Community 23 - "Web feature: case"
Cohesion: 0.13
Nodes (16): useAddComment(), useUploadDocument(), documentUrl(), uploadCaseDocument(), Body(), Composer(), escape(), mentionsIn() (+8 more)

### Community 24 - "Web shared: ui (3)"
Cohesion: 0.11
Nodes (17): Page(), AlertsPage(), fromParams(), toParams(), DataColumn, DataColumnMeta, DataTable(), empty (+9 more)

### Community 25 - "Web widget: network"
Cohesion: 0.13
Nodes (23): Cluster, detectClusters(), edgeSize(), mergeGraphs(), nodeLabel(), nodeRisk(), nodeSize(), seeded() (+15 more)

### Community 26 - "Release 4 shared contracts"
Cohesion: 0.07
Nodes (27): adminReferenceSchema, AdminUser, adminUserSchema, auditPageSchema, auditRowSchema, BranchInput, branchInputSchema, ImportBatch (+19 more)

### Community 27 - "API config and main"
Cohesion: 0.08
Nodes (22): Env, envSchema, loadEnv(), app, auth, cases, db, deps (+14 more)

### Community 28 - "Web entity: case (2)"
Cohesion: 0.12
Nodes (26): caseKeys, casesQueryOptions(), useAddCaseMember(), useCase(), useCaseMutation(), useCases(), useComments(), useCreateCase() (+18 more)

### Community 29 - "Shared: forms"
Cohesion: 0.08
Nodes (26): caseBasicsSchema, caseCreateSchema, casePartiesSchema, casePartySchema, caseSteps, caseTransitionSchema, caseUpdateSchema, commentInputSchema (+18 more)

### Community 30 - "API module: cases"
Cohesion: 0.12
Nodes (19): runSlaCheck(), CasesRepository, caseFacts(), CasesService, CommentSource, createCasesService(), notFound(), RowSource (+11 more)

### Community 31 - "API module: news"
Cohesion: 0.12
Nodes (15): lookup, audienceWhere(), createNewsModule(), dbError(), excerptOf(), postInclude, sanitizeNews(), stateOf() (+7 more)

### Community 32 - "Web entity: settings"
Cohesion: 0.12
Nodes (19): FALLBACK, changePassword(), deleteAvatar(), getSystemSettings(), MySettings, mySettingsSchema, saveSystemSettings(), updateProfile() (+11 more)

### Community 33 - "Web feature: case (2)"
Cohesion: 0.10
Nodes (8): useEligibleMembers(), CaseMembers(), initials(), Action, CaseTransitionActions(), statusClass, CaseDetail, lucide-react

### Community 34 - "Shared: workflow"
Cohesion: 0.10
Nodes (16): analyst, compliance, facts, supervisor, Actor, CaseFacts, baseSteps(), baseTransitions() (+8 more)

### Community 35 - "Command palette and help"
Cohesion: 0.14
Nodes (16): Page(), PaletteState, usePaletteStore, allPages, CommandPalette(), Entry, Group(), PaletteTrigger() (+8 more)

### Community 36 - "Web entity: workflow"
Cohesion: 0.14
Nodes (18): useCreateWorkflowDraft(), useDiscardWorkflowDraft(), useInvalidate(), usePublishWorkflow(), useSaveWorkflowDraft(), useWorkflow(), useWorkflowVersion(), workflowKeys (+10 more)

### Community 37 - "Web entity: workflow (2)"
Cohesion: 0.17
Nodes (17): useConditionText(), categoryStrip, StepNode, StepNodeData, StepNodeType, TransitionEdge, TransitionEdgeData, TransitionEdgeType (+9 more)

### Community 38 - "Project: ref (2)"
Cohesion: 0.09
Nodes (22): @aml/shared, cron-parser, @types/node, typescript, zod, name, private, type (+14 more)

### Community 39 - "API Prisma: seed"
Cohesion: 0.10
Nodes (18): BRANCHES, companyName(), db, formatters, FX, GULF_FIRST, GULF_LAST, HIGH_RISK (+10 more)

### Community 40 - "Web entity: my"
Cohesion: 0.16
Nodes (12): Page(), useCaseLive(), getMyWork(), myWorkKeys, useMyWork(), useMyWorkLive(), countOverdue(), MyWorkPage() (+4 more)

### Community 41 - "Web entity: news"
Cohesion: 0.13
Nodes (17): createNews(), deleteNews(), getNews(), getNewsPost(), markNewsRead(), newsKeys, updateNews(), uploaded (+9 more)

### Community 42 - "Web shared: ui (4)"
Cohesion: 0.17
Nodes (15): getOverview(), overviewKeys, useOverview(), usePreferences(), LogoMark(), Tooltip(), TooltipContent(), TooltipProvider() (+7 more)

### Community 43 - "Shared: views"
Cohesion: 0.11
Nodes (19): alertRowSchema, alertSlaHours, MyWork, CaseBoard, caseBoardSchema, caseDetailSchema, casePageSchema, casePriorities (+11 more)

### Community 44 - "API module: network"
Cohesion: 0.15
Nodes (14): createNetworkRepository(), dbError(), ExternalRow, NetworkRepository, NODE_LIMIT, Range, TransferRow, AccountSource (+6 more)

### Community 45 - "Web feature: workflow"
Cohesion: 0.23
Nodes (15): addStep(), addTransition(), autoLayout(), moveStep(), removeStep(), removeTransition(), uniqueId(), updateStep() (+7 more)

### Community 46 - "Project: package"
Cohesion: 0.10
Nodes (19): devDependencies, prettier, turbo, typescript, typescript, name, packageManager, private (+11 more)

### Community 47 - "Web entity: admin"
Cohesion: 0.16
Nodes (13): adminKeys, auditQueryOptions(), getAdminReference(), getAdminUsers(), put(), queryAudit(), renameClearance(), saveBranch() (+5 more)

### Community 48 - "Web entity: session"
Cohesion: 0.16
Nodes (14): sessionKeys, useLogin(), useRevokeOtherSessions(), useRevokeSession(), getMe(), getSessions(), login(), logout() (+6 more)

### Community 49 - "Web config: tsconfig"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 50 - "API config: package"
Cohesion: 0.11
Nodes (18): dependencies, @aml/shared, argon2, cookie, cookie-parser, cors, cron-parser, exceljs (+10 more)

### Community 51 - "Web page: network"
Cohesion: 0.17
Nodes (11): Page(), CustomerSearch(), day(), expandCenter(), Legend(), MIN_AMOUNTS, NetworkCanvas, NetworkPage() (+3 more)

### Community 52 - "Web config: components"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+9 more)

### Community 53 - "Web entity: network"
Cohesion: 0.18
Nodes (12): networkKeys, networkQueryOptions(), useFeaturedCustomer(), useNetwork(), useNetworkPath(), getFeaturedCustomer(), getNetwork(), getNetworkPath() (+4 more)

### Community 54 - "Web shared: api"
Cohesion: 0.20
Nodes (12): getReference(), referenceKeys, search(), searchKeys, useSearch(), del(), download(), HttpError (+4 more)

### Community 55 - "Web feature: workflow (2)"
Cohesion: 0.16
Nodes (11): SYMBOL, VALUE_NAMESPACE, IdInput(), Roles(), Row(), StepInspector(), TransitionInspector(), VALUE_NAMESPACE (+3 more)

### Community 56 - "Web entity: job"
Cohesion: 0.16
Nodes (13): getJobRuns(), getJobs(), jobKeys, runJob(), updateJob(), useInvalidate(), useJobRuns(), useJobs() (+5 more)

### Community 57 - "Shared workflow engine"
Cohesion: 0.13
Nodes (16): AvailableTransition, BlockReason, compare(), conditionMatches(), LocalizedText, reach(), validateWorkflow(), workflowConditionSchema (+8 more)

### Community 58 - "Web page: jobs"
Cohesion: 0.23
Nodes (11): Page(), JobCard(), JobsPage(), RunHistory(), RunStatus(), seconds(), statusClass, useScheduleText() (+3 more)

### Community 59 - "Web shared: ui (5)"
Cohesion: 0.20
Nodes (13): Item(), Props, RichText(), Tool(), Popover(), PopoverContent(), PopoverDescription(), PopoverHeader() (+5 more)

### Community 60 - "API config: package (2)"
Cohesion: 0.13
Nodes (15): devDependencies, @faker-js/faker, prisma, supertest, tsup, tsx, @types/cookie-parser, @types/cors (+7 more)

### Community 61 - "Web page: customers"
Cohesion: 0.22
Nodes (8): Page(), nextConfig, CustomersPage(), quick, CustomersGrid(), RiskCell(), next, react-i18next

### Community 62 - "Shared: index"
Cohesion: 0.14
Nodes (6): codeSchema, noteSchema, okSchema, API_URL, CaseUpdate, CommentInput

### Community 63 - "Project: turbo"
Cohesion: 0.13
Nodes (14): dependsOn, outputs, cache, persistent, dependsOn, $schema, tasks, build (+6 more)

### Community 64 - "Web entity: news (2)"
Cohesion: 0.25
Nodes (9): NewsStateBadge(), PinnedBadge(), ReadMeter(), stateClass, NewsCard(), intlLocale, setDigitPreference(), unitHour (+1 more)

### Community 65 - "Web entity: rule"
Cohesion: 0.15
Nodes (10): codeSchema, createRule(), getRule(), getRules(), ruleKeys, updateRule(), useRules(), RuleForm (+2 more)

### Community 66 - "Web page: settings"
Cohesion: 0.19
Nodes (10): savePreferences(), useSavePreferences(), allPages, AppearanceSection(), Row(), SaveState(), usePreference(), notificationTypes (+2 more)

### Community 67 - "Project: packages"
Cohesion: 0.14
Nodes (13): dependencies, zod, devDependencies, typescript, exports, typescript, zod, name (+5 more)

### Community 68 - "Project: tsconfig"
Cohesion: 0.14
Nodes (13): compilerOptions, esModuleInterop, exactOptionalPropertyTypes, forceConsistentCasingInFileNames, isolatedModules, lib, module, moduleResolution (+5 more)

### Community 69 - "API module: workflows"
Cohesion: 0.18
Nodes (8): createWorkflowsRepository(), createWorkflowsService(), dbError(), OPEN, Repo, toRow(), versionSelect, VersionSource

### Community 70 - "API module: admin"
Cohesion: 0.25
Nodes (6): audit(), createAdminModule(), dbError(), guardRolePermissions(), toUser(), userSelect

### Community 71 - "API module: imports"
Cohesion: 0.24
Nodes (7): applyMapping(), createImportsModule(), dbError(), FX_TO_EUR, Issue, Lookup, validateRows()

### Community 72 - "Web page: login"
Cohesion: 0.25
Nodes (6): Page(), getMySettings(), settingsKeys, demoAccounts, LoginPage(), loginSchema

### Community 73 - "Web config: package"
Cohesion: 0.18
Nodes (11): devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/turbopack, @tanstack/react-query-devtools, @types/node, @types/papaparse (+3 more)

### Community 74 - "Web entity: report"
Cohesion: 0.25
Nodes (8): exportReports(), getReports(), qs(), reportKeys, useExportReports(), useReports(), ReportRange, reportsSchema

### Community 75 - "Web shared: ui (6)"
Cohesion: 0.22
Nodes (7): SheetContent(), SheetDescription(), SheetFooter(), SheetHeader(), SheetOverlay(), SheetPortal(), SheetTitle()

### Community 76 - "API config: package (3)"
Cohesion: 0.20
Nodes (10): scripts, build, db:generate, db:migrate, db:reset, db:seed, dev, start (+2 more)

### Community 77 - "API Prisma: seed (2)"
Cohesion: 0.47
Nodes (10): between(), chance(), clampNow(), lognormal(), main(), partsIn(), randomTime(), sameDay() (+2 more)

### Community 79 - "Web page: settings (2)"
Cohesion: 0.27
Nodes (6): useSessions(), deviceOf(), PasswordForm, SecuritySection(), SessionsPanel(), @hookform/resolvers

### Community 80 - "Web feature: theme"
Cohesion: 0.33
Nodes (6): options, ThemeToggle(), noopSubscribe(), useMounted(), AppBar(), next-themes

### Community 81 - "Shared: geo"
Cohesion: 0.28
Nodes (8): iban(), CountryCode, countryCodes, highRiskCountries, ibanFrom(), isValidIban(), lettersToDigits(), mod97()

### Community 82 - "Web page: transactions"
Cohesion: 0.36
Nodes (4): Page(), presets, TransactionsPage(), TransactionsGrid()

### Community 83 - "Web entity: case (3)"
Cohesion: 0.31
Nodes (5): useNote(), useSaveNote(), getNote(), saveNote(), CaseNote()

### Community 84 - "Web feature: alert"
Cohesion: 0.36
Nodes (6): useReference(), AlertFilters(), AlertFilterValues, Chip(), toggle(), riskLevels

### Community 85 - "Web shared: ui (7)"
Cohesion: 0.25
Nodes (8): baseOptions(), ChartColors, ChartProps, readColors(), TOKENS, useChartColors(), highcharts, highcharts-react-official

### Community 86 - "Shared: network"
Cohesion: 0.22
Nodes (8): NetworkEdge, networkEdgeSchema, NetworkGraph, NetworkNode, networkNodeSchema, NetworkPath, NetworkQuery, networkQuerySchema

### Community 87 - "API config: tsconfig"
Cohesion: 0.29
Nodes (6): compilerOptions, noEmit, types, extends, include, ../../tsconfig.base.json

### Community 88 - "Project: docs"
Cohesion: 0.43
Nodes (7): AML logo mark (36x36 SVG app icon), Anti-money-laundering transaction monitoring, Blue and white color palette, Three graduated blue nodes on the path (#8DB8EC, #A9C9F0, #C6DCF5), Zigzag signal path polyline (light blue to white gradient, round caps), Target ring with white center dot at upper right (r6 ring #5B9BE0, r3 white dot), Rounded tile background (navy gradient #003F88 to #00296B, rx 10, faint white border)

### Community 90 - "Web config: package (2)"
Cohesion: 0.33
Nodes (6): scripts, build, dev, lint, start, typecheck

### Community 91 - "Project: docs (2)"
Cohesion: 0.40
Nodes (6): AML logo mark (dark variant), Navy and light-blue palette, Path node dots, Zigzag transaction path, Target ring with white core, Rounded navy gradient tile

### Community 92 - "Project: packages (2)"
Cohesion: 0.33
Nodes (5): compilerOptions, noEmit, extends, include, ../../tsconfig.base.json

### Community 93 - "Project: ref (3)"
Cohesion: 0.40
Nodes (4): AppDeps, cookie-parser, cors, helmet

### Community 94 - "Project: prettierrc"
Cohesion: 0.40
Nodes (4): printWidth, semi, singleQuote, trailingComma

## Knowledge Gaps
- **494 isolated node(s):** `semi`, `singleQuote`, `trailingComma`, `printWidth`, `name` (+489 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 650 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Web entity: notification` to `Web route pages`, `Admin and case mutations`, `Web entity: customer`, `Locale layout and proxy`, `Web entity: case`, `Web feature: customer`, `Web feature: import`, `Web shared: ui`, `Project: ref`, `Web feature: news`, `Web shared: ui (2)`, `Web feature: case`, `Web shared: ui (3)`, `Web widget: network`, `Web feature: case (2)`, `Command palette and help`, `Web entity: workflow (2)`, `Web entity: my`, `Web shared: ui (4)`, `Web feature: workflow`, `Web page: network`, `Web feature: workflow (2)`, `Web page: jobs`, `Web shared: ui (5)`, `Web page: customers`, `Web entity: news (2)`, `Web page: settings`, `Web page: login`, `Web shared: ui (6)`, `Web page: settings (2)`, `Web feature: theme`, `Web page: transactions`, `Web entity: case (3)`, `Web feature: alert`, `Web shared: ui (7)`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **What connects `semi`, `singleQuote`, `trailingComma` to the rest of the system?**
  _494 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Web route pages` be split into smaller, more focused modules?**
  _Cohesion score 0.061814914645103324 - nodes in this community are weakly interconnected._
- **Why does `cn()` connect `Web shared: ui` to `Web route pages`, `Admin and case mutations`, `Criteria to SQL where`, `Web entity: case`, `Web feature: customer`, `Web feature: import`, `Shared: domain`, `Web entity: notification`, `Web page: overview`, `Web feature: news`, `Web shared: ui (2)`, `Web feature: case`, `Web shared: ui (3)`, `Web feature: case (2)`, `Command palette and help`, `Web entity: workflow (2)`, `Web entity: my`, `Web shared: ui (4)`, `Web feature: workflow`, `Web page: network`, `Web page: jobs`, `Web shared: ui (5)`, `Web page: customers`, `Web entity: news (2)`, `Web page: settings`, `Web shared: ui (6)`, `Web page: transactions`, `Web feature: alert`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Should `API repositories and Prisma` be split into smaller, more focused modules?**
  _Cohesion score 0.06768388106416276 - nodes in this community are weakly interconnected._
- **Why does `dependencies` connect `Web dependencies` to `Project: ref`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Should `Docs, brand and design notes` be split into smaller, more focused modules?**
  _Cohesion score 0.05223880597014925 - nodes in this community are weakly interconnected._