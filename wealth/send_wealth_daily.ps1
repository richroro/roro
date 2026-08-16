# Sends the daily "10-year wealth" action to Slack DM.
# Each day shows: current roadmap phase + one rotating mission from one of the 6 pillars.
# All Korean content lives in roadmap.json (UTF-8); this script stays ASCII-safe.
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

# Slack user ID to DM (owner of this workspace account)
$channel = "U06BM8TBB6C"

# --- load roadmap (UTF-8) ---
$roadmapPath = Join-Path $here "roadmap.json"
$json = [System.IO.File]::ReadAllText($roadmapPath, [System.Text.Encoding]::UTF8)
$plan = $json | ConvertFrom-Json

# --- compute day index since start ---
$start = [datetime]::ParseExact($plan.meta.start, "yyyy-MM-dd", $null)
$today = (Get-Date).Date
$dayIndex = [int]([math]::Floor(($today - $start).TotalDays))
if ($dayIndex -lt 0) { $dayIndex = 0 }
$dayNum = $dayIndex + 1
$totalDays = [int]([datetime]::ParseExact($plan.meta.target, "yyyy-MM-dd", $null) - $start).TotalDays

# --- find current phase ---
$phase = $plan.phases[0]
foreach ($p in $plan.phases) {
    if ($dayIndex -ge $p.range_days[0] -and $dayIndex -le $p.range_days[1]) { $phase = $p; break }
    if ($dayIndex -gt $p.range_days[1]) { $phase = $p }
}

# --- pick today's pillar + mission (rotate through everything) ---
$pillars = $plan.pillars
$pIdx = $dayIndex % $pillars.Count
$pillar = $pillars[$pIdx]
$cycle = [int]([math]::Floor($dayIndex / $pillars.Count))
$mIdx = $cycle % $pillar.missions.Count
$mission = $pillar.missions[$mIdx]

# --- progress bar ---
$pct = [math]::Round(($dayIndex / [double]$totalDays) * 100, 1)
$filled = [int]([math]::Floor($pct / 10))
if ($filled -lt 0) { $filled = 0 }
if ($filled -gt 10) { $filled = 10 }
$bar = ("#" * $filled) + ("-" * (10 - $filled))

# --- build message ---
$tick = [char]96  # backtick, for Slack inline-code formatting
$dateStr = Get-Date -Format "yyyy-MM-dd dddd"
$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine(":moneybag: *10년 부자 프로젝트 - 오늘의 한 걸음*")
[void]$sb.AppendLine("_" + $dateStr + "  |  Day " + $dayNum + " / " + $totalDays + "  (" + $pct + "%)_")
[void]$sb.AppendLine($tick + "[" + $bar + "]" + $tick)
[void]$sb.AppendLine("")
[void]$sb.AppendLine("*" + $phase.name + "*  _(" + $phase.period + ")_")
[void]$sb.AppendLine("> " + $phase.focus)
[void]$sb.AppendLine("")
[void]$sb.AppendLine("*오늘의 집중 -- " + $pillar.emoji + " " + $pillar.name + "*")
[void]$sb.AppendLine(":dart: *미션:* " + $mission)
[void]$sb.AppendLine("_" + $pillar.note + "_")
[void]$sb.AppendLine("")
[void]$sb.AppendLine(":arrows_counterclockwise: *부의 플라이휠*")
[void]$sb.AppendLine("> " + $plan.flywheel)
[void]$sb.AppendLine("")
[void]$sb.AppendLine("---")
[void]$sb.AppendLine($plan.closing)
$text = $sb.ToString()

# --- send via Slack Web API ---
$payload = @{ channel = $channel; text = $text } | ConvertTo-Json -Depth 5
$bytes = [System.Text.Encoding]::UTF8.GetBytes($payload)

$resp = Invoke-RestMethod -Uri "https://slack.com/api/chat.postMessage" -Method Post `
    -Headers @{ Authorization = "Bearer $token" } `
    -ContentType "application/json; charset=utf-8" `
    -Body $bytes

if (-not $resp.ok) { throw "Slack API error: $($resp.error)" }
Write-Host "OK - sent to $channel (Day $dayNum, phase '$($phase.name)', pillar '$($pillar.name)') at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

# --- also send a condensed version to KakaoTalk (non-fatal on failure) ---
# All Korean comes from roadmap.json values (already decoded as UTF-8); the glue
# below is ASCII-only so this script needs no special file encoding.
try {
    $ksb = New-Object System.Text.StringBuilder
    [void]$ksb.AppendLine("[" + $plan.meta.title + "] Day " + $dayNum + "/" + $totalDays + " (" + $pct + "%)")
    [void]$ksb.AppendLine("")
    [void]$ksb.AppendLine($phase.name)
    [void]$ksb.AppendLine($pillar.emoji + " " + $pillar.name)
    [void]$ksb.AppendLine($mission)
    $kakaoText = $ksb.ToString()

    $tmp = Join-Path $env:TEMP ("kakao_wealth_" + [guid]::NewGuid().ToString("N") + ".txt")
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($tmp, $kakaoText, $utf8NoBom)
    $sender = Join-Path $repoRoot "kakao\send_kakao.py"
    $py = "C:\Users\MiJin\AppData\Local\Programs\Python\Python312\python.exe"
    if (-not (Test-Path $py)) { $py = "python" }
    & $py $sender --file $tmp
    Remove-Item $tmp -ErrorAction SilentlyContinue
    Write-Host "OK - also sent to KakaoTalk"
} catch {
    Write-Host "WARN - KakaoTalk send failed: $($_.Exception.Message)"
}
