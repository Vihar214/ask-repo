import { useMutation } from '@tanstack/react-query';

import { axiosPost } from '../../../api';
import {
  repositorySubmitInputSchema,
  submitRepositoryResponseSchema,
  type RepositorySubmitInput,
  type SubmitRepositoryResponse,
} from '../models';

export function useCreateRepository() {
  return useMutation({
    mutationFn: async (input: RepositorySubmitInput) => {
      const parsedInput = repositorySubmitInputSchema.parse(input);
      const { csrfToken, ...payload } = parsedInput;
      const response = await axiosPost<unknown>('/repos', payload, {
        headers: { 'x-csrf-token': csrfToken },
      });

      return submitRepositoryResponseSchema.parse(
        response,
      ) as SubmitRepositoryResponse;
    },
  });
}
