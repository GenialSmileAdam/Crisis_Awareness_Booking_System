import httpx
from jose import JWTError, jwt
from jose.backends.rsa_backend import RSAKey
from typing import Any, Dict
import json
from functools import lru_cache
import logging
from urllib.parse import urlencode

from app.core.config import settings

logger = logging.getLogger(__name__)


class OIDCProvider:
    def __init__(self):
        self.issuer = settings.CAMPUS_ONE_ISSUER
        self.client_id = settings.CAMPUS_ONE_CLIENT_ID
        self.client_secret = settings.CAMPUS_ONE_CLIENT_SECRET
        self.jwks_url = settings.CAMPUS_ONE_JWKS_URL
        self.discovery_url = settings.CAMPUS_ONE_DISCOVERY_URL
        self._jwks_cache: Dict[str, Any] | None = None

    @property
    def redirect_uri(self) -> str:
        """Exact callback URL registered in the Campus One dashboard."""
        if settings.CAMPUS_ONE_REDIRECT_URI:
            return settings.CAMPUS_ONE_REDIRECT_URI
        return f"{settings.BACKEND_URL.rstrip('/')}/api/auth/callback"

    async def get_jwks(self) -> Dict[str, Any]:
        """Fetch and cache JWKS from Campus One."""
        if self._jwks_cache:
            return self._jwks_cache

        async with httpx.AsyncClient() as client:
            response = await client.get(self.jwks_url, timeout=10)
            response.raise_for_status()
            self._jwks_cache = response.json()
            return self._jwks_cache

    async def verify_id_token(self, token: str) -> Dict[str, Any]:
        """Verify and decode the ID token from Campus One."""
        try:
            jwks = await self.get_jwks()

            # Decode without verification first to get the kid
            unverified_header = jwt.get_unverified_header(token)
            kid = unverified_header.get("kid")

            if not kid:
                raise JWTError("No kid in token header")

            # Find the key in JWKS
            key_data = None
            for key in jwks.get("keys", []):
                if key.get("kid") == kid:
                    key_data = key
                    break

            if not key_data:
                raise JWTError(f"Key {kid} not found in JWKS")

            # python-jose verifies signature and claims during decode.
            payload = jwt.decode(
                token,
                key_data,
                algorithms=["RS256"],
                audience=self.client_id,
                issuer=self.issuer,
            )

            return payload
        except JWTError as e:
            logger.error(f"Token verification failed: {e}")
            raise

    def get_authorization_url(self, state: str, code_challenge: str) -> str:
        """Generate Campus One authorization URL."""
        params = {
            "response_type": "code",
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "scope": settings.CAMPUS_ONE_SCOPES,
            "state": state,
            "code_challenge": code_challenge,
            "code_challenge_method": "S256",
        }

        query_string = urlencode(params)
        return f"{self.issuer}/api/auth/oauth2/authorize?{query_string}"

    async def exchange_code_for_token(
        self, code: str, code_verifier: str
    ) -> Dict[str, Any]:
        """Exchange authorization code for tokens."""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.issuer}/api/auth/oauth2/token",
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": self.redirect_uri,
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "code_verifier": code_verifier,
                },
                timeout=10,
            )
            response.raise_for_status()
            return response.json()

    async def get_userinfo(self, access_token: str) -> Dict[str, Any]:
        """Get user info from Campus One userinfo endpoint."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.issuer}/api/auth/oauth2/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=10,
            )
            response.raise_for_status()
            return response.json()


oidc_provider = OIDCProvider()
