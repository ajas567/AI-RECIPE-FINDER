import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from database import get_client, DB_NAME
from passlib.context import CryptContext
from typing import Dict, Any, Optional

# Setup password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class AuthEngine:
    def __init__(self):
        print("Initializing Authentication Engine...")
        self.client = get_client()
        self.db = self.client[DB_NAME]
        self.users = self.db['users']
        
        # Ensure email uniqueness
        self.users.create_index('email', unique=True)
        
    def hash_password(self, password: str) -> str:
        return pwd_context.hash(password)
        
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        return pwd_context.verify(plain_password, hashed_password)
        
    def register_user(self, name: str, email: str, password: str) -> Dict[str, Any]:
        """Creates a new user with a hashed password."""
        # Check if user already exists
        if self.users.find_one({"email": email}):
            return {"error": "Email already registered"}
            
        hashed_pw = self.hash_password(password)
        
        user_doc = {
            "name": name,
            "email": email,
            "password": hashed_pw, # Never store plain text!
            "dietary_preferences": [],
            "favorites": [] # Will explicitly store recipe ObjectIds or names later
        }
        
        result = self.users.insert_one(user_doc)
        
        return {
            "id": str(result.inserted_id),
            "name": name,
            "email": email
        }
        
    def login_user(self, email: str, password: str) -> Optional[Dict[str, Any]]:
        """Verifies credentials and returns user payload if successful."""
        user = self.users.find_one({"email": email})
        if not user:
            return {"error": "Invalid email or password"}
            
        if not self.verify_password(password, user['password']):
            return {"error": "Invalid email or password"}
            
        # Success!
        return {
            "id": str(user['_id']),
            "name": user['name'],
            "email": user['email'],
            "dietary_preferences": user.get('dietary_preferences', [])
        }

# Singleton
auth_engine = None

def get_auth_engine():
    global auth_engine
    if auth_engine is None:
        auth_engine = AuthEngine()
    return auth_engine
