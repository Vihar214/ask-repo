import axios, { AxiosError, AxiosRequestConfig } from 'axios';

export const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '',
  withCredentials: true,
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (
    error: AxiosError<{
      code?: string;
      error?: string;
      message?: unknown;
      statusCode?: number;
    }>,
  ) => {
    const message = error.response?.data?.message;

    return Promise.reject({
      code: error.response?.data?.code,
      error: error.response?.data?.error ?? 'Request failed',
      message:
        typeof message === 'string'
          ? message
          : 'Something went wrong. Please try again.',
      statusCode:
        error.response?.data?.statusCode ?? error.response?.status ?? 500,
    });
  },
);

export const axiosGet = async <T>(
  url: string,
  data?: object,
  config?: AxiosRequestConfig,
): Promise<T> => {
  const res = await axiosInstance.get(url, {
    params: data,
    ...config,
  });
  return res.data;
};

export const axiosPost = async <T = unknown>(
  url: string,
  data: object | null,
  config?: AxiosRequestConfig,
): Promise<T> => {
  const res = await axiosInstance.post(url, data, config);
  return res.data;
};

export const axiosPatch = async <T = unknown>(
  url: string,
  data: object | null,
  config?: AxiosRequestConfig,
): Promise<T> => {
  const res = await axiosInstance.patch(url, data, config);
  return res.data;
};

export const axiosPut = async <T = unknown>(
  url: string,
  data: object | null,
  config?: AxiosRequestConfig,
): Promise<T> => {
  const res = await axiosInstance.put(url, data, config);
  return res.data;
};

export const axiosDelete = async <T = unknown>(
  url: string,
  data?: object | null,
  config?: AxiosRequestConfig,
): Promise<T> => {
  const requestConfig = data ? { ...config, data } : config;
  const res = await axiosInstance.delete(url, requestConfig);
  return res.data;
};
