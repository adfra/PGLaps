# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PGLaps is a toolsuite for paragliding competition task management, supporting Short Circuit Lap Racing (SCLR) task setup, waypoint generation, and airspace management. It produces files compatible with XCTrack (.xctsk) and FS competition software (.cup).

## Build & Run Commands

### OnlineTransposer (Web App)
```bash
cd OnlineTransposer
npm install
npm start              # Dev server at http://localhost:9000
npm run build          # Production bundle to dist/
npm run build:dev      # Dev bundle with source maps
npm run type-check     # TypeScript type checking only
```

### C# CLI Tools
```bash
dotnet build PGLaps.sln          # Build all projects
dotnet run --project TaskCreator
dotnet run --project TaskTransposer
```

## Architecture

The repo has four components:

### PGLapsCommon (C# shared library)
Core data models used by both CLI tools: `PGTask`, `Turnpoint`, `Waypoint`, `Airspace`, `Leg`. Uses **CoordinateSharp** for geodetic math. Lives in `PGLapsCommon/XCTrackClasses.cs`.

### TaskCreator (C# CLI)
Generates XCTrack task definitions from scratch. Takes a starting coordinate plus pipe-separated leg specs (distance, direction change, waypoint radius). Outputs the turnpoints component for `.xctsk` files.

Key files: `Program.cs` (interactive CLI), `TaskBuilder.cs` (leg geometry), `DistanceBearingParser.cs`, `ElevationService.cs`.

### TaskTransposer (C# CLI)
Relocates and rotates existing tasks to new locations. Takes an `.xctsk` file + `.txt` OpenAir airspace file + new coordinates + bearing. Outputs transformed `.xctsk` and `.cup` files.

### OnlineTransposer (TypeScript web app, Webpack 5 + Leaflet)
Browser-based task transposition with an interactive map. Vanilla TypeScript, no UI framework.

```
src/
├── app.ts                  # Main orchestrator
├── components/
│   ├── fileUpload/         # File upload + drag-drop UI
│   └── map/                # Leaflet map visualization
├── services/
│   ├── taskService.ts      # Task transformation logic
│   ├── airspaceService.ts  # Airspace rotation/translation
│   └── fileService.ts      # File I/O (parse & export)
├── types/
│   ├── taskTypes.ts        # XCTask, Turnpoint, Waypoint
│   ├── airspaceTypes.ts    # Airspace, Coordinate
│   └── geometryTypes.ts    # Distance, Angle
└── utils/
    ├── coordinateUtils.ts  # Haversine, bearing, destination calcs
    ├── fileUtils.ts        # JSON/OpenAir parsing & generation
    └── validators.ts       # Validation helpers
```

## Key Domain Concepts

- **Task transposition**: Moving a task's geometry to a new origin while preserving relative distances and bearings between waypoints.
- **Airspace rotation**: Rotating OpenAir airspace polygons around a new center point to match a transposed task bearing.
- **XCTrack format**: JSON inside `.xctsk` files; the `turnpoints` array contains `waypoint` objects with lat/lon/altitude and a `radius`.
- **OpenAir format**: Plain-text airspace definitions (`.txt`) with `AC`, `AN`, `AL`, `AH`, `DP` records.
- **Leg spec format** (TaskCreator): `distance_km,bearing_change_deg,radius_m` repeated per leg.
