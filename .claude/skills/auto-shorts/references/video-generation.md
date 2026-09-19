# AI 영상 생성 연동 (Higgsfield 등)

정지 이미지에 켄 번즈를 거는 대신, **씬마다 AI 생성 영상 클립**을 쓸 수 있다. 움직임이 실제로 있는 만큼
체감 품질이 크게 오르지만 유료이고 씬당 생성 시간이 걸린다.

## 흐름

```
project.json (씬별 image_prompt)
   └─▶ scripts/higgsfield.py   생성 요청 → 폴링 → mp4 다운로드 → 씬에 "video" 경로 기록
        └─▶ scripts/make_shorts.py   그 클립을 9:16 로 맞춰 씬에 사용(나머지는 동일)
```

## 준비

```bash
export HIGGSFIELD_API_KEY=...        # 계정 대시보드에서 발급. HIGGSFIELD_API_SECRET 이 필요한 플랜도 있다
export HIGGSFIELD_MODEL=...          # 대시보드에 보이는 모델 이름
```

`.claude/skills/auto-shorts/.env` 에 넣어도 된다(`secrets/`·`.env` 는 git 에 올라가지 않는다).

## 실행

```bash
# 1) 어떤 요청이 나가는지 먼저 확인 (아무것도 생성하지 않는다)
python scripts/higgsfield.py --project shorts_output/<slug>/project.json --dry-run

# 2) 씬 하나만 실제로 만들어 응답 구조 확인
python scripts/higgsfield.py --project shorts_output/<slug>/project.json --probe

# 3) 전체 생성 → 그 뒤 평소처럼 렌더
python scripts/higgsfield.py --project shorts_output/<slug>/project.json
python scripts/make_shorts.py shorts_output/<slug>/project.json --out shorts_output
```

- 이미 받은 클립은 건너뛴다(`--force` 로 다시 생성, `--scenes 1,3` 로 일부만).
- 씬의 `motion` 은 카메라 프리셋으로 넘어간다: `in`→dolly_in, `out`→dolly_out, `pan_left/right`,
  `pan_up`→crane_up, `pan_down`→crane_down.
- 프롬프트는 씬의 `image_prompt` + `style.image_style` + `vertical 9:16, no text` 로 합쳐진다.
  **영상 생성은 `image_prompt` 품질이 전부다** — 피사체·행동·카메라·조명을 영어로 구체적으로 쓴다.

## 엔드포인트가 다르면

서비스마다 경로와 필드 이름이 다르고 플랜에 따라서도 바뀐다. `secrets/higgsfield.json` 을 만들면
기본값 대신 그 설정을 쓴다. `--probe` 로 실제 응답을 보고 아래 키만 맞추면 된다.

```json
{
  "base": "https://platform.higgsfield.ai/v1",
  "create_path": "/generations",
  "poll_path": "/generations/{id}",
  "auth_header": "Authorization",
  "auth_prefix": "Bearer ",
  "body": {"model": "{model}", "prompt": "{prompt}", "aspect_ratio": "9:16",
           "duration": "{duration}", "motion": "{motion}"},
  "id_keys": ["id", "job_id"],
  "status_keys": ["status", "state"],
  "done_values": ["completed", "succeeded"],
  "fail_values": ["failed", "error"],
  "url_keys": ["video_url", "url", "output"]
}
```

응답이 `{"data": {"generation": {...}}}` 처럼 중첩돼 있어도 키 이름만 맞으면 찾아낸다.
fal.ai·Replicate 같은 중개 서비스로 같은 모델을 쓸 때도 이 설정만 바꾸면 그대로 동작한다.

코드를 고친 뒤에는 네트워크 없이 확인할 수 있다:

```bash
python scripts/selftest_higgsfield.py    # 가짜 API 로 생성 → 폴링 → 다운로드 검증
```

## 영상 클립을 직접 넣을 때

생성 서비스를 쓰지 않고 손에 있는 클립을 넣어도 된다. 씬에 `video` 경로만 적으면 된다.

```json
{ "narration": "...", "video": "clips/01.mp4", "video_speed": 0.9 }
```

- 9:16 중앙 크롭, 씬 길이에 맞춰 자동 반복, 오디오는 무시(나레이션·BGM 이 우선).
- `video_speed` 로 느리게(0.8) 혹은 빠르게(1.2). 느린 클립이 명언·감성 포맷에 잘 맞는다.
- `style.dim`·`vignette`·`look` 은 영상에도 그대로 적용된다.

## 비용·시간 감각

씬당 4~6초 클립 하나가 보통 몇십 초에서 몇 분 걸리고, 7씬이면 그만큼 곱해진다. 요금은 플랜마다 다르니
먼저 `--probe` 로 한 씬만 만들어 결과와 과금을 확인한 뒤 전체를 돌리는 편이 안전하다.
편당 비용이 부담되면 **훅 씬과 반전 씬만 영상으로** 만들고(`--scenes 1,5`) 나머지는 그림·사진으로 두는
혼합 구성이 가성비가 좋다.
