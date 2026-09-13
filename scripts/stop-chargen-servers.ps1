$ErrorActionPreference = 'SilentlyContinue'

$root = (Get-Item -LiteralPath $PSScriptRoot).Parent.FullName.TrimEnd('\')
$killed = New-Object 'System.Collections.Generic.HashSet[int]'

function Stop-ViteTree([int]$ProcessId) {
  if ($ProcessId -le 0 -or -not $killed.Add($ProcessId)) { return }

  $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$ProcessId"
  if (-not $proc -or $proc.Name -ne 'node.exe') { return }

  $parent = Get-CimInstance Win32_Process -Filter "ProcessId=$($proc.ParentProcessId)"
  $parentCl = [string]$parent.CommandLine
  $killId = $ProcessId
  if ($parent -and $parent.Name -eq 'node.exe' -and $parentCl -match 'npm-cli') {
    $killId = [int]$parent.ProcessId
    [void]$killed.Add($killId)
  }

  Write-Host "Closing CharGen.AI server PID $killId"
  & taskkill.exe /F /T /PID $killId | Out-Null
}

function Test-CharGenViteCommand([string]$CommandLine) {
  if (-not $CommandLine) { return $false }
  $fromThisRepo = $CommandLine.IndexOf($root, [StringComparison]::OrdinalIgnoreCase) -ge 0
  return ($fromThisRepo -and $CommandLine -match 'vite')
}

Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | ForEach-Object {
  if (Test-CharGenViteCommand ([string]$_.CommandLine)) {
    Stop-ViteTree ([int]$_.ProcessId)
  }
}

Get-NetTCPConnection -State Listen |
  Where-Object { $_.LocalPort -eq 4173 -or ($_.LocalPort -ge 5173 -and $_.LocalPort -le 5250) } |
  ForEach-Object {
    $owner = Get-CimInstance Win32_Process -Filter "ProcessId=$($_.OwningProcess)"
    if (-not $owner -or $owner.Name -ne 'node.exe') { return }
    $cl = [string]$owner.CommandLine
    if (-not $cl -or $cl -match 'vite') {
      if (-not $cl -or $cl.IndexOf($root, [StringComparison]::OrdinalIgnoreCase) -ge 0) {
        Write-Host "Closing node PID $($owner.ProcessId) on port $($_.LocalPort)"
        Stop-ViteTree ([int]$owner.ProcessId)
      }
    }
  }

if ($killed.Count -gt 0) {
  Start-Sleep -Seconds 1
}
