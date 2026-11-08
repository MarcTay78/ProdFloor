# Dining Chair Factory Layout Planner — Phase 3b Design

Date: 2026-11-08
Status: Defaults chosen by Claude at the user's request ("complete all, I test at one go"); review during testing.
Builds on: `2026-11-08-factory-layout-planner-phase3a-design.md`

## 1. Goal

Automated arrangement suggestion: one click produces a new layout with machines rearranged to cut material movement. The original layout is never changed; the user judges the result with Compare (Phase 3a).

## 2. Decisions

| Topic | Decision |
|---|---|
| Method | Hill-climbing on pairwise position swaps: repeatedly apply the best valid swap (the `SWAP_SAVES` rule from 3a: saves ≥ 1 m, no new error) until none is left, at most 100 swaps. |
| Moves | Swap `x`/`y` of two workflow machines only; rotations, sizes and the factory are unchanged. No free-space relocation. |
| Output | New layout `<name> (auto-arranged)`, made active, same machine ids so the workflow and flows stay valid. One undo entry. |
| No improvement | No layout is created; toast says so. |
| Persistence | Nothing new in the file format. |

`ponytail:` local search can stop in a local optimum and never moves machines into empty floor. Add relocation moves or random restarts only if results disappoint in testing.

## 3. Domain (`src/domain/recommend.ts`)

- `validSwaps(layout, limit): Swap[]` — extracted from the 3a swap rule; `Swap = { a: Machine; b: Machine; saving: number; swapped: Layout }`, best first. `recommend` uses it for `SWAP_SAVES`.
- `autoArrange(layout, maxSwaps = 100): { layout: Layout; swaps: number; saved: number }` — loop `validSwaps(current, 1)`; `saved` = Manhattan total before − after. Returns the input unchanged with `swaps: 0` when the workflow has fewer than two non-empty steps or no swap helps.

## 4. Store and UI

- `projectStore.autoArrangeLayout(): { swaps: number; saved: number }` — runs `autoArrange` on the active layout; when `swaps > 0`, appends the result as a new layout (new id, name suffix) and makes it active.
- Suggestions tab header: button **Auto-arrange → new layout**, enabled when the list has a `SWAP_SAVES` suggestion. Click runs the action, clears selection, and shows a toast: "Auto-arranged: N swaps, saves X m. Original kept — use Compare." or "No better arrangement found."

## 5. Testing

- `recommend.test.ts`: `autoArrange` applies the best swap and stops (3-machine fixture: 1 swap, saves 14 m); result never worse and never adds an error; input layout object unchanged; `swaps: 0` without a workflow.
- `projectStore.test.ts`: action adds an active "(auto-arranged)" layout, keeps the original's positions, undo removes it; no layout added when nothing improves.
