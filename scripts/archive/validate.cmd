@echo off
setlocal
node "%~dp0validate.mjs" %*
exit /b %ERRORLEVEL%
