@echo off
REM Runs the unattended daily Blogger publish. Called by the Windows Scheduled Task.
setlocal
set "HERE=%~dp0"
cd /d "%HERE%"
python "%HERE%daily_post.py" >> "%HERE%daily_post.log" 2>&1
endlocal
