from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, UserRoleListView

router = DefaultRouter()
router.register("", UserViewSet, basename="users")

urlpatterns = [
    path("roles/", UserRoleListView.as_view()),
    path("", include(router.urls)),
]
