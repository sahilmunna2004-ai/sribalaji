# PostgreSQL Setup Instructions for Sri Balaji Traders
# Using pgAdmin for database management

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   PostgreSQL Setup for Sri Balaji Traders & Enterprises    ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

Write-Host "`n📋 SETUP INSTRUCTIONS USING pgADMIN:" -ForegroundColor Yellow
Write-Host "`n1️⃣  OPEN pgADMIN" -ForegroundColor Green
Write-Host "   → Launch pgAdmin from your applications"
Write-Host "   → Log in if prompted"

Write-Host "`n2️⃣  CREATE DATABASE" -ForegroundColor Green
Write-Host "   → Right-click on 'Databases' in the left panel"
Write-Host "   → Select 'Create > Database'"
Write-Host "   → Database name: balaji_traders"
Write-Host "   → Owner: postgres"
Write-Host "   → Click Save"

Write-Host "`n3️⃣  VERIFY DATABASE CREATED" -ForegroundColor Green
Write-Host "   → Expand 'Databases' in left panel"
Write-Host "   → You should see 'balaji_traders' listed"

Write-Host "`n4️⃣  BUILD AND START APPLICATION" -ForegroundColor Green
Write-Host "   → Run: gradle build"
Write-Host "   → Run: gradle bootRun"
Write-Host "   → Application will automatically run migration scripts"

Write-Host "`n5️⃣  VERIFY TABLES CREATED" -ForegroundColor Green
Write-Host "   → In pgAdmin, expand: balaji_traders > Schemas > public > Tables"
Write-Host "   → You should see these tables:"
Write-Host "     • farmers"
Write-Host "     • notebook_pages"
Write-Host "     • transactions"
Write-Host "     • stock"
Write-Host "     • image_metadata"

Write-Host "`n📊 DATABASE CONNECTION DETAILS:" -ForegroundColor Cyan
Write-Host "   Host: localhost" -ForegroundColor White
Write-Host "   Port: 5432" -ForegroundColor White
Write-Host "   Database: balaji_traders" -ForegroundColor White
Write-Host "   Username: postgres" -ForegroundColor White
Write-Host "   Password: postgres" -ForegroundColor White

Write-Host "`n🔧 MIGRATION FILES:" -ForegroundColor Cyan
Write-Host "   V1__init.sql      → Creates all tables with PostgreSQL syntax" -ForegroundColor White
Write-Host "   V2__seed_data.sql → Loads initial data (2 farmers, transactions, stock)" -ForegroundColor White

Write-Host "`n📁 TABLE SCHEMA:" -ForegroundColor Cyan
Write-Host "   farmers          → Farmer records with village, crop, season, photos" -ForegroundColor White
Write-Host "   notebook_pages   → Images/pages linked to farmers" -ForegroundColor White
Write-Host "   transactions     → Bills, payments, interest calculations" -ForegroundColor White
Write-Host "   stock            → Inventory management" -ForegroundColor White
Write-Host "   image_metadata   → Image storage tracking" -ForegroundColor White

Write-Host "`n⚙️  TO RESET DATABASE:" -ForegroundColor Yellow
Write-Host "   In pgAdmin Query Tool, run:" -ForegroundColor White
Write-Host "   DROP DATABASE IF EXISTS balaji_traders;" -ForegroundColor Gray
Write-Host "   CREATE DATABASE balaji_traders WITH OWNER postgres;" -ForegroundColor Gray

Write-Host "`n📖 For detailed instructions, see: POSTGRESQL_SETUP.md" -ForegroundColor Cyan
Write-Host "`n✅ Setup ready! Start with pgAdmin and then build the application.`n" -ForegroundColor Green
