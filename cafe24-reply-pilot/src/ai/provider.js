import { createClaudeProvider } from './claude.js';
import { createMockProvider } from './mock.js';

export function createProvider(aiConfig) {
  if (aiConfig.provider === 'claude') {
    if (!aiConfig.apiKey && !process.env.ANTHROPIC_AUTH_TOKEN) {
      throw new Error('AI_PROVIDER=claude 이지만 ANTHROPIC_API_KEY가 없습니다.');
    }
    return createClaudeProvider({
      apiKey: aiConfig.apiKey,
      model: aiConfig.model,
      effort: aiConfig.effort,
      fallbacks: aiConfig.fallbacks,
    });
  }
  return createMockProvider();
}
