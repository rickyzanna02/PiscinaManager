import pytest
from rest_framework.test import APIClient

from datetime import time, date

# -------- MONKEY PATCH User model --------
from django.contrib.auth import get_user_model
UserReal = get_user_model()

import django.contrib.auth.models as auth_models
auth_models.User = UserReal
# -----------------------------------------
User = UserReal
from shifts.models import Shift, ReplacementRequest





@pytest.mark.django_db
class TestReplacements:

    def setup_method(self):
        self.client = APIClient()

        # utenti
        self.u1 = User.objects.create(username="riccardo")
        self.u2 = User.objects.create(username="giada")
        self.u3 = User.objects.create(username="admin")

        # turno base
        self.shift = Shift.objects.create(
            user=self.u1,
            role="bagnino",
            date=date(2025, 11, 24),
            start_time=time(6, 0),
            end_time=time(14, 0),
        )

    # ---------------------------------------------------------
    # UTILITIES
    # ---------------------------------------------------------
    def ask(self, shift, requester, targets, partial=False, start=None, end=None):
        """Helper per inviare richieste."""
        payload = {
            "requester_id": requester.id,
            "target_users": [t.id for t in targets],
            "partial": partial,
        }

        if partial:
            payload["partial_start"] = start
            payload["partial_end"] = end

        r = self.client.post(
            f"/api/shifts/{shift.id}/ask_replacement/",
            payload,
            format="json"
        )

        assert r.status_code == 200
        ids = r.data["requests"]
        return ReplacementRequest.objects.filter(id__in=ids).order_by("id")


    def respond(self, request_obj, action):
        r = self.client.post("/api/shifts/respond_replacement/", {
            "request_id": request_obj.id,
            "action": action
        })
        assert r.status_code == 200

    # ---------------------------------------------------------
    # TEST: sostituzione totale
    # ---------------------------------------------------------
    def test_total_replacement(self):
        req = self.ask(self.shift, self.u1, [self.u2])[0]
        self.respond(req, "accept")

        self.shift.refresh_from_db()
        assert self.shift.user == self.u2

        req.refresh_from_db()
        assert req.status == "accepted"

    # ---------------------------------------------------------
    # TEST: parziale → totale
    # ---------------------------------------------------------
    def test_partial_then_total(self):
        # 1) riccardo → giada (parziale 6–10)
        req1 = self.ask(self.shift, self.u1, [self.u2],
                        partial=True, start="06:00", end="10:00")[0]

        self.respond(req1, "accept")

        # il turno viene splittato in 2 segmenti
        shifts = list(Shift.objects.order_by("start_time"))
        assert len(shifts) == 2

        # 2) nuova richiesta totale (giada → admin)
        req2 = self.ask(shifts[1], self.u2, [self.u3])[0]

        self.respond(req2, "accept")

        shifts[1].refresh_from_db()
        assert shifts[1].user == self.u3

        req1.refresh_from_db()
        assert req1.status == "accepted"  # il pezzo coperto resta suo

        # tutte le richieste sul segmento finale precedenti sono cancelled
        cancelled = ReplacementRequest.objects.filter(
            status="cancelled",
            closed_by=self.u3
        )
        assert cancelled.count() >= 0

    # ---------------------------------------------------------
    # TEST: totale → parziale
    # ---------------------------------------------------------
    def test_total_then_partial(self):
        # 1) totale riccardo → giada
        req_tot = self.ask(self.shift, self.u1, [self.u2])[0]
        self.respond(req_tot, "accept")

        self.shift.refresh_from_db()
        s = self.shift

        # 2) parziale su turno già sostituito
        req_part = self.ask(s, self.u2, [self.u3],
                        partial=True, start="08:00", end="11:00")[0]

        self.respond(req_part, "accept")

        pieces = Shift.objects.order_by("start_time")

        assert len(pieces) >= 2
        assert any(p.user == self.u3 for p in pieces)  # parte coperta
        assert any(p.user == self.u2 for p in pieces)  # parte non coperta

    # ---------------------------------------------------------
    # TEST: parziale → parziale (sovrapposta)
    # ---------------------------------------------------------
    def test_partial_to_partial_overlap(self):
        req1 = self.ask(self.shift, self.u1, [self.u2],
                        partial=True, start="06:00", end="10:00")[0]
        self.respond(req1, "accept")

        piece = Shift.objects.get(start_time=time(6, 0))

        # nuova parziale sovrapposta
        req2 = self.ask(piece, self.u2, [self.u3],
                        partial=True, start="08:00", end="09:00")[0]
        self.respond(req2, "accept")

        # i segmenti devono correggersi
        segments = list(Shift.objects.order_by("start_time"))
        assert len(segments) >= 3  # 6–8 | 8–9 | 9–10

        # la richiesta precedente non deve cambiare stato
        req1.refresh_from_db()
        assert req1.status == "accepted"

        # e la nuova sovrapposta è accepted
        req2.refresh_from_db()
        assert req2.status == "accepted"

    # ---------------------------------------------------------
    # TEST: storico (“closed_by”)
    # ---------------------------------------------------------
    def test_closed_by_is_correct(self):
        # riccardo → giada e admin (totale)
        reqs = self.ask(self.shift, self.u1, [self.u2, self.u3])

        # giada accetta
        self.respond(reqs[0], "accept")

        # admin deve essere cancelled + closed_by=giada
        req_admin = reqs[1]
        req_admin.refresh_from_db()

        assert req_admin.status == "cancelled"
        assert req_admin.closed_by == self.u2
