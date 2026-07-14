# PostgreSQL Setup Instructions using pgAdmin

Follow these steps to set up the PostgreSQL database for Sri Balaji Traders using pgAdmin:

## Step 1: Open pgAdmin
- Launch pgAdmin from your applications
- Log in with your PostgreSQL credentials

## Step 2: Create Database
1. Right-click on **Databases** in the left panel
2. Select **Create > Database**
3. In the **Create - Database** dialog:
   - **Database**: `balaji_traders`
   - **Owner**: `postgres`
4. Click **Save**

## Step 3: Verify Connection
- Expand **Databases** in the left panel
- You should see `balaji_traders` listed
- Right-click and select **Properties** to verify it's created

## Step 4: Run Migration Scripts
Once you start the Spring Boot application, it will automatically:
- Run `V1__init.sql` to create all tables with PostgreSQL syntax
- Run `V2__seed_data.sql` to load initial data
- Create indexes for performance optimization

## Database Connection Details
- **Host**: localhost
- **Port**: 5432
- **Database**: balaji_traders
- **Username**: postgres
- **Password**: postgres
- **JDBC URL**: jdbc:postgresql://localhost:5432/balaji_traders

## Tables Created (Flyway Migration V1)
1. **farmers** - Farmer records with photos and crop details
2. **notebook_pages** - Notebook images linked to farmers
3. **transactions** - Financial transactions (bills, payments, interest)
4. **stock** - Inventory management
5. **image_metadata** - Metadata for image tracking

## Indexes Created
- `idx_farmers_name` - Search farmers by name
- `idx_farmers_village` - Filter by village
- `idx_farmers_season` - Filter by season
- `idx_notebook_pages_farmer_id` - Link images to farmers
- `idx_transactions_farmer_id` - Link transactions to farmers
- `idx_stock_item_name` - Search inventory items

## Seed Data Loaded (V2)
- 2 sample farmers (A. Bhadrayya, Kali Somayya)
- 2 sample transactions
- 3 sample stock items

## Testing the Connection
After starting the application, check:
1. **pgAdmin**: Expand `balaji_traders` > Schemas > public > Tables
   - You should see: farmers, notebook_pages, transactions, stock, image_metadata
2. **Browser Console**: No database connection errors
3. **Application**: Farmers list should display data from PostgreSQL

## Troubleshooting

### Database not created?
- In pgAdmin, right-click on **Databases** and create manually
- Use database name: `balaji_traders`

### Connection refused?
- Verify PostgreSQL service is running
- Check pgAdmin connection settings under **Server > Properties**
- Default port is 5432

### Tables not appearing?
- Start the Spring Boot application to trigger Flyway migrations
- Check application logs for migration errors
- In pgAdmin, refresh the database view (F5)

### Need to clear and restart?
In pgAdmin Query Tool:
```sql
DROP DATABASE IF EXISTS balaji_traders;
CREATE DATABASE balaji_traders WITH OWNER postgres;
```
Then restart the Spring Boot application to re-run migrations.
