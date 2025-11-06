import { createApp } from './main';
import type { VercelApiHandler } from '@vercel/node';

let cachedApp: any = null;

export const handler: VercelApiHandler = async (req, res) => {
  if (!cachedApp) {
    cachedApp = await createApp();
  }

  const app = cachedApp.getHttpAdapter().getInstance();
  return app(req, res);
};

export default handler;
