/**
 * 카페24 관리자가 앱을 실행할 때 보내는 것과 같은 형식의 서명된 실행 URL을 만든다.
 * 로컬 데모: node --env-file=.env scripts/demo-launch-url.js [mall_id]
 */
import { signLaunchParams } from '../src/cafe24/hmac.js';

const secret = process.env.CAFE24_CLIENT_SECRET;
if (!secret) {
  console.error('CAFE24_CLIENT_SECRET 환경변수가 필요합니다.');
  process.exit(1);
}
const base = (process.env.APP_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const mallId = process.argv[2] || 'demo';
const params = {
  is_multi_shop: 'F',
  lang: 'ko_KR',
  mall_id: mallId,
  nation: 'KR',
  shop_no: '1',
  timestamp: String(Math.floor(Date.now() / 1000)),
  user_id: mallId,
  user_name: '데모 운영자',
  user_type: 'P',
};
console.log(`${base}/app/launch?${signLaunchParams(params, secret)}`);
