"""Email service using Resend API."""

import logging
from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """Send emails via Resend API."""

    @staticmethod
    async def send_password_reset(user_email: str, user_name: str, reset_link: str) -> bool:
        """Send password reset email."""
        if not settings.EMAIL_ENABLED or not settings.RESEND_API_KEY:
            logger.warning(f"Email disabled, cannot send reset link to {user_email}")
            return False

        try:
            import resend

            client = resend.Resend(api_key=settings.RESEND_API_KEY)

            html_content = f"""
            <html>
                <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px;">
                        <h1 style="color: #333;">Password Reset Request</h1>
                        <p style="color: #666;">Hello {user_name},</p>
                        <p style="color: #666;">
                            We received a request to reset your password for the Crisis Awareness System.
                            Click the button below to reset your password.
                        </p>
                        <p style="margin: 30px 0;">
                            <a href="{reset_link}" style="background-color: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
                                Reset Password
                            </a>
                        </p>
                        <p style="color: #666; font-size: 14px;">
                            Or copy and paste this link in your browser:<br/>
                            <code style="background-color: #f0f0f0; padding: 8px; border-radius: 4px; display: block; word-break: break-all; margin-top: 8px;">
                                {reset_link}
                            </code>
                        </p>
                        <p style="color: #666; font-size: 14px;">
                            This link will expire in 24 hours.
                        </p>
                        <p style="color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;">
                            If you didn't request a password reset, please ignore this email.
                        </p>
                    </div>
                </body>
            </html>
            """

            response = client.emails.send(
                **{
                    "from": settings.EMAIL_FROM or "noreply@crisisawareness.app",
                    "to": user_email,
                    "subject": "Password Reset - Crisis Awareness System",
                    "html": html_content,
                }
            )

            logger.info(f"✅ Password reset email sent to {user_email}: {response.id}")
            return True

        except Exception as e:
            logger.error(f"❌ Failed to send password reset email to {user_email}: {str(e)}")
            return False

    @staticmethod
    async def send_staff_welcome(user_email: str, user_name: str, password: str) -> bool:
        """Send staff welcome email with temporary password."""
        if not settings.EMAIL_ENABLED or not settings.RESEND_API_KEY:
            logger.warning(f"Email disabled, cannot send welcome email to {user_email}")
            return False

        try:
            import resend

            client = resend.Resend(api_key=settings.RESEND_API_KEY)

            html_content = f"""
            <html>
                <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px;">
                        <h1 style="color: #333;">Welcome to Crisis Awareness System</h1>
                        <p style="color: #666;">Hello {user_name},</p>
                        <p style="color: #666;">
                            Your staff account has been created. Use the credentials below to log in.
                        </p>
                        <div style="background-color: white; padding: 15px; border-radius: 4px; margin: 20px 0;">
                            <p style="margin: 8px 0;">
                                <strong>Email:</strong> {user_email}
                            </p>
                            <p style="margin: 8px 0;">
                                <strong>Temporary Password:</strong> <code style="background-color: #f0f0f0; padding: 4px 8px;">{password}</code>
                            </p>
                        </div>
                        <p style="color: #666;">
                            <a href="https://crisisawareness.app/login" style="color: #0066cc;">Log in to the system</a>
                        </p>
                        <p style="color: #666; font-size: 14px;">
                            We recommend changing your password after your first login.
                        </p>
                    </div>
                </body>
            </html>
            """

            response = client.emails.send(
                **{
                    "from": settings.EMAIL_FROM or "noreply@crisisawareness.app",
                    "to": user_email,
                    "subject": "Your Crisis Awareness System Account",
                    "html": html_content,
                }
            )

            logger.info(f"✅ Welcome email sent to {user_email}: {response.id}")
            return True

        except Exception as e:
            logger.error(f"❌ Failed to send welcome email to {user_email}: {str(e)}")
            return False
