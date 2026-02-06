# Generated manually for refactoring - SQLite compatible version

from django.db import migrations, models
import django.db.models.deletion


def migrate_category_to_role(apps, schema_editor):
    """Migra i dati da category (CharField) a role (FK)"""
    PublishedWeek = apps.get_model('shifts', 'PublishedWeek')
    UserRole = apps.get_model('users', 'UserRole')
    
    # Mappa i vecchi valori di category ai ruoli
    for week in PublishedWeek.objects.all():
        try:
            role = UserRole.objects.get(code=week.category)
            week.role = role
            week.save()
        except UserRole.DoesNotExist:
            # Se il ruolo non esiste, lo creiamo
            role = UserRole.objects.create(
                code=week.category,
                label=week.category.capitalize()
            )
            week.role = role
            week.save()


def reverse_migrate_role_to_category(apps, schema_editor):
    """Ripristina i dati da role (FK) a category (CharField)"""
    PublishedWeek = apps.get_model('shifts', 'PublishedWeek')
    
    for week in PublishedWeek.objects.all():
        if week.role:
            week.category = week.role.code
            week.save()


class Migration(migrations.Migration):

    dependencies = [
        ('shifts', '0013_delete_payrate'),
        ('users', '0005_populate_user_roles'),
    ]

    operations = [
        # Step 1: Rimuovi il constraint unique_together esistente
        migrations.AlterUniqueTogether(
            name='publishedweek',
            unique_together=set(),
        ),
        
        # Step 2: Aggiungi il nuovo campo role come FK (nullable temporaneamente)
        migrations.AddField(
            model_name='publishedweek',
            name='role',
            field=models.ForeignKey(
                null=True,
                blank=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='published_weeks',
                to='users.userrole'
            ),
        ),
        
        # Step 3: Migra i dati da category a role
        migrations.RunPython(migrate_category_to_role, reverse_migrate_role_to_category),
        
        # Step 4: Rimuovi il vecchio campo category
        migrations.RemoveField(
            model_name='publishedweek',
            name='category',
        ),
        
        # Step 5: Rendi role obbligatorio
        migrations.AlterField(
            model_name='publishedweek',
            name='role',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='published_weeks',
                to='users.userrole'
            ),
        ),
        
        # Step 6: Aggiungi il nuovo constraint unique_together
        migrations.AlterUniqueTogether(
            name='publishedweek',
            unique_together={('role', 'start_date')},
        ),
    ]
