@echo off
rem Thin Windows wrapper so the demo terminal can show `consent-run <command>`
rem instead of `node agents\consent-run.mjs ...`. Delegates to the Node script.
node "%~dp0agents\consent-run.mjs" %*
