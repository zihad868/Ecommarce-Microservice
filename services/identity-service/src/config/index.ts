import { env } from './env';

// Re-export env as config for backward compatibility
export const config = env;
export { env };
export type { Env as AppConfig } from './env';
export default config;
