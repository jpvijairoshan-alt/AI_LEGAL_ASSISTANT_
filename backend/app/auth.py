from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.config import get_settings

_bearer = HTTPBearer(auto_error=False)


def get_current_lawyer_id(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> str:
    """Verify the Bearer JWT (HS256) issued by the Next.js app and return the lawyer id."""
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if creds is None or creds.scheme.lower() != "bearer":
        raise unauthorized
    try:
        payload = jwt.decode(creds.credentials, get_settings().JWT_SECRET, algorithms=["HS256"])
    except JWTError:
        raise unauthorized
    lawyer_id = payload.get("lawyerId")
    if not isinstance(lawyer_id, str) or not lawyer_id:
        raise unauthorized
    return lawyer_id
