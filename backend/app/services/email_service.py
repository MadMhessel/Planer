from __future__ import annotations

import smtplib
from email.message import EmailMessage

from app.core.config import get_settings


class EmailService:
    def __init__(self) -> None:
        self.settings = get_settings()

    @property
    def enabled(self) -> bool:
        return bool(self.settings.smtp_host and self.settings.smtp_username and self.settings.smtp_password)

    def send(self, *, to_email: str, subject: str, text: str, html: str | None = None) -> bool:
        if not self.enabled:
            return False

        message = EmailMessage()
        message['Subject'] = subject
        message['From'] = f'{self.settings.smtp_from_name} <{self.settings.smtp_from_email}>'
        message['To'] = to_email
        message.set_content(text)
        if html:
            message.add_alternative(html, subtype='html')

        with smtplib.SMTP(self.settings.smtp_host, self.settings.smtp_port, timeout=20) as smtp:
            if self.settings.smtp_use_tls:
                smtp.starttls()
            smtp.login(self.settings.smtp_username or '', self.settings.smtp_password or '')
            smtp.send_message(message)
        return True
