# Project Glossary

This file defines domain terms used across specs, tickets, docs, tests, and code. It is a glossary only, not an architecture document or implementation plan.

## User Types

**User**: A person using Ask Repo to submit a GitHub repository and chat with the indexed codebase.

**Guest User**: A user identified by a signed HTTP-only session cookie, without GitHub OAuth login.

**Logged-In User**: A user authenticated with GitHub OAuth.

**Session**: The server-side scope that connects a browser/user to repos, chats, and temporary or persistent data.

## Repository Concepts

**Repository**: A GitHub repository submitted by a user for indexing.

**Private Repository Token**: A GitHub token pasted by the user for one private repository clone/index operation. It is not the same as the user's GitHub OAuth login.

**Temp Clone**: A shallow clone of a submitted repository created in a temporary folder for indexing.

**Repository Index**: The stored searchable representation of a repository after indexing. It includes file records, chunks, embeddings, symbols, references, and skipped file records.

**Skipped File**: A repository file that is counted toward repository limits but not indexed because it is binary, too large, or inside an ignored/vendor/build path.

## Indexing Concepts

**Chunk**: A stored slice of repository text with file path and line range metadata.

**Embedding**: A vector representation of a chunk used for semantic retrieval.

**Symbol**: A named code or document structure extracted from repository content, such as a function, class, heading, or key.

**Reference**: A stored relationship from a symbol use site to a symbol definition.

**Resolver**: The indexing component that attempts to connect references to definitions.

**Degraded Symbol Accuracy**: A state where exact LSP-backed reference resolution was unavailable or timed out, so the app used a fallback resolver.

## Chat Concepts

**Chat Message**: A user or assistant message associated with a repository.

**Retrieval**: The process of selecting relevant repository chunks, symbols, or references for a chat answer.

**Citation**: A file and line range attached to an answer, formatted as `path:start-end`.

**Source Viewer**: The UI that shows stored chunk text for a citation.
