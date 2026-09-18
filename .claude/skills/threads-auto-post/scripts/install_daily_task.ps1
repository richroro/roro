# Registers a Windows Scheduled Task that posts one Threads update every day.
$ErrorActionPreference = "Stop"
$here = $PSScriptRoot
$taskName = "RichgogoThreadsDaily"
$bat = Join-Path $here "daily_post.bat"

# 게시 시간 (24h). 원하면 바꾸세요. 예: 8:00am / 20:30
$runAt = "8:00am"

# 클라우드(GitHub Actions) 스케줄과 이 예약작업을 같이 켜면 같은 글이 두 번 올라간다.
# 워크플로 파일이 있으면 한 번 더 확인한다.
$repoRoot = Resolve-Path (Join-Path $here "..\..\..\..")
$cloudWorkflow = Join-Path $repoRoot ".github\workflows\threads-daily.yml"
if (Test-Path $cloudWorkflow) {
    Write-Warning "GitHub Actions 워크플로(threads-daily.yml)가 있습니다. 클라우드 스케줄을 쓰고 있다면 이 예약작업은 등록하지 마세요 (같은 글이 두 번 게시됨)."
    $ans = Read-Host "그래도 Windows 예약작업을 등록할까요? (y/N)"
    if ($ans -ne "y") { Write-Host "등록 취소."; exit 1 }
}

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
