import { env } from '@showdex/utils/core';

export const isShowdownClientOrigin = (
  origin: string = typeof window === 'undefined' ? null : window.location?.origin,
): boolean => {
  if (!origin) {
    return false;
  }

  try {
    return new URL(env('showdown-client-base-url')).origin === origin;
  } catch {
    return false;
  }
};
