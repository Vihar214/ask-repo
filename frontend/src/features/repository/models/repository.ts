import { z } from 'zod';

export const repositorySubmitInputSchema = z
  .object({
    csrfToken: z.string().min(1),
    url: z.string().min(1),
    isPrivate: z.boolean(),
    privateRepositoryToken: z.string().max(512).nullable(),
    replaceActiveRepository: z.boolean(),
    reindexExistingRepository: z.boolean(),
  })
  .refine(
    (input) => input.isPrivate || input.privateRepositoryToken === null,
    'Public repositories cannot include token material.',
  );

export const repositorySummarySchema = z.object({
  id: z.string(),
  url: z.string(),
  githubOwner: z.string(),
  githubRepo: z.string(),
  isPrivate: z.boolean(),
  status: z.enum([
    'queued',
    'processing',
    'ready_for_indexing',
    'rejected_file_limit',
    'failed',
  ]),
});

export const repositoryJobSchema = z.object({
  id: z.string(),
  repository_id: z.string().optional(),
  repositoryId: z.string().optional(),
  replaces_repository_id: z.string().nullable().optional(),
  replacesRepositoryId: z.string().nullable().optional(),
  status: z.enum([
    'queued',
    'cloning',
    'counting_files',
    'ready_for_indexing',
    'rejected_file_limit',
    'failed',
  ]),
});

export const submitRepositoryResponseSchema = z.object({
  repository: repositorySummarySchema,
  job: repositoryJobSchema,
});

export type RepositorySubmitInput = z.infer<typeof repositorySubmitInputSchema>;
export type SubmitRepositoryResponse = z.infer<
  typeof submitRepositoryResponseSchema
>;
