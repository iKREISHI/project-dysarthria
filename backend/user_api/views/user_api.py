from django.contrib.auth import login, logout
from django.contrib.auth.hashers import make_password
from rest_framework.authentication import SessionAuthentication
from rest_framework.exceptions import ValidationError
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response

from project import settings
from project.settings import DEBUG
from user_api.permissions.is_member_group_or_admin import IsSuperUserOrAdminPermission, \
    IsSuperUserOrDoctorOrAdminPermission
from user_api.serializers.user import UserRegistrationSerializer, UserLoginSerializer, UserSerializer, \
    ChangePasswordSerializer, ChangeNameSerializer, UserChangeEmailSerializer, UserForgotPasswordSerializer, \
    ForgotPasswordConfirmChangeSerializer
from rest_framework import permissions, status, viewsets

from user_api.utils.creating_email_message import send_confirmation_email, send_confirmation_password
from user_api.utils.format_serializer_answer import format_serializer_answers
from user_api.utils.token_generator import verify_signed_token, create_confirmation_token
from user_api.validations import custom_validation
from users.models.users import User, PasswordChangeToken
from user_api.serializers.doctor_serializers import AssignGroupSerializer
from django.contrib.auth.models import Group
from users.models.users import EmailConfirmationToken


class ConfirmEmailView(viewsets.ModelViewSet):
    permission_classes = [permissions.AllowAny]
    queryset = User.objects.all()
    http_method_names = ['get', 'head', 'options', 'list']

    def list(self, request, *args, **kwargs):
        return Response(status=status.HTTP_204_NO_CONTENT)

    def retrieve(self, request, pk=None, *args, **kwargs):
        token = pk
        email, signed_user_id = verify_signed_token(token)

        # Проверяем токен на то что почта и id не пустые
        if email is None or signed_user_id is None:
            if DEBUG:
                return Response({"error": "Field email or user_id is Null. Token is invalid"}, status=status.HTTP_400_BAD_REQUEST)
            else:
                return Response({"error": "Invalid token or user."}, status=status.HTTP_400_BAD_REQUEST)

        # Достаем токен из базы
        try:
            email_token = EmailConfirmationToken.objects.get(user_id=signed_user_id, token=token)
        except EmailConfirmationToken.DoesNotExist:
            if DEBUG:
                return Response({"error": "Token not found."}, status=status.HTTP_404_NOT_FOUND)
            else:
                return Response({"error": "Invalid token or user."}, status=status.HTTP_400_BAD_REQUEST)

        user = email_token.user

        # Проверка на то что токен просрочен
        if email_token.has_expired():
            # Удаляем токен
            user.check_delete_if_inactive_unconfirmed()

            if DEBUG:
                return Response({"error": "Token has expired. Token has deleted"}, status=status.HTTP_400_BAD_REQUEST)
            else:
                return Response({"error": "Invalid token or user."}, status=status.HTTP_400_BAD_REQUEST)


        if user.is_active:
            # Если пользователь активен и хочет изменить почту
            if email_token.is_changing_email:
                # Проверяем флаг и изменяем
                user.email = email_token.changed_email
            else:
                # Если флага на токена нет - значит произошла какая то ошибка или уязвимость
                email_token.delete()
                if DEBUG:
                    return Response({"error": "User is activated. But he has token."}, status=status.HTTP_400_BAD_REQUEST)
                else:
                    return Response({"error": "Invalid token."}, status=status.HTTP_400_BAD_REQUEST)
        else:
            # Если пользователь не активен (только зарегистрировался)
            # Делаем пользователя активным
            user.is_active = True
            user.email_confirmed = True

        email_token.delete()
        user.save()
        return Response({"message": "Email confirmed successfully"}, status=status.HTTP_200_OK)


