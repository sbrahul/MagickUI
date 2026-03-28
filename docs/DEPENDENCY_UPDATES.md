## Updating NPM Dependencies (Developer Guide)

**Purpose**

This document lists concise, safe steps for reviewing and updating npm dependencies in this repository.

**Assumptions**

- You have Node and npm installed.
- Run commands from the project root.

**Scope**

This guide covers updating *direct* dependencies listed in `package.json` (both `dependencies` and `devDependencies`). Do not manually edit `package-lock.json` or attempt to directly bump transitive (indirect) dependencies there. To update transitive dependencies, update the direct dependency that depends on them, or use package manager tools (e.g. `npm audit`, `npm update`) which will manage the lockfile for you.

---

### 1) Check outdated packages

```bash
npm outdated
```

Shows current, wanted, and latest versions. Review major upgrades before applying.

### 2) Update compatible (minor/patch) versions

```bash
npm update
```

Updates `package.json` / `package-lock.json` to compatible minor/patch releases.

### 3) Upgrade major versions (interactive / bulk)

Use `npm-check-updates` to update *direct* dependencies in `package.json` to latest versions (including majors):

```bash
npx npm-check-updates -u
npm install
```

Inspect the `package.json` diffs and changelogs before committing. This will only change direct dependency entries; transitive dependency versions live in `package-lock.json` and should not be edited by hand.


### 4) Run tests and linters

```bash
npm test
```
