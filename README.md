# Group Travel Planner

An iPhone-first group travel planning prototype for turning shared Instagram Reels into researched place ideas and an editable day-by-day plan.

This repository contains a three-person project scaffold and planning documents only. No application code or framework has been selected yet.

## Repository structure

```text
frontend/                  Person 1 only: mobile web UI and mock-data hooks
  src/components/          Cards, inputs, itinerary views
  src/hooks/               Frontend data access and temporary mock data
backend/                   Person 2 only: API, providers, and background work
  src/routes/glasser.js    Glasser/Instagram/Maps route placeholder
  src/services/llm.js      Prompt parsing service placeholder
shared/                    Person 3 only: contracts, database, and planning logic
  contracts/               Data shapes and API contracts
  database/schema.js       Database schema placeholder
  utils/itinerary.js       Day-grouping algorithm placeholder
docs/                      Person 3 only: project-wide planning notes
```

## File ownership

Each person creates and edits files only inside their assigned directory. Person 3 also owns project-wide files at the repository root, including this README, `.env.example`, and any future root configuration. This gives every tracked path one owner during parallel work.

Person 1 builds the UI against mock data in `frontend/src/hooks/`. Person 2 builds API routes and provider integration in `backend/`. Person 3 defines shared contracts and database structure in `shared/`, including the itinerary grouping algorithm. When a contract needs to change, coordinate the desired shape with Person 3; the other people then update their own directories. Keep package manifests and configuration local to each owned directory where possible.

The `.js` files in the tree are empty placeholders. They reserve ownership without choosing a framework or adding implementation.

## Prototype boundaries

The first prototype targets groups of 3–8 people and approximately 20–30 public Instagram Reels. It should support trip creation, member preferences, Reel capture, researched place cards, reactions and concerns, rough day planning, and collaborative edits.

See [docs/product-scope.md](docs/product-scope.md) and [docs/architecture.md](docs/architecture.md) before implementation.

## Getting started

There are no dependencies or services to install yet. Agree on the implementation stack and API contracts before integration. Person 3 records shared environment variable names in `.env.example` and adds root setup commands when the stack is chosen.

