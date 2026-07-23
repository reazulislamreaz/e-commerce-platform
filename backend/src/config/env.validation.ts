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
  // Marks auth/guest-cart cookies as Secure. Defaults to true in production and
  // false otherwise; set explicitly to false when serving over plain HTTP
  // (e.g. an IP-only VPS without TLS), or browsers will drop the cookies.
  COOKIE_SECURE: Joi.boolean().when('NODE_ENV', {
    is: 'production',
    then: Joi.boolean().default(true),
    otherwise: Joi.boolean().default(false),
  }),
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
  CONTACT_INBOX: Joi.string().email().optional().allow(''),
  // Company identity printed on PDF invoices; sensible Elevate Apparel defaults apply.
  COMPANY_LEGAL_NAME: Joi.string().optional().allow(''),
  COMPANY_ADDRESS: Joi.string().optional().allow(''),
  SUPPORT_EMAIL: Joi.string().email().optional().allow(''),
  SUPPORT_PHONE: Joi.string().optional().allow(''),
  // Directory for locally stored product images; defaults to backend/uploads/products.
  PRODUCT_UPLOAD_DIR: Joi.string().optional().allow(''),
  // Local MVP report storage; use durable object storage in multi-instance production.
  REPORTS_STORAGE_DIR: Joi.string().optional().allow(''),
  // CRM high-value customer lifetime threshold in poisha (default ৳10,000).
  CRM_HIGH_VALUE_THRESHOLD_POISHA: Joi.number().integer().min(0).default(1_000_000),
});
