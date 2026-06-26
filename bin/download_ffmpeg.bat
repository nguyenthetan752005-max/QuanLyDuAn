@echo off
echo Running PowerShell script to download ffmpeg and ffprobe...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0download_ffmpeg.ps1"
echo.
pause
