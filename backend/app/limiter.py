from .config import settings
import os

# Rate Limiting Logic
# Extracted to avoid circular imports between main.py and routers
try:
    from slowapi import Limiter, _rate_limit_exceeded_handler
    from slowapi.util import get_remote_address
    from slowapi.errors import RateLimitExceeded

    limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])
    
    def add_rate_limit_exception_handler(app):
        app.state.limiter = limiter
        app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
        
except ImportError:
    # Fallback mock if slowapi not installed
    class MockLimiter:
        def limit(self, limit_value):
            def decorator(func):
                return func
            return decorator
    
    limiter = MockLimiter()
    
    def add_rate_limit_exception_handler(app):
        pass
