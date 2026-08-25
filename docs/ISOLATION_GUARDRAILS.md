# Isolation Guardrails

This project must remain completely isolated from all Arbor-related projects and repositories.

## Absolute rules

Do not:

- import code from `arbor-app`, `arbor-memory`, `arbor-web`, or any other Arbor repository
- add those repositories as git submodules, package dependencies, workspace references, or remote sources
- copy Arbor environment variables
- use Arbor Supabase projects, API keys, database schemas, storage buckets, auth configuration, or migrations
- use Arbor Netlify projects, deployment configuration, domains, redirects, or build hooks
- use Arbor branding, logos, domains, assets, user data, or content
- share local configuration files with Arbor projects
- alter any Arbor repository while working on PA Tuning Wizard
- create commits, branches, issues, pull requests, or releases in Arbor repositories for this project
- assume any Arbor secret or credential is valid for this project

## Required separation

PA Tuning Wizard must have its own:

- repository
- dependency tree
- local environment configuration
- application identifiers
- build configuration
- database, if/when persistence requires one beyond local SQLite
- deployment/signing configuration
- release workflow

## Local-development rule

If a developer has Arbor repositories checked out on the same computer, PA Tuning Wizard must not rely on relative paths, symlinks, shared `.env` files, shared node_modules directories, or local imports pointing into those repositories.

## Codex/agent rule

When an AI coding agent is operating inside `pa-tuning-wizard`, it should treat this repository as the entire project boundary unless the user explicitly authorizes a specific external public dependency or reference.

It must not inspect neighboring private repositories to find examples or reusable code.

## Verification

Before each major milestone, verify that the repository contains no references to:

- `arbor-app`
- `arbor-memory`
- `arbor-web`
- `goarbor`
- Arbor-specific environment variable names or service identifiers

Any accidental reference must be removed before continuing.
