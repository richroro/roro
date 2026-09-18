# trends/

`scripts/research_trends.py` 가 만드는 트렌드 브리핑.

- `latest.md` — 최신 브리핑. 쇼츠 주제를 고를 때(1단계) 읽는다. 8일 넘게 오래됐으면 스크립트를 다시 돌린다.
- `YYYY-MM-DD.json` — 원본 스냅샷(최근 12개만 보관).

GitHub Actions `auto-shorts weekly trends` 가 매주 월요일 아침 자동으로 갱신한다(수동 실행도 가능).
