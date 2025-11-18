📘 Piscina Manager — Descrizione Completa del Progetto
🏗️ STACK TECNOLOGICO
Backend

Django 4+

Django REST Framework

PostgreSQL o SQLite

Autenticazione tramite modello User esteso (ruolo incluso)

API per:

Gestione turni reali (Shift)

Gestione settimana tipo (TemplateShift)

Richieste di sostituzione (ReplacementRequest)

Pubblicazione turni settimanali/mensili

Gestione corsi istruttori

Gestione tariffe (PayRate)

Frontend

React + Vite

FullCalendar (TimeGrid)

TailwindCSS

Routing semplice (component pages)

Custom CSS per overlay e bottoni evento

UI personalizzata per Admin e Collaboratori

📦 MODELLO DEI DATI (BACKEND)
👤 User

id

username

role → uno dei:

“bagnino”

“istruttore”

“segreteria”

“pulizia”

altri campi standard Django

🗓️ TemplateShift (Settimana tipo)

Definisce ricorrenze settimanali.

Campi:

user (collaboratore assegnato)

role

category (bagnino / istruttore / segreteria / pulizia)

weekday (0 = lun, 6 = dom)

start_time

end_time

usato per generare i turni reali mensili

🕒 Shift (Turno reale)

Campi:

user

role

date

start_time

end_time

approved (per eventuali workflow futuri)

Durante una sostituzione, lo Shift viene aggiornato.

🔁 ReplacementRequest

Campi:

shift (turno per cui fare richiesta)

requester (chi chiede)

target_user (destinatario)

status: pending / accepted / rejected / cancelled

partial: bool

partial_start, partial_end (solo se partial = True)

🔄 LOGICA DI BUSINESS
🔹 1. Admin definisce la settimana tipo

Nel calendario Admin:

drag & drop per creare un TemplateShift

popup per assegnare collaboratore

modifica e cancellazione eventi

funzioni speciali per corsi istruttori:

scuola nuoto (40 min)

adulti (45 min)

fitness (45 min)

propaganda / agonismo (durata libera)

🔹 2. Admin pubblica la settimana o il mese

Due endpoint:

POST /shifts/publish_week/

legge tutti i TemplateShift della categoria

genera i turni reali della prossima settimana

POST /shifts/publish_month/

genera TUTTO il mese

usa funzione generate_shifts_from_template(year, month)

❗ Prima, la pubblicazione sovrascriveva le sostituzioni:
→ Ora risolto aggiornando anche TemplateShift quando una sostituzione viene accettata.

👤 AREA COLLABORATORI

Il collaboratore vede:

1) Calendario settimanale dei propri turni

colore verde = turno normale

grigio = turno ceduto ad altri

blu = turno ricevuto tramite sostituzione

bottone interno bianco (come in admin)

overlay popup centrato (come admin)

Clic su un turno → popup con possibilità di:

richiedere sostituzione intera

richiedere sostituzione parziale

inserimento orari

selezionare uno o più collaboratori destinatari

2) Tab “Sostituzioni”

Due colonne:

Richieste inviate

stato (pending / accepted / rejected)

ruolo, orario, partial info

Richieste ricevute

accetta / rifiuta

🔁 GESTIONE SOSTITUZIONI (DEFINITIVA)

Quando un destinatario accetta una richiesta:

✔ 1) La richiesta diventa accepted
✔ 2) Tutte le altre richieste sullo stesso turno diventano rejected
✔ 3) Lo Shift reale cambia assegnatario
✔ 4) 🔥 Il TemplateShift corrispondente viene aggiornato

→ Questo impedisce che la pubblicazione settimanale/mensile sovrascriva la sostituzione.

Funziona sia per:

sostituzioni totali

sostituzioni parziali (il template passa intero al sostituto, come previsto dalla settimana tipo)

🎨 FULLCALENDAR PERSONALIZZATO
Admin

bottoni bianchi con due righe:

orario

nome collaboratore

overlay popup centrato

drag-and-drop sempre abilitato

eventi sotto non bloccano drop

Collaboratore

stesso stile Admin

eventi blu/grigi/verdi

overlay popup centrato

niente drag & drop

click sui bottoni interni (non sull’evento grezzo)

🧩 PROBLEMI RISOLTI NEL PROGETTO

❌ FullCalendar non permetteva drag/drop su eventi → risolto con CSS corretti

❌ Bottoni degli eventi non cliccabili → risolto rimuovendo pointer-events: none globali

❌ Popup dei collaboratori compariva inline anziché overlay → risolto

❌ Ruoli venivano troncati (es. "bagnin") → risolto rimuovendo slicing [:-1]

❌ Le sostituzioni venivano cancellate pubblicando la settimana → risolto aggiornando TemplateShift

❌ Due stili diversi admin/collaboratori → uniformato

❌ Bug con orari 06:00–22:00 → sistemato

