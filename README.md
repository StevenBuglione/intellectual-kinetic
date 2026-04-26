# Intellectual Kinetic

Intellectual Kinetic is a working Next.js monolith slice for AST-first book restoration. The app renders a Google Docs-like Tiptap editing workspace, keeps canonical AST as the durable semantic model, generates deterministic LaTeX from that AST, and exposes a revealable source/debug panel.

## Getting Started

Install dependencies and run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Without `DATABASE_URL`, the app uses the built-in restoration fixture in memory. With Docker Compose, canonical AST persistence is stored in Postgres and survives restarts.

## Docker Compose

```bash
docker compose up --build
```

The Compose app image includes a local LaTeX toolchain for server-side PDF preview compilation.

Compose starts:

- `app` - the single Next.js monolith
- `postgres` - durable metadata and canonical AST persistence
- named volumes for Postgres and inspectable artifact storage

## Available Scripts

- `npm run dev` - start the local development server
- `npm run build` - build the production app
- `npm run start` - start the production server after build
- `npm run lint` - run ESLint
- `npm run typecheck` - run TypeScript verification
- `npm run test` - run Vitest regression tests
- `npm run verify:fixtures` - run the initial fixture-driven parity check
- `npm run verify:visual` - render TextView fixture pages in headless Chrome, render every compiled PDF page to PNG, and fail on editor/PDF visual drift above the ratcheted budget
- `npm run verify:gates` - run semantic fixture gates and visual parity gates together

`verify:visual` requires `pdflatex`, `pdftoppm`, ImageMagick `compare`/`identify`, and a Chrome-compatible browser. Set `IK_ARTIFACT_ROOT=.artifacts` to keep `editor.png`, `pdf.png`, and `diff.png` outputs for inspection. Fixture budgets live in code with a zero-difference target so parity improvements can ratchet the allowed drift downward.
