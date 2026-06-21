# Tunnelshooter — Session History

This document tracks prompts, thinking effort, and outcomes across sessions.
Format: **Prompt** → thinking effort → result.

---

## Session 1 — 2026-06-20

| # | User prompt | My thinking | Result |
|---|-------------|-------------|--------|
| 1 | "Set up phaser, and a git repo with vite" | Minimal — straightforward scaffold | Vite vanilla + Phaser installed, git init + first commit done |
| 2 | "What are the 3D capabilities of Phaser?" | Low — factual recall | Summary: Phaser is 2D, Mesh object exists for basic 3D geometry but no lighting/shadows/scene graph |
| 3 | "don't make assumptions about what I want that isn't what I ask for, I know what I'm doing" | None — feedback | Noted. No follow-up questions asked. |
| 4 | "create a portrait mode game targeting mobile devices" | Low — config choices only | Phaser game config (390×844, FIT scaling, touch), cleaned up Vite boilerplate, created GameScene stub |
| 5 | Detailed cylinder + controls + player box prompt (interrupted, too long) | High — complex geometry reasoning, exceeded context | Interrupted before any code was written |
| 6 | "before writing any code, generate a step-by-step plan… create a backlog and save it" | Medium — geometry model, VP math, rendering pipeline design | BACKLOG.md created with 8 steps; rendering model documented |
| 7 | "It's possible that using Phaser's built-in 3D features can help" | Low — evaluating Mesh vs manual projection | Explained Mesh approach; noted it handles projection math so no need to rewrite it |
| 8 | "if the math is already done, you don't have to redo it" | Minimal — agreement, update backlog | BACKLOG.md Step 1 updated to use Phaser Mesh + Graphics wireframe approach |
| 9 | "Save what you need from this session to memory. Also in memory, I want a history…" | Low — organizing memory files | This file + project + feedback memories written; MEMORY.md index created |
| 10 | "where is history.md, I don't see it" | Minimal | Explained location; offered to move it |
| 11 | "put it into the project directory, put it and backlog into a root-level docs folder" | Minimal | Moved BACKLOG.md and history.md into docs/ |

**Session total:** User typed ~11 prompts. I had 1 high-effort think (the interrupted cylinder prompt), the rest were low-to-medium.

---
