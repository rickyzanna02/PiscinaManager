from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # API endpoints
    path('api/auth/', include('users.urls')),  # ✅ Auth endpoints (/api/auth/login, /api/auth/me, etc.)
    path('api/users/', include('users.urls')),  # ✅ User endpoints (/api/users/roles/, /api/users/users/, etc.)
    path('api/', include('shifts.urls')),      # ✅ Shifts endpoints
    path('api/courses/', include('courses.urls')),  # ✅ Courses endpoints
]