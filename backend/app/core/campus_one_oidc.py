"""
Campus One OIDC Integration - Minimal Implementation

Following official spec: https://docs.campusone.com.ng/llms-full.txt

Key points:
- PKCE S256 is mandatory
- Verify JWT signature before trusting claims
- Keep client_secret server-side only
"""

import httpx
import secrets
import base64
import hashlib
import logging
from typing import Optional, Dict, Any
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

from jose import jwt, JWTError
from jose.utils import base64url_decode
from cryptography.hazmat.primitives.asymmetric import rsa, ed25519
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend

from app.core.config import settings

logger = logging.getLogger(__name__)


class CampusOneOIDC:
    """Minimal Campus One OIDC handler."""

    ISSUER = "https://auth.campusone.com.ng"
    AUTHORIZE_URL = "https://auth.campusone.com.ng/api/auth/oauth2/authorize"
    TOKEN_URL = "https://auth.campusone.com.ng/api/auth/oauth2/token"
    JWKS_URL = "https://auth.campusone.com.ng/api/auth/jwks"

    SCOPES = ["openid", "profile", "email", "academic", "roles", "notifications", "events", "offline_access"]

    def __init__(self):
        self.client_id = settings.CAMPUS_ONE_CLIENT_ID
        self.client_secret = settings.CAMPUS_ONE_CLIENT_SECRET
        self.redirect_uri = settings.CAMPUS_ONE_REDIRECT_URI
        self._jwks_cache: Optional[Dict] = None
        self._jwks_time: Optional[datetime] = None

    async def generate_authorize_url(self, prompt: str = "login") -> tuple[str, str, str]:
        """Generate PKCE-protected authorize URL.

        Args:
            prompt: OIDC ``prompt`` value.
                - ``"login"`` (default): force a fresh Campus One login screen.
                  Used by the explicit "Sign in" page.
                - ``"none"``: silent authentication. If the user already has an
                  active Campus One session, Campus One returns an authorization
                  code WITHOUT showing any UI; otherwise it returns a
                  ``login_required`` error. Used for seamless SSO when a user
                  lands on the home route already signed in to Campus One.

        Returns:
            (auth_url, state, code_verifier)
        """
        code_verifier = base64.urlsafe_b64encode(secrets.token_bytes(32)).decode().rstrip("=")
        code_challenge = base64.urlsafe_b64encode(
            hashlib.sha256(code_verifier.encode()).digest()
        ).decode().rstrip("=")
        state = base64.urlsafe_b64encode(secrets.token_bytes(32)).decode().rstrip("=")

        params = {
            "response_type": "code",
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "scope": " ".join(self.SCOPES),
            "state": state,
            "code_challenge": code_challenge,
            "code_challenge_method": "S256",
            "prompt": prompt,
        }

        url = f"{self.AUTHORIZE_URL}?{urlencode(params)}"
        logger.info(f"Generated authorize URL (prompt={prompt})")
        return url, state, code_verifier

    async def exchange_code_for_tokens(self, code: str, code_verifier: str) -> Dict[str, Any]:
        """Exchange authorization code for tokens."""
        request_data = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": self.redirect_uri,
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "code_verifier": code_verifier,
        }

        logger.info(f"🔄 TOKEN REQUEST to {self.TOKEN_URL}")
        logger.info(f"   grant_type: {request_data['grant_type']}")
        logger.info(f"   code: {code[:20]}...")
        logger.info(f"   redirect_uri: {request_data['redirect_uri']}")
        logger.info(f"   client_id: {self.client_id}")
        logger.info(f"   code_verifier: {code_verifier[:20]}...")

        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.TOKEN_URL,
                data=request_data,
                timeout=10,
            )

            logger.info(f"📬 TOKEN RESPONSE (status={response.status_code})")

            if response.status_code != 200:
                logger.error(f"❌ Token exchange failed")
                logger.error(f"   Status: {response.status_code}")
                logger.error(f"   Body: {response.text}")
                raise ValueError(f"Token exchange failed: {response.status_code}")

            token_data = response.json()
            logger.info(f"✅ Token exchange successful")
            logger.info(f"   access_token: {token_data.get('access_token', 'N/A')[:50]}...")
            logger.info(f"   id_token: {token_data.get('id_token', 'N/A')[:50]}...")
            logger.info(f"   refresh_token: {token_data.get('refresh_token', 'N/A')[:50] if token_data.get('refresh_token') else 'N/A'}...")
            logger.info(f"   expires_in: {token_data.get('expires_in', 'N/A')}")
            logger.info(f"   Full response: {token_data}")

            return token_data

    async def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        """Use a refresh token to obtain a new access token from Campus One."""
        request_data = {
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
            "client_id": self.client_id,
            "client_secret": self.client_secret,
        }

        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(self.TOKEN_URL, data=request_data)

        if response.status_code != 200:
            raise ValueError(f"Campus One token refresh failed: {response.status_code} {response.text[:200]}")

        return response.json()

    def _jwk_to_pem(self, jwk: Dict[str, Any]) -> str:
        """Convert JWK to PEM format for python-jose to use."""
        kty = jwk.get("kty")

        if kty == "RSA":
            # RSA key: need modulus (n) and exponent (e)
            n_b64 = jwk["n"] if isinstance(jwk["n"], str) else jwk["n"].decode()
            e_b64 = jwk["e"] if isinstance(jwk["e"], str) else jwk["e"].decode()

            n = int.from_bytes(base64url_decode(n_b64.encode()), byteorder="big")
            e = int.from_bytes(base64url_decode(e_b64.encode()), byteorder="big")

            public_key = rsa.RSAPublicNumbers(e, n).public_key(default_backend())

        elif kty == "OKP":
            # EdDSA key
            crv = jwk.get("crv")
            x_b64 = jwk["x"] if isinstance(jwk["x"], str) else jwk["x"].decode()
            x = base64url_decode(x_b64.encode())

            if crv == "Ed25519":
                public_key = ed25519.Ed25519PublicKey.from_public_bytes(x)
            else:
                raise ValueError(f"Unsupported EdDSA curve: {crv}")

        else:
            raise ValueError(f"Unsupported key type: {kty}")

        # Convert to PEM
        pem = public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo,
        )
        return pem.decode("utf-8")

    async def fetch_jwks(self) -> Dict[str, Any]:
        """Fetch JWKS from Campus One (with caching)."""
        # Cache for 1 hour
        if self._jwks_cache and self._jwks_time:
            age = datetime.now(timezone.utc) - self._jwks_time
            if age < timedelta(hours=1):
                logger.info(f"📦 Using cached JWKS (age: {age.total_seconds():.0f}s)")
                return self._jwks_cache

        logger.info(f"🔄 JWKS REQUEST to {self.JWKS_URL}")

        async with httpx.AsyncClient() as client:
            response = await client.get(self.JWKS_URL, timeout=10)
            response.raise_for_status()

            self._jwks_cache = response.json()
            self._jwks_time = datetime.now(timezone.utc)

            logger.info(f"✅ Fetched JWKS")
            logger.info(f"   Keys: {len(self._jwks_cache.get('keys', []))} available")
            for i, key in enumerate(self._jwks_cache.get("keys", [])):
                logger.info(f"   [{i}] kid={key.get('kid')}, kty={key.get('kty')}, alg={key.get('alg')}")

            return self._jwks_cache

    async def verify_and_decode_id_token(self, id_token: str) -> Dict[str, Any]:
        """Verify JWT signature and decode claims.

        CRITICAL: Always verify signature before trusting claims!
        Handles both RSA (RS256) and EdDSA (Ed25519) algorithms.
        """
        try:
            logger.info(f"🔐 VERIFYING ID TOKEN")
            logger.info(f"   Token: {id_token[:50]}...{id_token[-50:]}")

            # Parse token parts
            parts = id_token.split(".")
            if len(parts) != 3:
                raise ValueError("Invalid JWT format")

            # Get unverified header
            header_b64 = parts[0]
            payload_b64 = parts[1]
            signature_b64 = parts[2]

            unverified_header = jwt.get_unverified_header(id_token)
            kid = unverified_header.get("kid")
            alg = unverified_header.get("alg", "RS256")

            logger.info(f"   Header (unverified): kid={kid}, alg={alg}")
            logger.info(f"   Full header: {unverified_header}")

            if not kid:
                raise ValueError("Missing 'kid' in token header")

            # Fetch JWKS and find matching key
            logger.info(f"   Finding key with kid={kid} in JWKS...")
            jwks = await self.fetch_jwks()
            key = None
            for jwk in jwks.get("keys", []):
                if jwk.get("kid") == kid:
                    key = jwk
                    break

            if not key:
                logger.error(f"❌ Key {kid} not found in JWKS")
                raise ValueError(f"Key {kid} not found in JWKS")

            logger.info(f"   ✅ Found key: kty={key.get('kty')}, alg={key.get('alg')}")
            logger.info(f"   Full key: {key}")

            # Handle EdDSA separately (python-jose doesn't support it well)
            if alg == "EdDSA" and key.get("kty") == "OKP":
                logger.info(f"   🔑 Using manual EdDSA verification")
                # Manually verify EdDSA signature
                crv = key.get("crv")
                x_b64 = key["x"] if isinstance(key["x"], str) else key["x"].decode()
                x = base64url_decode(x_b64.encode())

                if crv == "Ed25519":
                    public_key = ed25519.Ed25519PublicKey.from_public_bytes(x)
                else:
                    raise ValueError(f"Unsupported EdDSA curve: {crv}")

                # Reconstruct signing input
                signing_input = f"{header_b64}.{payload_b64}".encode()
                signature = base64url_decode(signature_b64.encode())

                # Verify signature
                try:
                    public_key.verify(signature, signing_input)
                    logger.info(f"   ✅ EdDSA signature verified")
                except Exception as e:
                    logger.error(f"   ❌ EdDSA signature verification failed: {str(e)}")
                    raise ValueError(f"EdDSA signature verification failed: {str(e)}")

                # Decode without verification (we already verified it)
                claims = jwt.get_unverified_claims(id_token)

            else:
                # Use python-jose for RSA (it handles it well)
                logger.info(f"   🔑 Using {alg} signature verification")
                public_key_pem = self._jwk_to_pem(key)

                claims = jwt.decode(
                    id_token,
                    public_key_pem,
                    algorithms=[alg],
                    audience=self.client_id,
                    issuer=self.ISSUER,
                    options={
                        "verify_aud": True,
                        "verify_iss": True,
                        "verify_signature": True,
                    },
                )
                logger.info(f"   ✅ {alg} signature verified")

            if "sub" not in claims:
                raise ValueError("Missing 'sub' claim")

            logger.info(f"✅ TOKEN VERIFICATION SUCCESS")
            logger.info(f"   User: {claims.get('sub')}")
            logger.info(f"   Email: {claims.get('email')}")
            logger.info(f"   Role: {claims.get('role')}")
            logger.info(f"   Full claims: {claims}")
            return claims

        except JWTError as e:
            logger.error(f"JWT verification failed: {str(e)}")
            raise ValueError(f"Invalid token: {str(e)}") from e
        except Exception as e:
            logger.error(f"Token verification error: {str(e)}")
            raise
