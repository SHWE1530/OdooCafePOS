from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import Table, Floor, User
from app.schemas import TableCreate, TableResponse
from app.auth import get_current_user, check_role

router = APIRouter(prefix="/tables", tags=["Tables"])

@router.get("", response_model=List[TableResponse])
def get_tables(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Table).filter(Table.is_deleted == False).all()

@router.get("/public", response_model=List[TableResponse])
def get_public_tables(db: Session = Depends(get_db)):
    return db.query(Table).filter(Table.is_deleted == False, Table.is_active == True).all()

@router.post("", response_model=TableResponse, status_code=status.HTTP_201_CREATED)
def create_table(
    table_in: TableCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(check_role(["admin"]))
):
    # Check floor exists
    floor = db.query(Floor).filter(Floor.id == table_in.floor_id, Floor.is_deleted == False).first()
    if not floor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Floor not found"
        )
        
    db_table = Table(
        table_number=table_in.table_number,
        seats=table_in.seats,
        status=table_in.status,
        floor_id=table_in.floor_id,
        x_pos=table_in.x_pos,
        y_pos=table_in.y_pos,
        is_active=True
    )
    db.add(db_table)
    db.commit()
    db.refresh(db_table)
    return db_table

@router.put("/{id}", response_model=TableResponse)
def update_table(
    id: int, 
    table_in: TableCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(check_role(["admin", "employee"]))
):
    db_table = db.query(Table).filter(Table.id == id, Table.is_deleted == False).first()
    if not db_table:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Table not found"
        )
        
    floor = db.query(Floor).filter(Floor.id == table_in.floor_id, Floor.is_deleted == False).first()
    if not floor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Floor not found"
        )
        
    db_table.table_number = table_in.table_number
    db_table.seats = table_in.seats
    db_table.status = table_in.status
    db_table.floor_id = table_in.floor_id
    db_table.x_pos = table_in.x_pos
    db_table.y_pos = table_in.y_pos
    
    db.commit()
    db.refresh(db_table)
    return db_table

@router.put("/{id}/status", response_model=TableResponse)
def update_table_status(
    id: int,
    status_str: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if status_str not in ["available", "occupied", "reserved"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid status. Must be 'available', 'occupied', or 'reserved'"
        )
        
    db_table = db.query(Table).filter(Table.id == id, Table.is_deleted == False).first()
    if not db_table:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Table not found"
        )
        
    db_table.status = status_str
    db.commit()
    db.refresh(db_table)
    return db_table

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_table(
    id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(check_role(["admin"]))
):
    db_table = db.query(Table).filter(Table.id == id, Table.is_deleted == False).first()
    if not db_table:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Table not found"
        )
        
    db_table.is_deleted = True
    db.commit()
    return
