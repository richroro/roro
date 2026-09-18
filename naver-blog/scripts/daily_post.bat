@echo off
REM 매일 글 하나를 네이버 블로그에 발행한다. Windows 예약작업이 이 파일을 호출한다.
REM 큐가 비어 있으면 topics.txt 의 다음 주제로 글을 생성해 발행한다 (ANTHROPIC_API_KEY 필요).
setlocal
set "HERE=%~dp0"
cd /d "%HERE%.."
python -m naverblog run >> "%HERE%daily_post.log" 2>&1
endlocal
