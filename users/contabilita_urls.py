# users/contabilita_urls.py
from django.urls import path
from .views import (
    MyContabilitaChecksView,
    ToggleContabilitaCheckView,
)

urlpatterns = [
    path("checks/", MyContabilitaChecksView.as_view()),
    path("checks/<int:user_id>/", ToggleContabilitaCheckView.as_view()),
]
