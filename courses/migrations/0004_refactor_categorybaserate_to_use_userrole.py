# Generated manually for refactoring

from django.db import migrations, models
import django.db.models.deletion


def migrate_category_to_role(apps, schema_editor):
    """Migra i dati da category (CharField) a role (FK)"""
    CategoryBaseRate = apps.get_model('courses', 'CategoryBaseRate')
    UserRole = apps.get_model('users', 'UserRole')
    
    # Mappa i vecchi valori di category ai ruoli
    for rate in CategoryBaseRate.objects.all():
        try:
            role = UserRole.objects.get(code=rate.category_old)
            rate.role = role
            rate.save()
        except UserRole.DoesNotExist:
            # Se il ruolo non esiste, lo creiamo
            role = UserRole.objects.create(
                code=rate.category_old,
                label=rate.category_old.capitalize()
            )
            rate.role = role
            rate.save()


def reverse_migrate_role_to_category(apps, schema_editor):
    """Ripristina i dati da role (FK) a category (CharField)"""
    CategoryBaseRate = apps.get_model('courses', 'CategoryBaseRate')
    
    for rate in CategoryBaseRate.objects.all():
        if rate.role:
            rate.category_old = rate.role.code
            rate.save()


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0003_delete_course'),
        ('users', '0005_populate_user_roles'),
    ]

    operations = [
        # Step 1: Rinomina il campo category esistente
        migrations.RenameField(
            model_name='categorybaserate',
            old_name='category',
            new_name='category_old',
        ),
        
        # Step 2: Aggiungi il nuovo campo role come FK (nullable temporaneamente)
        migrations.AddField(
            model_name='categorybaserate',
            name='role',
            field=models.ForeignKey(
                null=True,
                blank=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='category_base_rates',
                to='users.userrole'
            ),
        ),
        
        # Step 3: Migra i dati
        migrations.RunPython(migrate_category_to_role, reverse_migrate_role_to_category),
        
        # Step 4: Rendi role obbligatorio e unique
        migrations.AlterField(
            model_name='categorybaserate',
            name='role',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='category_base_rates',
                to='users.userrole',
                unique=True
            ),
        ),
        
        # Step 5: Rimuovi il vecchio campo category_old
        migrations.RemoveField(
            model_name='categorybaserate',
            name='category_old',
        ),
    ]
