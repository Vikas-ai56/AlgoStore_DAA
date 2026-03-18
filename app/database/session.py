import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from app.database.models import Base
from app.database.connection import engine

if __name__ == "__main__":
    # Create all tables defined in the models (including User)
    Base.metadata.create_all(engine)
    print("All tables (including User) created successfully.")