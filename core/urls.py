from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('shifts.urls')),
    path('api/', include('users.urls')),
    path("courses/", include("courses.urls")),
    path("", include("shifts.urls")),   # se già lo usi


]
