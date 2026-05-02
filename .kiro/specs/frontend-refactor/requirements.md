# Requirements Document

## Introduction

This feature restructures the project repository by moving all frontend-related files from the root directory into a dedicated `frontend/` folder. Currently, the project has a React/TypeScript/Vite frontend at the root level alongside a `backend/` folder containing a Python/FastAPI application. The goal is to achieve a clean monorepo layout where `frontend/` and `backend/` are sibling directories, all tooling continues to work correctly, and no functionality is broken.

## Glossary

- **Frontend**: The React/TypeScript application built with Vite, Tailwind CSS, and shadcn/ui components.
- **Backend**: The Python/FastAPI application located in the `backend/` directory.
- **Root**: The top-level directory of the repository.
- **Frontend_Files**: All files and directories currently at the root that belong exclusively to the frontend, including `src/`, `public/`, `index.html`, `package.json`, `package-lock.json`, `bun.lock`, `bun.lockb`, `vite.config.ts`, `eslint.config.js`, `postcss.config.js`, `components.json`, `playwright.config.ts`, `playwright-fixture.ts`, and `tsconfig*.json`.
- **Config_File**: Any configuration file that contains paths, aliases, or references that may need updating after the move (e.g., `vite.config.ts`, `tsconfig.json`, `playwright.config.ts`, `components.json`).
- **Path_Alias**: The `@` alias defined in `vite.config.ts` and `tsconfig.json` that maps to the `src/` directory.
- **Restructuring_Tool**: The developer or automated script performing the file move and configuration updates.

## Requirements

### Requirement 1: Move Frontend Files to Dedicated Folder

**User Story:** As a developer, I want all frontend files consolidated under a `frontend/` folder, so that the repository has a clear separation between frontend and backend concerns.

#### Acceptance Criteria

1. THE Restructuring_Tool SHALL move all Frontend_Files from the root directory into a new `frontend/` directory at the root of the repository.
2. WHEN the move is complete, THE Root directory SHALL contain only `frontend/`, `backend/`, `.git/`, `.gitignore`, `.kiro/`, `.vscode/`, and `README.md`.
3. WHEN the move is complete, THE `frontend/` directory SHALL contain `src/`, `public/`, `index.html`, `package.json`, `package-lock.json`, `bun.lock`, `bun.lockb`, `vite.config.ts`, `eslint.config.js`, `postcss.config.js`, `components.json`, `playwright.config.ts`, `playwright-fixture.ts`, and all `tsconfig*.json` files.
4. THE Restructuring_Tool SHALL preserve the internal directory structure of all moved files without modification to their contents, except where path references must be updated.

### Requirement 2: Update Vite Configuration

**User Story:** As a developer, I want the Vite configuration to reflect the new directory layout, so that the dev server, build, and preview commands work correctly from the `frontend/` directory.

#### Acceptance Criteria

1. WHEN `vite.config.ts` is relocated to `frontend/vite.config.ts`, THE Config_File SHALL resolve the `@` Path_Alias to `frontend/src/` relative to the new `__dirname`.
2. THE `frontend/vite.config.ts` SHALL retain all existing server, plugin, and resolve settings without functional change.
3. WHEN a developer runs `vite` from the `frontend/` directory, THE Vite_Dev_Server SHALL start successfully on the configured port.

### Requirement 3: Update TypeScript Configuration

**User Story:** As a developer, I want TypeScript path aliases and project references to resolve correctly after the move, so that the TypeScript compiler reports no new errors.

#### Acceptance Criteria

1. WHEN `tsconfig.json` and any `tsconfig.*.json` files are relocated to `frontend/`, THE Config_File SHALL update all `paths`, `include`, and `exclude` entries to be valid relative to the `frontend/` directory.
2. THE `@/*` path alias in `tsconfig.json` SHALL resolve to `./src/*` relative to `frontend/`.
3. WHEN the TypeScript compiler runs from the `frontend/` directory, THE Compiler SHALL produce zero new type errors attributable to the restructuring.

### Requirement 4: Update Package Scripts

**User Story:** As a developer, I want all npm/bun scripts to work correctly when run from the `frontend/` directory, so that the development workflow is uninterrupted.

#### Acceptance Criteria

