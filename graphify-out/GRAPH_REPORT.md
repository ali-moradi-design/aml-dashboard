# Graph Report - aml-dashboard  (2026-10-17)

## Corpus Check
- Corpus is ~1,749 words - fits in a single context window. You may not need a graph.

## Summary
- 31 nodes · 45 edges · 5 communities
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.72)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Project Scope and Stack
- Cases and Workflow
- Access and Platform
- Data and Forms
- Alert Pipeline

## God Nodes (most connected - your core abstractions)
1. `AML Dashboard (demo 1)` - 12 edges
2. `Alerts` - 5 edges
3. `Cases` - 5 edges
4. `Transactions` - 5 edges
5. `Workflow model B (React Flow designer)` - 5 edges
6. `Account network graph (Sigma.js)` - 4 edges
7. `Access model (permission, region, clearance, membership)` - 4 edges
8. `Node.js service (cron and live updates)` - 4 edges
9. `AG Grid Enterprise (license note)` - 4 edges
10. `Scheduled jobs (cron)` - 3 edges

## Surprising Connections (you probably didn't know these)
- `Account network graph (Sigma.js)` --semantically_similar_to--> `Workflow model B (React Flow designer)`  [INFERRED] [semantically similar]
  docs/brief.md → docs/brief.md  _Bridges community 3 → community 1_
- `AML Dashboard (demo 1)` --references--> `Access model (permission, region, clearance, membership)`  [EXTRACTED]
  docs/brief.md → docs/brief.md  _Bridges community 0 → community 2_
- `AML Dashboard (demo 1)` --references--> `Release plan (open decision)`  [EXTRACTED]
  docs/brief.md → docs/brief.md  _Bridges community 0 → community 1_
- `AML Dashboard (demo 1)` --references--> `Node.js service (cron and live updates)`  [EXTRACTED]
  docs/brief.md → docs/brief.md  _Bridges community 0 → community 4_
- `Rules (AND/OR rule builder)` --references--> `Scheduled jobs (cron)`  [EXTRACTED]
  docs/brief.md → docs/brief.md  _Bridges community 3 → community 4_

## Hyperedges (group relationships)
- **Alert to SAR workflow** — docs_brief_rules, docs_brief_scheduled_jobs, docs_brief_alerts, docs_brief_cases, docs_brief_sar [EXTRACTED 1.00]
- **Chosen tech stack** — docs_brief_stack_nextjs, docs_brief_stack_node_service, docs_brief_stack_turborepo, docs_brief_stack_postgres [EXTRACTED 1.00]

## Communities (5 total, 0 thin omitted)

### Community 0 - "Project Scope and Stack"
Cohesion: 0.32
Nodes (6): AG Grid Enterprise (license note), AML Dashboard (demo 1), Five languages and RTL rules, Next.js web app, Turborepo monorepo, Transaction monitoring and AML for fictional bank

### Community 1 - "Cases and Workflow"
Cohesion: 0.33
Nodes (5): Case collaboration, Cases, My work inbox (SLA, four-eyes), Release plan (open decision), SAR report to regulator

### Community 2 - "Access and Platform"
Cohesion: 0.33
Nodes (4): Admin (users, roles, audit log), News, Notifications and live updates, Roles: analyst, supervisor, compliance manager, admin

### Community 3 - "Data and Forms"
Cohesion: 0.40
Nodes (6): Account network graph (Sigma.js), Customers and KYC, Data import, Forms (React Hook Form + Zod), Rules (AND/OR rule builder), Transactions

### Community 4 - "Alert Pipeline"
Cohesion: 0.50
Nodes (4): Alerts, Reports (Sankey, heatmap, export), Scheduled jobs (cron), Node.js service (cron and live updates)

## Knowledge Gaps
- **5 isolated node(s):** `Transaction monitoring and AML for fictional bank`, `SAR report to regulator`, `Reports (Sankey, heatmap, export)`, `Data import`, `Admin (users, roles, audit log)`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 8 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AML Dashboard (demo 1)` connect `Project Scope and Stack` to `Cases and Workflow`, `Access and Platform`, `Alert Pipeline`?**
  _High betweenness centrality (0.499) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `Workflow model B (React Flow designer)` (e.g. with `Account network graph (Sigma.js)` and `Release plan (open decision)`) actually correct?**
  _`Workflow model B (React Flow designer)` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Transaction monitoring and AML for fictional bank`, `SAR report to regulator`, `Reports (Sankey, heatmap, export)` to the rest of the system?**
  _5 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Why does `Workflow model B (React Flow designer)` connect `Cases and Workflow` to `Data and Forms`?**
  _High betweenness centrality (0.195) - this node is a cross-community bridge._
- **Why does `Alerts` connect `Alert Pipeline` to `Project Scope and Stack`, `Cases and Workflow`, `Data and Forms`?**
  _High betweenness centrality (0.183) - this node is a cross-community bridge._