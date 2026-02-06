from datetime import date, timedelta
from calendar import monthrange
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from rest_framework.permissions import IsAuthenticated
User = get_user_model()
from users.serializers import UserListSerializer
from django.utils import timezone
from users.models import UserRole



from rest_framework import generics

from .models import Shift, TemplateShift, ReplacementRequest, PublishedWeek
from .serializers import (
    ShiftSerializer,
    TemplateShiftSerializer,
    ReplacementRequestSerializer,
)


# ============================================================
#  TURNI REALI (quelli effettivi pubblicati)
# ============================================================
class ShiftViewSet(viewsets.ModelViewSet):
    """
    Gestisce i turni effettivi dei collaboratori.
    Permette di filtrare per utente, ruolo, mese e anno.
    """
    queryset = Shift.objects.all()
    serializer_class = ShiftSerializer
    permission_classes = [permissions.AllowAny]  # in futuro: IsAuthenticated

    def get_queryset(self):
        qs = super().get_queryset()
        user_id = self.request.query_params.get('user')
        role = self.request.query_params.get('role')
        month = self.request.query_params.get('month')
        year = self.request.query_params.get('year')

        if user_id:
            qs = qs.filter(user_id=user_id)
        if role:
            qs = qs.filter(role=role)
        if month and year:
            qs = qs.filter(date__month=month, date__year=year)
        return qs.order_by('date', 'start_time')

    # ----------------------------------------------------------
    # GENERA MENSILE (base, non categoria-specifico)
    # ----------------------------------------------------------
    @action(detail=False, methods=['post'])
    def generate_month(self, request):
        """
        Genera automaticamente i turni reali del mese partendo dai TemplateShift.
        """
        try:
            year = int(request.data.get('year'))
            month = int(request.data.get('month'))
        except (TypeError, ValueError):
            return Response({'error': 'Specifica year e month'}, status=status.HTTP_400_BAD_REQUEST)

        days_in_month = monthrange(year, month)[1]
        created_count = 0

        for day in range(1, days_in_month + 1):
            current_date = date(year, month, day)
            weekday = current_date.weekday()  # 0=lun, 6=dom
            templates = TemplateShift.objects.filter(weekday=weekday)

            for template in templates:
                # evita duplicati se già generato
                shift, created = Shift.objects.get_or_create(
                    user=template.user,
                    role=template.category,  # NB: qui usi direttamente la stringa category
                    date=current_date,
                    start_time=template.start_time,
                    end_time=template.end_time,
                    defaults={'course_type': template.course_type}
                )
                if created:
                    created_count += 1

        return Response({'created': created_count})

    @action(detail=False, methods=['post'])
    def publish(self, request):
        weeks = request.data.get("weeks", [])
        category = request.data.get("category")

        if not category:
            return Response({"error": "category mancante"}, status=400)
        
        # ✅ Ottieni il UserRole dal code
        try:
            role = UserRole.objects.get(code=category)
        except UserRole.DoesNotExist:
            return Response({"error": f"Ruolo '{category}' non trovato"}, status=400)

        if not isinstance(weeks, list) or not weeks:
            return Response({"error": "Lista 'weeks' mancante o vuota"},
                            status=status.HTTP_400_BAD_REQUEST)

        total_created = 0
        total_updated = 0
        total_deleted = 0
        debug_log = []

        for week in weeks:
            try:
                start_date = date.fromisoformat(week["start"])
                end_date = date.fromisoformat(week["end"])
            except Exception:
                return Response({"error": "Formato data errato"}, status=400)

            # Normalizza settimana a Lunedì
            if start_date.weekday() == 6:
                normalized = start_date + timedelta(days=1)
            else:
                normalized = start_date - timedelta(days=start_date.weekday())

            start_date = normalized
            end_date = start_date + timedelta(days=6)

            debug_log.append(f"Settimana normalizzata: {start_date} → {end_date}")

            # Registra settimana come pubblicata
            # ✅ Usa role invece di category
            PublishedWeek.objects.get_or_create(
                role=role,
                start_date=start_date
            )

            # Turni esistenti della settimana
            existing_shifts = Shift.objects.filter(
                date__range=[start_date, end_date],
                role=category
            )

            existing_map = {
                (s.date, s.user_id, s.role.code): s
                for s in existing_shifts
            }

            template_keys = set()

            # Genera i turni dai template
            for i in range(7):
                current_date = start_date + timedelta(days=i)
                weekday = current_date.weekday()

                templates = TemplateShift.objects.filter(
                    weekday=weekday,
                    category=category
                )

                for template in templates:
                    if not template.user:
                        continue

                    key = (current_date, template.user_id, template.category)
                    template_keys.add(key)

                    if key in existing_map:
                        shift = existing_map[key]

                        # 🔥 CONFRONTO CORRETTO (course_type!)
                        tpl_course_id = template.course_type_id

                        if (
                            shift.start_time != template.start_time or
                            shift.end_time != template.end_time or
                            shift.course_type_id != tpl_course_id
                        ):
                            shift.start_time = template.start_time
                            shift.end_time = template.end_time
                            shift.course_type_id = tpl_course_id
                            shift.save(update_fields=["start_time", "end_time", "course_type"])
                            total_updated += 1

                    else:
                        Shift.objects.create(
                            user=template.user,
                            role=template.category,
                            date=current_date,
                            start_time=template.start_time,
                            end_time=template.end_time,
                            course_type=template.course_type,
                        )
                        total_created += 1

            # Elimina turni non più presenti nei template
            for key, shift in existing_map.items():
                if key not in template_keys:
                    shift.delete()
                    total_deleted += 1

        return Response({
            "message": "Pubblicazione completata",
            "created": total_created,
            "updated": total_updated,
            "deleted": total_deleted,
            "debug": debug_log,
        })





    # ----------------------------------------------------------
    # RICHIESTA SOSTITUZIONE "vecchia" (manager → tutti)
    # ----------------------------------------------------------
    @action(detail=True, methods=['post'])
    def request_replacement(self, request, pk=None):
        """
        Vecchio endpoint generico: manda una richiesta "broadcast" (mock).
        Lo lascio per compatibilità, ma la nuova logica usa ReplacementRequest.
        """
        try:
            shift = self.get_object()
        except Shift.DoesNotExist:
            return Response({'error': 'Turno non trovato'}, status=status.HTTP_404_NOT_FOUND)

        users = User.objects.exclude(id=shift.user.id)
        user_list = [u.username for u in users]

        return Response({
            'message': 'Richiesta di sostituzione inviata!',
            'to': user_list,
            'shift': {
                'id': shift.id,
                'date': shift.date,
                'role': shift.role,
                'user': shift.user.username
            }
        }, status=status.HTTP_200_OK)

    # ----------------------------------------------------------
    # NUOVO: CREAZIONE RICHIESTE SOSTITUZIONE PUNTUALI
    # ----------------------------------------------------------
    @action(detail=True, methods=['post'])
    def ask_replacement(self, request, pk=None):
        """
        Crea richieste di sostituzione per uno o più collaboratori.

        Body:
        - requester_id (opzionale, per ora utile perché non hai login reale)
        - target_users: lista di user_id (obbligatoria)
        - partial: bool (True = solo parte turno)
        - partial_start: "HH:MM"
        - partial_end: "HH:MM"
        """
        try:
            shift = self.get_object()
        except Shift.DoesNotExist:
            return Response({'error': 'Turno non trovato'}, status=status.HTTP_404_NOT_FOUND)

        # chi sta chiedendo? per ora permettiamo di passare requester_id
        requester = request.user if request.user and request.user.is_authenticated else None
        requester_id = request.data.get("requester_id")
        if requester_id:
            try:
                requester = User.objects.get(id=requester_id)
            except User.DoesNotExist:
                return Response({'error': 'requester_id non valido'}, status=400)

        # fallback estremo: se proprio non abbiamo info, usiamo il titolare del turno
        if requester is None:
            requester = shift.user

        target_users = request.data.get("target_users", [])
        partial = bool(request.data.get("partial", False))
        partial_start = request.data.get("partial_start")
        partial_end = request.data.get("partial_end")

        if not isinstance(target_users, list) or len(target_users) == 0:
            return Response({'error': 'Nessun collaboratore selezionato'}, status=400)

        # se partial, voglio entrambe le ore
        if partial and (not partial_start or not partial_end):
            return Response({'error': 'Specifica partial_start e partial_end'}, status=400)

        created_ids = []
        for user_id in target_users:
            # evita di mandare la richiesta a sé stesso
            if int(user_id) == requester.id:
                continue

            req = ReplacementRequest.objects.create(
                shift=shift,
                requester=requester,
                target_user_id=user_id,
                partial=partial,
                partial_start=partial_start if partial else None,
                partial_end=partial_end if partial else None,
                original_start_time=shift.start_time,
                original_end_time=shift.end_time,
            )
            created_ids.append(req.id)

        return Response({
            "message": "Richieste inviate",
            "requests": created_ids
        }, status=200)

    # ----------------------------------------------------------
    # RICHIESTE INVIATE (per collaboratore)
    # ----------------------------------------------------------
    @action(detail=False, methods=['get'])
    def replacements_sent(self, request):
        """
        Lista delle richieste di sostituzione INVIATE da un utente.

        Query string:
        - user_id (se manca, uso request.user se autenticato)
        """
        user_id = request.query_params.get("user_id")
        if not user_id and request.user and request.user.is_authenticated:
            user_id = request.user.id

        if not user_id:
            return Response({'error': 'user_id mancante'}, status=400)
        
        year = request.query_params.get("year")
        month = request.query_params.get("month")

        qs = ReplacementRequest.objects.filter(
            requester_id=user_id
        ).select_related("shift", "target_user")

        if year and month:
            qs = qs.filter(
                shift__date__year=year,
                shift__date__month=month
            )

        qs = qs.order_by("-shift__date")

        ser = ReplacementRequestSerializer(qs, many=True)
        return Response(ser.data, status=200)

    # ----------------------------------------------------------
    # RICHIESTE RICEVUTE (per collaboratore)
    # ----------------------------------------------------------
    @action(detail=False, methods=['get'])
    def replacements_received(self, request):
        user_id = request.query_params.get("user_id")
        only_pending = request.query_params.get("only_pending", "true") == "true"

        year = request.query_params.get("year")
        month = request.query_params.get("month")

        qs = ReplacementRequest.objects.filter(
            target_user_id=user_id
        ).select_related("shift")

        if only_pending:
            qs = qs.filter(status="pending")

        if year and month:
            qs = qs.filter(
                shift__date__year=year,
                shift__date__month=month
            )

        qs = qs.order_by("-shift__date")

        ser = ReplacementRequestSerializer(qs, many=True)
        return Response(ser.data)


    # ----------------------------------------------------------
    # RISPOSTA A RICHIESTA (ACCONSENTE / RIFIUTA)
    # ----------------------------------------------------------
    @action(detail=False, methods=['post'])
    def respond_replacement(self, request):
        req_id = request.data.get("request_id")
        action = request.data.get("action")

        if not req_id or action not in ("accept", "reject"):
            return Response({'error': 'request_id o action non validi'}, status=400)

        try:
            req = ReplacementRequest.objects.select_related(
                "shift", "target_user", "requester"
            ).get(id=req_id)
        except ReplacementRequest.DoesNotExist:
            return Response({'error': 'Richiesta non trovata'}, status=404)

        if req.status != 'pending':
            return Response({'error': 'Richiesta già gestita'}, status=400)

        shift = req.shift
        requester = req.requester
        sostituto = req.target_user

        orig_start = shift.start_time
        orig_end = shift.end_time
        part_start = req.partial_start
        part_end = req.partial_end

        # -----------------------------------------------------
        # 🔴 RIFIUTA
        # -----------------------------------------------------
        if action == "reject":
            req.status = 'rejected'
            req.save(update_fields=["status"])
            return Response({'message': 'Richiesta rifiutata'}, status=200)

        # -----------------------------------------------------
        # 🟢 ACCETTA
        # -----------------------------------------------------
        req.status = 'accepted'

        # 🔥 SALVA ORARI ORIGINALI SOLO NELLA REQUEST
        if req.original_start_time is None:
            req.original_start_time = shift.start_time

        if req.original_end_time is None:
            req.original_end_time = shift.end_time

        req.save(update_fields=[
            "status",
            "original_start_time",
            "original_end_time"
        ])

        # -----------------------------------------------------
        # 🔵 SOSTITUZIONE TOTALE
        # -----------------------------------------------------
        if not req.partial:

            # Aggiorna turno reale → passa al sostituto
            shift.user = sostituto
            shift.save(update_fields=["user"])

            # Le altre richieste pending → CANCELLED
            other_requests = ReplacementRequest.objects.filter(
                shift=shift
            ).exclude(id=req.id)

            other_requests.filter(status='pending').update(
                status='cancelled',
                closed_by=sostituto,     # chi ha accettato
                updated_at=timezone.now()
            )


            return Response({'message': 'Sostituzione totale accettata'}, status=200)

        # -----------------------------------------------------
        # 🟣 SOSTITUZIONE PARZIALE (SPLIT)
        # -----------------------------------------------------

        # 1) altre richieste sul turno
        other_reqs = ReplacementRequest.objects.filter(shift=shift).exclude(id=req.id)

        # 2) parziali / totali
        partial_reqs = other_reqs.filter(partial=True)
        total_reqs = other_reqs.filter(partial=False)

        # 3) sovrapposte alla richiesta accettata
        overlapping = partial_reqs.filter(
            partial_start__lt=part_end,
            partial_end__gt=part_start,
        )
        non_overlapping = partial_reqs.exclude(id__in=overlapping.values("id"))

        # 4 e 5
        overlapping.filter(status='pending').update(
            status='cancelled',
            closed_by=sostituto,
            updated_at=timezone.now()
        )

        total_reqs.filter(status='pending').update(
            status='cancelled',
            closed_by=sostituto,
            updated_at=timezone.now()
        )


        # 6) Crea segmenti
        new_requester_shifts = []

        # 🔥 RICHIESTA ACCETTATA PRECEDENTE DELLO SHIFT ORIGINALE
        previous_req = ReplacementRequest.objects.filter(
            shift=shift,
            status="accepted",
            original_start_time=shift.start_time,
            original_end_time=shift.end_time
        ).exclude(id=req.id).order_by("-id").first()



        def clone_previous_replacement(new_shift):
            """
            🔥 Clona la vecchia richiesta accettata sul nuovo shift,
            SOLO se il vecchio turno era già una sostituzione totale.
            """
            if not previous_req:
                return

            # Creo una copia 1:1 della richiesta precedente
            ReplacementRequest.objects.create(
                shift=new_shift,
                requester=previous_req.requester,
                target_user=previous_req.target_user,
                partial=previous_req.partial,
                partial_start=previous_req.partial_start,
                partial_end=previous_req.partial_end,
                original_start_time=previous_req.original_start_time,
                original_end_time=previous_req.original_end_time,
                status="accepted"
            )


        def create_shift(user, start, end):
            s = Shift.objects.create(
                user=user,
                role=shift.role,
                date=shift.date,
                start_time=start,
                end_time=end,
                approved=shift.approved,
                course_type=shift.course_type,
            )

            # ⭐ Se il pezzo appartiene al sostituto, eredita la vecchia sostituzione
            if previous_req and user == previous_req.target_user:
                clone_previous_replacement(s)

            if user == requester:
                new_requester_shifts.append(s)

            return s


        # ⭐ SALVA IL PEZZO ACCETTATO DAL NUOVO SOSTITUTO
        shift_original_user = shift.user  # chi era prima del nuovo split

        # Caso 1 — parte iniziale
        if part_start == orig_start and part_end < orig_end:
            shift.user = sostituto
            shift.start_time = part_start
            shift.end_time = part_end
            shift.save(update_fields=["user", "start_time", "end_time"])

            create_shift(shift_original_user, part_end, orig_end)

        # Caso 2 — parte finale
        elif part_start > orig_start and part_end == orig_end:
            shift.user = sostituto
            shift.start_time = part_start
            shift.end_time = part_end
            shift.save(update_fields=["user", "start_time", "end_time"])

            create_shift(shift_original_user, orig_start, part_start)

        # Caso 3 — parte interna
        else:
            shift.user = sostituto
            shift.start_time = part_start
            shift.end_time = part_end
            shift.save(update_fields=["user", "start_time", "end_time"])

            create_shift(shift_original_user, orig_start, part_start)
            create_shift(shift_original_user, part_end, orig_end)

        # 7) Ricollega richieste non sovrapposte
        for other in non_overlapping.filter(status='pending'):
            target_shift = None
            for s in new_requester_shifts:
                if s.start_time <= other.partial_start and s.end_time >= other.partial_end:
                    target_shift = s
                    break

            if target_shift:
                other.shift = target_shift
                other.save(update_fields=["shift"])
            else:
                other.status = 'cancelled'
                other.closed_by = sostituto
                other.save(update_fields=["status", "closed_by"])


        return Response({'message': 'Sostituzione parziale accettata'}, status=200)




    

    @action(detail=False, methods=['get'])
    def get_week_shifts(self, request):
        """
        Restituisce tutti i turni reali della settimana,
        includendo informazioni su eventuali sostituzioni.
        """
        start_str = request.query_params.get("start_date")
        if not start_str:
            return Response({'error': 'start_date mancante'}, status=400)

        try:
            start_date = date.fromisoformat(start_str)
        except ValueError:
            return Response({'error': 'start_date non valido'}, status=400)

        end_date = start_date + timedelta(days=6)

        shifts = Shift.objects.filter(
            date__range=[start_date, end_date]
        ).select_related("user")

        # Recupera eventuali richieste accettate per ogni turno
        accepted_reqs = (
            ReplacementRequest.objects
            .filter(shift__in=shifts, status="accepted")
            .select_related("requester", "target_user", "shift")
        )

        rep_map = {}
        for r in accepted_reqs:
            rep_map[r.shift_id] = {
                "accepted": True,
                "partial": r.partial,
                "requester_id": r.requester_id,
                "accepted_by_id": r.target_user_id,
                "accepted_by_username": r.target_user.username,
                "partial_start": r.partial_start,
                "partial_end": r.partial_end,
            }

        data = []
        for s in shifts:
            data.append({
                "id": s.id,
                "date": str(s.date),
                "role": s.role.code,
                "start_time": s.start_time.strftime("%H:%M"),
                "end_time": s.end_time.strftime("%H:%M"),
                "user_id": s.user.id if s.user else None,
                "user": {
                    "id": s.user.id,
                    "username": s.user.username
                } if s.user else None,

                # INFO sostituzione (se presente)
                "replacement_info": rep_map.get(s.id, {"accepted": False}),
            })

        return Response(data, status=200)
    
    @action(detail=False, methods=['get'])
    def get_month_shifts(self, request):
        """
        Restituisce tutti i turni reali per un mese.
        Parametri:
        - year (int)
        - month (int)
        """
        try:
            year = int(request.query_params.get("year"))
            month = int(request.query_params.get("month"))
        except:
            return Response({'error': 'Specificare year e month'}, status=400)

        shifts = Shift.objects.filter(
            date__year=year,
            date__month=month
        ).select_related("user")

        data = [
            {
                "id": s.id,
                "title": s.user.username if s.user else "—",
                "role": s.role.code,
                "date": str(s.date),
                "start_time": s.start_time.strftime("%H:%M"),
                "end_time": s.end_time.strftime("%H:%M"),
                "user_id": s.user.id if s.user else None,
            }
            for s in shifts
        ]

        return Response(data, status=200)
    
    @action(detail=False, methods=['get'])
    def published_weeks(self, request):
        """
        GET /api/shifts/published_weeks/?year=2024&month=1&category=bagnino
        Restituisce le start_date delle settimane pubblicate per quella categoria/mese
        """
        year = request.query_params.get("year")
        month = request.query_params.get("month")
        category = request.query_params.get("category")

        if not category:
            return Response({"error": "category richiesta"}, status=400)

        # ✅ Converti year e month in interi
        try:
            year = int(year)
            month = int(month)
        except (TypeError, ValueError):
            return Response({"error": "year e month devono essere numeri"}, status=400)

        first = date(year, month, 1)  # ✅ Ora funziona!
        last = date(year, month, monthrange(year, month)[1])

        search_start = first - timedelta(days=7)
        search_end = last + timedelta(days=7)

        # ✅ MODIFICATO: Usa role__code invece di category
        weeks = PublishedWeek.objects.filter(
            role__code=category,  # ✅ Cambiato
            start_date__range=[search_start, search_end]
        ).values_list("start_date", flat=True)

        return Response({
            "published": [d.isoformat() for d in weeks]
        })
    

    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticated])
    def available_collaborators(self, request, pk=None):
        shift = self.get_object()
        role = shift.role

        users = (
            User.objects
            .filter(roles__code=role)
            .exclude(id=shift.user_id)
        )

        serializer = UserListSerializer(users, many=True)
        return Response(serializer.data)


