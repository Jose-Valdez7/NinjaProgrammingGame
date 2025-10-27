import 'dotenv/config';
import * as joi from 'joi';

interface EnvVars {
  PORT: number;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  ALLOWED_ORIGINS?: string;
  NODE_ENV?: string;
}

const envsSchema = joi
  .object<EnvVars>({
    PORT: joi.number(),
    DATABASE_URL: joi.string().required(),
    JWT_SECRET: joi.string().required(),
    JWT_REFRESH_SECRET: joi.string().required(),
    ALLOWED_ORIGINS: joi.string().optional(),
    NODE_ENV: joi.string().optional(),
  })
  .unknown(true);

const { error, value } = envsSchema.validate({
  ...process.env,
});

if (error) {
  throw new Error(`Env vars validation error: ${error.message}`);
}

const envVars: EnvVars = value;

export const envs = {
  port: envVars.PORT,
  databaseUrl: envVars.DATABASE_URL,
  jwtSecret: envVars.JWT_SECRET,
  jwtRefreshSecret: envVars.JWT_REFRESH_SECRET,
  allowedOrigins: envVars.ALLOWED_ORIGINS,
  nodeEnv: envVars.NODE_ENV,
};
