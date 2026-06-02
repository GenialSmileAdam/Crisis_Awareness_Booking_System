import httpx
from jose import JWTError, jwt
from typing import Any, Dict
import json
import base64
import logging
import time
from urllib.parse import urlencode

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey

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

    @staticmethod
    def _b64url_decode(value: str) -> bytes:
        padding = "=" * (-len(value) % 4)
        return base64.urlsafe_b64decode(value + padding)

    def _decode_jwt_part(self, part: str) -> Dict[str, Any]:
        return json.loads(self._b64url_decode(part))

    def _validate_claims(self, payload: Dict[str, Any]) -> None:
        if payload.get("iss") != self.issuer:
            raise JWTError("Invalid issuer")

        audience = payload.get("aud")
        if isinstance(audience, str):
            audience = [audience]
        if self.client_id not in (audience or []):
            raise JWTError("Invalid audience")

        now = int(time.time())
        leeway = 60

        exp = payload.get("exp")
        if not isinstance(exp, int) or exp < now - leeway:
            raise JWTError("Token has expired")

        nbf = payload.get("nbf")
        if isinstance(nbf, int) and nbf > now + leeway:
            raise JWTError("Token is not valid yet")

    def _verify_eddsa_token(self, token: str, key_data: Dict[str, Any]) -> Dict[str, Any]:
        if key_data.get("kty") != "OKP" or key_data.get("crv") != "Ed25519":
            raise JWTError("Unsupported EdDSA key type")

        parts = token.split(".")
        if len(parts) != 3:
            raise JWTError("Invalid token format")

        signing_input = f"{parts[0]}.{parts[1]}".encode()
        signature = self._b64url_decode(parts[2])
        public_key = Ed25519PublicKey.from_public_bytes(
            self._b64url_decode(key_data["x"])
        )

        try:
            public_key.verify(signature, signing_input)
        except InvalidSignature as exc:
            raise JWTError("Invalid token signature") from exc

        payload = self._decode_jwt_part(parts[1])
        self._validate_claims(payload)
        return payload

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
            alg = unverified_header.get("alg")

            if not kid:
                raise JWTError("No kid in token header")
            if alg == "none":
                raise JWTError("Unsigned ID tokens are not accepted")

            # Find the key in JWKS
            key_data = None
            for key in jwks.get("keys", []):
                if key.get("kid") == kid:
                    key_data = key
                    break

            if not key_data:
                raise JWTError(f"Key {kid} not found in JWKS")

            if alg == "EdDSA":
                return self._verify_eddsa_token(token, key_data)

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

    async def refresh_access_token(
        self, refresh_token: str
    ) -> Dict[str, Any]:
        """Refresh access token using refresh token."""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.issuer}/api/auth/oauth2/token",
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": refresh_token,
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
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
