from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import Floor, User
from app.schemas import FloorCreate, FloorResponse
from app.auth import get_current_user, check_role

router = APIRouter(prefix="/floors", tags=["Floors"])

@router.get("", response_model=List[FloorResponse])
def get_floors(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Floor).filter(Floor.is_deleted == False).all()

@router.get("/public", response_model=List[FloorResponse])
def get_public_floors(db: Session = Depends(get_db)):
    return db.query(Floor).filter(Floor.is_deleted == False, Floor.is_active == True).all()

@router.post("", response_model=FloorResponse, status_code=status.HTTP_201_CREATED)
def create_floor(
    floor_in: FloorCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(check_role(["admin"]))
):
    existing = db.query(Floor).filter(Floor.name == floor_in.name, Floor.is_deleted == False).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Floor with this name already exists"
        )
    
    db_floor = Floor(name=floor_in.name, is_active=True)
    db.add(db_floor)
    db.commit()
    db.refresh(db_floor)
    return db_floor

@router.put("/{id}", response_model=FloorResponse)
def update_floor(
    id: int, 
    floor_in: FloorCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(check_role(["admin"]))
):
    db_floor = db.query(Floor).filter(Floor.id == id, Floor.is_deleted == False).first()
    if not db_floor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Floor not found"
        )
        
    existing = db.query(Floor).filter(
        Floor.name == floor_in.name, 
        Floor.id != id, 
        Floor.is_deleted == False
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Floor with this name already exists"
        )
        
    db_floor.name = floor_in.name
    db.commit()
    db.refresh(db_floor)
    return db_floor

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_floor(
    id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(check_role(["admin"]))
):
    db_floor = db.query(Floor).filter(Floor.id == id, Floor.is_deleted == False).first()
    if not db_floor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Floor not found"
        )
        
    db_floor.is_deleted = True
    db.commit()
    return
