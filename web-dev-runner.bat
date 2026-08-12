@echo off
cd /d "D:\workspace\my-prj\tercher-work\work-system\web-app"
echo Starting web [cloud] on http://localhost:5201/
npm run dev > "D:\workspace\my-prj\tercher-work\work-system\web-app-dev.log" 2>&1
