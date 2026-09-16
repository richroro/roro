# Registers a Windows Scheduled Task that posts one Threads update every day.
$ErrorActionPreference = "Stop"
$here = $PSScriptRoot
$taskName = "RichgogoThreadsDaily"
$bat = Join-Path $here "daily_post.bat"

# 게시 시간 (24h). 원하면 바꾸세요. 예: 8:00am / 20:30
$runAt = "8:00am"

$action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$bat`""
$trigger = New-ScheduledTaskTrigger -Daily -At $runAt
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings `
    -Description "Post a daily work-automation thread to Threads, then notify Slack"

Write-Host "예약작업 '$taskName' 등록 완료. 매일 $runAt 에 실행됩니다."
Write-Host "지금 바로 테스트:  Start-ScheduledTask -TaskName $taskName"
Write-Host "로그 확인:        Get-Content `"$here\daily_post.log`" -Tail 20"
Write-Host "삭제:             Unregister-ScheduledTask -TaskName $taskName -Confirm:`$false"
