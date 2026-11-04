import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestStore {
  userId?: string;
}

export const requestContext = new AsyncLocalStorage<RequestStore>();
