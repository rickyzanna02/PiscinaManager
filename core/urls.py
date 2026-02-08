from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # API endpoints
    path("api/auth/", include("users.auth_urls")),
    path("api/users/", include("users.user_urls")),
     path("api/contabilita/", include("users.contabilita_urls")), #contabilità

    path('api/', include('shifts.urls')),      # ✅ Shifts endpoints
    path('api/courses/', include('courses.urls')),  # ✅ Courses endpoints
]