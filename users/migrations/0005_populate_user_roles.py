# Generated manually for refactoring

from django.db import migrations


def populate_user_roles(apps, schema_editor):
    """Popola la tabella UserRole con i 4 ruoli base"""
    UserRole = apps.get_model('users', 'UserRole')
    
    roles = [
        {'code': 'bagnino', 'label': 'Bagnino'},
        {'code': 'istruttore', 'label': 'Istruttore'},
        {'code': 'segreteria', 'label': 'Segreteria'},
        {'code': 'pulizia', 'label': 'Pulizia'},
    ]
    
    for role_data in roles:
        UserRole.objects.get_or_create(
            code=role_data['code'],
            defaults={'label': role_data['label']}
        )


def reverse_populate_user_roles(apps, schema_editor):
    """Rimuove i ruoli base in caso di rollback"""
    UserRole = apps.get_model('users', 'UserRole')
    UserRole.objects.filter(
        code__in=['bagnino', 'istruttore', 'segreteria', 'pulizia']
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0004_contabilitacheck'),
    ]

    operations = [
        migrations.RunPython(populate_user_roles, reverse_populate_user_roles),
    ]