# class UserRegistrationAPIView(APIView):
#     permission_classes = [permissions.AllowAny]
#
#     def post(self, request):
#         clean_data = custom_validation(request.data)
#         serializer = UserRegistrationSerializer(data=clean_data)
#         if serializer.is_valid():
#             user = serializer.save()
#             if user is not None:
#                 response_data = {
#                     "email": user.email,
#                     "username": user.username,
#                 }
#                 return Response(response_data, status=status.HTTP_201_CREATED)
#         return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserRegistrationModelViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.AllowAny]
    serializer_class = UserRegistrationSerializer
    http_method_names = ['post']

    def create(self, request, *args, **kwargs):
        clean_data = request.data
        email = clean_data.get('email').strip()

        # Попытка удалить существующего неактивного пользователя с таким email
        existing_user = User.objects.filter(email=email).first()
        if existing_user:
            existing_user.check_delete_if_inactive_unconfirmed()
        try:
            validated_data = custom_validation(clean_data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(data=validated_data)
        if serializer.is_valid(raise_exception=True):
            user = serializer.save()
            if user:
                return Response({'user': 'Успешно.'}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserLoginModelViewSet(viewsets.ModelViewSet):
    permission_classes = (permissions.AllowAny,)
    serializer_class = UserLoginSerializer
    http_method_names = ['post']
    queryset = ''

    def create(self, request, *args, **kwargs):
        data = request.data
        serializer = self.serializer_class(data=data)
        if serializer.is_valid(raise_exception=True):
            try:
                user = serializer.check_user(data)
            except ValidationError:
                return Response({"error": "Неправильная почта или пароль"}, status=status.HTTP_401_UNAUTHORIZED)
            if user is None:
                return Response({"error": "Неправильная почта или пароль"}, status=status.HTTP_401_UNAUTHORIZED)
            login(request, user)

            # Вызов метода проверки и удаления, если это необходимо
            if user.check_delete_if_inactive_unconfirmed():
                return Response({"error": "Аккаунт был удалён так как не подтвердил свою почту."},
                                status=status.HTTP_403_FORBIDDEN)

            response_data = {
                'email': user.email,
            }
            return Response(response_data, status=status.HTTP_200_OK)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserLogoutViewSet(viewsets.ViewSet):
    permission_classes = (permissions.IsAuthenticated,)
    http_method_names = ['post']

    def create(self, request):
        logout(request)
        return Response(status=status.HTTP_200_OK)


class CurrentUserViewSet(viewsets.ModelViewSet):
    permission_classes = (permissions.IsAuthenticated,)
    authentication_classes = (SessionAuthentication,)
    serializer_class = UserSerializer
    http_method_names = ['get']
    queryset = User.objects.all()

    def list(self, request, pk=None, **kwargs):
        serializer = self.serializer_class(request.user)
        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )


class UserChangePasswordModelViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['post']
    serializer_class = ChangePasswordSerializer

    def create(self, request, *args, **kwargs):
        user = self.request.user
        serializer = self.serializer_class(data=request.data, context={'request': request})

        if serializer.is_valid():
            # Установите новый пароль для пользователя
            new_password = serializer.validated_data.get("new_password")
            user.set_password(new_password)
            user.save()
            return Response({"detail": "Пароль изменён."}, status=status.HTTP_200_OK)

        # Преобразование ошибок сериализатора в строки сообщений
        return Response(format_serializer_answers(serializer.errors), status=status.HTTP_400_BAD_REQUEST)

class AssignDoctorGroupModelViewSet(viewsets.ModelViewSet):
    serializer_class = AssignGroupSerializer
    permission_classes = [IsSuperUserOrDoctorOrAdminPermission]
    http_method_names = ['post']

    def get_group(self):
        user_group, _ = Group.objects.get_or_create(name='Doctors')
        return user_group

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user_id = serializer.validated_data['user_id']

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"detail": "Пользователь не найден."}, status=status.HTTP_404_NOT_FOUND)

        try:
            if user.is_doctor():
                user.groups.remove(self.get_group())
                return Response({"detail": "Группа снята", "user_in_group": False}, status=status.HTTP_200_OK)

            user.groups.add(self.get_group())
            user.save()
            return Response({"detail": "Группа назначена.", "user_in_group": True}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class AssignAdministratorGroupModelViewSet(viewsets.ModelViewSet):
    serializer_class = AssignGroupSerializer
    permission_classes = [IsSuperUserOrAdminPermission]
    http_method_names = ['post']

    def get_group(self):
        user_group, _ = Group.objects.get_or_create(name='Administrators')
        return user_group

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user_id = serializer.validated_data['user_id']


        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"detail": "Пользователь не найден."}, status=status.HTTP_404_NOT_FOUND)

        try:
            if user.is_administrator():
                user.groups.remove(self.get_group())
                return Response({"detail": "Группа снята", "user_in_group": False}, status=status.HTTP_200_OK)

            user.groups.add(self.get_group())
            user.save()
            return Response({"detail": "Группа назначена.", "user_in_group": True}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class UpdateNameModelViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ChangeNameSerializer
    http_method_names = ['post', 'get']

    def create(self, request, *args, **kwargs):
        user = request.user
        serializer = self.serializer_class(user, data=request.data, partial=True)

        if serializer.is_valid():
            if not request.data.get('first_name') and not request.data.get('last_name'):
                return Response({"detail": "Данные не предоставлены."}, status=status.HTTP_400_BAD_REQUEST)

            serializer.save()
            return Response({"detail": "Имя изменено."}, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def list(self, request, *args, **kwargs):
        serializer = self.serializer_class(request.user)
        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )


class UserChangeEmailModelViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['post',]
    serializer_class = UserChangeEmailSerializer

    def get_queryset(self):
        request = self.request
        user = request.user
        # Вернуть queryset, содержащий только текущего пользователя
        return User.objects.filter(pk=user.pk)

    def list(self, request, *args, **kwargs):
        return Response(status=status.HTTP_200_OK)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():  # Проверяет данные
            new_email = serializer.validated_data.get('new_email')
            try:
                self.send_confirmation_email(request.user, new_email)
            except ValidationError as e:
                return Response(format_serializer_answers(e), status=status.HTTP_400_BAD_REQUEST)
            except Exception as ex:
                # Общая обработка ошибок
                return Response(format_serializer_answers(ex), status=status.HTTP_400_BAD_REQUEST)
            return Response(status=status.HTTP_200_OK)

        # Преобразование ошибок сериализатора в строки сообщений
        formatted_errors = format_serializer_answers(serializer.errors)
        return Response(formatted_errors, status=status.HTTP_400_BAD_REQUEST)
    def send_confirmation_email(self, user, new_email):
        confirmation_token = create_confirmation_token(user=user, is_changing_email=True, changed_email=new_email)
        send_confirmation_email(user, confirmation_token)


class UserForgotPasswordModelViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.AllowAny]
    http_method_names = ['post']
    serializer_class = UserForgotPasswordSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Логика создания токена и получения пользователя
        user = User.objects.get(email=serializer.validated_data['email'])

        # Удаляем старые токены для пользователя
        PasswordChangeToken.objects.filter(user=user).delete()

        # Создаём новый токен
        token = PasswordChangeToken.objects.create(user=user)

        # Формируем код для письма
        code = token.token

        # Отправляем письмо с подтверждением
        try:
            send_confirmation_password(user, token.url, code)
        except ValidationError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        # Возвращаем email
        return Response({'email': user.email}, status=status.HTTP_201_CREATED)

    def list(self, request, *args, **kwargs):
        return Response(status=status.HTTP_200_OK)

