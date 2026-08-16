# Sends the daily "automation entrepreneur" task list to Slack DM.
# All Korean text lives in message_template.txt (UTF-8), so this script stays ASCII-safe.
$ErrorActionPreference = "Stop"

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $here
$envFile = Join-Path $repoRoot "slackbot\.env"

# --- read bot token from slackbot/.env ---
$token = $null
if (-not (Test-Path $envFile)) { throw ".env not found at $envFile" }
foreach ($line in Get-Content $envFile) {
    if ($line -match '^\s*SLACK_BOT_TOKEN\s*=\s*(.+)$') { $token = $Matches[1].Trim() }
}
if (-not $token) { throw "SLACK_BOT_TOKEN not found in $envFile" }

# Slack user ID to DM (the owner of this workspace account)
$channel = "U06BM8TBB6C"

# --- build message from UTF-8 template ---
$templatePath = Join-Path $here "message_template.txt"
$text = [System.IO.File]::ReadAllText($templatePath, [System.Text.Encoding]::UTF8)
$today = Get-Date -Format "yyyy-MM-dd dddd"
$text = $text.Replace("{DATE}", $today)

# --- send via Slack Web API ---
$payload = @{ channel = $channel; text = $text } | ConvertTo-Json -Depth 5
$bytes = [System.Text.Encoding]::UTF8.GetBytes($payload)

$resp = Invoke-RestMethod -Uri "https://slack.com/api/chat.postMessage" -Method Post `
    -Headers @{ Authorization = "Bearer $token" } `
    -ContentType "application/json; charset=utf-8" `
    -Body $bytes

if (-not $resp.ok) { throw "Slack API error: $($resp.error)" }
Write-Host "OK - sent to $channel at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') (ts=$($resp.ts))"
