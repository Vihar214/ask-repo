# Frontend Rules

This file describes the preferred frontend structure for agents. Keep frontend code predictable: shared API plumbing is central, feature behavior is feature-local, and components stay focused on UI.

## Libraries

- Use Axios as the standard HTTP transport for app APIs.
- Use TanStack Query for API reads and writes.
- Use Zod for API response schemas and form validation schemas.
- API response parsing should use `Schema.parse(response)` by default so contract drift fails loudly.
- Use `safeParse` only when the API legitimately returns multiple known shapes and the hook handles each shape explicitly.
- Request payload, query, and route-param schemas are optional. Add them when the shape is non-trivial, reused, or easy to get wrong.

## Shared API Folder

Keep shared API infrastructure in `src/api`.

Allowed in `src/api`:

- Axios instance and interceptors.
- HTTP verb helpers such as `axiosGet`, `axiosPost`, `axiosPut`, `axiosPatch`, and `axiosDelete`.
- Token/session refresh handlers.
- Normalized API error schemas and types.
- Generic API utilities.
- Generic reusable API hooks only.

Not allowed in `src/api`:

- Feature endpoint hooks.
- Feature-specific request/response schemas.
- Feature-specific query keys.
- Component or screen logic.

## Feature Shape

Prefer this shape for frontend features:

```text
src/features/<feature>/
  components/
  hooks/
    <domain>.ts
    index.ts
  models/
    <domain>.ts
    index.ts
  utils/
  routes.tsx
  index.ts
```

Small features may keep a single `model.ts` or `hooks.ts`. When a feature grows, split into `models/` and `hooks/` folders with `index.ts` barrel exports, usually using `export * from "./<file>";`.

Use kebab-case for feature/domain filenames when creating new files unless the surrounding project already has a stronger local convention.

## Routing

Use React Router as the standard routing library.

Prefer this shape for routing:

```text
src/routes/
  AppRoutes.tsx
  ProtectedRoutes.tsx
  AuthGuard.tsx
  DynamicNavigate.tsx
  react-router.tsx
  index.ts

src/features/<feature>/
  routes.tsx
```

Routing rules:

- Keep the app-level router in `src/routes/react-router.tsx`.
- Render the router through `src/routes/AppRoutes.tsx` with `RouterProvider`.
- Mount feature route groups from the app router with wildcard paths, for example `/profile/*` or `/repos/*`.
- Keep auth, session, and onboarding guards in route guard components under `src/routes`.
- Put each feature's child routes in `src/features/<feature>/routes.tsx`.
- Feature route modules should be thin: import feature components, declare `<Routes>` and `<Route>` entries, and avoid data fetching or business logic.
- Use index routes for a feature's default screen.
- Use route params for entity identity, for example `:repoId`, and read them in the screen/component or a feature hook.
- Keep redirects that choose the user's landing destination in a dedicated route component such as `DynamicNavigate`.
- Export route modules through the relevant `index.ts` only when another module needs that public import.

## Models

- Put Zod schemas and inferred TypeScript types in feature-local model files.
- Name response schemas after the API/domain shape, for example `RepoStatusResponseSchema`.
- Export inferred types next to schemas with `z.infer<typeof SchemaName>`.
- Form validation schemas belong in models when they represent reusable domain input.
- Models must not import hooks or components.

## Hooks

Use hook names that match their responsibility:

- Query hooks read server data with `useQuery`, for example `useGetRepoStatus`.
- Mutation hooks create/update/delete server data with `useMutation`, for example `useCreateRepo`.
- Infinite query hooks use `useInfiniteQuery` for paginated or infinite lists.
- Composition hooks combine multiple hooks or add domain flow behavior, for example `useSubmitRepoFlow`.
- UI-only hooks handle local browser/UI behavior and should not live with API hooks unless they are feature-specific.

Query rules:

- Use array query keys only.
- Include every input that changes the request in the query key.
- Parse API responses in the hook before returning data.
- Use `enabled` when required inputs may be missing.

Mutation rules:

- Accept optional callbacks in an argument object, usually `onSuccess` and `onError`.
- Put cache invalidation inside the mutation hook when it is always required.
- Keep screen-specific navigation, toasts, or follow-up behavior at the component/screen level.

## Components

Components should render UI, collect input, call hooks, and manage local UI state.

Components should not:

- Call Axios or `fetch` directly.
- Define endpoint URLs.
- Parse API responses.
- Own reusable query keys.
- Define large API request/response types.
- Contain cross-screen API flow logic.

## Imports

- Feature hooks may import from shared `src/api` and same-feature `models`.
- Feature models must not import hooks or components.
- Shared `src/api` must not import feature code.
- Components may import feature hooks, models, and components.
- Avoid cross-feature imports except through the other feature's public `index.ts`.

## Tests

- Test tricky Zod schemas when API shapes have defaults, transforms, unions, or nullable fields.
- Test hooks at their public seam when they contain non-trivial query options, invalidation, parsing, or composition logic.
