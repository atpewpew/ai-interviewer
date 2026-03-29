"""
Email service — sends automated emails via SMTP (preferred) with Resend fallback.
Used for candidate notifications (advance to next round, interview links, etc.)
"""
import logging
from config import RESEND_API_KEY, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM, FRONTEND_URL

logger = logging.getLogger(__name__)
_SEQUENZY_SMTP_HOST = "smtp.sequenzy.com"
_SMTP_TIMEOUT_SECONDS = 20

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
    return bool(SMTP_HOST and SMTP_PORT and _smtp_username() and SMTP_PASSWORD and _smtp_sender())


def _smtp_username() -> str:
    """Username for SMTP login. Sequenzy accepts a generic username like 'api'."""
    if SMTP_USER:
        return SMTP_USER
    if SMTP_HOST.lower() == _SEQUENZY_SMTP_HOST:
        return "api"
    return ""


def _smtp_sender() -> str:
    """From address must be a valid sender email for most SMTP providers."""
    if SMTP_FROM:
        return SMTP_FROM
    if SMTP_USER and "@" in SMTP_USER:
        return SMTP_USER
    return ""


def get_email_provider_health() -> dict:
    """Return non-sensitive startup diagnostics for configured email providers."""
    smtp_user = _smtp_username()
    smtp_sender = _smtp_sender()

    smtp_missing = []
    if not SMTP_HOST:
        smtp_missing.append("SMTP_HOST")
    if not SMTP_PORT:
        smtp_missing.append("SMTP_PORT")
    if not smtp_user:
        smtp_missing.append("SMTP_USER")
    if not SMTP_PASSWORD:
        smtp_missing.append("SMTP_PASSWORD")
    if not smtp_sender:
        smtp_missing.append("SMTP_FROM")

    smtp_usable = len(smtp_missing) == 0

    resend_missing = []
    if not RESEND_API_KEY:
        resend_missing.append("RESEND_API_KEY")
    if RESEND_API_KEY and not _resend_available:
        resend_missing.append("resend-sdk")

    return {
        "smtp": {
            "usable": smtp_usable,
            "host": SMTP_HOST,
            "port": SMTP_PORT,
            "from": smtp_sender,
            "missing": smtp_missing,
        },
        "resend": {
            "usable": _resend_available,
            "missing": resend_missing,
        },
        "effective_order": ["smtp", "resend"],
    }


def log_email_provider_health() -> None:
    """Log provider readiness once at app boot to simplify config debugging."""
    health = get_email_provider_health()
    smtp = health["smtp"]
    resend = health["resend"]

    logger.info(
        "Email startup health | order=%s | smtp_usable=%s host=%s port=%s from=%s | resend_usable=%s",
        " -> ".join(health["effective_order"]),
        smtp["usable"],
        smtp["host"] or "-",
        smtp["port"] or "-",
        smtp["from"] or "-",
        resend["usable"],
    )

    if not smtp["usable"]:
        logger.warning("SMTP startup config incomplete; missing: %s", ", ".join(smtp["missing"]))
    if not resend["usable"] and resend["missing"]:
        logger.info("Resend not active; missing: %s", ", ".join(resend["missing"]))


def send_email(to_email: str, subject: str, html_body: str) -> bool:
    """Send email via SMTP first, then Resend fallback. Returns True on success."""
    providers = []
    if _smtp_configured():
        providers.append(("SMTP", _send_via_smtp))
    if _resend_available:
        providers.append(("Resend", _send_via_resend))

    if not providers:
        logger.warning("No email provider configured — email to %s skipped", to_email)
        return False

    for index, (provider_name, sender_func) in enumerate(providers):
        if sender_func(to_email, subject, html_body):
            return True
        if index < len(providers) - 1:
            logger.warning(
                "%s send failed for %s — trying next provider",
                provider_name,
                to_email,
            )

    logger.error("All configured email providers failed for %s", to_email)
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
        smtp_user = _smtp_username()
        smtp_sender = _smtp_sender()
        if not smtp_user or not SMTP_PASSWORD:
            logger.error("SMTP credentials missing (username/password)")
            return False
        if not smtp_sender:
            logger.error("SMTP_FROM missing or invalid; set a valid sender email address")
            return False

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = smtp_sender
        msg["To"] = to_email
        msg.attach(MIMEText(html_body, "html"))

        # Port 465 uses implicit TLS (SMTP_SSL); 587/2525 use STARTTLS.
        if SMTP_PORT == 465:
            with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=_SMTP_TIMEOUT_SECONDS) as server:
                server.login(smtp_user, SMTP_PASSWORD)
                server.send_message(msg)
        else:
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=_SMTP_TIMEOUT_SECONDS) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(smtp_user, SMTP_PASSWORD)
                server.send_message(msg)

        logger.info("Email sent via SMTP (%s:%s) to %s: %s", SMTP_HOST, SMTP_PORT, to_email, subject)
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