class ForgotPasswordConfirmChangeView(viewsets.ModelViewSet):
    permission_classes = [permissions.AllowAny]
    http_method_names = ['get', 'post']
    serializer_class = ForgotPasswordConfirmChangeSerializer

    def get_queryset(self, url=None):
        # Filter tokens by the specified URL if provided
        if url:
            return PasswordChangeToken.objects.filter(url=url)  # Only tokens with the specified URL
        return PasswordChangeToken.objects.none()  # Return an empty queryset if no URL is provided

    def retrieve(self, request, *args, **kwargs):
        # Получаем токен из URL
        url = kwargs.get('pk')  # Здесь предполагаем, что токен захватывается как 'pk'
        try:
            # Получаем токен из базы данных
            password_change_token = PasswordChangeToken.objects.get(url=url)
            # Проверяем, истек ли токен
            if password_change_token.has_expired():
                return Response({"detail": "Токен истек."}, status=status.HTTP_404_NOT_FOUND)

            # Возвращаем 200, если токен существует и не истек
            return Response(status=status.HTTP_200_OK)

        except PasswordChangeToken.DoesNotExist:
            # Возвращаем 404, если токен не найден
            return Response({"detail": "Страница не найдена."}, status=status.HTTP_404_NOT_FOUND)

    def list(self, request, *args, **kwargs):
        return Response({"detail": "Страница не найдена."},
                        status=status.HTTP_404_NOT_FOUND)  # Возвращаем 404, если не найден

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():  # Валидация входящих данных
            user = serializer.save()  # Сохранение данных
            return Response({"detail": "Пароль успешно изменен."}, status=status.HTTP_201_CREATED)
        return Response({"detail": "Непредвиденная ошибка."}, status=status.HTTP_400_BAD_REQUEST)

