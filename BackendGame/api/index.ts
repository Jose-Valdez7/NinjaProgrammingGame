import serverlessExpress from '@vendia/serverless-express';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import { createApp } from '../src/main';

let server: any;

export const handler = async (event: any, context: any) => {
  if (!server) {
    const expressApp = express();
    const nestApp = await createApp();
    nestApp.use(expressApp);
    await nestApp.init();
    server = serverlessExpress({ app: expressApp });
  }
  return server(event, context);
};
