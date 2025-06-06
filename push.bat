@echo off
echo "Pushing to GitHub..."
git add .
git commit -m "commit"
git push -u origin main
echo "Push completed. Press any key to exit."
pause > nul