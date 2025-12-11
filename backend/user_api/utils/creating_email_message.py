from django.core.exceptions import ValidationError
from django.core.mail import send_mail, BadHeaderError

from project import settings


def send_confirmation_email(user, confirmation_token):
    try:
        # Формирование URL для подтверждения почты
        confirmation_url = f"{settings.SITE_URL}/profile/confirm-email/{confirmation_token}/"
        email_subject = "Подтверждение почты"
        email_message = f"Пожалуйста, подтвердите свою почту, кликнув по следующей ссылке: {confirmation_url}"

        # Отправка письма
        send_mail(email_subject, email_message, settings.DEFAULT_FROM_EMAIL, [user.email])

    except BadHeaderError:
        raise ValidationError("Обнаружен неверный заголовок в email.")

    except Exception as e:
        raise ValidationError(f"Ошибка при отправке письма: {str(e)}")


def send_confirmation_password(user, url, code):
    try:
        num_str = str(code)
        str_code = num_str[:len(num_str) // 2] + '-' + num_str[len(num_str) // 2:]

        # Формирование URL для подтверждения
        confirmation_url = f"{settings.SITE_URL}/profile/confirm-password/{url}/"

        email_subject = f"Подтверждение смены пароля"

        email_message = f"Для перехода кликните по следующей ссылке: {confirmation_url}" \
                        f"Для смены пароля перейдите по ссылке и введите следующий код: {str_code}"

        # Отправка письма
        send_mail(email_subject, email_message, settings.DEFAULT_FROM_EMAIL, [user.email])

    except BadHeaderError:
        raise ValidationError("Обнаружен неверный заголовок в email.")

    except Exception as e:
        raise ValidationError(f"Ошибка при отправке письма: {str(e)}")