from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password, verify_password
from app.models.entities import User
from app.models.enums import UserRole


def normalize_username(username: str) -> str:
    return username.strip().lower()


def get_user_by_username(db: Session, username: str) -> User | None:
    normalized = normalize_username(username)
    return db.scalar(select(User).where(func.lower(User.username) == normalized))


def count_active_users(db: Session) -> int:
    return db.scalar(
        select(func.count()).select_from(User).where(
            User.is_active.is_(True),
            User.role.in_([UserRole.admin, UserRole.user]),
        )
    ) or 0


def count_active_admins(db: Session, exclude_user_id: int | None = None) -> int:
    query = select(func.count()).select_from(User).where(
        User.is_active.is_(True),
        User.role == UserRole.admin,
    )
    if exclude_user_id is not None:
        query = query.where(User.id != exclude_user_id)
    return db.scalar(query) or 0


def bootstrap_admin_if_needed(db: Session) -> User | None:
    if count_active_users(db) > 0:
        return None

    admin = User(
        username=settings.admin_username.strip() or "admin",
        full_name=None,
        password_hash=hash_password(settings.admin_password),
        role=UserRole.admin,
        is_active=True,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin


def authenticate_user(db: Session, username: str, password: str) -> User | None:
    bootstrap_admin_if_needed(db)
    user = get_user_by_username(db, username)
    if user is None or not user.is_active:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


def ensure_username_available(db: Session, username: str, exclude_user_id: int | None = None) -> None:
    existing = get_user_by_username(db, username)
    if existing is not None and existing.id != exclude_user_id:
        raise ValueError("Пользователь с таким именем уже существует.")


def ensure_can_change_admin_status(
    db: Session,
    user: User,
    next_role: UserRole | None = None,
    next_is_active: bool | None = None,
) -> None:
    role_after = next_role if next_role is not None else user.role
    active_after = next_is_active if next_is_active is not None else user.is_active
    if user.role == UserRole.admin and (role_after != UserRole.admin or not active_after):
        if count_active_admins(db, exclude_user_id=user.id) == 0:
            raise ValueError("Нельзя деактивировать последнего администратора")