🧱 STRUTTURA DEL CODICE (FRONTEND)
/frontend
  /src
    App.jsx  (admin)
    MyShifts.jsx  (collaboratori)
    CollaboratorePage.jsx
    api.js
    main.jsx
    App.css
    myshifts.css


Le principali logiche sono in:

App.jsx → calendario admin

MyShifts.jsx → calendario collaboratori + sostituzioni

🧱 STRUTTURA DEL CODICE (BACKEND)
/shifts
  models.py
  serializers.py
  views.py
  urls.py
  utils.py  (generate_shifts_from_template)

🔍 FLUSSO COMPLETO (ESEMPIO)

Admin crea una settimana tipo

Admin pubblica il mese

Riccardo ha un turno il 10/02

Riccardo chiede sostituzione a Giada

Giada accetta

Shift reale del 10/02 → passa a Giada

TemplateShift corrispondente → passa a Giada

Admin modifica la settimana tipo e ripubblica

Il turno resta a Giada

📌 Cosa comprende il progetto

gestione turni settimanali/mensili per piscina

gestione corsi istruttori con durate diverse

sostituzioni avanzate (totale/parziale, multi-destinatario)

calendario fullcalendar reattivo

pannello admin completo

UI collaboratori ottimizzata

sincronizzazione settimana tipo ↔ turni pubblicati



Vorrei che, dopo aver inserito il turno, posso cliccarci sopra e 1) eliminarlo 2) modifiche orari 3) modificare collaboratore 4) inviare notifica richiesta sostituzione a tutti gli utenti



L’utente oltre a quello che hai detto può aggiungersi automaticamente turni, che però devono essere mandati al responsabile per l’accettazione. Il responsabile deve avere un area in cui arrivano tutte le richieste di questo tipo


Ogni collaboratore deve poi poter cliccare sul proprio turno per chiedere sostituzione( serve area gestione sostituzioni ), o cedere il turno a un altro collaboratore, o chiedere ferie/ permesso /mutua


ok ora vorrei modificare la gestione dei turni personali dei collaboratori. vorrei che sopra al turno ci fosse un bottone (come abbiamo fatto nella pagina del responsabile):
1) titolo del bottone : "<mansione> caporiga <orario>" 75% della dimesnione allineato a sx
2) cliccando sul bottone si apre un popup di gestione del turno con: richiedi sostituizione (deve funzionare), malattia, permesso, mutua (che gestiremo piu avanti)
3) se un utente richiede sostituzione deve poter selezionare a chi chiederla (elenco collaboratori), seleziona a chi. I collaboratori selezionati devono ricevere in un area dedicata del profilo (che va creata), la richiesta con la possibilità di accettare o rifiutare. chi ha chiesto la sostituzione deve avere il resoconto di chi ha rifiutato e accettato. appena uno accetta la sostituzione, essa deve scomparire da tutti gli altri e il turno deve aggiornarsi automaticamente. 

vorrei ora gestire le sostituzioni parziali. immaginiamo di avere un turno dalle 6 alle 12 la sostituzione totale (tutto 6-12) funziona gia correttamente la sostituzione parziale deve funzionare cosi: - se l'orario di inizio sostituzione corrisponde con l'inizio del turno (es richiesta sost dalle 6 alle 8 di un turno 6-12), il turno deve esssere spezzato in 2: dalle 6 alle 8 passa a chi accetta la sostituzione e il resto dalle 8 alle 12 resta al utente originario. - se l'orario di fine sostituzione coindice con la fine del turno (es richiesta sostituzione dalle 10 alle 12 di un turno dalle 6 alle 12): stesso discorso di sopra, divisione del turno in 2 ecc - se l'orario di inizio e di fine non coincidono, (sostituzione "interna" es dalle 8 alle 10 di un turno 6-12), devono essere creati 3 turni: il primo dalle 6 alle 8 resta all utente , il secondo dalle 8 alle 10 passa a chi la accetta, il terzo dalle 10 alle 12 resta all'utente richiedente. tutto questo deve aggiornare anche il calendario di admin (template shift), oltre a shift, e ogni utente alla fine dovrà vedere solo i turni che effettivamente fa. Admin alla fine vedrà che il turno originario 6-12 si è spezzato in 2 o 3 pezzi (dipende dai casi), con relativi orari e nomi




DA FARE:
- gestire bottoni pubblica settimana/mese: se non ci snoo modifiche renderli non cliccabili ad esempio
- problema: sostituzioni multiple: SE ne accetto una spariscono tutte.
- problema: in caso di sostituzioni multiple sullo stesso turno è capitato che un parte di turno resti in shift ma non in template shift: fare prove





PS C:\Users\ricky\Desktop\Piscina_Manager\PiscinaManager> .\venv\Scripts\activate
(venv) PS C:\Users\ricky\Desktop\Piscina_Manager\PiscinaManager> python manage.py runserver

 C:\Users\ricky\Desktop\Piscina_Manager\PiscinaManager\frontend> npm run dev