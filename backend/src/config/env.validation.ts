import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().port().default(4000),
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgresql', 'postgres'] })
    .required(),
  REDIS_URL: Joi.string()
    .uri({ scheme: ['redis', 'rediss'] })
    .required(),
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  FRONTEND_ORIGIN: Joi.string().uri().required(),
  // SMTP is optional in development (emails are logged); mandatory in production.
  SMTP_HOST: Joi.string().hostname().default('smtp.gmail.com'),
  SMTP_PORT: Joi.number().port().default(465),
  SMTP_SECURE: Joi.boolean().default(true),
  SMTP_USER: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional().allow(''),
  }),
  SMTP_PASSWORD: Joi.string().when('SMTP_USER', {
    is: Joi.exist().not(''),
    then: Joi.required(),
    otherwise: Joi.optional().allow(''),
  }),
  MAIL_FROM: Joi.string().when('SMTP_USER', {
    is: Joi.exist().not(''),
    then: Joi.required(),
    otherwise: Joi.optional().allow(''),
  }),
});
