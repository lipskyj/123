@echo off
REM Double-click this file on Windows to start Song Splitter.
cd /d "%~dp0"
set "PATH=%USERPROFILE%\.local\bin;%PATH%"
where uv >nul 2>nul
if errorlevel 1 (
  echo Installing uv ^(a small tool that sets up Python for this app^)...
  powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
  set "PATH=%USERPROFILE%\.local\bin;%PATH%"
)
echo Starting Song Splitter (the first start downloads a few GB and takes a few minutes)...
uv run server.py %*
echo Song Splitter stopped.
pause
