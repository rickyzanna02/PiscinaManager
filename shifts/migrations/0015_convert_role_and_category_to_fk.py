# Generated manually to fix migration conflicts
# V4: FINALE - Disabilita FK constraints durante la ricostruzione

from django.db import migrations, models
import django.db.models.deletion


def check_and_migrate_shift_role(apps, schema_editor):
    """
    Migra Shift.role da CharField a FK
    V4: Disabilita FK constraints per evitare conflitti
    """
    from django.db import connection
    
    Shift = apps.get_model('shifts', 'Shift')
    UserRole = apps.get_model('users', 'UserRole')
    User = apps.get_model('users', 'User')
    
    # Verifica lo stato attuale delle colonne
    with connection.cursor() as cursor:
        cursor.execute("PRAGMA table_info(shifts_shift);")
        columns = {col[1]: col for col in cursor.fetchall()}
    
    role_exists = 'role' in columns
    role_id_exists = 'role_id' in columns
    
    print(f"\n=== MIGRAZIONE SHIFT.ROLE ===")
    print(f"Colonna 'role' (CharField): {role_exists}")
    print(f"Colonna 'role_id' (FK): {role_id_exists}")
    
    if role_exists and not role_id_exists:
        print("→ Migrando da CharField a FK...")
        
        # 🔥 DISABILITA FK CONSTRAINTS
        with connection.cursor() as cursor:
            cursor.execute("PRAGMA foreign_keys = OFF;")
        
        try:
            # Pulisci dati orfani
            print("→ Pulizia dati orfani...")
            existing_user_ids = set(User.objects.values_list('id', flat=True))
            
            with connection.cursor() as cursor:
                cursor.execute("SELECT DISTINCT user_id FROM shifts_shift")
                all_shift_users = {row[0] for row in cursor.fetchall()}
            
            orphaned_ids = all_shift_users - existing_user_ids
            
            if orphaned_ids:
                print(f"  Trovati {len(orphaned_ids)} user_id orfani: {sorted(orphaned_ids)}")
                
                # Elimina richieste di sostituzione collegate
                for uid in orphaned_ids:
                    with connection.cursor() as cursor:
                        cursor.execute("""
                            DELETE FROM shifts_replacementrequest 
                            WHERE shift_id IN (
                                SELECT id FROM shifts_shift WHERE user_id = %s
                            )
                        """, [uid])
                
                # Elimina turni orfani
                for uid in orphaned_ids:
                    with connection.cursor() as cursor:
                        cursor.execute("SELECT COUNT(*) FROM shifts_shift WHERE user_id = %s", [uid])
                        count = cursor.fetchone()[0]
                        
                        cursor.execute("DELETE FROM shifts_shift WHERE user_id = %s", [uid])
                        print(f"  Eliminati {count} turni con user_id={uid}")
            else:
                print("  ✅ Nessun turno orfano")
            
            # Migrazione ruoli
            role_map = {role.code: role.id for role in UserRole.objects.all()}
            print(f"Ruoli disponibili: {list(role_map.keys())}")
            
            # Aggiungi campo temporaneo
            with connection.cursor() as cursor:
                cursor.execute("ALTER TABLE shifts_shift ADD COLUMN role_id_temp INTEGER;")
            
            # Migra i dati
            shifts_updated = 0
            shifts_skipped = 0
            
            for shift in Shift.objects.all():
                old_role_code = getattr(shift, 'role', None)
                
                if old_role_code and old_role_code in role_map:
                    with connection.cursor() as cursor:
                        cursor.execute(
                            "UPDATE shifts_shift SET role_id_temp = %s WHERE id = %s",
                            [role_map[old_role_code], shift.id]
                        )
                    shifts_updated += 1
                else:
                    print(f"⚠️  WARNING: Shift {shift.id} ha role '{old_role_code}' non trovato")
                    shifts_skipped += 1
            
            print(f"Turni migrati: {shifts_updated}, saltati: {shifts_skipped}")
            print("Ricostruzione tabella...")
            
            # Ricostruisci la tabella
            with connection.cursor() as cursor:
                # Crea nuova tabella direttamente
                cursor.execute("""
                    CREATE TABLE shifts_shift_new (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        role_id INTEGER NOT NULL,
                        date DATE NOT NULL,
                        start_time TIME NOT NULL,
                        end_time TIME NOT NULL,
                        course_type_id INTEGER,
                        approved BOOLEAN NOT NULL DEFAULT 0
                    );
                """)
                
                # Copia dati
                cursor.execute("""
                    INSERT INTO shifts_shift_new 
                    (id, user_id, role_id, date, start_time, end_time, course_type_id, approved)
                    SELECT id, user_id, role_id_temp, date, start_time, end_time, course_type_id, approved
                    FROM shifts_shift
                    WHERE role_id_temp IS NOT NULL;
                """)
                
                # Elimina vecchia e rinomina
                cursor.execute("DROP TABLE shifts_shift;")
                cursor.execute("ALTER TABLE shifts_shift_new RENAME TO shifts_shift;")
            
            print("✅ Migrazione Shift.role completata")
        
        finally:
            # 🔥 RIABILITA FK CONSTRAINTS
            with connection.cursor() as cursor:
                cursor.execute("PRAGMA foreign_keys = ON;")
    
    elif role_exists and role_id_exists:
        print("⚠️  Entrambe le colonne esistono - pulizia non necessaria")
        print("✅ Migrazione già parzialmente applicata")
    
    elif role_id_exists and not role_exists:
        print("✅ Migrazione Shift.role già applicata")


