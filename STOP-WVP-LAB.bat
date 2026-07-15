@echo off
REM Stop modern WVP lab stack (mysql/redis/zlm/wvp). Fleet me8-zlm left running.
cd /d "%~dp0"
docker compose -p me8-wvp -f docker\wvp\docker-compose.wvp.yml down
echo WVP modern stack stopped. Fleet me8-zlm left as-is.
pause
