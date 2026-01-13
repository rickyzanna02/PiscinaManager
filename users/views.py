from rest_framework import generics, permissions
from rest_framework.response import Response
from .serializers import RegisterSerializer
from rest_framework.viewsets import ReadOnlyModelViewSet
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from .serializers import UserListSerializer
from rest_framework.permissions import IsAdminUser
User = get_user_model()


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


class MeView(generics.GenericAPIView):
    """
    Ritorna l’utente autenticato.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            "id": user.id,
            "username": user.username,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "roles": [r.code for r in user.roles.all()],
            "is_staff": user.is_staff,
            "is_superuser": user.is_superuser
        })
