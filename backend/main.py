import os
import logging
from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

from sqlalchemy import create_engine, Column, Integer, String, select
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import sessionmaker, declarative_base, Session

import psycopg2
from psycopg2 import sql
from typing import Optional

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Allow frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database configuration (environment overrides allowed)
PG_USER = os.getenv("POSTGRES_USER", "postgres")
PG_PASSWORD = os.getenv("POSTGRES_PASSWORD", "P00jitha*19")
PG_HOST = os.getenv("POSTGRES_HOST", "localhost")
PG_PORT = os.getenv("POSTGRES_PORT", "5432")
DB_NAME = os.getenv("POSTGRES_DB", "ci_cd_db")

def ensure_database_exists(user: str, password: str, host: str, port: str, db_name: str):
    try:
        conn = psycopg2.connect(dbname="postgres", user=user, password=password, host=host, port=port)
        conn.autocommit = True
        cur = conn.cursor()
        cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (db_name,))
        exists = cur.fetchone()
        if not exists:
            logger.info(f"Creating database {db_name}")
            cur.execute(sql.SQL("CREATE DATABASE {}") .format(sql.Identifier(db_name)))
        cur.close()
        conn.close()
    except Exception as e:
        logger.warning(f"Could not ensure database exists: {e}")


ensure_database_exists(PG_USER, PG_PASSWORD, PG_HOST, PG_PORT, DB_NAME)

DATABASE_URL = f"postgresql+psycopg2://{PG_USER}:{PG_PASSWORD}@{PG_HOST}:{PG_PORT}/{DB_NAME}"

# Setup SQLAlchemy
engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class EmployeeDB(Base):
    __tablename__ = "employees"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    department = Column(String, nullable=False)
    role = Column(String, nullable=True) 


class Employee(BaseModel):
    name: str
    email: str
    department: str
    role: Optional[str] = None


def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.on_event("startup")
def on_startup():
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables ensured/created")
    except OperationalError as e:
        logger.error(f"Database error on startup: {e}")


@app.get("/")
def home():
    return {"message": "Employee API Running"}


@app.post("/employees")
def create_employee(employee: Employee, db: Session = Depends(get_db)):
    emp = EmployeeDB(name=employee.name, email=employee.email, department=employee.department, role=employee.role)
    db.add(emp)
    db.commit()
    db.refresh(emp)
    return {"message": "Employee added successfully", "employee": {"id": emp.id, "name": emp.name, "email": emp.email, "department": emp.department, "role": emp.role}}


@app.get("/employees")
def get_employees(db: Session = Depends(get_db)):
    rows = db.execute(select(EmployeeDB)).scalars().all()
    return [{"id": r.id, "name": r.name, "email": r.email, "department": r.department, "role": r.role} for r in rows]


@app.get("/employees/{employee_id}")
def get_employee(employee_id: int, db: Session = Depends(get_db)):
    emp = db.get(EmployeeDB, employee_id)
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    return {"id": emp.id, "name": emp.name, "email": emp.email, "department": emp.department, "role": emp.role}


@app.put("/employees/{employee_id}")
def update_employee(employee_id: int, updated_employee: Employee, db: Session = Depends(get_db)):
    emp = db.get(EmployeeDB, employee_id)
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    emp.name = updated_employee.name
    emp.email = updated_employee.email
    emp.department = updated_employee.department
    emp.role = updated_employee.role
    db.add(emp)
    db.commit()
    db.refresh(emp)
    return {"message": "Employee updated successfully", "employee": {"id": emp.id, "name": emp.name, "email": emp.email, "department": emp.department, "role": emp.role}}