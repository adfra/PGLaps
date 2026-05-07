# OnlineTransposer — Backlog

_Generated: 2026-05-06. Based on full codebase review._

---

## CRITICAL (Breaks Core Functionality)

| # | Item | File(s) | Issue |
|---|------|---------|-------|
| 1 | **Fix rotation state management** | `mapComponent.ts`, `app.ts` | Rotation values diverge between map and app components — dragging or rotating leaves `currentTask` stale, causing exports to produce wrong coordinates |
| 2 | **Fix `calculateRotationAngle()`** | `mapComponent.ts:304-318` | Uses `calculateDistance()` where it should use `calculateBearing()`, producing wrong rotation values |
| 3 | **Fix `isPointInAirspace()` axis orientation** | `validators.ts:174-182` | Lat/lon are swapped in ray-casting algorithm — x should be lon, y should be lat |
| 4 | **Fix `padNumber()` function** | `fileUtils.ts:172-175` | `Array.join('0')` produces wrong padding; DMS coordinate output will be malformed |
| 5 | **Fix airspace data loss on transformation** | `airspaceService.ts:66-70` | `description` and `alt` fields on every `AirspacePoint` are silently dropped during transformation |

---

## HIGH (Major Feature Gaps)

| # | Item | File(s) | Issue |
|---|------|---------|-------|
| 6 | **Complete turnpoint dragging** | `mapComponent.ts:122-144` | Only the start point is draggable — infrastructure exists for others but is unfinished |
| 7 | **Single source of truth for task state** | `app.ts`, `mapComponent.ts` | `app.currentTask` and `map.currentTask` diverge after drag operations; all transformations should go through one validated path |
| 8 | **Resolve validation vs type contradictions** | `validators.ts`, `taskTypes.ts` | `XCTask` type marks SSS/goal as optional but the validator hard-requires them — needs a clear decision and consistent enforcement |
| 9 | **Fix silent NaN in DMS coordinate parsing** | `fileUtils.ts:134-144` | Regex failure produces NaN lat/lon with no error thrown or shown |

---

## MEDIUM (Code Quality / UX)

| # | Item | File(s) | Issue |
|---|------|---------|-------|
| 10 | **Show errors to user, not just console** | `fileUploadComponent.ts:155` | Parse/load errors are `console.error()`'d but never surfaced in the UI |
| 11 | **Debounce rotation slider** | `app.ts:325-328` | Slider fires on every pixel of movement, triggering a full transformation each time |
| 12 | **Deduplicate `displayTaskPreview()`** | `mapComponent.ts:237-279` | Near-copy of `displayTask()` with only styling differences; parameterize instead |
| 13 | **Enable TypeScript strict mode** | `tsconfig.json` | All strict checks disabled — re-enabling would catch many of the above at compile time |
| 14 | **Validate turnpoint sequence** | `validators.ts` | No check that SSS appears before ESS, or that the sequence is logically valid |
| 15 | **Populate or remove `StartSettings`/`GoalSettings`** | `taskTypes.ts`, `fileUtils.ts` | Defined in types but never parsed from files or used anywhere |
| 16 | **Remove dead popup code** | `mapComponent.ts:350-374` | `createTurnpointPopup()` and `createAirspacePopup()` are defined but never bound to markers |
| 17 | **Clarify `FileService` export pattern** | `fileService.ts:184` | Default export is commented out with a note suggesting an unfinished refactor |

---

## LOW

| # | Item | File(s) | Issue |
|---|------|---------|-------|
| 18 | **Webpack production optimisation** | `webpack.config.js` | No minification, no code splitting, no CSS optimisation in production builds |
| 19 | **Mobile/accessibility basics** | `index.html` | No meta viewport tag, no ARIA labels, no favicon |
