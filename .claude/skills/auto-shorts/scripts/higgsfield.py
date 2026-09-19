#!/usr/bin/env python3
"""Higgsfield(힉스필드) AI 영상 생성 연동 (auto-shorts).

project.json 의 씬별 `image_prompt` 를 Higgsfield 에 보내 9:16 클립을 만들고, 내려받아
씬의 `video` 필드에 연결한다. 그 뒤 `make_shorts.py` 를 돌리면 정지 이미지 대신 그 클립이 쓰인다.

    export HIGGSFIELD_API_KEY=...            # (필요하면) HIGGSFIELD_API_SECRET 도
    python scripts/higgsfield.py --project shorts_output/<slug>/project.json --dry-run   # 요청만 확인
    python scripts/higgsfield.py --project shorts_output/<slug>/project.json             # 실제 생성
    python scripts/make_shorts.py shorts_output/<slug>/project.json --out shorts_output

**엔드포인트·필드 이름은 계정/플랜마다 다르다.** 기본값은 흔한 REST 패턴(작업 생성 → 폴링 → 결과 URL)이며,
`secrets/higgsfield.json` 을 만들면 그 값이 우선한다. 먼저 `--dry-run` 으로 어떤 요청이 나가는지 보고,
`--probe` 로 실제 응답을 확인한 뒤 필요한 곳만 고치면 된다.

    secrets/higgsfield.json 예시
    {
      "base": "https://platform.higgsfield.ai/v1",
      "create_path": "/generations",
      "poll_path": "/generations/{id}",
      "auth_header": "Authorization",
      "auth_prefix": "Bearer ",
      "extra_headers": {},
      "body": {"model": "{model}", "prompt": "{prompt}", "aspect_ratio": "9:16",
               "duration": "{duration}", "motion": "{motion}"},
      "id_keys": ["id", "job_id", "generation_id"],
      "status_keys": ["status", "state"],
      "done_values": ["completed", "succeeded", "success", "done"],
      "fail_values": ["failed", "error", "canceled"],
      "url_keys": ["video_url", "url", "output_url", "result_url"]
    }

Higgsfield 를 fal.ai·Replicate 같은 중개 서비스로 쓰는 경우에도 위 설정만 바꾸면 그대로 동작한다.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import time
from pathlib import Path
from typing import Any, Optional

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import SKILL_DIR, die, download, env_key, http_get, log, read_json, warn, write_json  # noqa: E402

STAGE = "higgsfield"
CONFIG_PATH = SKILL_DIR / "secrets" / "higgsfield.json"
DEFAULT_CONFIG: dict[str, Any] = {
    "base": "https://platform.higgsfield.ai/v1",
    "create_path": "/generations",
    "poll_path": "/generations/{id}",
    "auth_header": "Authorization",
    "auth_prefix": "Bearer ",
    "secret_header": "hf-secret",
    "extra_headers": {},
    "body": {"model": "{model}", "prompt": "{prompt}", "aspect_ratio": "9:16",
             "duration": "{duration}", "motion": "{motion}"},
    "id_keys": ["id", "job_id", "generation_id", "request_id"],
    "status_keys": ["status", "state"],
    "done_values": ["completed", "succeeded", "success", "done", "finished"],
    "fail_values": ["failed", "error", "canceled", "cancelled"],
    "url_keys": ["video_url", "url", "output_url", "result_url", "output"],
}
# Higgsfield 는 카메라 무빙 프리셋이 강점이다. 씬의 motion 을 프리셋 이름으로 옮긴다.
MOTION_PRESET = {"in": "dolly_in", "out": "dolly_out", "pan_left": "pan_left", "pan_right": "pan_right",
                 "pan_up": "crane_up", "pan_down": "crane_down", "static": "static"}


def load_config() -> dict:
    cfg = dict(DEFAULT_CONFIG)
    user = read_json(CONFIG_PATH)
    if isinstance(user, dict):
        cfg.update(user)
        log(STAGE, f"설정 덮어쓰기: {CONFIG_PATH}")
    if env_key("HIGGSFIELD_API_BASE"):
        cfg["base"] = env_key("HIGGSFIELD_API_BASE")
    return cfg


def headers(cfg: dict) -> dict:
    key = env_key("HIGGSFIELD_API_KEY", "HIGGSFIELD_KEY")
    if not key:
        die(STAGE, "HIGGSFIELD_API_KEY 가 없습니다. 계정 대시보드에서 발급해 .env 또는 환경변수에 넣으세요.")
    h = {"Content-Type": "application/json", "Accept": "application/json",
         cfg["auth_header"]: f'{cfg.get("auth_prefix", "")}{key}'}
    secret = env_key("HIGGSFIELD_API_SECRET", "HIGGSFIELD_SECRET")
    if secret and cfg.get("secret_header"):
        h[cfg["secret_header"]] = secret
    h.update(cfg.get("extra_headers") or {})
    return h


def _fill(template: Any, values: dict) -> Any:
    """{prompt} 같은 자리표시자를 채운다(문자열·딕셔너리·리스트 재귀)."""
    if isinstance(template, str):
        out = template
        for k, v in values.items():
            out = out.replace("{" + k + "}", str(v))
        return out
    if isinstance(template, dict):
        return {k: _fill(v, values) for k, v in template.items()}
    if isinstance(template, list):
        return [_fill(v, values) for v in template]
    return template


def _dig(obj: Any, keys: list[str]) -> Optional[Any]:
    """중첩된 응답에서 키 이름으로 값을 찾는다(너비 우선)."""
    queue = [obj]
    while queue:
        cur = queue.pop(0)
        if isinstance(cur, dict):
            for k in keys:
                if k in cur and cur[k] not in (None, "", []):
                    return cur[k]
            queue.extend(cur.values())
        elif isinstance(cur, list):
            queue.extend(cur)
    return None


def post_json(url: str, body: dict, hdrs: dict, timeout: int = 120) -> dict:
    import requests  # type: ignore

    r = requests.post(url, json=body, headers=hdrs, timeout=timeout)
    if r.status_code >= 400:
        die(STAGE, f"요청 실패 HTTP {r.status_code}\n  {url}\n  {r.text[:500]}")
    try:
        return r.json()
    except ValueError:
        die(STAGE, f"JSON 이 아닌 응답:\n{r.text[:500]}")
        return {}


def generate_scene(cfg: dict, hdrs: dict, prompt: str, motion: str, duration: float,
                   model: str, out: Path, poll_every: float = 5.0, timeout_s: float = 600) -> Optional[str]:
    """한 씬을 생성해 out 에 내려받는다. 성공하면 결과 URL."""
    values = {"prompt": prompt, "motion": MOTION_PRESET.get(motion, "static"),
              "duration": int(round(duration)), "model": model, "aspect_ratio": "9:16"}
    body = _fill(cfg["body"], values)
    res = post_json(cfg["base"].rstrip("/") + cfg["create_path"], body, hdrs)

    url = _dig(res, cfg["url_keys"])
    job_id = _dig(res, cfg["id_keys"])
    waited = 0.0
    while not url:
        if not job_id:
            die(STAGE, f"작업 ID 도 결과 URL 도 찾지 못했습니다. 응답:\n{json.dumps(res, ensure_ascii=False)[:600]}"
                       f"\n  → secrets/higgsfield.json 의 id_keys/url_keys 를 응답에 맞게 고치세요.")
        if waited > timeout_s:
            warn(STAGE, f"시간 초과({timeout_s:.0f}s) — 작업 {job_id}")
            return None
        time.sleep(poll_every)
        waited += poll_every
        poll = cfg["base"].rstrip("/") + cfg["poll_path"].replace("{id}", str(job_id))
        res = json.loads(http_get(poll, headers=hdrs, timeout=60, retries=2, stage=STAGE).decode("utf-8", "replace"))
        status = str(_dig(res, cfg["status_keys"]) or "").lower()
        if status in [v.lower() for v in cfg["fail_values"]]:
            warn(STAGE, f"생성 실패({status}) — 작업 {job_id}")
            return None
        url = _dig(res, cfg["url_keys"])
        log(STAGE, f"  대기 {waited:.0f}s · 상태 {status or '?'}")
    if isinstance(url, list):
        url = url[0]
    download(str(url), out, timeout=600, min_bytes=50_000, stage=STAGE)
    return str(url)


def main() -> None:
    ap = argparse.ArgumentParser(description="auto-shorts × Higgsfield 영상 생성")
    ap.add_argument("--project", required=True)
    ap.add_argument("--out", default="shorts_output")
    ap.add_argument("--model", default=None, help="모델 이름(기본: HIGGSFIELD_MODEL 환경변수)")
    ap.add_argument("--scenes", default=None, help="일부 씬만: 1,3,5")
    ap.add_argument("--duration", type=float, default=5.0, help="씬당 생성 길이(초)")
    ap.add_argument("--dry-run", action="store_true", help="보낼 요청만 출력")
    ap.add_argument("--probe", action="store_true", help="씬 1개만 실제로 생성해 응답 구조 확인")
    ap.add_argument("--force", action="store_true", help="이미 받은 클립도 다시 생성")
    args = ap.parse_args()

    ppath = Path(args.project)
    project = read_json(ppath)
    if not project:
        die(STAGE, f"프로젝트를 찾을 수 없습니다: {ppath}")
    cfg = load_config()
    model = args.model or env_key("HIGGSFIELD_MODEL") or "turbo"
    style_suffix = (project.get("style") or {}).get("image_style", "")
    work = Path(args.out) / project.get("slug", ppath.parent.name) / "work"
    work.mkdir(parents=True, exist_ok=True)

    want = None
    if args.scenes:
        want = {int(x) for x in re.split(r"[,\s]+", args.scenes) if x.strip().isdigit()}

    made = 0
    for i, sc in enumerate(project["scenes"], 1):
        if want and i not in want:
            continue
        prompt = (sc.get("image_prompt") or sc.get("keywords") or "").strip()
        if not prompt:
            warn(STAGE, f"씬 {i}: image_prompt 가 없어 건너뜁니다")
            continue
        if style_suffix:
            prompt = f"{prompt}, {style_suffix}"
        prompt = f"{prompt}, vertical 9:16, no text"
        out = work / f"vid_{i:02d}.mp4"
        if out.exists() and not args.force:
            sc["video"] = str(out)
            log(STAGE, f"씬 {i}: 이미 있음 — {out.name}")
            continue

        motion = sc.get("motion") or "in"
        if args.dry_run:
            values = {"prompt": prompt, "motion": MOTION_PRESET.get(motion, "static"),
                      "duration": int(args.duration), "model": model, "aspect_ratio": "9:16"}
            print("─" * 60)
            print(f"POST {cfg['base'].rstrip('/') + cfg['create_path']}")
            print("headers:", {k: ("<키>" if "auth" in k.lower() or "secret" in k.lower() else v)
                               for k, v in {**{"Content-Type": "application/json"},
                                            cfg["auth_header"]: "…"}.items()})
            print("body:", json.dumps(_fill(cfg["body"], values), ensure_ascii=False, indent=1))
            continue

        hdrs = headers(cfg)
        log(STAGE, f"씬 {i}/{len(project['scenes'])} 생성 중 ({MOTION_PRESET.get(motion, 'static')}) …")
        url = generate_scene(cfg, hdrs, prompt, motion, args.duration, model, out)
        if url:
            sc["video"] = str(out)
            made += 1
            log(STAGE, f"씬 {i} 완료 → {out}")
        if args.probe:
            break

    if args.dry_run:
        log(STAGE, "--dry-run 이라 아무것도 생성하지 않았습니다")
        return
    if made:
        write_json(ppath, project)      # 씬에 video 경로를 적어 둔다
        log(STAGE, f"{made}개 클립 생성 · project.json 갱신 → 이제 make_shorts.py 를 돌리세요")
    else:
        warn(STAGE, "생성된 클립이 없습니다")


if __name__ == "__main__":
    main()
