$ErrorActionPreference = 'Continue'

$root = (Get-Item -LiteralPath $PSScriptRoot).Parent.FullName.TrimEnd('\')
$killed = New-Object 'System.Collections.Generic.HashSet[int]'
$chargenPort = 5173

function Stop-PidTree([int]$ProcessId, [string]$Reason) {
  if ($ProcessId -le 4 -or -not $killed.Add($ProcessId)) { return }

  $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$ProcessId" -ErrorAction SilentlyContinue
  $parent = $null
  if ($proc) {
    $parent = Get-CimInstance Win32_Process -Filter "ProcessId=$($proc.ParentProcessId)" -ErrorAction SilentlyContinue
  }

  $killId = $ProcessId
  $parentCl = [string]$parent.CommandLine
  if ($parent -and $parent.Name -eq 'node.exe' -and $parentCl -match 'npm-cli') {
    $killId = [int]$parent.ProcessId
    [void]$killed.Add($killId)
  }

  Write-Host "Closing PID $killId ($Reason)"
  & taskkill.exe /F /T /PID $killId | Out-Null
}

function Test-CharGenViteCommand([string]$CommandLine) {
  if (-not $CommandLine) { return $false }
  $fromThisRepo = $CommandLine.IndexOf($root, [StringComparison]::OrdinalIgnoreCase) -ge 0
  return ($fromThisRepo -and $CommandLine -match 'vite')
}

function Get-ListenPids([int]$Port) {
  $pids = New-Object 'System.Collections.Generic.HashSet[int]'
  Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
    ForEach-Object { [void]$pids.Add([int]$_.OwningProcess) }

  $pattern = ':{0}\s+\S+\s+LISTENING\s+(\d+)\s*$' -f $Port
  netstat -ano | ForEach-Object {
    if ($_ -match $pattern) {
      [void]$pids.Add([int]$Matches[1])
    }
  }

  return @($pids)
}

Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue | ForEach-Object {
  if (Test-CharGenViteCommand ([string]$_.CommandLine)) {
    Stop-PidTree ([int]$_.ProcessId) 'leftover CharGen.AI Vite'
  }
}

Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
  Where-Object { $_.LocalPort -eq 4173 -or ($_.LocalPort -ge 5173 -and $_.LocalPort -le 5250) } |
  ForEach-Object {
    $owner = Get-CimInstance Win32_Process -Filter "ProcessId=$($_.OwningProcess)" -ErrorAction SilentlyContinue
    if (-not $owner) { return }
    $cl = [string]$owner.CommandLine
    if (Test-CharGenViteCommand $cl) {
      Stop-PidTree ([int]$owner.ProcessId) "CharGen.AI on port $($_.LocalPort)"
    }
  }

foreach ($listenPid in (Get-ListenPids $chargenPort)) {
  if ($listenPid -le 4) { continue }
  $owner = Get-CimInstance Win32_Process -Filter "ProcessId=$listenPid" -ErrorAction SilentlyContinue
  $label = if ($owner) { $owner.Name } else { 'unknown' }
  Stop-PidTree $listenPid "port $chargenPort held by $label"
}

$deadline = (Get-Date).AddSeconds(8)
while ((Get-Date) -lt $deadline) {
  $left = @(Get-ListenPids $chargenPort | Where-Object { $_ -gt 4 })
  if ($left.Count -eq 0) { break }
  Start-Sleep -Milliseconds 250
}

$still = @(Get-ListenPids $chargenPort | Where-Object { $_ -gt 4 })
if ($still.Count -gt 0) {
  Write-Host "Port $chargenPort is still in use by PID(s): $($still -join ', ')"
  exit 1
}

if ($killed.Count -gt 0) {
  Start-Sleep -Milliseconds 400
}

exit 0
