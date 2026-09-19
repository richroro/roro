# Registers a Windows Scheduled Task that runs send_daily_tasks.bat every morning.
$ErrorActionPreference = "Stop"
$here = $PSScriptRoot
$taskName = "RichgogoDailyGoals"
$bat = Join-Path $here "send_daily_tasks.bat"

# Change the time here if you want it earlier/later (24h format, e.g. 7:00am / 21:30).
$runAt = "8:00am"

$action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$bat`""
$trigger = New-ScheduledTaskTrigger -Daily -At $runAt
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings `
    -Description "Send daily automation-entrepreneur task list to Slack DM"

Write-Host "Task '$taskName' registered. It will run every day at $runAt."
Write-Host "Run now to test:  Start-ScheduledTask -TaskName $taskName"
Write-Host "Remove it later:  Unregister-ScheduledTask -TaskName $taskName -Confirm:`$false"
