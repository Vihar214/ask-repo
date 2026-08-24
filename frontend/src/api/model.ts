import { z } from 'zod';

export const ListBaseModel = z.object({
  totalCount: z.number(),
  page: z.number(),
  totalPages: z.number(),
  items: z.unknown(),
});

export const AxiosErrorModel = z.object({
  error: z.string().nullish(),
  message: z.string().nullish(),
  statusCode: z.number().nullish(),
});

export type AxiosErrorType = z.infer<typeof AxiosErrorModel>;
