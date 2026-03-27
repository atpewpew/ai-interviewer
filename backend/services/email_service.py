"""
Email service — sends automated emails via Resend (preferred) or SMTP fallback.
Used for candidate notifications (advance to next round, interview links, etc.)
"""
import logging
from config import RESEND_API_KEY, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM, FRONTEND_URL

logger = logging.getLogger(__name__)

# ── Resend setup ──
_resend_available = False
if RESEND_API_KEY:
    try:
        import resend
        resend.api_key = RESEND_API_KEY
        _resend_available = True
        logger.info("Resend email configured")
    except ImportError:
        logger.warning("resend package not installed — pip install resend")


def _smtp_configured() -> bool:
    return bool(SMTP_USER and SMTP_PASSWORD)


def send_email(to_email: str, subject: str, html_body: str) -> bool:
    """Send an email via Resend (preferred) or SMTP fallback. Returns True on success."""
    if _resend_available:
        return _send_via_resend(to_email, subject, html_body)
    if _smtp_configured():
        return _send_via_smtp(to_email, subject, html_body)
    logger.warning("No email provider configured — email to %s skipped", to_email)
    return False


def _send_via_resend(to_email: str, subject: str, html_body: str) -> bool:
    try:
        params = {
            "from": SMTP_FROM or "InterviewOS <onboarding@resend.dev>",
            "to": [to_email],
            "subject": subject,
            "html": html_body,
        }
        resend.Emails.send(params)
        logger.info("Email sent via Resend to %s: %s", to_email, subject)
        return True
    except Exception as e:
        logger.error("Resend email failed to %s: %s", to_email, e)
        return False


def _send_via_smtp(to_email: str, subject: str, html_body: str) -> bool:
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = SMTP_FROM or SMTP_USER
        msg["To"] = to_email
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)
        logger.info("Email sent via SMTP to %s: %s", to_email, subject)
        return True
    except Exception as e:
        logger.error("SMTP email failed to %s: %s", to_email, e)
        return False


async def send_round_invite(
    candidate_name: str,
    candidate_email: str,
    job_title: str,
    round_name: str,
    round_type: str,
    link: str,
):
    """Send a candidate an invite to their next round."""
    subject = f"InterviewOS — You've been advanced! Next: {round_name}"

    type_instructions = {
        "ai_interview": "You'll be interviewed by our AI system. Ensure you have a working microphone, webcam, and a quiet environment.",
        "dsa_coding": "You'll complete a coding challenge. Make sure you have a stable internet connection.",
        "live_1on1": "You'll have a live video interview with a member of our team. Please ensure your camera and microphone are working.",
        "manual_review": "Our team is reviewing your application. No action needed from you at this time.",
    }

    html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #7c3aed;">InterviewOS</h2>
        <p>Hi {candidate_name},</p>
        <p>Great news! You've been advanced to the next stage for <strong>{job_title}</strong>.</p>
        <div style="background: #f5f3ff; border-left: 4px solid #7c3aed; padding: 16px; margin: 20px 0; border-radius: 4px;">
            <strong>Next Round:</strong> {round_name}<br>
            <strong>Type:</strong> {round_type.replace('_', ' ').title()}<br>
            <p style="margin: 10px 0 0; color: #555;">{type_instructions.get(round_type, '')}</p>
        </div>
        {f'<a href="{link}" style="display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Start Round</a>' if link else ''}
        <p style="color: #888; margin-top: 20px; font-size: 13px;">
            If you have any questions, please reply to this email.<br>
            Good luck!
        </p>
    </div>
    """
    return send_email(candidate_email, subject, html)


async def send_application_received(candidate_name: str, candidate_email: str, job_title: str):
    """Notify candidate their application was received."""
    subject = f"Application Received — {job_title}"
    html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #7c3aed;">InterviewOS</h2>
        <p>Hi {candidate_name},</p>
        <p>Thank you for applying to <strong>{job_title}</strong>. Your application has been received and is under review.</p>
        <p>We'll reach out when it's time for the next step.</p>
        <p style="color: #888; margin-top: 20px; font-size: 13px;">— The InterviewOS Team</p>
    </div>
    """
    return send_email(candidate_email, subject, html)


async def send_rejection(candidate_name: str, candidate_email: str, job_title: str):
    """Notify candidate of rejection."""
    subject = f"Update on your {job_title} application"
    html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #7c3aed;">InterviewOS</h2>
        <p>Hi {candidate_name},</p>
        <p>Thank you for your interest in <strong>{job_title}</strong> and for taking the time to go through our process.</p>
        <p>After careful consideration, we've decided to move forward with other candidates at this time.</p>
        <p>We encourage you to apply again in the future as new positions open up.</p>
        <p style="color: #888; margin-top: 20px; font-size: 13px;">— The InterviewOS Team</p>
    </div>
    """
    return send_email(candidate_email, subject, html)


async def send_offer(candidate_name: str, candidate_email: str, job_title: str):
    """Notify candidate they've been selected."""
    subject = f"Congratulations! Offer for {job_title}"
    html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #7c3aed;">InterviewOS</h2>
        <p>Hi {candidate_name},</p>
        <p>We're thrilled to let you know that you've been selected for <strong>{job_title}</strong>! 🎉</p>
        <p>A member of our team will reach out shortly with the formal offer details.</p>
        <p style="color: #888; margin-top: 20px; font-size: 13px;">— The InterviewOS Team</p>
    </div>
    """
    return send_email(candidate_email, subject, html)