1. THE `frontend/package.json` SHALL contain all scripts (`dev`, `build`, `build:dev`, `lint`, `preview`, `test`, `test:watch`) that execute correctly when run from the `frontend/` directory.
2. WHEN a developer runs `npm run dev` or `bun run dev` from `frontend/`, THE Dev_Server SHALL start without errors.
3. WHEN a developer runs `npm run build` or `bun run build` from `frontend/`, THE Build_Process SHALL complete successfully and output artifacts to `frontend/dist/`.
4. WHEN a developer runs `npm run test` from `frontend/`, THE Test_Runner SHALL discover and execute all tests under `frontend/src/test/`.

### Requirement 5: Update Playwright Configuration

**User Story:** As a developer, I want Playwright end-to-end tests to continue running correctly after the move, so that the test suite remains fully functional.

#### Acceptance Criteria

1. WHEN `playwright.config.ts` is relocated to `frontend/playwright.config.ts`, THE Config_File SHALL update all path references (test directories, output directories, base URL) to be valid relative to `frontend/`.
2. WHEN `playwright-fixture.ts` is relocated to `frontend/playwright-fixture.ts`, THE Config_File SHALL update any import paths to reference the correct locations within `frontend/`.
3. WHEN a developer runs Playwright tests from the `frontend/` directory, THE Test_Runner SHALL discover and execute all end-to-end tests without path resolution errors.

### Requirement 6: Update shadcn/ui Components Configuration

**User Story:** As a developer, I want the shadcn/ui CLI to continue working correctly after the move, so that new components can be added without manual path corrections.

#### Acceptance Criteria

1. WHEN `components.json` is relocated to `frontend/components.json`, THE Config_File SHALL update the `aliases.components`, `aliases.utils`, `aliases.ui`, `aliases.lib`, and `aliases.hooks` paths to resolve correctly relative to `frontend/src/`.
2. WHEN a developer runs the shadcn/ui CLI from the `frontend/` directory, THE CLI SHALL add new components to the correct paths under `frontend/src/components/ui/`.

### Requirement 7: Update ESLint and PostCSS Configuration

**User Story:** As a developer, I want linting and CSS processing to work correctly from the `frontend/` directory, so that code quality tooling is unaffected by the restructuring.

#### Acceptance Criteria

1. WHEN `eslint.config.js` is relocated to `frontend/eslint.config.js`, THE Config_File SHALL resolve all plugin imports and file patterns correctly relative to `frontend/`.
2. WHEN `postcss.config.js` is relocated to `frontend/postcss.config.js`, THE Config_File SHALL retain all plugin configurations without modification.
3. WHEN a developer runs `npm run lint` from `frontend/`, THE Linter SHALL report zero new errors attributable to the restructuring.

### Requirement 8: Update Root .gitignore

**User Story:** As a developer, I want the root `.gitignore` to correctly exclude frontend build artifacts and dependencies after the move, so that generated files are not accidentally committed.

#### Acceptance Criteria

1. THE Root `.gitignore` SHALL include patterns that exclude `frontend/node_modules/`, `frontend/dist/`, and `frontend/.env*` from version control.
2. IF the root `.gitignore` previously excluded `node_modules/` or `dist/` at the root level, THEN THE Root `.gitignore` SHALL retain those patterns and additionally add the `frontend/`-prefixed equivalents.

### Requirement 9: Update README Documentation

**User Story:** As a developer, I want the README to reflect the new project structure and updated commands, so that contributors can onboard without confusion.

#### Acceptance Criteria

1. THE `README.md` SHALL document the updated project structure showing `frontend/` and `backend/` as sibling directories.
2. THE `README.md` SHALL update all frontend-related commands to specify that they must be run from the `frontend/` directory.
3. THE `README.md` SHALL retain all backend-related documentation without modification.

### Requirement 10: No Regression in Frontend Functionality

**User Story:** As a developer, I want the frontend application to behave identically after the restructuring, so that no user-facing functionality is broken.

#### Acceptance Criteria

1. WHEN the frontend is built from `frontend/` after restructuring, THE Build_Output SHALL be functionally equivalent to the build output produced before restructuring.
2. WHEN the dev server is running from `frontend/`, THE Application SHALL render all routes defined in `src/App.tsx` without errors.
3. IF any internal import path within `src/` uses the `@` alias, THEN THE Compiler SHALL resolve it correctly after restructuring.
4. THE Restructuring_Tool SHALL not modify any file contents inside `src/` or `public/` except to correct path aliases or references that break due to the directory move.
