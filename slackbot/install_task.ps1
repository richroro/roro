$ErrorActionPreference = "Stop"
$here = $PSScriptRoot
$taskName = "RichgogoSlackBot"

$action = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$here\run_forever.ps1`""

$trigger = New-ScheduledTaskTrigger -AtLogOn

$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit ([TimeSpan]::Zero)

Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description "Slack bot that lets from0731 control this PC via Slack DM"

Write-Host "Task '$taskName' registered. It will start the Slack bot at next logon."
Write-Host "To start it right now without logging off/on, run:"
Write-Host "  Start-ScheduledTask -TaskName $taskName"
