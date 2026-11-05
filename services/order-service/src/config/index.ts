import { env } from './env';

export const config = env;
export { env };
export type { Env as AppConfig } from './env';
export default config;
