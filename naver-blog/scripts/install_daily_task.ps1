# 매일 정해진 시간에 네이버 블로그 글을 발행하는 Windows 예약작업을 등록한다.
# 크롬 창을 띄우는 방식이므로 "사용자가 로그온한 경우에만 실행" 으로 등록된다.
$ErrorActionPreference = "Stop"
$here = $PSScriptRoot
$taskName = "NaverBlogDaily"
$bat = Join-Path $here "daily_post.bat"

# 발행 시간 (24h). 원하면 바꾸세요. 예: 9:00am / 21:30
$runAt = "9:00am"

$action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$bat`""
$trigger = New-ScheduledTaskTrigger -Daily -At $runAt
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings `
    -Description "Publish one queued post to Naver Blog every day (naver-blog)"

Write-Host "예약작업 '$taskName' 등록 완료. 매일 $runAt 에 실행됩니다."
Write-Host "지금 바로 테스트:  Start-ScheduledTask -TaskName $taskName"
Write-Host "로그 확인:        Get-Content `"$here\daily_post.log`" -Tail 20"
Write-Host "삭제:             Unregister-ScheduledTask -TaskName $taskName -Confirm:`$false"
