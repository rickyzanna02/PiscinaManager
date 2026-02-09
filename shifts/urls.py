# shifts/urls.py
from rest_framework.routers import DefaultRouter
from .views import (ShiftViewSet, TemplateShiftViewSet,)

router = DefaultRouter()
router.register(r'shifts', ShiftViewSet, basename='shifts')
router.register(r'templates', TemplateShiftViewSet, basename='templates')

urlpatterns = []
urlpatterns += router.urls
