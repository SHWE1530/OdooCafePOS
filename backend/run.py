import os
import sys
import uvicorn

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, Base
from app.seed import seed_db

def main():
    db_file = "cafe_pos.db"
    
    # Check if database exists, if not, create tables and seed
    if not os.path.exists(db_file) or "--seed" in sys.argv:
        print("Database not found or seed flag provided. Creating tables and seeding data...")
        # Clear existing DB if seeding requested
        if "--seed" in sys.argv and os.path.exists(db_file):
            try:
                os.remove(db_file)
                print("Removed existing database file.")
            except Exception as e:
                print(f"Error removing database: {e}")
                
        Base.metadata.create_all(bind=engine)
        seed_db()
        print("Database initialization complete.")
    else:
        # Ensure tables are created anyway
        Base.metadata.create_all(bind=engine)
        print("Database found. Starting server...")

    # Run FastAPI using Uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

if __name__ == "__main__":
    main()