def check_and_migrate_templateshift_category(apps, schema_editor):
    """
    Migra TemplateShift.category da CharField a FK
    V4: Disabilita FK constraints
    """
    from django.db import connection
    
    TemplateShift = apps.get_model('shifts', 'TemplateShift')
    UserRole = apps.get_model('users', 'UserRole')
    User = apps.get_model('users', 'User')
    
    # Verifica lo stato attuale
    with connection.cursor() as cursor:
        cursor.execute("PRAGMA table_info(shifts_templateshift);")
        columns = {col[1]: col for col in cursor.fetchall()}
    
    category_exists = 'category' in columns
    category_id_exists = 'category_id' in columns
    
    print(f"\n=== MIGRAZIONE TEMPLATESHIFT.CATEGORY ===")
    print(f"Colonna 'category' (CharField): {category_exists}")
    print(f"Colonna 'category_id' (FK): {category_id_exists}")
    
    if category_exists and not category_id_exists:
        print("→ Migrando da CharField a FK...")
        
        # 🔥 DISABILITA FK CONSTRAINTS
        with connection.cursor() as cursor:
            cursor.execute("PRAGMA foreign_keys = OFF;")
        
        try:
            # Pulisci template orfani
            print("→ Pulizia template orfani...")
            existing_user_ids = set(User.objects.values_list('id', flat=True))
            
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT DISTINCT user_id 
                    FROM shifts_templateshift 
                    WHERE user_id IS NOT NULL
                """)
                all_template_users = {row[0] for row in cursor.fetchall() if row[0]}
            
            orphaned_ids = all_template_users - existing_user_ids
            
            if orphaned_ids:
                print(f"  Trovati {len(orphaned_ids)} user_id orfani: {sorted(orphaned_ids)}")
                for uid in orphaned_ids:
                    with connection.cursor() as cursor:
                        cursor.execute("SELECT COUNT(*) FROM shifts_templateshift WHERE user_id = %s", [uid])
                        count = cursor.fetchone()[0]
                        
                        cursor.execute("DELETE FROM shifts_templateshift WHERE user_id = %s", [uid])
                        print(f"  Eliminati {count} template con user_id={uid}")
            else:
                print("  ✅ Nessun template orfano")
            
            # Migrazione
            role_map = {role.code: role.id for role in UserRole.objects.all()}
            
            with connection.cursor() as cursor:
                cursor.execute("ALTER TABLE shifts_templateshift ADD COLUMN category_id_temp INTEGER;")
            
            templates_updated = 0
            templates_skipped = 0
            
            for template in TemplateShift.objects.all():
                old_category_code = getattr(template, 'category', None)
                
                if old_category_code and old_category_code in role_map:
                    with connection.cursor() as cursor:
                        cursor.execute(
                            "UPDATE shifts_templateshift SET category_id_temp = %s WHERE id = %s",
                            [role_map[old_category_code], template.id]
                        )
                    templates_updated += 1
                else:
                    print(f"⚠️  WARNING: Template {template.id} ha category '{old_category_code}' non trovata")
                    templates_skipped += 1
            
            print(f"Template migrati: {templates_updated}, saltati: {templates_skipped}")
            
            # Ricostruisci tabella
            with connection.cursor() as cursor:
                cursor.execute("""
                    CREATE TABLE shifts_templateshift_new (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        category_id INTEGER NOT NULL,
                        weekday INTEGER NOT NULL,
                        start_time TIME NOT NULL,
                        end_time TIME NOT NULL,
                        user_id INTEGER,
                        course_type_id INTEGER
                    );
                """)
                
                cursor.execute("""
                    INSERT INTO shifts_templateshift_new 
                    (id, category_id, weekday, start_time, end_time, user_id, course_type_id)
                    SELECT id, category_id_temp, weekday, start_time, end_time, user_id, course_type_id
                    FROM shifts_templateshift
                    WHERE category_id_temp IS NOT NULL;
                """)
                
                cursor.execute("DROP TABLE shifts_templateshift;")
                cursor.execute("ALTER TABLE shifts_templateshift_new RENAME TO shifts_templateshift;")
            
            print("✅ Migrazione TemplateShift.category completata")
        
        finally:
            # 🔥 RIABILITA FK CONSTRAINTS
            with connection.cursor() as cursor:
                cursor.execute("PRAGMA foreign_keys = ON;")
    
    elif category_exists and category_id_exists:
        print("⚠️  Entrambe le colonne esistono - pulizia non necessaria")
        print("✅ Migrazione già parzialmente applicata")
    
    elif category_id_exists and not category_exists:
        print("✅ Migrazione TemplateShift.category già applicata")


def reverse_migration(apps, schema_editor):
    """Reverse non supportato"""
    print("⚠️  REVERSE non implementato - ripristinare da backup se necessario!")


class Migration(migrations.Migration):
    
    # 🔥 IMPORTANTE: Disabilita atomic per poter gestire FK manualmente
    atomic = False

    dependencies = [
        ('shifts', '0014_refactor_publishedweek_to_use_userrole'),
        ('users', '0005_populate_user_roles'),
    ]

    operations = [
        migrations.RunPython(
            check_and_migrate_shift_role,
            reverse_migration
        ),
        migrations.RunPython(
            check_and_migrate_templateshift_category,
            reverse_migration
        ),
    ]