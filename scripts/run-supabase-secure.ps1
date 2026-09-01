param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$SupabaseArgs
)

# Search for access token across User/Machine registry, process env, or local/home config files
$token = $env:SUPABASE_ACCESS_TOKEN
if (-not $token) {
    $token = [System.Environment]::GetEnvironmentVariable('SUPABASE_ACCESS_TOKEN', 'User')
}
if (-not $token) {
    $token = [System.Environment]::GetEnvironmentVariable('SUPABASE_ACCESS_TOKEN', 'Machine')
}
if (-not $token) {
    $localTokenPath = Join-Path $PSScriptRoot "..\.supabase-access-token.local"
    if (Test-Path $localTokenPath) {
        $token = (Get-Content $localTokenPath -Raw).Trim()
    }
}
if (-not $token) {
    $homeLocalTokenPath = Join-Path $HOME ".supabase-access-token.local"
    if (Test-Path $homeLocalTokenPath) {
        $token = (Get-Content $homeLocalTokenPath -Raw).Trim()
    }
}
if (-not $token) {
    $tokenPath = Join-Path $HOME ".supabase\access-token"
    if (Test-Path $tokenPath) {
        $token = (Get-Content $tokenPath -Raw).Trim()
    }
}

if (-not $token) {
    Write-Error "No Supabase token found in Process, User, Machine environment, or token files."
    exit 1
}

$env:SUPABASE_ACCESS_TOKEN = $token

# Execute supabase command safely
& npx supabase @SupabaseArgs
exit $LASTEXITCODE
