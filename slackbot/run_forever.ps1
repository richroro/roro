$ErrorActionPreference = "Continue"
$here = $PSScriptRoot
$log = Join-Path $here "bot.log"

while ($true) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $log -Value "[$timestamp] starting bot.py"
    python "$here\bot.py" *>> $log
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $log -Value "[$timestamp] bot.py exited, restarting in 5s"
    Start-Sleep -Seconds 5
}
