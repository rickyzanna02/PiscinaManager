from datetime import date, timedelta
from calendar import monthrange
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from django.contrib.auth.models import User
from rest_framework import generics

from .models import Shift, TemplateShift, PayRate, ReplacementRequest
from .serializers import (
    ShiftSerializer,
    TemplateShiftSerializer,
    PayRateSerializer,
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
                    defaults={'course': template.course}
                )
                if created:
                    created_count += 1

        return Response({'created': created_count})

    # ----------------------------------------------------------
    # PUBBLICA SETTIMANA (crea/aggiorna/elimina)
    # ----------------------------------------------------------
    @action(detail=False, methods=['post'])
    def publish_week(self, request):
        """
        Crea, aggiorna o rimuove i turni reali per la settimana specificata.
        Se non viene indicata una data, usa la settimana corrente.
        """
        try:
            start_str = request.data.get('start_date')
            if start_str:
                start_date = date.fromisoformat(start_str)
            else:
                today = date.today()
                start_date = today - timedelta(days=today.weekday())  # lunedì corrente
        except Exception:
            return Response({'error': 'Data non valida'}, status=status.HTTP_400_BAD_REQUEST)

        end_date = start_date + timedelta(days=6)
        created_count, updated_count, deleted_count = 0, 0, 0

        # Carica turni già pubblicati in quella settimana
        existing_shifts = Shift.objects.filter(date__range=[start_date, end_date])
        existing_map = {(s.date, s.user_id, s.role): s for s in existing_shifts}

        # Genera da template
        template_keys = set()
        for day in range(7):
            current_date = start_date + timedelta(days=day)
            weekday = current_date.weekday()  # 0=lun, 6=dom
            templates = TemplateShift.objects.filter(weekday=weekday)

            for template in templates:
                if not template.user:
                    continue

                role = template.category
                key = (current_date, template.user.id, role)
                template_keys.add(key)

                if key in existing_map:
                    shift = existing_map[key]
                    if (
                        shift.start_time != template.start_time
                        or shift.end_time != template.end_time
                        or shift.course_id != (template.course.id if template.course else None)
                    ):
                        shift.start_time = template.start_time
                        shift.end_time = template.end_time
                        shift.course = template.course
                        shift.save(update_fields=["start_time", "end_time", "course"])
                        updated_count += 1
                else:
                    Shift.objects.create(
                        user=template.user,
                        role=role,
                        date=current_date,
                        start_time=template.start_time,
                        end_time=template.end_time,
                        course=template.course
                    )
                    created_count += 1

        # Elimina turni che non esistono più nel template
        for key, shift in existing_map.items():
            if key not in template_keys:
                shift.delete()
                deleted_count += 1

        return Response({
            'message': f'Settimana pubblicata ({start_date} → {end_date})',
            'created': created_count,
            'updated': updated_count,
            'deleted': deleted_count
        }, status=status.HTTP_200_OK)

    # ----------------------------------------------------------
    # PUBBLICA MESE (crea/aggiorna/elimina) per categoria
    # ----------------------------------------------------------
    @action(detail=False, methods=['post'])
    def publish_month(self, request):
        """
        Crea, aggiorna o rimuove i turni reali dell'intero mese.
        Se year/month non sono inviati → usa mese attuale.
        La pubblicazione avviene solo per la categoria richiesta.
        """
        # --- Categoria obbligatoria ---
        category = request.data.get("category")
        if not category:
            return Response({'error': 'Specifica category'}, status=status.HTTP_400_BAD_REQUEST)

        # --- Mese / anno (default: mese corrente) ---
        today = date.today()
        try:
            year = int(request.data.get("year", today.year))
            month = int(request.data.get("month", today.month))
        except ValueError:
            return Response({'error': 'Parametri year/month non validi'}, status=status.HTTP_400_BAD_REQUEST)

        days_in_month = monthrange(year, month)[1]
        created_count, updated_count, deleted_count = 0, 0, 0

        # --- Turni già pubblicati della categoria ---
        existing_shifts = Shift.objects.filter(
            date__year=year,
            date__month=month,
            role=category  # NB: qui usi direttamente la stringa category
        )
        existing_map = {(s.date, s.user_id, s.role): s for s in existing_shifts}
        template_keys = set()

        # --- Template SOLO della categoria richiesta ---
        for day in range(1, days_in_month + 1):
            current_date = date(year, month, day)
            weekday = current_date.weekday()

            templates = TemplateShift.objects.filter(
                weekday=weekday,
                category=category
            )

            for template in templates:
                if not template.user:
                    continue

                role = template.category
                key = (current_date, template.user.id, role)
                template_keys.add(key)

                if key in existing_map:
                    shift = existing_map[key]
                    if (
                        shift.start_time != template.start_time
                        or shift.end_time != template.end_time
                        or shift.course_id != (template.course.id if template.course else None)
                    ):
                        shift.start_time = template.start_time
                        shift.end_time = template.end_time
                        shift.course = template.course
                        shift.save(update_fields=["start_time", "end_time", "course"])
                        updated_count += 1
                else:
                    Shift.objects.create(
                        user=template.user,
                        role=role,
                        date=current_date,
                        start_time=template.start_time,
                        end_time=template.end_time,
                        course=template.course
                    )
                    created_count += 1

        # --- Elimina turni non più presenti nei template ---
        for key, shift in existing_map.items():
            if key not in template_keys:
                shift.delete()
                deleted_count += 1

        return Response({
            'message': f'Mese pubblicato ({month}/{year})',
            'created': created_count,
            'updated': updated_count,
            'deleted': deleted_count
        }, status=status.HTTP_200_OK)

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

        qs = ReplacementRequest.objects.filter(
            requester_id=user_id
        ).select_related("shift", "target_user")

        ser = ReplacementRequestSerializer(qs, many=True)
        return Response(ser.data, status=200)

    # ----------------------------------------------------------
    # RICHIESTE RICEVUTE (per collaboratore)
    # ----------------------------------------------------------
    @action(detail=False, methods=['get'])
    def replacements_received(self, request):
        """
        Lista delle richieste di sostituzione RICEVUTE da un utente.

        Query string:
        - user_id (se manca, uso request.user se autenticato)
        - only_pending=true/false (default: true)
        """
        user_id = request.query_params.get("user_id")
        if not user_id and request.user and request.user.is_authenticated:
            user_id = request.user.id

        if not user_id:
            return Response({'error': 'user_id mancante'}, status=400)

        only_pending = request.query_params.get("only_pending", "true").lower() == "true"

        qs = ReplacementRequest.objects.filter(
            target_user_id=user_id
        ).select_related("shift", "requester")

        if only_pending:
            qs = qs.filter(status='pending')

        ser = ReplacementRequestSerializer(qs, many=True)
        return Response(ser.data, status=200)

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
            req = ReplacementRequest.objects.select_related("shift", "target_user").get(id=req_id)
        except ReplacementRequest.DoesNotExist:
            return Response({'error': 'Richiesta non trovata'}, status=404)

        if req.status != 'pending':
            return Response({'error': 'Richiesta già gestita'}, status=400)

        # ---- RIFIUTA ----
        if action == "reject":
            req.status = 'rejected'
            req.save(update_fields=["status"])
            return Response({'message': 'Richiesta rifiutata'}, status=200)

       # ---- ACCETTA ----
        req.status = 'accepted'
        req.save(update_fields=["status"])

        # Rifiuta tutte le altre richieste per lo stesso turno
        other_reqs = ReplacementRequest.objects.filter(shift=req.shift).exclude(id=req.id)
        other_reqs.update(status='rejected')

        shift = req.shift

        # 🔥 1) Aggiorna il turno reale
        shift.user = req.target_user
        shift.save(update_fields=["user"])

        # 🔥 2) Aggiorna il TEMPLATE SHIFT corrispondente
        from .models import TemplateShift

        template = TemplateShift.objects.filter(
            user=req.requester,                 # vecchio assegnato
            weekday=shift.date.weekday(),       # stesso giorno settimana
            start_time=shift.start_time,
            end_time=shift.end_time,
            category=shift.role                     # stesso ruolo
        ).first()

        if template:
            template.user = req.target_user     # assegna al nuovo sostituto
            template.save(update_fields=["user"])


        # -----------------------------------------------------
        # 🔵 SOSTITUZIONE TOTALE
        # -----------------------------------------------------
        if not req.partial:
            shift.user = req.target_user
            shift.save(update_fields=["user"])
        else:
            # -----------------------------------------------------
            # 🟣 PARZIALE (per ora soluzione semplice)
            # -----------------------------------------------------
            shift.user = req.target_user
            shift.save(update_fields=["user"])
            # TODO: implementare split turni se vuoi farla completa

        return Response({'message': 'Richiesta accettata'}, status=200)


# ============================================================
#  TARIFFE ORARIE / PER TURNO
# ============================================================
class PayRateViewSet(viewsets.ModelViewSet):
    queryset = PayRate.objects.all()
    serializer_class = PayRateSerializer
    permission_classes = [permissions.AllowAny]


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



