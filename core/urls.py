from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('shifts.urls')),
    path('api/', include('users.urls')),
    path('api/courses/', include('courses.urls')),
    path("api/auth/", include("users.urls")),
    path("api/users/", include("users.urls")),
    path("api/auth/", include("users.urls")),
    



]
