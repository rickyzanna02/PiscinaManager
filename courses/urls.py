from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import CourseTypeViewSet

router = DefaultRouter()
router.register(r'types', CourseTypeViewSet, basename='course-types')

urlpatterns = router.urls
