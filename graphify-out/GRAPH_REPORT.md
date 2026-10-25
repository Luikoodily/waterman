# Graph Report - waterstock  (2026-10-25)

## Corpus Check
- 21 files · ~7,291 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 176 nodes · 376 edges · 9 communities (7 shown, 2 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.57)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- ProductsScreen.tsx
- ledger.ts
- compilerOptions
- devDependencies
- storage.ts
- DashboardScreen.tsx
- persist.ts
- next.config.ts
- next-env.d.ts

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 16 edges
2. `roundMoney()` - 15 edges
3. `useShop()` - 13 edges
4. `inr()` - 13 edges
5. `sell()` - 11 edges
6. `summarize()` - 11 edges
7. `DashboardScreen()` - 10 edges
8. `restock()` - 10 edges
9. `parsePersisted()` - 10 edges
10. `dayKey()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `importBackup()` --calls--> `parsePersisted()`  [EXTRACTED]
  src/components/ProductsScreen.tsx → src/lib/persist.ts
- `resetShop()` --calls--> `initialState()`  [EXTRACTED]
  src/components/ProductsScreen.tsx → src/lib/ledger.ts
- `DashboardScreen()` --calls--> `useShop()`  [EXTRACTED]
  src/components/DashboardScreen.tsx → src/components/shop-context.tsx
- `DashboardScreen()` --calls--> `roundMoney()`  [EXTRACTED]
  src/components/DashboardScreen.tsx → src/lib/format.ts
- `DashboardScreen()` --calls--> `summarize()`  [EXTRACTED]
  src/components/DashboardScreen.tsx → src/lib/ledger.ts

## Import Cycles
- None detected.

## Communities (9 total, 2 thin omitted)

### Community 0 - "ProductsScreen.tsx"
Cohesion: 0.09
Nodes (24): metadata, metadata, ProductEditor(), save(), ProductsScreen(), add(), exportBackup(), importBackup() (+16 more)

### Community 1 - "ledger.ts"
Cohesion: 0.19
Nodes (27): addProduct(), cashOnDay(), Clock, collect(), countStock(), DaySummary, entryFor(), err() (+19 more)

### Community 2 - "compilerOptions"
Cohesion: 0.07
Nodes (27): dom, dom.iterable, esnext, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.test.ts, **/*.ts (+19 more)

### Community 3 - "devDependencies"
Cohesion: 0.08
Nodes (24): next, dependencies, next, react, react-dom, devDependencies, @types/bun, @types/node (+16 more)

### Community 4 - "storage.ts"
Cohesion: 0.16
Nodes (17): metadata, viewport, Providers(), initialState(), Persisted, serialize(), accept(), idbGet() (+9 more)

### Community 5 - "DashboardScreen.tsx"
Cohesion: 0.18
Nodes (11): metadata, metadata, Activity(), DashboardScreen(), SellScreen(), clockTime(), inr(), longDay() (+3 more)

### Community 6 - "persist.ts"
Cohesion: 0.33
Nodes (9): roundMoney(), EntryType, LastAction, isDay(), parseEntry(), parseLast(), parsePersisted(), parseProduct() (+1 more)

## Knowledge Gaps
- **49 isolated node(s):** `nextConfig`, `name`, `private`, `dev`, `build` (+44 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useShop()` connect `ProductsScreen.tsx` to `DashboardScreen.tsx`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Why does `roundMoney()` connect `persist.ts` to `ProductsScreen.tsx`, `ledger.ts`, `DashboardScreen.tsx`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **What connects `nextConfig`, `name`, `private` to the rest of the system?**
  _49 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `ProductsScreen.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08888888888888889 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.07142857142857142 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._