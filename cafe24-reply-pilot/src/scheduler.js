import { createClientForMall } from './cafe24/client.js';
import { syncMall } from './services/inbox.js';
import { remainingQuota } from './plans.js';

/**
 * 폴링 스케줄러: 설치된 모든 몰의 미답변 글을 주기적으로 동기화한다.
 * 웹훅이 설정돼 있어도 누락 이벤트를 메우는 안전망 역할을 한다.
 */
export function startScheduler({ db, config, provider, logger = console }) {
  const interval = config.poll.intervalSec;
  if (!interval || interval <= 0) return { stop() {} };
  const running = new Set();

  async function tick() {
    for (const mall of db.listMalls()) {
      if (!mall.access_token || running.has(mall.mall_id)) continue;
      running.add(mall.mall_id);
      try {
        const settings = db.getSettings(mall.mall_id);
        if (!settings.onboarded) continue;
        const client = createClientForMall(db, config, mall);
        const quota = remainingQuota(db, mall.mall_id, settings);
        const stats = await syncMall({ db, client, config, provider, mall, settings, logger, maxGenerate: quota.remaining });
        if (stats.created || stats.generated || stats.errors.length) {
          logger.info?.(`[scheduler] ${mall.mall_id}: +${stats.created} new, ${stats.generated} drafted, ${stats.published} auto-published, ${stats.errors.length} errors`);
        }
      } catch (err) {
        logger.error?.(`[scheduler] ${mall.mall_id} failed: ${err.message}`);
      } finally {
        running.delete(mall.mall_id);
      }
    }
  }

  const timer = setInterval(() => tick().catch((e) => logger.error?.(e)), interval * 1000);
  timer.unref?.();
  setTimeout(() => tick().catch((e) => logger.error?.(e)), 3000).unref?.();
  return { stop: () => clearInterval(timer), tick };
}
