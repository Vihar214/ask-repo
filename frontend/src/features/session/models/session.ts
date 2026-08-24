import { z } from 'zod';

export const SessionKindSchema = z.enum(['guest', 'logged_in']);

export const SessionStateSchema = z.object({
  session: z.object({
    kind: SessionKindSchema,
    expiresAt: z.string(),
    csrfToken: z.string(),
    recovered: z.boolean(),
  }),
  user: z
    .object({
      githubUsername: z.string(),
      avatarUrl: z.string().nullable(),
      email: z.string().nullable(),
    })
    .nullable(),
});

export type SessionKind = z.infer<typeof SessionKindSchema>;
export type SessionState = z.infer<typeof SessionStateSchema>;
