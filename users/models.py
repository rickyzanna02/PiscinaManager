from django.contrib.auth.models import AbstractUser
from django.db import models
from django.conf import settings

class UserRole(models.Model):
    code = models.CharField(max_length=50, unique=True)
    label = models.CharField(max_length=100)

    def __str__(self):
        return self.label


class User(AbstractUser):
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    date_of_birth = models.DateField(null=True, blank=True)

    roles = models.ManyToManyField(
        UserRole,
        related_name="users",
        blank=True
    )

    def __str__(self):
        return f"{self.username} ({self.first_name} {self.last_name})"


class ContabilitaCheck(models.Model):
    checked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="contabilita_checks"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="checked_by_contabilita"
    )
    checked_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("checked_by", "user")

    def __str__(self):
        return f"{self.checked_by} → {self.user}"
