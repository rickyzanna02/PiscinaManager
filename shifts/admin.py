from django.contrib import admin, messages
from django.utils import timezone

from .models import (
    Shift,
    TemplateShift,
    PublishedWeek,
    ReplacementRequest
)

from .utils import generate_shifts_from_template


# ==============================
# SHIFT
# ==============================
@admin.register(Shift)
class ShiftAdmin(admin.ModelAdmin):
    list_display = (
        'user',
        'role',
        'date',
        'start_time',
        'end_time',
        'course_type',      # 🔥 AGGIUNTO
        'approved'
    )
    list_filter = ('role', 'date', 'user', 'course_type')
    search_fields = ('user__username',)


# ==============================
# TEMPLATE SHIFT
# ==============================
@admin.register(TemplateShift)
class TemplateShiftAdmin(admin.ModelAdmin):
    list_display = (
        'category',
        'weekday',
        'start_time',
        'end_time',
        'user',
        'course_type',  # 🔥 AGGIUNTO
    )
    list_filter = ('category', 'weekday', 'course_type')
    search_fields = ('user__username',)
    
    actions = ["genera_turni_mese_corrente"]

    @admin.action(description="Genera i turni del mese corrente dai template")
    def genera_turni_mese_corrente(self, request, queryset):
        today = timezone.now().date()
        created = generate_shifts_from_template(today.year, today.month)
        self.message_user(
            request,
            f"Creati {created} turni per {today.strftime('%B %Y')}.",
            messages.SUCCESS
        )


# ==============================
# PUBLISHED WEEK
# ==============================
@admin.register(PublishedWeek)
class PublishedWeekAdmin(admin.ModelAdmin):
    list_display = ("category", "start_date", "created_at")
    list_filter = ("category", "start_date")
    ordering = ("-start_date",)


# ==============================
# REPLACEMENT REQUEST (per debug)
# ==============================
@admin.register(ReplacementRequest)
class ReplacementRequestAdmin(admin.ModelAdmin):
    list_display = (
        'shift',
        'requester',
        'target_user',
        'status',
        'partial',
        'partial_start',
        'partial_end',
        'closed_by',
        'created_at'
    )
    list_filter = ('status', 'partial', 'shift__role')
    search_fields = ('requester__username', 'target_user__username')
