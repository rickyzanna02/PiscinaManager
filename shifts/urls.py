# shifts/urls.py
from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import (
    ShiftViewSet,
    TemplateShiftViewSet,
    PayRateViewSet,
    notify_replacement,           # ✅ import
)

from courses.views import CourseTypeViewSet

router = DefaultRouter()
router.register(r'shifts', ShiftViewSet, basename='shifts')
router.register(r'templates', TemplateShiftViewSet, basename='templates')
router.register(r'payrates', PayRateViewSet, basename='payrates')


urlpatterns = [
    path('notify_replacement/', notify_replacement, name='notify_replacement'),  # ✅ aggiunto
]

urlpatterns += router.urls
