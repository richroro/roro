@echo off
REM Send today's automation-entrepreneur task list to Slack.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0send_daily_tasks.ps1"