# ============================================================
#  SETTIMANA TIPO (TemplateShift)
# ============================================================
class TemplateShiftViewSet(viewsets.ModelViewSet):
    queryset = TemplateShift.objects.all()
    serializer_class = TemplateShiftSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = super().get_queryset()
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category=category)
        return qs.order_by('weekday', 'start_time')


# ============================================================
#  API SEPARATA PER NOTIFICA SOSTITUZIONE (manager)
# ============================================================
@api_view(['POST'])
def notify_replacement(request):
    """
    Invio di una richiesta di sostituzione da parte del manager.
    (endpoint "storico", ora hai ReplacementRequest per la parte collaboratori)
    """
    shift_id = request.data.get('shift_id')
    if not shift_id:
        return Response({'error': 'shift_id mancante'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        shift = Shift.objects.get(id=shift_id)
    except Shift.DoesNotExist:
        return Response({'error': 'Turno non trovato'}, status=status.HTTP_404_NOT_FOUND)

    users = User.objects.exclude(id=shift.user.id)
    user_list = [u.username for u in users]

    return Response({
        'message': 'Richiesta sostituzione inviata a tutti gli utenti',
        'to': user_list,
        'shift': {
            'date': shift.date,
            'role': shift.role,
            'user': shift.user.username
        }
    })



