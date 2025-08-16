#!/bin/bash

echo "🐘 PostgreSQL Setup for Shelf Pattern Memory"
echo "==========================================="
echo ""

# Check if PostgreSQL is running
if ! pg_isready -q; then
    echo "⚠️  PostgreSQL is not running. Please start PostgreSQL first."
    echo ""
    echo "On macOS with Homebrew:"
    echo "  brew services start postgresql"
    echo ""
    echo "Or start Postgres.app if you're using that."
    exit 1
fi

echo "✅ PostgreSQL is running"
echo ""

# Create database
echo "Creating database 'shelf_patterns'..."
createdb shelf_patterns 2>/dev/null || echo "Database already exists"

echo ""
echo "✅ Database ready!"
echo ""
echo "Next steps:"
echo "1. Update .env file with your PostgreSQL credentials if needed"
echo "2. Run migration: npx tsx src/migrate-to-postgres.ts"
echo "3. Update your code to use patternStorePostgres.ts instead of patternStore.ts"