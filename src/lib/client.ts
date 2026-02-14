import axios from "axios";
import type { AxiosError, InternalAxiosRequestConfig } from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

const getAccessToken = () => localStorage.getItem("accessToken");
const getRefreshToken = () => localStorage.getItem("refreshToken");

const setTokens = (accessToken?: string, refreshToken?: string) => {
  if (accessToken) localStorage.setItem("accessToken", accessToken);
  if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
};

const clearAuth = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
};

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let queue: Array<{ resolve: (t: string) => void; reject: (e: unknown) => void }> = [];

const flushQueue = (err: unknown, token?: string) => {
  queue.forEach((p) => (err ? p.reject(err) : p.resolve(token!)));
  queue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as any;

    if (!error.response || error.response.status !== 401) throw error;
    if (original?._retry) {
      clearAuth();
      throw error;
    }
    original._retry = true;

    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearAuth();
      throw error;
    }

    if (isRefreshing) {
      const newAccessToken = await new Promise<string>((resolve, reject) => {
        queue.push({ resolve, reject });
      });
      original.headers.Authorization = `Bearer ${newAccessToken}`;
      return api(original);
    }

    isRefreshing = true;

    try {
      // plain axios call (avoid recursion)
      const refreshRes = await axios.post(
        `${API_BASE_URL}/api/v1/auth/refresh`,
        { refreshToken },
        { headers: { "Content-Type": "application/json" } }
      );

      const newAccessToken = refreshRes?.data?.data?.accessToken as string | undefined;
      const newRefreshToken = refreshRes?.data?.data?.refreshToken as string | undefined;

      if (!newAccessToken || !newRefreshToken) {
        clearAuth();
        throw error;
      }

      setTokens(newAccessToken, newRefreshToken);
      flushQueue(null, newAccessToken);

      original.headers.Authorization = `Bearer ${newAccessToken}`;
      return api(original);
    } catch (e) {
      flushQueue(e);
      clearAuth();
      throw e;
    } finally {
      isRefreshing = false;
    }
  }
);
