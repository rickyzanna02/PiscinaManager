from django.contrib import admin
from .models import (
    CategoryBaseRate,
    UserHourlyRate,
    CourseType,
    InstructorCourseRate,
)


@admin.register(CategoryBaseRate)
class CategoryBaseRateAdmin(admin.ModelAdmin):
    list_display = ("role", "base_rate")
    search_fields = ("role__code", "role__label")
    ordering = ("role__code",)
    autocomplete_fields = ("role",)


@admin.register(UserHourlyRate)
class UserHourlyRateAdmin(admin.ModelAdmin):
    list_display = ("user", "rate")
    search_fields = ("user__username",)
    autocomplete_fields = ("user",)
    
    ordering = ("user__username",)


@admin.register(CourseType)
class CourseTypeAdmin(admin.ModelAdmin):
    list_display = ("name", "base_rate", "default_minutes")
    search_fields = ("name",)
    list_filter = ("default_minutes",)
    ordering = ("name",)


@admin.register(InstructorCourseRate)
class InstructorCourseRateAdmin(admin.ModelAdmin):
    list_display = ("instructor", "course_type", "rate")
    search_fields = ("instructor__username", "course_type__name")
    autocomplete_fields = ("instructor", "course_type")
    list_filter = ("course_type",)
    ordering = ("instructor__username",)
