@echo off
echo "Pushing to GitHub..."
git add .
git commit -m "update"
git push -u origin master
echo "Push completed. Press any key to exit."
pause > nul