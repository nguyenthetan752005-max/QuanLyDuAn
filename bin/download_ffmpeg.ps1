$ErrorActionPreference = "Stop"

function Download-GoogleDriveFile {
    param (
        [string]$FileId,
        [string]$OutPath
    )
    
    Write-Host "Downloading file to $OutPath..."
    $Url = "https://drive.google.com/uc?export=download&id=$FileId"
    $WebSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    
    try {
        $Response = Invoke-WebRequest -Uri $Url -WebSession $WebSession -Method Get -ErrorAction SilentlyContinue
    } catch {
        $Response = $_.Exception.Response
    }
    
    $Content = ""
    if ($Response.Content -is [byte[]]) {
        $Content = [System.Text.Encoding]::UTF8.GetString($Response.Content)
    } else {
        $Content = $Response.Content
    }

    if ($Content -match 'action="([^"]+)"') {
        $ActionUrl = $matches[1]
        
        $Confirm = "t"
        $Uuid = ""
        if ($Content -match 'name="uuid" value="([^"]+)"') {
            $Uuid = $matches[1]
        }
        
        if ($ActionUrl -match "^https://") {
            $DownloadUrl = $ActionUrl + "?id=" + $FileId + "&export=download&confirm=" + $Confirm + "&uuid=" + $Uuid
            Write-Host "Bypassing virus scan warning for large file..."
            Invoke-WebRequest -Uri $DownloadUrl -WebSession $WebSession -OutFile $OutPath
        } else {
            Invoke-WebRequest -Uri $Url -WebSession $WebSession -OutFile $OutPath
        }
    } else {
        Invoke-WebRequest -Uri $Url -WebSession $WebSession -OutFile $OutPath
    }
    
    Write-Host "Downloaded successfully!"
    Write-Host ""
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition

Write-Host "--- Downloading FFMPEG ---"
Download-GoogleDriveFile -FileId "1mpujgFFI4cUV7O-eon1n__SKFmZXg0Ux" -OutPath (Join-Path $ScriptDir "ffmpeg.exe")

Write-Host "--- Downloading FFPROBE ---"
Download-GoogleDriveFile -FileId "1ToGceYc8yZOmN5GGjTaOlavGv7sOaLnX" -OutPath (Join-Path $ScriptDir "ffprobe.exe")

Write-Host "All downloads finished successfully!"
