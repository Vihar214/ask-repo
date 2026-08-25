import { axiosDelete, axiosGet, axiosPost } from '../../api';

export type SessionFetcher = () => Promise<unknown>;
export type SessionAction = (
  url: string,
  method: 'POST' | 'DELETE',
  csrfToken: string,
) => Promise<void>;

export const fetchSession: SessionFetcher = async () => {
  return axiosGet('/session');
};

export const sendSessionAction: SessionAction = async (
  url,
  method,
  csrfToken,
) => {
  const config = { headers: { 'x-csrf-token': csrfToken } };

  if (method === 'POST') {
    await axiosPost(url, null, config);
    return;
  }

  await axiosDelete(url, null, config);
};
