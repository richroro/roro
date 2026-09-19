import express from 'express';
import { sessionMiddleware } from './web/session.js';
import { createRouter } from './web/routes.js';
import { errorPage } from './web/views.js';

/**
 * Express 앱 팩토리. 테스트에서 fetchImpl/provider를 주입할 수 있도록 ctx를 받는다.
 * ctx = { config, db, provider, logger, fetchImpl }
 */
export function createApp(ctx) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', true);

  // 웹훅은 서명 검증을 위해 원문(raw body)이 필요하다
  app.use('/webhooks', express.raw({ type: '*/*', limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(express.json({ limit: '1mb' }));
  app.use(sessionMiddleware(ctx.config));

  app.use(createRouter(ctx));

  app.use((req, res) => {
    res.status(404).type('html').send(errorPage({ title: '페이지를 찾을 수 없습니다', message: req.path }));
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    ctx.logger?.error?.(err);
    const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 500;
    res.status(status).type('html').send(errorPage({ title: '오류가 발생했습니다', message: err.message }));
  });

  return app;
}
