from django.contrib import admin
from .models import Shift, PayRate
from django.contrib import admin, messages
from django.utils import timezone
from .models import Shift, PayRate, TemplateShift, PublishedWeek
from .utils import generate_shifts_from_template


@admin.register(Shift)
class ShiftAdmin(admin.ModelAdmin):
    list_display = ('user', 'role', 'date', 'start_time', 'end_time', 'approved')

@admin.register(PayRate)
class PayRateAdmin(admin.ModelAdmin):
    list_display = ('user', 'role', 'pay_type', 'amount')
    list_filter = ('role', 'pay_type')

@admin.register(TemplateShift)
class TemplateShiftAdmin(admin.ModelAdmin):
    list_display = ('category', 'weekday', 'start_time', 'end_time', 'user')
    list_filter = ('category', 'weekday')

    actions = ["genera_turni_mese_corrente"]

    @admin.action(description="Genera i turni del mese corrente dai template")
    def genera_turni_mese_corrente(self, request, queryset):
        today = timezone.now().date()
        created = generate_shifts_from_template(today.year, today.month)
        self.message_user(request, f"Creati {created} turni per {today.strftime('%B %Y')}.", messages.SUCCESS)

@admin.register(PublishedWeek)
class PublishedWeekAdmin(admin.ModelAdmin):
    list_display = ("category", "start_date", "created_at")
    list_filter = ("category", "start_date")
    ordering = ("-start_date",)

