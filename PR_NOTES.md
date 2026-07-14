Summary of UI changes

Files changed:
- src/main/resources/static/index.html
- src/main/resources/static/style.css
- src/main/resources/static/app.js

What I changed:
- Moved deity image into the left sidebar and added compact Traders/Enterprises buttons above it.
- Swapped login layout so deity image appears left and login form right on wide screens; stacked on mobile.
- Central home-mode buttons are hidden when sidebar compact mode is active; shown on small screens.
- Added smoother show/hide transitions and polished button hover/focus states.
- Improved accessibility: ARIA attributes on compact buttons, keyboard activation via Enter/Space, focus styles.

How to test locally:
1. Start the application:

```powershell
.\gradlew.bat bootRun
```

2. Open a browser and visit: http://localhost:8080/
3. On wide screens you should see the deity image on the left, compact Traders/Enterprises icons above it, and the login form on the right.
4. After logging in (or if a token exists in localStorage), the left sidebar will show mode selection; compact buttons will set active state and central home buttons will hide.
5. Test keyboard access: focus the compact buttons with Tab and press Enter or Space to activate.

Notes / next steps:
- If the index does not refresh, clear browser cache or stop/restart the Spring Boot app to pick up static file changes.
- I can create a git branch and commit these changes, then prepare a PR with screenshots if you want.
