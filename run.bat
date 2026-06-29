@echo off
title Sri Balaji Traders & Enterprises Management Suite
echo Unsetting invalid JAVA_HOME...
set "JAVA_HOME="
echo Checking application package...
if not exist "build\libs\traders-0.0.1-SNAPSHOT.jar" (
    echo Building the application package first time (Please wait, this will take about 1 minute)...
    call .\gradlew.bat build -x test
)
echo.
echo Starting Sri Balaji Traders & Enterprises Backend...
echo -------------------------------------------------------------
echo The application is launching. Once started, open your web
echo browser and navigate to: http://localhost:8080
echo -------------------------------------------------------------
echo.
java -jar build\libs\traders-0.0.1-SNAPSHOT.jar
pause
