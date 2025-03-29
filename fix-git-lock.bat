@echo off
echo Checking for Git lock files...

cd /d "d:\Code\learing react\bit2byte"

if exist ".git\index.lock" (
  echo Found .git\index.lock - removing...
  del /f ".git\index.lock"
  echo Lock file removed successfully.
) else (
  echo No index.lock file found.
)

if exist ".git\refs\heads\*.lock" (
  echo Found lock files in refs/heads/ - removing...
  del /f ".git\refs\heads\*.lock"
  echo Lock files removed successfully.
)

if exist ".git\HEAD.lock" (
  echo Found .git\HEAD.lock - removing...
  del /f ".git\HEAD.lock"
  echo Lock file removed successfully.
)

echo Done. You can now try your Git operation again.
pause
