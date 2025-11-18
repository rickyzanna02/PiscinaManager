from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from .models import User

@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    fieldsets = (
        ("Credenziali", {"fields": ("username", "password")}),
        ("Informazioni personali", {"fields": ("first_name", "last_name", "email")}),
        ("Ruolo e compenso", {"fields": ("role", "hourly_rate")}),
        ("Permessi", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Date importanti", {"fields": ("last_login", "date_joined")}),
    )

    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("username", "password1", "password2", "role", "hourly_rate"),
        }),
    )

    list_display = ("username", "email", "first_name", "last_name", "role", "hourly_rate", "is_staff")
    search_fields = ("username", "email", "first_name", "last_name")
    ordering = ("username",)
