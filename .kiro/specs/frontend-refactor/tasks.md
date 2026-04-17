# Implementation Plan: Frontend Refactor

## Overview

This plan implements a structural refactoring to move all frontend files from the repository root into a dedicated `frontend/` directory. The work is organized into three sequential phases: moving files, updating configuration paths, and verifying the toolchain works correctly from the new location.

## Tasks

- [x] 1. Create frontend directory structure and move files
  - Create `frontend/` directory at repository root
  - Move `src/`, `public/`, `index.html` into `frontend/`
  - Move all config files: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `eslint.config.js`, `postcss.config.js`, `components.json`, `playwright.config.ts`, `playwright-fixture.ts`
  - Move lockfiles: `bun.lock`, `bun.lockb`, `package-lock.json`
  - Verify no frontend files remain at root (except `.gitignore` and `README.md`)
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Install dependencies in new location
  - Delete old `node_modules/` directory at root if it exists
  - Run `npm install` or `bun install` from `frontend/` directory
  - Verify `frontend/node_modules/` is created successfully
  - _Requirements: 1.4, 4.1_

- [x] 3. Verify configuration files are correct
  - Verify `frontend/vite.config.ts` has `resolve.alias["@"]` pointing to `path.resolve(__dirname, "./src")`
  - Verify `frontend/tsconfig.json` has `paths["@/*"]` set to `["./src/*"]`
  - Verify `frontend/tsconfig.json` has `references` pointing to `./tsconfig.app.json` and `./tsconfig.node.json`
  - Verify `frontend/tsconfig.app.json` has `include: ["src"]` and `paths["@/*"]` set to `["./src/*"]`
  - Verify `frontend/tsconfig.node.json` has `include: ["vite.config.ts"]`
  - Verify `frontend/components.json` has `tailwind.css` pointing to `"src/index.css"` and aliases using `@/` prefix
  - _Requirements: 2.1, 2.2, 3.1, 3.2, 5.1, 5.2, 6.1, 7.1, 7.2_

- [x] 4. Update root .gitignore file
  - Add `frontend/node_modules/` pattern to root `.gitignore`
  - Add `frontend/dist/` pattern to root `.gitignore`
  - Add `frontend/.env*` pattern to root `.gitignore`
  - Retain existing root-level patterns (`node_modules`, `dist`, etc.)
  - _Requirements: 8.1, 8.2_

- [x] 5. Update README.md documentation
  - Update project structure section to show `frontend/` and `backend/` as sibling directories
  - Update all frontend command examples to specify running from `frontend/` directory (e.g., `cd frontend && npm run dev`)
  - Retain all backend documentation without modification
  - _Requirements: 9.1, 9.2, 9.3_

- [x] 6. Checkpoint - Verify TypeScript compilation
  - Run `tsc --noEmit` from `frontend/` directory
  - Ensure zero new type errors attributable to restructuring
  - If errors occur, review path aliases and config file references
  - Ensure all tests pass, ask the user if questions arise.
  - _Requirements: 3.3_

- [x] 7. Checkpoint - Verify build process
  - Run `npm run build` or `bun run build` from `frontend/` directory
  - Verify build completes successfully
  - Verify `frontend/dist/` directory is created with build artifacts
  - Ensure build output is functionally equivalent to pre-refactor build
  - Ensure all tests pass, ask the user if questions arise.
  - _Requirements: 4.3, 10.1_

- [x] 8. Checkpoint - Verify development server
  - Run `npm run dev` or `bun run dev` from `frontend/` directory
  - Verify dev server starts on configured port (8080)
  - Verify application renders all routes without errors
  - Verify hot module replacement (HMR) works correctly
  - Ensure all tests pass, ask the user if questions arise.
  - _Requirements: 2.3, 4.2, 10.2_

- [ ]* 9. Verify test suite
  - Run `npm run test` from `frontend/` directory
  - Verify all tests under `frontend/src/test/` are discovered and executed
  - Verify zero new test failures attributable to restructuring
  - _Requirements: 4.4_

- [ ]* 10. Verify linting
  - Run `npm run lint` from `frontend/` directory
  - Verify zero new lint errors attributable to restructuring
  - Verify ESLint resolves all plugin imports and file patterns correctly
  - _Requirements: 7.3_

- [ ]* 11. Verify Playwright end-to-end tests
  - Run Playwright tests from `frontend/` directory
  - Verify all e2e tests are discovered and executed without path resolution errors
  - Verify test results are equivalent to pre-refactor test results
  - _Requirements: 5.3_

- [ ]* 12. Verify shadcn/ui CLI functionality
  - Run shadcn/ui CLI command from `frontend/` directory to add a test component
  - Verify component is added to correct path under `frontend/src/components/ui/`
  - Verify component imports use correct `@/` alias paths
  - Remove test component after verification
  - _Requirements: 6.2_

- [x] 13. Final verification and cleanup
  - Verify root directory contains only: `frontend/`, `backend/`, `.git/`, `.gitignore`, `.kiro/`, `.vscode/`, `README.md`
  - Verify no orphaned frontend files remain at root
  - Verify all `@` alias imports in `src/` resolve correctly
  - Verify no file contents in `src/` or `public/` were modified except for necessary path corrections
  - Ensure all tests pass, ask the user if questions arise.
  - _Requirements: 1.2, 10.3, 10.4_

## Notes

- Tasks marked with `*` are optional verification tasks and can be skipped for faster completion
- All configuration files use relative paths, so they remain valid after the move
- The `@` path alias is resolved relative to each config file's location, so it stays correct
- Checkpoints ensure incremental validation at critical stages (TypeScript, build, dev server)
- No application logic is modified - this is purely a structural refactoring
- If any verification step fails, review the corresponding config file paths before proceeding
