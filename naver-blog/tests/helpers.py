# -*- coding: utf-8 -*-
"""테스트용: 큐·데이터·로그 경로를 임시 폴더로 돌린다."""
import tempfile
from pathlib import Path
from unittest import mock

from naverblog import cli, config, publisher
from naverblog import queue as q


class TempDirs:
    """with TempDirs() as base: ... 안에서 모든 파일 경로가 임시 폴더를 가리킨다."""

    def __enter__(self):
        self._tmp = tempfile.TemporaryDirectory()
        base = Path(self._tmp.name)
        paths = {
            "QUEUE_DIR": base / "queue",
            "POSTED_DIR": base / "queue" / "posted",
            "DATA_DIR": base / "data",
            "STATE_PATH": base / "data" / "state.json",
            "POSTED_LOG_PATH": base / "data" / "posted_log.json",
            "LOGS_DIR": base / "logs",
            "PROFILE_DIR": base / "profile",
            "EXPORT_DIR": base / "export",
            "TOPICS_PATH": base / "topics.txt",
            "ENV_PATH": base / ".env",
        }
        self._patches = []
        for mod in (config, q, cli, publisher):
            for name, value in paths.items():
                if hasattr(mod, name):
                    self._patches.append(mock.patch.object(mod, name, value))
        for p in self._patches:
            p.start()
        self.paths = paths
        return base

    def __exit__(self, *exc):
        for p in reversed(self._patches):
            p.stop()
        self._tmp.cleanup()
        return False
