from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.auth import require_admin
from app.core.security import hash_password
from app.db.session import get_db
from app.models.entities import User
from app.models.enums import UserRole
from app.schemas.auth import CurrentUserRead
from app.schemas.users import UserCreate, UserRead, UserResetPasswordRequest, UserUpdate
from app.services.users import ensure_can_change_admin_status, ensure_username_available

router = APIRouter(prefix="/api/users", tags=["users"])


def parse_user_role(value: str) -> UserRole:
    if value not in {UserRole.admin.value, UserRole.user.value}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Недопустимая роль пользователя.")
    return UserRole(value)


@router.get("", response_model=list[UserRead])
def list_users(
    _: CurrentUserRead = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[User]:
    return list(db.scalars(select(User).order_by(User.id)))


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    _: CurrentUserRead = Depends(require_admin),
    db: Session = Depends(get_db),
) -> User:
    try:
        ensure_username_available(db, payload.username)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    user = User(
        username=payload.username.strip(),
        full_name=None,
        password_hash=hash_password(payload.password),
        role=parse_user_role(payload.role),
        is_active=payload.is_active,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/{user_id}", response_model=UserRead)
def update_user(
    user_id: int,
    payload: UserUpdate,
    _: CurrentUserRead = Depends(require_admin),
    db: Session = Depends(get_db),
) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден.")

    next_role = parse_user_role(payload.role) if payload.role is not None else None
    try:
        ensure_can_change_admin_status(db, user, next_role=next_role, next_is_active=payload.is_active)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    if payload.username is not None:
        try:
            ensure_username_available(db, payload.username, exclude_user_id=user.id)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
        user.username = payload.username.strip()
    if next_role is not None:
        user.role = next_role
    if payload.is_active is not None:
        user.is_active = payload.is_active

    db.commit()
    db.refresh(user)
    return user


@router.post("/{user_id}/reset-password")
def reset_user_password(
    user_id: int,
    payload: UserResetPasswordRequest,
    _: CurrentUserRead = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден.")
    user.password_hash = hash_password(payload.new_password)
    db.commit()
    return {"status": "ok"}
