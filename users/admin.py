from django.contrib import admin
from .models import User, UserRole


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ("username", "first_name", "last_name")
    search_fields = ("username", "first_name", "last_name")
    filter_horizontal = ("roles",)

@admin.register(UserRole)
class UserRoleAdmin(admin.ModelAdmin):
    list_display = ("code", "label")
    search_fields = ("code", "label")
