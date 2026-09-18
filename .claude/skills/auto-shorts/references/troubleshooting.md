# 문제 해결

로그는 `[단계] 메시지` 형식이다. 실패한 단계의 중간 산출물은 `shorts_output/<slug>/work/` 에 남아 있으니
그 파일을 직접 열어 보면 원인이 빨리 잡힌다. 고친 뒤 같은 명령을 다시 실행하면 바뀐 것만 다시 만든다.

| 증상 | 원인 | 조치 |
|---|---|---|
| `[env] ffmpeg 를 찾을 수 없습니다` | ffmpeg 미설치 | `pip install imageio-ffmpeg` (가장 쉬움) 또는 `winget install Gyan.FFmpeg` |
| `필터 없음: ['xfade', ...]` | 축소판 ffmpeg 빌드 | Gyan 'full' 빌드 또는 imageio-ffmpeg 사용. ffmpeg 5 이상 필요 |
| `[tts] edge-tts 실패 (403 / NoAudioReceived / WSServerHandshakeError)` | MS 서비스가 클라이언트 토큰을 바꿈, 또는 망 차단 | `pip install -U edge-tts` 후 재시도. 계속되면 `--tts-engine gtts` |
| `[tts]` 단어 수가 0 이거나 `timing: estimated` | 보이스가 WordBoundary 를 안 줌 | 자막은 글자 수 추정으로 나옴(약간 어긋날 수 있음). `female`/`male` 프리셋 보이스로 바꾸면 대부분 해결 |
| `[image] pollinations 실패: HTTP 429/5xx` | 익명 한도·과부하 | 잠시 후 `--force` 없이 재실행(성공한 씬은 캐시됨). `--jobs 1` 로 동시 요청 줄이기. `POLLINATIONS_TOKEN` 발급 |
| `[image] pollinations 실패: 요청 실패: timeout` | 생성이 느림 | 재실행. 프롬프트를 짧게. 스톡 키(Pexels) 추가로 폴백 확보 |
| 사진 대신 전부 `card` | 키 없음 + Openverse/Wikimedia 실패 | `PEXELS_API_KEY` 발급(무료 2분)이 가장 확실. `python scripts/selftest_providers.py` 로 코드 경로부터 확인 |
| `연결 불가 → 이번 실행에서 건너뜁니다` | 방화벽·프록시가 그 호스트를 막음 | 회사망이면 개인망에서 실행하거나, 막히지 않는 제공자만 `--image-providers` 로 지정 |
| 사진이 주제와 안 맞음 | `keywords` 가 너무 길거나 사진이 없는 개념 | 흔한 명사 2~3개로 줄인다(`octopus three hearts` → `octopus underwater`). 개념은 은유 사물로 |
| 이미지가 `card` 로 떨어짐 | 모든 제공자 실패 | 위 조치 후 `--force` 는 쓰지 말고(성공분 보존) 그 씬의 `image_prompt` 만 바꿔 재실행 |
| 이미지가 주제와 다름 | 프롬프트가 추상적 | `피사체+구도+배경+조명` 으로 구체화, `keywords` 에 구체 명사 |
| 자막이 네모(□)로 나옴 | 폰트 미로딩 또는 이모지 | `assets/fonts/Pretendard-ExtraBold.otf` 존재 확인. 이모지는 자동 제거되지만 특수기호는 피하기 |
| Windows 에서 `ass=` 필터 경로 오류 | 경로의 `:`·`\`·공백 | 스크립트가 이스케이프하지만, 저장소를 **공백·한글 없는 경로**에 두면 가장 안전 |
| `[plan] 60초를 넘습니다` | 대본이 김 | 문장 삭제 또는 `rate` `+12%`. 유튜브 쇼츠는 60초 초과 시 노출이 달라짐 |
| BGM 이 너무 큼/작음 | 소스 라우드니스 차이 | `bgm.volume` 0.2~0.4 사이에서 조정(덕킹은 자동) |
| 전환 때 화면이 튐 | 이미지가 극단적 비율 | 세로 1080x1920 으로 정규화되므로 드묾. `style.transition` 을 `fade` 로 |
| 렌더가 느림 | 씬 많음/느린 PC | 클립은 `veryfast` 프리셋. 씬 6~9개 권장. 재실행 시 캐시로 빨라짐 |
| `Duration` 과 자막이 안 맞음 | TTS 캐시가 옛 대본 | 대본을 바꾸면 자동 재생성되지만, 의심되면 `work/nar_XX.json` 의 `text` 확인 후 `--force` |
| 한글 로그가 깨짐 (Windows) | 콘솔 인코딩 | 스크립트가 UTF-8 로 재설정함. 여전히 깨지면 `chcp 65001` |

## 단계별 단독 실행 (디버깅)

```bash
S=.claude/skills/auto-shorts/scripts
python $S/tts.py --text "테스트 문장입니다." --out /tmp/t.mp3 --voice female --rate +8%
python $S/fetch_images.py --prompt "a red fox in snow, close-up" --keywords "red fox snow" --out /tmp/fox.jpg
python $S/fetch_audio.py bgm --mood mysterious --duration 50 --out /tmp/bgm.mp3
python $S/fetch_audio.py sfx --name boom --out /tmp/boom.wav
python $S/make_shorts.py shorts_output/<slug>/project.json --out shorts_output --stage images   # 이미지까지만
```

## 산출물 구조

```
shorts_output/<slug>/
  project.json     입력 사본
  final.mp4        완성본 (1080x1920, 30fps, H.264 + AAC 192k, -14 LUFS)
  thumbnail.jpg    첫 씬 + 제목
  preview.jpg      12프레임 그리드 (검수용)
  meta.md          제목·설명·해시태그·출처
  work/            nar_XX.mp3/.json(타이밍) · img_XX.jpg/.json(출처) · bgm.mp3 · sfx_*.wav · subs.ass
                   · clip_XX.mp4 · video.mp4 · narration.wav · music.wav · sfx.wav · signatures.json(캐시 서명)
```
