from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from .views import ChangePasswordView, MyContabilitaChecksView, RegisterView, MeView, UserRoleListView, UserViewSet, ToggleContabilitaCheckView, MyContabilitaChecksView

router = DefaultRouter()
router.register("users", UserViewSet, basename="users")

urlpatterns = [
    # 🔐 Auth
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", TokenObtainPairView.as_view(), name="login"),
    path("refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("me/", MeView.as_view(), name="me"),
    path("roles/", UserRoleListView.as_view()),
    path("change-password/", ChangePasswordView.as_view(), name="change-password"),    
    path("contabilita/checks/", MyContabilitaChecksView.as_view()),
    path("contabilita/checks/<int:user_id>/",ToggleContabilitaCheckView.as_view()),
    
    

    # 👥 Utenti
    path("", include(router.urls)),
]
