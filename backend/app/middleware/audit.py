from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from ..models.audit_log import AuditLog
from ..database import SessionLocal
import json

class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Allow request to proceed
        response = await call_next(request)
        
        # Log only successful state mutating operations or access to sensitive resources
        # Simple policy: Log POST, PUT, DELETE, and GET /patients
        method = request.method
        path = request.url.path
        
        should_log = False
        if method in ["POST", "PUT", "DELETE"]:
            should_log = True
        elif method == "GET" and "/patients" in path:
            should_log = True
            
        if should_log and response.status_code < 400:
            # Extract user ID from authorization token if present
            # Avoid logging full payload to prevent PII leaks
            
            db = SessionLocal()
            try:
                user_id = None
                
                # Extract user ID from token
                auth_header = request.headers.get("Authorization")
                if auth_header and auth_header.startswith("Bearer "):
                    token = auth_header.split(" ")[1]
                    try:
                        from jose import jwt
                        from ..config import settings
                        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.ALGORITHM])
                        user_id = payload.get("id")
                    except Exception as jwt_err:
                        print(f"JWT Decode Error in Audit: {jwt_err}")
                
                log = AuditLog(
                    user_id=user_id,
                    action=method,
                    resource_type="endpoint",
                    resource_id=path,
                    details=f"Status: {response.status_code}",
                    ip_address=request.client.host
                )
                db.add(log)
                db.commit()
            except Exception as e:
                print(f"Audit Log Error: {e}")
            finally:
                db.close()
                
        return response
