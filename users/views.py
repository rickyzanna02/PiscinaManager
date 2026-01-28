from rest_framework import generics, permissions
from rest_framework.response import Response
from .serializers import RegisterSerializer
from rest_framework.viewsets import ReadOnlyModelViewSet
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from .serializers import UserListSerializer
from rest_framework.permissions import IsAdminUser
from rest_framework.generics import ListAPIView
from .models import UserRole
from .serializers import UserRoleSerializer
User = get_user_model()
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from rest_framework.views import APIView
from rest_framework import status
from .models import User



from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            "id": user.id,
            "username": user.username,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "date_of_birth": user.date_of_birth,
            "roles": [r.code for r in user.roles.all()],
            "is_staff": user.is_staff,
            "is_superuser": user.is_superuser
        })

    def put(self, request):
        user = request.user

        user.first_name = request.data.get("first_name", user.first_name)
        user.last_name = request.data.get("last_name", user.last_name)
        user.date_of_birth = request.data.get("date_of_birth", user.date_of_birth)

        user.save()

        return Response({
            "id": user.id,
            "username": user.username,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "date_of_birth": user.date_of_birth,
            "roles": [r.code for r in user.roles.all()],
            "is_staff": user.is_staff,
            "is_superuser": user.is_superuser
        }, status=status.HTTP_200_OK)


class UserViewSet(ReadOnlyModelViewSet):
    serializer_class = UserListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        # collaboratori NON vedono utenti
        if not (user.is_staff or user.roles.filter(code="contabilita").exists()):
            return User.objects.none()

        qs = User.objects.all()

        if self.request.query_params.get("only_collaborators") == "true":
            qs = qs.filter(is_staff=False).exclude(roles__code="contabilita")

        return qs.distinct().order_by("username")





class RegisterView(generics.CreateAPIView):
    """
    Registrazione utente standard (collaboratore).
    """
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


    
class UserRoleListView(ListAPIView):
    queryset = UserRole.objects.all()
    serializer_class = UserRoleSerializer


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]


    def post(self, request):
        user = request.user


        old_password = request.data.get("old_password")
        new_password = request.data.get("new_password")


        if not user.check_password(old_password):
            return Response(
            {"detail": "Password attuale errata"},
            status=status.HTTP_400_BAD_REQUEST
            )


        try:
            validate_password(new_password, user)
        except ValidationError as e:
            return Response(
            {"detail": e.messages},
            status=status.HTTP_400_BAD_REQUEST
            )


        user.set_password(new_password)
        user.save()


        return Response(
        {"detail": "Password aggiornata"},
        status=status.HTTP_200_OK
        )
