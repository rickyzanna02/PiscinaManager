from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    # API endpoints
    path("api/auth/", include("users.auth_urls")), # Auth endpoints
    path("api/users/", include("users.user_urls")), # User endpoints
    path("api/contabilita/", include("users.contabilita_urls")), # Contabilità endpoints
    path('api/', include('shifts.urls')),      # Shifts endpoints
    path('api/courses/', include('courses.urls')),  # Courses endpoints
]