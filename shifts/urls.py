from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import (
    ShiftViewSet,
    TemplateShiftViewSet,
    PayRateViewSet,
)

from courses.views import CourseTypeViewSet

router = DefaultRouter()
router.register(r'shifts', ShiftViewSet, basename='shifts')
router.register(r'templates', TemplateShiftViewSet, basename='templates')
router.register(r'payrates', PayRateViewSet, basename='payrates')




urlpatterns = []
urlpatterns += router.urls
