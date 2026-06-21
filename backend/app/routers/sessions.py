from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional

from app.database import get_db
from app.models import Session as POSSession, User
from app.schemas import SessionCreate, SessionResponse, SessionClose
from app.auth import get_current_user

router = APIRouter(prefix="/sessions", tags=["Sessions"])

@router.get("", response_model=List[SessionResponse])
def get_sessions(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Admins see all, employees see their own
    if current_user.role == "admin":
        return db.query(POSSession).order_by(POSSession.start_time.desc()).all()
    return db.query(POSSession).filter(POSSession.user_id == current_user.id).order_by(POSSession.start_time.desc()).all()

@router.get("/active", response_model=Optional[SessionResponse])
def get_active_session(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(POSSession).filter(
        POSSession.user_id == current_user.id, 
        POSSession.status == "active"
    ).first()

@router.post("/open", response_model=SessionResponse)
def open_session(session_in: SessionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Check if user already has an active session
    active = db.query(POSSession).filter(
        POSSession.user_id == current_user.id, 
        POSSession.status == "active"
    ).first()
    if active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have an active POS session open"
        )
    
    db_session = POSSession(
        user_id=current_user.id,
        start_time=datetime.utcnow(),
        status="active",
        start_balance=session_in.start_balance,
        end_balance=0.0,
        notes=session_in.notes
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session

@router.post("/{id}/close", response_model=SessionResponse)
def close_session(
    id: int, 
    session_close: SessionClose, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    db_session = db.query(POSSession).filter(POSSession.id == id).first()
    if not db_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    if db_session.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to close this session"
        )
    if db_session.status == "closed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session is already closed"
        )
    
    db_session.status = "closed"
    db_session.end_time = datetime.utcnow()
    db_session.end_balance = session_close.end_balance
    db_session.notes = session_close.notes
    db_session.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(db_session)
    return db_session
