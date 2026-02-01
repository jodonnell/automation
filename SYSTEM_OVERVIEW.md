# System Overview (Agent-Focused)

This repo is a Vite + TypeScript Pixi.js app that renders a nested “node graph” UI.
Users connect labeled boxes with drawn paths, zoom into child nodes, and place small
utility nodes (converter/combiner). This file explains the concepts and architecture
so you can reason about behavior quickly.

## Core Concepts

- **NodeSpec (spec tree):** A static tree of nodes defined in `src/nodeSpec.ts`.
  Each spec has an `id`, `label`, and optional `children`. The root is a top-level
  “board” that can be zoomed into by double‑clicking a box with children.
- **NodeContainer:** A runtime Pixi `Container` that renders one NodeSpec level.
  It contains boxes (child specs), connection lines, flow labels, and incoming stubs.
- **Boxes:** Square, labeled containers rendered by `src/renderer/nodeRenderer.ts`.
  Each box corresponds to a child NodeSpec or a dynamically placed node.
- **Connections (edges):** Paths drawn between boxes. Each connection stores
  `fromId`, `toId`, and an array of points in `src/core/types.ts`.
- **Incoming stubs:** Short line segments that represent “incoming” sources from
  parent levels. These allow you to connect from a parent node into a child scene.
- **Flow labels:** Text rendered along paths to show the propagated label computed
  by `src/core/flowLabel.ts` (with combiner/converter rules).
- **Placeables:** Small nodes (converter/combiner) you can spawn via keyboard
  (`1` or `2`) at the pointer, defined in `src/features/placeables/definitions.ts`.

## Architecture (High Level)

1) **App bootstrapping**
   - `src/scene.ts` creates the Pixi `Application`, injects the canvas, and starts
     the SceneController.

2) **Scene orchestration**
   - `src/app/sceneController.ts` is the coordinator. It wires together:
     - `GameModel` (graph + layout state)
     - `NodeManager` (creates/caches NodeContainers)
     - Renderers (connections, incoming labels)
     - Interactions (drag + zoom)
     - Placeables (spawn/delete custom nodes)
     - Camera controller + tick loop

3) **Model layer (graph + layout)**
   - `src/core/model.ts` stores per-spec connections and incoming stubs and
     notifies listeners on graph changes.
   - `src/core/layout.ts` computes a deterministic layout for boxes based on
     `spec.id` and viewport size.

4) **Rendering layer**
   - `src/renderer/nodeRenderer.ts` builds the node container and its boxes.
   - `src/renderer/connectionRenderer.ts` draws smoothed paths, incoming stubs,
     and animates flow labels along those paths.
   - `src/renderer/path.ts` (not detailed here) shapes curves for connections.

5) **Interaction layer**
   - `src/renderer/interactions/drag.ts` tracks pointer drags and produces actions
     via a state machine in `src/core/interactionState.ts`.
   - `src/renderer/interactions/zoom.ts` handles double‑click zoom in and right‑click
     double‑tap zoom out using camera tweens.

6) **Placeables**
   - `src/features/placeables/manager.ts` spawns/removes converter/combiner nodes,
     checks collision (`src/features/placeables/collision.ts`), and rebinding events.

## Data Flow (Behavioral)

- **Graph updates:**
  - Interactions create/modify connections in `GameModel`.
  - `GameModel` emits graph changes → SceneController re-renders connections and
    syncs incoming stub labels for the current node.

- **Label resolution:**
  - `resolveFlowLabel` in `src/core/flowLabel.ts` propagates labels through the
    graph and applies placeable behaviors (converter/combiner constraints).

- **Zooming:**
  - Double‑click a box with children to zoom into its NodeSpec.
  - The camera tween animates from the box bounds into the next NodeContainer.
  - Right‑click twice quickly to zoom out to the previous node.

- **Incoming stubs:**
  - When connecting from a box into a child node, the child scene receives an
    “incoming stub” that can be dragged to connect to boxes inside that child.

## Rendering Layers (per NodeContainer)

- **connectionLayer:** drawn paths for edges.
- **flowLayer:** animated text (labels) along edges.
- **incomingLayer:** drawn incoming stubs (short segments).
- **box children:** square boxes for node items or placeables.

## Key Files by Responsibility

- Boot: `src/scene.ts`, `main.ts`
- Orchestration: `src/app/sceneController.ts`
- Model/Layout: `src/core/model.ts`, `src/core/layout.ts`, `src/core/types.ts`
- Rendering: `src/renderer/nodeRenderer.ts`, `src/renderer/connectionRenderer.ts`
- Interactions: `src/renderer/interactions/drag.ts`, `src/renderer/interactions/zoom.ts`
- Placeables: `src/features/placeables/manager.ts`, `src/features/placeables/definitions.ts`

## Useful Mental Model

Think of the app as a **stack of NodeContainers** (one per zoom level), each
showing a local graph. The **GameModel** stores per-spec connections and stubs.
Interactions write to the model; renderers read from it and redraw the view.

## Required Post-Change Commands (per AGENTS.md)
```
npm run prettier
npm run lint
npm test
```
