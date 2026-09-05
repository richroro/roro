# Registers a Windows Scheduled Task that sends the daily wealth action to Slack every morning.
$ErrorActionPreference = "Stop"
$here = $PSScriptRoot
$taskName = "RichgogoWealth10yr"
$bat = Join-Path $here "send_wealth_daily.bat"

# Change the time here if you want it earlier/later (24h ok, e.g. 7:00am / 21:30).
# 8:00pm (evening) so it does not overlap with daily_goals (8:00am).
$runAt = "8:00pm"

$action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$bat`""
$trigger = New-ScheduledTaskTrigger -Daily -At $runAt
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings `
    -Description "Send daily 10-year wealth action to Slack DM"

Write-Host "Task '$taskName' registered. It will run every day at $runAt."
Write-Host "Run now to test:  Start-ScheduledTask -TaskName $taskName"
Write-Host "Remove it later:  Unregister-ScheduledTask -TaskName $taskName -Confirm:`$false"
