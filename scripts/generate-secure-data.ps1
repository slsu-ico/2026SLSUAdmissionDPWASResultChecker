param(
  [string]$SourceCsv = "data.csv",
  [string]$OutputFile = "data.secure.json",
  [string]$Secret = $env:DATA_ENCRYPTION_KEY
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Normalize-AppNo {
  param([string]$Value)

  if ($null -eq $Value) {
    return ""
  }

  return (($Value.ToUpperInvariant()) -replace "[^A-Z0-9]", "")
}

function Get-Sha256Hex {
  param([string]$Value)

  $bytes = [System.Text.Encoding]::UTF8.GetBytes($Value)
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    $hash = $sha.ComputeHash($bytes)
  } finally {
    $sha.Dispose()
  }

  return ([System.BitConverter]::ToString($hash)).Replace("-", "").ToLowerInvariant()
}

function Get-DerivedKeys {
  param([string]$Passphrase)

  $bytes = [System.Text.Encoding]::UTF8.GetBytes($Passphrase)
  $sha = [System.Security.Cryptography.SHA512]::Create()
  try {
    $digest = $sha.ComputeHash($bytes)
  } finally {
    $sha.Dispose()
  }

  return @{
    EncKey = [byte[]]$digest[0..31]
    MacKey = [byte[]]$digest[32..63]
  }
}

function Protect-Value {
  param(
    [string]$Plaintext,
    [byte[]]$EncKey,
    [byte[]]$MacKey
  )

  $aes = New-Object System.Security.Cryptography.AesManaged
  $aes.Mode = [System.Security.Cryptography.CipherMode]::CBC
  $aes.Padding = [System.Security.Cryptography.PaddingMode]::PKCS7
  $aes.KeySize = 256
  $aes.BlockSize = 128
  $aes.Key = $EncKey
  $aes.GenerateIV()
  $ivBytes = [byte[]]$aes.IV.Clone()

  try {
    $encryptor = $aes.CreateEncryptor()
    try {
      $plainBytes = [System.Text.Encoding]::UTF8.GetBytes($Plaintext)
      $cipherBytes = $encryptor.TransformFinalBlock($plainBytes, 0, $plainBytes.Length)
    } finally {
      $encryptor.Dispose()
    }
  } finally {
    $aes.Dispose()
  }

  $combined = New-Object byte[] ($ivBytes.Length + $cipherBytes.Length)
  [System.Buffer]::BlockCopy($ivBytes, 0, $combined, 0, $ivBytes.Length)
  [System.Buffer]::BlockCopy($cipherBytes, 0, $combined, $ivBytes.Length, $cipherBytes.Length)

  $hmac = New-Object System.Security.Cryptography.HMACSHA256(,$MacKey)
  try {
    $macBytes = $hmac.ComputeHash($combined)
  } finally {
    $hmac.Dispose()
  }

  return @{
    iv = [Convert]::ToBase64String($ivBytes)
    data = [Convert]::ToBase64String($cipherBytes)
    mac = [Convert]::ToBase64String($macBytes)
  }
}

if ([string]::IsNullOrWhiteSpace($Secret)) {
  throw "Missing DATA_ENCRYPTION_KEY. Set it in the environment or pass -Secret."
}

if (-not (Test-Path -LiteralPath $SourceCsv)) {
  throw "Source CSV not found: $SourceCsv"
}

$rows = Import-Csv -LiteralPath $SourceCsv
if (-not $rows -or $rows.Count -eq 0) {
  throw "No records found in $SourceCsv"
}

$keys = Get-DerivedKeys -Passphrase $Secret
$records = [ordered]@{}
$count = 0

foreach ($row in $rows) {
  $rowObject = $row.PSObject.Properties
  $appProperty = $rowObject | Where-Object {
    ($_.Name.ToLowerInvariant().Trim()) -in @("application no.", "applicationno", "appno", "application#", "application number", "examineeno")
  } | Select-Object -First 1

  $programProperty = $rowObject | Where-Object {
    ($_.Name.ToLowerInvariant().Trim()) -in @("first choice program", "firstchoiceprogram", "first choice", "program", "course")
  } | Select-Object -First 1

  if ($null -eq $appProperty -or $null -eq $programProperty) {
    throw "CSV must include Application No. and First Choice Program columns."
  }

  $normalizedAppNo = Normalize-AppNo -Value ([string]$appProperty.Value)
  $program = ([string]$programProperty.Value).Trim()

  if ([string]::IsNullOrWhiteSpace($normalizedAppNo) -or [string]::IsNullOrWhiteSpace($program)) {
    continue
  }

  $hash = Get-Sha256Hex -Value $normalizedAppNo
  $records[$hash] = Protect-Value -Plaintext $program -EncKey $keys.EncKey -MacKey $keys.MacKey
  $count++
}

$payload = [ordered]@{
  version = 1
  algorithm = "aes-256-cbc+hmac-sha256"
  recordCount = $count
  source = (Split-Path -Leaf $SourceCsv)
  generatedAt = [DateTime]::UtcNow.ToString("o")
  records = $records
}

$json = $payload | ConvertTo-Json -Depth 6
$outputPath = Join-Path -Path (Resolve-Path ".").Path -ChildPath $OutputFile
[System.IO.File]::WriteAllText($outputPath, $json, [System.Text.Encoding]::UTF8)

Write-Host "Generated $OutputFile with $count encrypted records."
