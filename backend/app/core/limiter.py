from slowapi import Limiter
from slowapi.util import get_remote_address

# Single shared limiter instance — imported by main.py and any endpoint that needs
# a per-route override via @limiter.limit("N/period")
limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])
