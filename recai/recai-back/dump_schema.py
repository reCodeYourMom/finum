#!/usr/bin/env python3
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.schema import CreateTable
from database.base import Base

# 1) Charge le .env
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))

# 2) Crée l'engine à la mano
db_url = os.environ.get('DATABASE_URL')
if not db_url:
    raise RuntimeError("❌ DATABASE_URL introuvable dans l'environnement")
engine = create_engine(db_url, echo=False)

# 3) Génère la DDL et écrit dans migrations/init.sql
os.makedirs('migrations', exist_ok=True)
with open('migrations/init.sql', 'w') as f:
    for table in Base.metadata.sorted_tables:
        # Compile la CREATE TABLE pour chaque table
        ddl = str(CreateTable(table).compile(engine)).strip()
        f.write(ddl + ";\n\n")

print("✅ migrations/init.sql généré avec succès !")
