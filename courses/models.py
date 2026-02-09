from django.db import models
from django.conf import settings


# ================================
# 1️ - Tariffe base per ogni ruolo/categoria.
# ================================
class CategoryBaseRate(models.Model):
    role = models.OneToOneField(
        'users.UserRole',
        on_delete=models.CASCADE,
        related_name='base_rate',
        verbose_name='Ruolo'
    )
    base_rate = models.DecimalField(
        max_digits=6, 
        decimal_places=2,
        verbose_name='Tariffa base (€/h)'
    )

    class Meta:
        verbose_name = 'Tariffa base per categoria'
        verbose_name_plural = 'Tariffe base per categoria'

    def __str__(self):
        return f"{self.role.label}: {self.base_rate} €/h"


# ====================================
# 2️ - Tariffe personalizzate per utente
# (bagnino, segreteria, pulizie)
# ====================================
class UserHourlyRate(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="custom_hourly_rate"
    )
    rate = models.DecimalField(max_digits=6, decimal_places=2)

    def __str__(self):
        return f"{self.user.username}: {self.rate} €/h"


# =====================================
# 3️ - Tipi di corso (base per istruttori)
# =====================================
class CourseType(models.Model):
    name = models.CharField(max_length=100, unique=True)    
    base_rate = models.DecimalField(max_digits=6, decimal_places=2) # Tariffa base del corso    
    default_minutes = models.PositiveIntegerField(null=True, blank=True)    # Durata standard (es: 40 o 45 min)

    def __str__(self):
        return self.name


# ==================================================
# 4️ - Tariffa personalizzata dell'istruttore per corso
# ==================================================
class InstructorCourseRate(models.Model):
    instructor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="course_custom_rates"
    )
    course_type = models.ForeignKey(
        CourseType,
        on_delete=models.CASCADE,
        related_name="instructor_rates"
    )
    rate = models.DecimalField(max_digits=6, decimal_places=2)

    class Meta:
        unique_together = ("instructor", "course_type")

    def __str__(self):
        return f"{self.instructor.username} – {self.course_type.name}: {self.rate} €"