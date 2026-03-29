"use client"
import * as React from "react"

export type Lang = "en" | "de" | "fr" | "es" | "it" | "pl"

// BCP-47 locale tag for Intl / toLocaleDateString
export const LOCALE_TAG: Record<Lang, string> = {
  en: "en-GB",
  de: "de-DE",
  fr: "fr-FR",
  es: "es-ES",
  it: "it-IT",
  pl: "pl-PL",
}

// ─── SHAPE TYPE ───────────────────────────────────────────────────────────────

type PageEntry = { title: string; subtitle: string }

export type Translations = {
  nav: {
    dashboard: string
    trips: string; rota: string; importHub: string; calendar: string; maintenanceTrips: string
    drivers: string; fleetManagement: string; places: string
    fuelTracking: string; parkingMonitoring: string
    tollExpenses: string; tollReceipts: string; fuelReceipts: string
    holidays: string; offShift: string
    maintenance: string; compliance: string; inventory: string
    allocationSettings: string
  }
  topbar: {
    profile: string; settings: string; logout: string
    lightMode: string; darkMode: string; systemMode: string; language: string
  }
  common: {
    save: string; cancel: string; upload: string; download: string
    search: string; new: string; edit: string; delete: string
    submit: string; back: string; loading: string
    addVehicle: string; export: string; filter: string; refresh: string
    active: string; inactive: string; pending: string; resolved: string
    allVehicles: string; today: string; thisMonth: string; selectAll: string
    tryAgain: string; records: string; noData: string
    // Table headers
    date: string; vehicle: string; driver: string; status: string; action: string
    ref: string; route: string; type: string; amount: string; method: string
    litres: string; costPerLitre: string; totalCost: string; odometer: string
    mpg: string; depot: string; duration: string; location: string; cost: string
    fleet: string; name: string; phone: string; licence: string; notes: string; address: string
    // Buttons / actions
    view: string; reconcile: string; addNew: string; assign: string; approve: string
    reject: string; newCharge: string; details: string; close: string
    // Status & filter tabs
    all: string; reconciled: string; scheduled: string; dispatched: string
    started: string; completed: string; cancelled: string
    // Dashboard
    tripsToday: string; driversAvailable: string; fleetSize: string; thisWeek: string
    available: string; onLeave: string; noTripsToday: string; nothingScheduled: string
    createTrip: string; driverStatus: string; allDrivers: string
    todaysTrips: string; weekAtGlance: string; vehicleDowntime: string; upcomingLeave: string
    viewCalendar: string; manage: string; viewAll: string; tripsMonSun: string
    active2: string; done: string; awaitingDispatch: string; ofTotal: string
    vehiclesRegistered: string; vehiclesOff: string; needsDriver: string
    // Greetings
    goodMorning: string; goodAfternoon: string; goodEvening: string
    // Search placeholders
    searchPlaceholder: string; searchVehicles: string; searchDrivers: string
    // Misc
    noDriverAssigned: string; driverAssigned: string; ongoing: string
    noUpcomingDowntime: string; noUpcomingLeave: string
    consumptionByVehicle: string
  }
  pages: {
    dashboard:          PageEntry
    trips:              PageEntry
    rota:               PageEntry
    importHub:          PageEntry
    calendar:           PageEntry
    drivers:            PageEntry
    fleetManagement:    PageEntry
    places:             PageEntry
    fuelTracking:       PageEntry
    parkingMonitoring:  PageEntry
    tollExpenses:       PageEntry
    tollReceipts:       PageEntry
    fuelReceipts:       PageEntry
    holidays:           PageEntry
    offShift:           PageEntry
    maintenance:        PageEntry
    maintenanceTrips:   PageEntry
    compliance:         PageEntry
    inventory:          PageEntry
    allocationSettings: PageEntry
    vehicles:           PageEntry
    fleets:             PageEntry
  }
  rota: {
    // Loader steps
    step1Label: string; step1Detail: string
    step2Label: string; step2Detail: string
    step3Label: string; step3Detail: string
    step4Label: string; step4Detail: string
    // Status legend
    workingDay: string; restDay: string; holiday: string; unavailable: string; off: string; notOnRota: string
    // Day abbreviations
    sun: string; mon: string; tue: string; wed: string; thu: string; fri: string; sat: string
  }
  maintenance: {
    upcoming: string; historical: string
    searchPlaceholder: string
    records: string; ofRecords: string
    refresh: string; export: string
    colVehicle: string; colDateRange: string; colDays: string; colWhen: string
    loading: string; tryAgain: string
    noUpcoming: string; noUpcomingDesc: string
    noHistorical: string; noHistoricalDesc: string
    statusActive: string; statusUpcoming: string; statusCompleted: string
    today: string; inDays: string; daysAgo: string
    durationDays: string
  }
  login: {
    tagline: string
    signIn: string; signInDesc: string
    emailLabel: string; emailPlaceholder: string
    passwordLabel: string
    rememberMe: string; forgotPassword: string
    submit: string; submitting: string
    resetTitle: string; resetDesc: string
    sendLink: string; sending: string
    backToSignIn: string
    checkInbox: string; checkInboxDesc: string
    errorDefault: string
  }
}

// ─── TRANSLATIONS ─────────────────────────────────────────────────────────────

export const translations: Record<Lang, Translations> = {

  // ── English ─────────────────────────────────────────────────────────────────
  en: {
    nav: {
      dashboard:          "Dashboard",
      trips:              "Trips",
      rota:               "Weekly Rota",
      importHub:          "Import Hub",
      calendar:           "Calendar",
      maintenanceTrips:   "Maintenance Trips",
      drivers:            "Drivers",
      fleetManagement:    "Fleet Management",
      places:             "Places",
      fuelTracking:       "Fuel Tracking",
      parkingMonitoring:  "Parking Monitoring",
      tollExpenses:       "Toll Expenses",
      tollReceipts:       "Toll Receipts",
      fuelReceipts:       "Fuel Receipts",
      holidays:           "Holidays",
      offShift:           "Off-shift",
      maintenance:        "Maintenance",
      compliance:         "Compliance",
      inventory:          "Inventory",
      allocationSettings: "Allocation Settings",
    },
    topbar: {
      profile:    "My Profile",
      settings:   "Settings",
      logout:     "Sign Out",
      lightMode:  "Light",
      darkMode:   "Dark",
      systemMode: "System",
      language:   "Language",
    },
    common: {
      save:"Save",cancel:"Cancel",upload:"Upload",download:"Download",search:"Search",new:"New",edit:"Edit",delete:"Delete",submit:"Submit",back:"Back",loading:"Loading…",addVehicle:"Add Vehicle",export:"Export",filter:"Filter",refresh:"Refresh",active:"Active",inactive:"Inactive",pending:"Pending",resolved:"Resolved",allVehicles:"All Vehicles",today:"Today",thisMonth:"This Month",selectAll:"Select All",tryAgain:"Try again",records:"records",noData:"No data",
      date:"Date",vehicle:"Vehicle",driver:"Driver",status:"Status",action:"Action",ref:"Ref",route:"Route",type:"Type",amount:"Amount",method:"Method",litres:"Litres",costPerLitre:"Cost/L",totalCost:"Total Cost",odometer:"Odometer (mi)",mpg:"MPG",depot:"Depot",duration:"Duration",location:"Location",cost:"Cost",fleet:"Fleet",name:"Name",phone:"Phone",licence:"Licence",notes:"Notes",
      view:"View",reconcile:"Reconcile",addNew:"Add New",assign:"Assign",approve:"Approve",reject:"Reject",newCharge:"New Charge",details:"Details",close:"Close",
      all:"All",reconciled:"Reconciled",scheduled:"Scheduled",dispatched:"Dispatched",started:"Started",completed:"Completed",cancelled:"Cancelled",
      tripsToday:"Trips Today",driversAvailable:"Drivers Available",fleetSize:"Fleet Size",thisWeek:"This Week",available:"available",onLeave:"on leave",noTripsToday:"No trips today",nothingScheduled:"Nothing scheduled for today",createTrip:"Create a trip →",driverStatus:"Driver Status",allDrivers:"All drivers",todaysTrips:"Today's Trips",weekAtGlance:"Week at a Glance",vehicleDowntime:"Vehicle Downtime",upcomingLeave:"Upcoming Leave",viewCalendar:"View calendar",manage:"Manage",viewAll:"View all",tripsMonSun:"trips Mon–Sun",active2:"active",done:"done",awaitingDispatch:"Awaiting dispatch",ofTotal:"of {n} total",vehiclesRegistered:"vehicles registered",vehiclesOff:"{n} vehicle(s) off today",needsDriver:"{n} trip(s) need a driver today",
      goodMorning:"Good morning",goodAfternoon:"Good afternoon",goodEvening:"Good evening",
      searchPlaceholder:"Search…",searchVehicles:"Search by reg, driver, depot…",searchDrivers:"Search drivers…",
      noDriverAssigned:"No driver assigned",driverAssigned:"Driver assigned",ongoing:"Ongoing",noUpcomingDowntime:"No upcoming vehicle downtime",noUpcomingLeave:"No upcoming leave in the next 7 days",consumptionByVehicle:"Consumption by Vehicle (30 days)",address:"Address",
    },
    pages: {
      dashboard:          { title: "Dashboard",               subtitle: "Your operational summary for today." },
      trips:              { title: "Trips",                   subtitle: "Manage and monitor all transport orders." },
      rota:               { title: "Weekly Driver Rota",      subtitle: "Plan and manage driver assignments for the week." },
      importHub:          { title: "Import Hub",              subtitle: "Central control for all vendor data connections and manual imports." },
      calendar:           { title: "Calendar",                subtitle: "View and schedule trips on the calendar." },
      drivers:            { title: "Drivers",                 subtitle: "Manage driver profiles, licences, and CPC compliance." },
      fleetManagement:    { title: "Fleet Management",        subtitle: "Live telematics, diagnostics and fleet administration — powered by MyGeotab API." },
      places:             { title: "Places",                  subtitle: "Manage depots, customer sites, and frequent stop locations." },
      fuelTracking:       { title: "Fuel Tracking",           subtitle: "Monitor consumption, MPG efficiency, and fuel spend per vehicle." },
      parkingMonitoring:  { title: "Parking Monitoring",      subtitle: "Track overnight lorry park usage, costs, and approved locations." },
      tollExpenses:       { title: "Toll Expenses",           subtitle: "Track road tolls, bridge, and tunnel charges across the fleet." },
      tollReceipts:       { title: "Toll Receipts",           subtitle: "VAT receipt capture for toll road charges across the fleet." },
      fuelReceipts:       { title: "Fuel Receipts",           subtitle: "VAT-recoverable fuel receipt management and approval workflow." },
      holidays:           { title: "Holidays & Leave",        subtitle: "Manage driver annual leave, sick days, and training absences." },
      offShift:           { title: "Off-Shift & Rest Periods",subtitle: "Monitor driver rest compliance against EU WTD rules (min 11h daily rest)." },
      maintenance:        { title: "Maintenance Hub",         subtitle: "Schedule and track vehicle servicing, repairs, and inspections." },
      maintenanceTrips:   { title: "Maintenance Trips",       subtitle: "Vehicle downtime and off-road events from the calendar." },
      compliance:         { title: "Compliance Hub",          subtitle: "Manage regulatory documents, licences, and audit readiness." },
      inventory:          { title: "Inventory Hub",           subtitle: "Track parts, consumables, and asset stock across all depots." },
      allocationSettings: { title: "Allocation Settings",     subtitle: "Configure driver pairing rules and automatic trip allocation." },
      vehicles:           { title: "Vehicles",                subtitle: "View and manage the full vehicle register." },
      fleets:             { title: "Fleets",                  subtitle: "Manage your fleet groups and driver assignments." },
    },
    rota: {
      step1Label: "Fetching drivers",          step1Detail: "Loading driver profiles and shift patterns",
      step2Label: "Loading holiday schedule",  step2Detail: "Checking approved leave and time-off requests",
      step3Label: "Checking trip assignments", step3Detail: "Finding unassigned trips for this week",
      step4Label: "Building the schedule",     step4Detail: "Matching drivers to their trips, almost there…",
      workingDay: "Working Day", restDay: "Rest Day", holiday: "Holiday",
      unavailable: "Unavailable", off: "Off", notOnRota: "Not on Rota",
      sun: "Sun", mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat",
    },
    maintenance: {
      upcoming: "Upcoming", historical: "Historical",
      searchPlaceholder: "Search vehicle, reason…",
      records: "records", ofRecords: "of",
      refresh: "Refresh", export: "Export",
      colVehicle: "Vehicle", colDateRange: "Date Range", colDays: "Days", colWhen: "When",
      loading: "Loading maintenance events…", tryAgain: "Try again",
      noUpcoming: "No upcoming maintenance",    noUpcomingDesc: "No vehicle downtime is currently scheduled.",
      noHistorical: "No historical records",    noHistoricalDesc: "No past maintenance events found.",
      statusActive: "Active", statusUpcoming: "Upcoming", statusCompleted: "Completed",
      today: "Today", inDays: "In {n}d", daysAgo: "{n}d ago", durationDays: "{n}d",
    },
    login: {
      tagline:       "Compliance & Fleet Management",
      signIn:        "Sign in",
      signInDesc:    "Enter your credentials to access the platform",
      emailLabel:    "Email address",
      emailPlaceholder: "you@company.com",
      passwordLabel: "Password",
      rememberMe:    "Remember me",
      forgotPassword:"Forgot password?",
      submit:        "Sign In",
      submitting:    "Signing in…",
      resetTitle:    "Reset password",
      resetDesc:     "Enter your account email and we'll send you a reset link.",
      sendLink:      "Send reset link",
      sending:       "Sending…",
      backToSignIn:  "← Back to sign in",
      checkInbox:    "Check your inbox",
      checkInboxDesc:"If {email} is registered, you'll receive a reset link shortly.",
      errorDefault:  "Login failed. Check your credentials and try again.",
    },
  },

  // ── German ──────────────────────────────────────────────────────────────────
  de: {
    nav: {
      dashboard:          "Dashboard",
      trips:              "Fahrten",
      rota:               "Wochenplan",
      importHub:          "Import-Hub",
      calendar:           "Kalender",
      maintenanceTrips:   "Wartungsfahrten",
      drivers:            "Fahrer",
      fleetManagement:    "Flottenmanagement",
      places:             "Standorte",
      fuelTracking:       "Kraftstoffverfolgung",
      parkingMonitoring:  "Parküberwachung",
      tollExpenses:       "Mautkosten",
      tollReceipts:       "Mautquittungen",
      fuelReceipts:       "Tankquittungen",
      holidays:           "Urlaub & Abwesenheit",
      offShift:           "Schichtfrei",
      maintenance:        "Wartung",
      compliance:         "Compliance",
      inventory:          "Inventar",
      allocationSettings: "Zuweisungseinstellungen",
    },
    topbar: {
      profile:    "Mein Profil",
      settings:   "Einstellungen",
      logout:     "Abmelden",
      lightMode:  "Hell",
      darkMode:   "Dunkel",
      systemMode: "System",
      language:   "Sprache",
    },
    common: {
      save:"Speichern",cancel:"Abbrechen",upload:"Hochladen",download:"Herunterladen",search:"Suchen",new:"Neu",edit:"Bearbeiten",delete:"Löschen",submit:"Einreichen",back:"Zurück",loading:"Laden…",addVehicle:"Fahrzeug hinzufügen",export:"Exportieren",filter:"Filtern",refresh:"Aktualisieren",active:"Aktiv",inactive:"Inaktiv",pending:"Ausstehend",resolved:"Erledigt",allVehicles:"Alle Fahrzeuge",today:"Heute",thisMonth:"Diesen Monat",selectAll:"Alle auswählen",tryAgain:"Erneut versuchen",records:"Einträge",noData:"Keine Daten",
      date:"Datum",vehicle:"Fahrzeug",driver:"Fahrer",status:"Status",action:"Aktion",ref:"Ref",route:"Strecke",type:"Typ",amount:"Betrag",method:"Methode",litres:"Liter",costPerLitre:"Kosten/L",totalCost:"Gesamtkosten",odometer:"Kilometerstand",mpg:"L/100km",depot:"Depot",duration:"Dauer",location:"Standort",cost:"Kosten",fleet:"Flotte",name:"Name",phone:"Telefon",licence:"Lizenz",notes:"Notizen",
      view:"Ansehen",reconcile:"Abgleichen",addNew:"Hinzufügen",assign:"Zuweisen",approve:"Genehmigen",reject:"Ablehnen",newCharge:"Neue Gebühr",details:"Details",close:"Schließen",
      all:"Alle",reconciled:"Abgeglichen",scheduled:"Geplant",dispatched:"Disponiert",started:"Gestartet",completed:"Abgeschlossen",cancelled:"Storniert",
      tripsToday:"Fahrten heute",driversAvailable:"Fahrer verfügbar",fleetSize:"Flottengröße",thisWeek:"Diese Woche",available:"verfügbar",onLeave:"im Urlaub",noTripsToday:"Keine Fahrten heute",nothingScheduled:"Nichts für heute geplant",createTrip:"Fahrt erstellen →",driverStatus:"Fahrerstatus",allDrivers:"Alle Fahrer",todaysTrips:"Heutige Fahrten",weekAtGlance:"Woche im Überblick",vehicleDowntime:"Fahrzeugausfälle",upcomingLeave:"Kommender Urlaub",viewCalendar:"Kalender anzeigen",manage:"Verwalten",viewAll:"Alle anzeigen",tripsMonSun:"Fahrten Mo–So",active2:"aktiv",done:"erledigt",awaitingDispatch:"Wartet auf Disposition",ofTotal:"von {n} gesamt",vehiclesRegistered:"Fahrzeuge registriert",vehiclesOff:"{n} Fahrzeug(e) heute abwesend",needsDriver:"{n} Fahrt(en) brauchen heute einen Fahrer",
      goodMorning:"Guten Morgen",goodAfternoon:"Guten Tag",goodEvening:"Guten Abend",
      searchPlaceholder:"Suchen…",searchVehicles:"Nach Kennzeichen, Fahrer, Depot suchen…",searchDrivers:"Fahrer suchen…",
      noDriverAssigned:"Kein Fahrer zugewiesen",driverAssigned:"Fahrer zugewiesen",ongoing:"Laufend",noUpcomingDowntime:"Keine anstehenden Fahrzeugausfälle",noUpcomingLeave:"Kein Urlaub in den nächsten 7 Tagen",consumptionByVehicle:"Verbrauch nach Fahrzeug (30 Tage)",address:"Adresse",
    },
    pages: {
      dashboard:          { title: "Dashboard",                    subtitle: "Ihre betriebliche Zusammenfassung für heute." },
      trips:              { title: "Fahrten",                      subtitle: "Alle Transportaufträge verwalten und überwachen." },
      rota:               { title: "Wöchentlicher Fahrerplan",     subtitle: "Fahrerplanung und Schichtzuweisungen für die Woche." },
      importHub:          { title: "Import-Hub",                   subtitle: "Zentrale Steuerung aller Lieferantendatenverbindungen und manuellen Importe." },
      calendar:           { title: "Kalender",                     subtitle: "Fahrten im Kalender anzeigen und planen." },
      drivers:            { title: "Fahrer",                       subtitle: "Fahrerprofile, Führerscheine und CPC-Compliance verwalten." },
      fleetManagement:    { title: "Flottenmanagement",            subtitle: "Live-Telematik, Diagnose und Flottenverwaltung – gestützt auf die MyGeotab API." },
      places:             { title: "Standorte",                    subtitle: "Depots, Kundenstellen und häufige Haltepunkte verwalten." },
      fuelTracking:       { title: "Kraftstoffverfolgung",         subtitle: "Verbrauch, Kilometerleistung und Kraftstoffkosten je Fahrzeug überwachen." },
      parkingMonitoring:  { title: "Parküberwachung",              subtitle: "Nutzung von LKW-Parkplätzen, Kosten und genehmigte Standorte verfolgen." },
      tollExpenses:       { title: "Mautkosten",                   subtitle: "Straßenmaut, Brücken- und Tunnelgebühren der gesamten Flotte erfassen." },
      tollReceipts:       { title: "Mautquittungen",               subtitle: "MwSt.-Belegerfassung für Mautgebühren der Flotte." },
      fuelReceipts:       { title: "Tankquittungen",               subtitle: "Verwaltung und Genehmigung von erstattungsfähigen MwSt.-Tankbelegen." },
      holidays:           { title: "Urlaub & Abwesenheit",         subtitle: "Jahresurlaub, Krankheits- und Schulungsabwesenheiten der Fahrer verwalten." },
      offShift:           { title: "Schichtfrei & Ruhezeiten",     subtitle: "Einhaltung der EU-Lenk- und Ruhezeiten überwachen (min. 11 Std. tägliche Ruhezeit)." },
      maintenance:        { title: "Wartungs-Hub",                 subtitle: "Fahrzeugwartung, Reparaturen und Inspektionen planen und verfolgen." },
      maintenanceTrips:   { title: "Wartungsfahrten",              subtitle: "Fahrzeugstillstände und Außerbetriebnahmen aus dem Kalender." },
      compliance:         { title: "Compliance-Hub",               subtitle: "Regulatorische Dokumente, Lizenzen und Prüfungsbereitschaft verwalten." },
      inventory:          { title: "Inventar-Hub",                 subtitle: "Teile, Verbrauchsmaterialien und Bestand über alle Depots hinweg verfolgen." },
      allocationSettings: { title: "Zuweisungseinstellungen",      subtitle: "Fahrerpaarungsregeln und automatische Fahrtenzuweisung konfigurieren." },
      vehicles:           { title: "Fahrzeuge",                    subtitle: "Das vollständige Fahrzeugregister anzeigen und verwalten." },
      fleets:             { title: "Fuhrparks",                    subtitle: "Flottengruppen und Fahrerzuweisungen verwalten." },
    },
    rota: {
      step1Label: "Fahrer laden",               step1Detail: "Fahrerprofile und Schichtmuster werden geladen",
      step2Label: "Urlaubsplan abrufen",         step2Detail: "Genehmigten Urlaub und Abwesenheiten prüfen",
      step3Label: "Fahrtzuweisungen prüfen",    step3Detail: "Nicht zugewiesene Fahrten für diese Woche suchen",
      step4Label: "Dienstplan erstellen",        step4Detail: "Fahrer ihren Fahrten zuordnen, fast fertig…",
      workingDay: "Arbeitstag", restDay: "Ruhetag", holiday: "Urlaub",
      unavailable: "Nicht verfügbar", off: "Frei", notOnRota: "Nicht im Plan",
      sun: "So", mon: "Mo", tue: "Di", wed: "Mi", thu: "Do", fri: "Fr", sat: "Sa",
    },
    maintenance: {
      upcoming: "Bevorstehend", historical: "Vergangen",
      searchPlaceholder: "Fahrzeug, Grund suchen…",
      records: "Einträge", ofRecords: "von",
      refresh: "Aktualisieren", export: "Exportieren",
      colVehicle: "Fahrzeug", colDateRange: "Zeitraum", colDays: "Tage", colWhen: "Wann",
      loading: "Wartungsereignisse laden…", tryAgain: "Erneut versuchen",
      noUpcoming: "Keine bevorstehende Wartung",    noUpcomingDesc: "Aktuell ist kein Fahrzeugstillstand geplant.",
      noHistorical: "Keine vergangenen Einträge",   noHistoricalDesc: "Keine früheren Wartungsereignisse gefunden.",
      statusActive: "Aktiv", statusUpcoming: "Bevorstehend", statusCompleted: "Abgeschlossen",
      today: "Heute", inDays: "In {n} T.", daysAgo: "Vor {n} T.", durationDays: "{n} T.",
    },
    login: {
      tagline:       "Compliance & Flottenmanagement",
      signIn:        "Anmelden",
      signInDesc:    "Geben Sie Ihre Anmeldedaten ein, um auf die Plattform zuzugreifen",
      emailLabel:    "E-Mail-Adresse",
      emailPlaceholder: "sie@unternehmen.de",
      passwordLabel: "Passwort",
      rememberMe:    "Angemeldet bleiben",
      forgotPassword:"Passwort vergessen?",
      submit:        "Anmelden",
      submitting:    "Anmeldung läuft…",
      resetTitle:    "Passwort zurücksetzen",
      resetDesc:     "Geben Sie Ihre E-Mail-Adresse ein und wir senden Ihnen einen Reset-Link.",
      sendLink:      "Reset-Link senden",
      sending:       "Wird gesendet…",
      backToSignIn:  "← Zurück zur Anmeldung",
      checkInbox:    "Posteingang prüfen",
      checkInboxDesc:"Falls {email} registriert ist, erhalten Sie in Kürze einen Reset-Link.",
      errorDefault:  "Anmeldung fehlgeschlagen. Bitte Zugangsdaten prüfen und erneut versuchen.",
    },
  },

  // ── French ──────────────────────────────────────────────────────────────────
  fr: {
    nav: {
      dashboard:          "Tableau de bord",
      trips:              "Trajets",
      rota:               "Planning hebdomadaire",
      importHub:          "Hub d'import",
      calendar:           "Calendrier",
      maintenanceTrips:   "Trajets maintenance",
      drivers:            "Chauffeurs",
      fleetManagement:    "Gestion de flotte",
      places:             "Lieux",
      fuelTracking:       "Suivi carburant",
      parkingMonitoring:  "Surveillance parking",
      tollExpenses:       "Frais de péage",
      tollReceipts:       "Reçus de péage",
      fuelReceipts:       "Reçus carburant",
      holidays:           "Congés & absences",
      offShift:           "Hors service",
      maintenance:        "Maintenance",
      compliance:         "Conformité",
      inventory:          "Inventaire",
      allocationSettings: "Paramètres d'affectation",
    },
    topbar: {
      profile:    "Mon profil",
      settings:   "Paramètres",
      logout:     "Se déconnecter",
      lightMode:  "Clair",
      darkMode:   "Sombre",
      systemMode: "Système",
      language:   "Langue",
    },
    common: {
      save:"Enregistrer",cancel:"Annuler",upload:"Téléverser",download:"Télécharger",search:"Rechercher",new:"Nouveau",edit:"Modifier",delete:"Supprimer",submit:"Soumettre",back:"Retour",loading:"Chargement…",addVehicle:"Ajouter un véhicule",export:"Exporter",filter:"Filtrer",refresh:"Actualiser",active:"Actif",inactive:"Inactif",pending:"En attente",resolved:"Résolu",allVehicles:"Tous les véhicules",today:"Aujourd'hui",thisMonth:"Ce mois-ci",selectAll:"Tout sélectionner",tryAgain:"Réessayer",records:"entrées",noData:"Aucune donnée",
      date:"Date",vehicle:"Véhicule",driver:"Chauffeur",status:"Statut",action:"Action",ref:"Réf",route:"Itinéraire",type:"Type",amount:"Montant",method:"Méthode",litres:"Litres",costPerLitre:"Coût/L",totalCost:"Coût total",odometer:"Compteur (km)",mpg:"L/100km",depot:"Dépôt",duration:"Durée",location:"Emplacement",cost:"Coût",fleet:"Flotte",name:"Nom",phone:"Téléphone",licence:"Permis",notes:"Notes",
      view:"Voir",reconcile:"Rapprocher",addNew:"Ajouter",assign:"Affecter",approve:"Approuver",reject:"Rejeter",newCharge:"Nouveau frais",details:"Détails",close:"Fermer",
      all:"Tous",reconciled:"Rapproché",scheduled:"Planifié",dispatched:"Expédié",started:"Démarré",completed:"Terminé",cancelled:"Annulé",
      tripsToday:"Trajets aujourd'hui",driversAvailable:"Chauffeurs disponibles",fleetSize:"Taille de la flotte",thisWeek:"Cette semaine",available:"disponible(s)",onLeave:"en congé",noTripsToday:"Aucun trajet aujourd'hui",nothingScheduled:"Rien de prévu aujourd'hui",createTrip:"Créer un trajet →",driverStatus:"Statut chauffeurs",allDrivers:"Tous les chauffeurs",todaysTrips:"Trajets du jour",weekAtGlance:"Semaine en un coup d'œil",vehicleDowntime:"Indisponibilité véhicules",upcomingLeave:"Congés à venir",viewCalendar:"Voir le calendrier",manage:"Gérer",viewAll:"Tout voir",tripsMonSun:"trajets lun–dim",active2:"actif(s)",done:"terminé(s)",awaitingDispatch:"En attente d'expédition",ofTotal:"sur {n} au total",vehiclesRegistered:"véhicules enregistrés",vehiclesOff:"{n} véhicule(s) absent(s) aujourd'hui",needsDriver:"{n} trajet(s) ont besoin d'un chauffeur",
      goodMorning:"Bonjour",goodAfternoon:"Bon après-midi",goodEvening:"Bonsoir",
      searchPlaceholder:"Rechercher…",searchVehicles:"Rechercher par immat., chauffeur, dépôt…",searchDrivers:"Rechercher des chauffeurs…",
      noDriverAssigned:"Aucun chauffeur affecté",driverAssigned:"Chauffeur affecté",ongoing:"En cours",noUpcomingDowntime:"Aucune indisponibilité prévue",noUpcomingLeave:"Aucun congé dans les 7 prochains jours",consumptionByVehicle:"Consommation par véhicule (30 jours)",address:"Adresse",
    },
    pages: {
      dashboard:          { title: "Tableau de bord",              subtitle: "Votre résumé opérationnel du jour." },
      trips:              { title: "Trajets",                      subtitle: "Gérer et suivre tous les ordres de transport." },
      rota:               { title: "Planning hebdomadaire",        subtitle: "Planifiez et gérez les affectations de chauffeurs pour la semaine." },
      importHub:          { title: "Hub d'import",                 subtitle: "Contrôle central de toutes les connexions de données fournisseurs et importations manuelles." },
      calendar:           { title: "Calendrier",                   subtitle: "Visualisez et planifiez les trajets dans le calendrier." },
      drivers:            { title: "Chauffeurs",                   subtitle: "Gérer les profils, permis et conformité CPC des chauffeurs." },
      fleetManagement:    { title: "Gestion de flotte",            subtitle: "Télématique en direct, diagnostics et administration — via l'API MyGeotab." },
      places:             { title: "Lieux",                        subtitle: "Gérer les dépôts, sites clients et arrêts fréquents." },
      fuelTracking:       { title: "Suivi carburant",              subtitle: "Surveiller la consommation, l'efficacité et les dépenses par véhicule." },
      parkingMonitoring:  { title: "Surveillance parking",         subtitle: "Suivre l'utilisation des parkings poids-lourds, coûts et sites approuvés." },
      tollExpenses:       { title: "Frais de péage",               subtitle: "Suivre les péages, ponts et tunnels de toute la flotte." },
      tollReceipts:       { title: "Reçus de péage",               subtitle: "Capture de reçus TVA pour les péages de la flotte." },
      fuelReceipts:       { title: "Reçus carburant",              subtitle: "Gestion et validation des reçus carburant récupérables en TVA." },
      holidays:           { title: "Congés & absences",            subtitle: "Gérer les congés annuels, arrêts maladie et absences formation." },
      offShift:           { title: "Hors service & repos",         subtitle: "Surveiller la conformité des temps de repos EU (min. 11h de repos quotidien)." },
      maintenance:        { title: "Hub maintenance",              subtitle: "Planifier et suivre l'entretien, réparations et contrôles des véhicules." },
      maintenanceTrips:   { title: "Trajets maintenance",          subtitle: "Immobilisations et événements hors route depuis le calendrier." },
      compliance:         { title: "Hub conformité",               subtitle: "Gérer documents réglementaires, licences et préparation aux audits." },
      inventory:          { title: "Hub inventaire",               subtitle: "Suivre pièces, consommables et stocks dans tous les dépôts." },
      allocationSettings: { title: "Paramètres d'affectation",     subtitle: "Configurer les règles d'appariement chauffeurs et l'affectation automatique." },
      vehicles:           { title: "Véhicules",                    subtitle: "Consulter et gérer le registre complet des véhicules." },
      fleets:             { title: "Flottes",                      subtitle: "Gérer vos groupes de flotte et affectations de chauffeurs." },
    },
    rota: {
      step1Label: "Chargement des chauffeurs",     step1Detail: "Chargement des profils et des roulements",
      step2Label: "Récupération des congés",        step2Detail: "Vérification des congés approuvés et absences",
      step3Label: "Vérification des affectations", step3Detail: "Recherche des trajets non affectés cette semaine",
      step4Label: "Construction du planning",      step4Detail: "Affectation des chauffeurs à leurs trajets, presque terminé…",
      workingDay: "Jour travaillé", restDay: "Jour de repos", holiday: "Congé",
      unavailable: "Indisponible", off: "Absent", notOnRota: "Non planifié",
      sun: "Dim", mon: "Lun", tue: "Mar", wed: "Mer", thu: "Jeu", fri: "Ven", sat: "Sam",
    },
    maintenance: {
      upcoming: "À venir", historical: "Historique",
      searchPlaceholder: "Chercher véhicule, raison…",
      records: "entrées", ofRecords: "sur",
      refresh: "Actualiser", export: "Exporter",
      colVehicle: "Véhicule", colDateRange: "Période", colDays: "Jours", colWhen: "Échéance",
      loading: "Chargement des événements de maintenance…", tryAgain: "Réessayer",
      noUpcoming: "Aucune maintenance à venir",      noUpcomingDesc: "Aucune immobilisation de véhicule n'est actuellement planifiée.",
      noHistorical: "Aucun historique",              noHistoricalDesc: "Aucun événement de maintenance passé trouvé.",
      statusActive: "Actif", statusUpcoming: "À venir", statusCompleted: "Terminé",
      today: "Aujourd'hui", inDays: "Dans {n}j", daysAgo: "Il y a {n}j", durationDays: "{n}j",
    },
    login: {
      tagline:       "Conformité & Gestion de flotte",
      signIn:        "Connexion",
      signInDesc:    "Saisissez vos identifiants pour accéder à la plateforme",
      emailLabel:    "Adresse e-mail",
      emailPlaceholder: "vous@entreprise.fr",
      passwordLabel: "Mot de passe",
      rememberMe:    "Se souvenir de moi",
      forgotPassword:"Mot de passe oublié ?",
      submit:        "Se connecter",
      submitting:    "Connexion en cours…",
      resetTitle:    "Réinitialiser le mot de passe",
      resetDesc:     "Saisissez votre e-mail et nous vous enverrons un lien de réinitialisation.",
      sendLink:      "Envoyer le lien",
      sending:       "Envoi en cours…",
      backToSignIn:  "← Retour à la connexion",
      checkInbox:    "Vérifiez votre boîte mail",
      checkInboxDesc:"Si {email} est enregistré, vous recevrez un lien de réinitialisation.",
      errorDefault:  "Échec de la connexion. Vérifiez vos identifiants et réessayez.",
    },
  },

  // ── Spanish ─────────────────────────────────────────────────────────────────
  es: {
    nav: {
      dashboard:          "Panel",
      trips:              "Viajes",
      rota:               "Planificación semanal",
      importHub:          "Centro de importación",
      calendar:           "Calendario",
      maintenanceTrips:   "Viajes de mantenimiento",
      drivers:            "Conductores",
      fleetManagement:    "Gestión de flota",
      places:             "Lugares",
      fuelTracking:       "Control de combustible",
      parkingMonitoring:  "Supervisión de aparcamiento",
      tollExpenses:       "Gastos de peaje",
      tollReceipts:       "Recibos de peaje",
      fuelReceipts:       "Recibos de combustible",
      holidays:           "Vacaciones y ausencias",
      offShift:           "Fuera de turno",
      maintenance:        "Mantenimiento",
      compliance:         "Cumplimiento",
      inventory:          "Inventario",
      allocationSettings: "Configuración de asignación",
    },
    topbar: {
      profile:    "Mi perfil",
      settings:   "Configuración",
      logout:     "Cerrar sesión",
      lightMode:  "Claro",
      darkMode:   "Oscuro",
      systemMode: "Sistema",
      language:   "Idioma",
    },
    common: {
      save:"Guardar",cancel:"Cancelar",upload:"Subir",download:"Descargar",search:"Buscar",new:"Nuevo",edit:"Editar",delete:"Eliminar",submit:"Enviar",back:"Volver",loading:"Cargando…",addVehicle:"Añadir vehículo",export:"Exportar",filter:"Filtrar",refresh:"Actualizar",active:"Activo",inactive:"Inactivo",pending:"Pendiente",resolved:"Resuelto",allVehicles:"Todos los vehículos",today:"Hoy",thisMonth:"Este mes",selectAll:"Seleccionar todo",tryAgain:"Reintentar",records:"registros",noData:"Sin datos",
      date:"Fecha",vehicle:"Vehículo",driver:"Conductor",status:"Estado",action:"Acción",ref:"Ref",route:"Ruta",type:"Tipo",amount:"Importe",method:"Método",litres:"Litros",costPerLitre:"Coste/L",totalCost:"Coste total",odometer:"Cuentakilómetros",mpg:"L/100km",depot:"Depósito",duration:"Duración",location:"Ubicación",cost:"Coste",fleet:"Flota",name:"Nombre",phone:"Teléfono",licence:"Permiso",notes:"Notas",
      view:"Ver",reconcile:"Conciliar",addNew:"Añadir",assign:"Asignar",approve:"Aprobar",reject:"Rechazar",newCharge:"Nuevo cargo",details:"Detalles",close:"Cerrar",
      all:"Todos",reconciled:"Conciliado",scheduled:"Programado",dispatched:"Despachado",started:"Iniciado",completed:"Completado",cancelled:"Cancelado",
      tripsToday:"Viajes hoy",driversAvailable:"Conductores disponibles",fleetSize:"Tamaño de flota",thisWeek:"Esta semana",available:"disponible(s)",onLeave:"con permiso",noTripsToday:"Sin viajes hoy",nothingScheduled:"Nada programado para hoy",createTrip:"Crear viaje →",driverStatus:"Estado de conductores",allDrivers:"Todos los conductores",todaysTrips:"Viajes de hoy",weekAtGlance:"Semana de un vistazo",vehicleDowntime:"Tiempo de inactividad",upcomingLeave:"Permisos próximos",viewCalendar:"Ver calendario",manage:"Gestionar",viewAll:"Ver todo",tripsMonSun:"viajes lun–dom",active2:"activo(s)",done:"hecho(s)",awaitingDispatch:"Esperando despacho",ofTotal:"de {n} en total",vehiclesRegistered:"vehículos registrados",vehiclesOff:"{n} vehículo(s) fuera hoy",needsDriver:"{n} viaje(s) necesitan conductor hoy",
      goodMorning:"Buenos días",goodAfternoon:"Buenas tardes",goodEvening:"Buenas noches",
      searchPlaceholder:"Buscar…",searchVehicles:"Buscar por matrícula, conductor, depósito…",searchDrivers:"Buscar conductores…",
      noDriverAssigned:"Sin conductor asignado",driverAssigned:"Conductor asignado",ongoing:"En curso",noUpcomingDowntime:"Sin inactividad prevista",noUpcomingLeave:"Sin permisos en los próximos 7 días",consumptionByVehicle:"Consumo por vehículo (30 días)",address:"Dirección",
    },
    pages: {
      dashboard:          { title: "Panel",                        subtitle: "Tu resumen operativo del día." },
      trips:              { title: "Viajes",                       subtitle: "Gestionar y supervisar todos los pedidos de transporte." },
      rota:               { title: "Planificación semanal",        subtitle: "Planifica y gestiona las asignaciones de conductores para la semana." },
      importHub:          { title: "Centro de importación",        subtitle: "Control centralizado de todas las conexiones de datos de proveedores e importaciones manuales." },
      calendar:           { title: "Calendario",                   subtitle: "Ver y programar viajes en el calendario." },
      drivers:            { title: "Conductores",                  subtitle: "Gestionar perfiles de conductores, licencias y conformidad CPC." },
      fleetManagement:    { title: "Gestión de flota",             subtitle: "Telemática en vivo, diagnósticos y administración — con la API de MyGeotab." },
      places:             { title: "Lugares",                      subtitle: "Gestionar depósitos, instalaciones de clientes y paradas frecuentes." },
      fuelTracking:       { title: "Control de combustible",       subtitle: "Supervisar el consumo, la eficiencia y el gasto por vehículo." },
      parkingMonitoring:  { title: "Supervisión de aparcamiento",  subtitle: "Seguimiento del uso de aparcamientos de camiones, costes y ubicaciones aprobadas." },
      tollExpenses:       { title: "Gastos de peaje",              subtitle: "Registrar peajes, puentes y túneles de toda la flota." },
      tollReceipts:       { title: "Recibos de peaje",             subtitle: "Captura de recibos de IVA para peajes de la flota." },
      fuelReceipts:       { title: "Recibos de combustible",       subtitle: "Gestión y aprobación de recibos de combustible recuperables a efectos de IVA." },
      holidays:           { title: "Vacaciones y ausencias",       subtitle: "Gestionar vacaciones anuales, bajas por enfermedad y ausencias de formación." },
      offShift:           { title: "Fuera de turno y descanso",    subtitle: "Supervisar el cumplimiento del descanso de conductores según la normativa EU (mín. 11h diarias)." },
      maintenance:        { title: "Hub de mantenimiento",         subtitle: "Programar y hacer seguimiento del mantenimiento, reparaciones e inspecciones." },
      maintenanceTrips:   { title: "Viajes de mantenimiento",      subtitle: "Inmovilizaciones y eventos fuera de ruta desde el calendario." },
      compliance:         { title: "Hub de cumplimiento",          subtitle: "Gestionar documentos regulatorios, licencias y preparación para auditorías." },
      inventory:          { title: "Hub de inventario",            subtitle: "Rastrear piezas, consumibles y stock en todos los depósitos." },
      allocationSettings: { title: "Configuración de asignación",  subtitle: "Configurar reglas de emparejamiento de conductores y asignación automática de viajes." },
      vehicles:           { title: "Vehículos",                    subtitle: "Ver y gestionar el registro completo de vehículos." },
      fleets:             { title: "Flotas",                       subtitle: "Gestionar grupos de flota y asignaciones de conductores." },
    },
    rota: {
      step1Label: "Cargando conductores",        step1Detail: "Cargando perfiles de conductores y turnos",
      step2Label: "Cargando vacaciones",         step2Detail: "Comprobando permisos aprobados y ausencias",
      step3Label: "Revisando asignaciones",      step3Detail: "Buscando viajes no asignados para esta semana",
      step4Label: "Construyendo el horario",     step4Detail: "Asignando conductores a sus viajes, casi listo…",
      workingDay: "Día laborable", restDay: "Día de descanso", holiday: "Vacaciones",
      unavailable: "No disponible", off: "Libre", notOnRota: "No planificado",
      sun: "Dom", mon: "Lun", tue: "Mar", wed: "Mié", thu: "Jue", fri: "Vie", sat: "Sáb",
    },
    maintenance: {
      upcoming: "Próximos", historical: "Histórico",
      searchPlaceholder: "Buscar vehículo, motivo…",
      records: "registros", ofRecords: "de",
      refresh: "Actualizar", export: "Exportar",
      colVehicle: "Vehículo", colDateRange: "Período", colDays: "Días", colWhen: "Cuándo",
      loading: "Cargando eventos de mantenimiento…", tryAgain: "Reintentar",
      noUpcoming: "Sin mantenimiento próximo",       noUpcomingDesc: "No hay inmovilizaciones de vehículos programadas.",
      noHistorical: "Sin registros históricos",      noHistoricalDesc: "No se encontraron eventos de mantenimiento pasados.",
      statusActive: "Activo", statusUpcoming: "Próximo", statusCompleted: "Completado",
      today: "Hoy", inDays: "En {n}d", daysAgo: "Hace {n}d", durationDays: "{n}d",
    },
    login: {
      tagline:       "Cumplimiento & Gestión de flota",
      signIn:        "Iniciar sesión",
      signInDesc:    "Introduce tus credenciales para acceder a la plataforma",
      emailLabel:    "Correo electrónico",
      emailPlaceholder: "tu@empresa.es",
      passwordLabel: "Contraseña",
      rememberMe:    "Recuérdame",
      forgotPassword:"¿Olvidaste tu contraseña?",
      submit:        "Iniciar sesión",
      submitting:    "Iniciando sesión…",
      resetTitle:    "Restablecer contraseña",
      resetDesc:     "Introduce tu correo y te enviaremos un enlace de restablecimiento.",
      sendLink:      "Enviar enlace",
      sending:       "Enviando…",
      backToSignIn:  "← Volver al inicio de sesión",
      checkInbox:    "Revisa tu bandeja de entrada",
      checkInboxDesc:"Si {email} está registrado, recibirás un enlace en breve.",
      errorDefault:  "Error al iniciar sesión. Comprueba tus credenciales e inténtalo de nuevo.",
    },
  },

  // ── Italian ─────────────────────────────────────────────────────────────────
  it: {
    nav: {
      dashboard:          "Dashboard",
      trips:              "Viaggi",
      rota:               "Piano settimanale",
      importHub:          "Hub importazione",
      calendar:           "Calendario",
      maintenanceTrips:   "Viaggi manutenzione",
      drivers:            "Autisti",
      fleetManagement:    "Gestione flotta",
      places:             "Luoghi",
      fuelTracking:       "Monitoraggio carburante",
      parkingMonitoring:  "Monitoraggio parcheggio",
      tollExpenses:       "Spese pedaggi",
      tollReceipts:       "Ricevute pedaggi",
      fuelReceipts:       "Ricevute carburante",
      holidays:           "Ferie e assenze",
      offShift:           "Fuori turno",
      maintenance:        "Manutenzione",
      compliance:         "Conformità",
      inventory:          "Inventario",
      allocationSettings: "Impostazioni di assegnazione",
    },
    topbar: {
      profile:    "Il mio profilo",
      settings:   "Impostazioni",
      logout:     "Esci",
      lightMode:  "Chiaro",
      darkMode:   "Scuro",
      systemMode: "Sistema",
      language:   "Lingua",
    },
    common: {
      save:"Salva",cancel:"Annulla",upload:"Carica",download:"Scarica",search:"Cerca",new:"Nuovo",edit:"Modifica",delete:"Elimina",submit:"Invia",back:"Indietro",loading:"Caricamento…",addVehicle:"Aggiungi veicolo",export:"Esporta",filter:"Filtra",refresh:"Aggiorna",active:"Attivo",inactive:"Inattivo",pending:"In attesa",resolved:"Risolto",allVehicles:"Tutti i veicoli",today:"Oggi",thisMonth:"Questo mese",selectAll:"Seleziona tutto",tryAgain:"Riprova",records:"voci",noData:"Nessun dato",
      date:"Data",vehicle:"Veicolo",driver:"Autista",status:"Stato",action:"Azione",ref:"Rif",route:"Percorso",type:"Tipo",amount:"Importo",method:"Metodo",litres:"Litri",costPerLitre:"Costo/L",totalCost:"Costo totale",odometer:"Contachilometri",mpg:"L/100km",depot:"Deposito",duration:"Durata",location:"Posizione",cost:"Costo",fleet:"Flotta",name:"Nome",phone:"Telefono",licence:"Patente",notes:"Note",
      view:"Vedi",reconcile:"Riconcilia",addNew:"Aggiungi",assign:"Assegna",approve:"Approva",reject:"Rifiuta",newCharge:"Nuovo addebito",details:"Dettagli",close:"Chiudi",
      all:"Tutti",reconciled:"Riconciliato",scheduled:"Programmato",dispatched:"Spedito",started:"Avviato",completed:"Completato",cancelled:"Annullato",
      tripsToday:"Viaggi oggi",driversAvailable:"Autisti disponibili",fleetSize:"Dimensione flotta",thisWeek:"Questa settimana",available:"disponibile/i",onLeave:"in ferie",noTripsToday:"Nessun viaggio oggi",nothingScheduled:"Niente in programma per oggi",createTrip:"Crea un viaggio →",driverStatus:"Stato autisti",allDrivers:"Tutti gli autisti",todaysTrips:"Viaggi di oggi",weekAtGlance:"Settimana in sintesi",vehicleDowntime:"Fermo veicoli",upcomingLeave:"Ferie in arrivo",viewCalendar:"Vedi calendario",manage:"Gestisci",viewAll:"Vedi tutto",tripsMonSun:"viaggi lun–dom",active2:"attivo/i",done:"completato/i",awaitingDispatch:"In attesa di spedizione",ofTotal:"di {n} totali",vehiclesRegistered:"veicoli registrati",vehiclesOff:"{n} veicolo/i assente/i oggi",needsDriver:"{n} viaggio/i necessita/no di un autista",
      goodMorning:"Buongiorno",goodAfternoon:"Buon pomeriggio",goodEvening:"Buonasera",
      searchPlaceholder:"Cerca…",searchVehicles:"Cerca per targa, autista, deposito…",searchDrivers:"Cerca autisti…",
      noDriverAssigned:"Nessun autista assegnato",driverAssigned:"Autista assegnato",ongoing:"In corso",noUpcomingDowntime:"Nessun fermo veicoli previsto",noUpcomingLeave:"Nessuna ferie nei prossimi 7 giorni",consumptionByVehicle:"Consumo per veicolo (30 giorni)",address:"Indirizzo",
    },
    pages: {
      dashboard:          { title: "Dashboard",                    subtitle: "Il tuo riepilogo operativo di oggi." },
      trips:              { title: "Viaggi",                       subtitle: "Gestisci e monitora tutti gli ordini di trasporto." },
      rota:               { title: "Piano settimanale autisti",    subtitle: "Pianifica e gestisci le assegnazioni degli autisti per la settimana." },
      importHub:          { title: "Hub importazione",             subtitle: "Controllo centralizzato di tutte le connessioni dati fornitori e importazioni manuali." },
      calendar:           { title: "Calendario",                   subtitle: "Visualizza e pianifica i viaggi nel calendario." },
      drivers:            { title: "Autisti",                      subtitle: "Gestisci profili autisti, patenti e conformità CPC." },
      fleetManagement:    { title: "Gestione flotta",              subtitle: "Telematica in tempo reale, diagnostica e amministrazione — tramite API MyGeotab." },
      places:             { title: "Luoghi",                       subtitle: "Gestisci depositi, siti clienti e fermate frequenti." },
      fuelTracking:       { title: "Monitoraggio carburante",      subtitle: "Monitora consumo, efficienza e spesa per veicolo." },
      parkingMonitoring:  { title: "Monitoraggio parcheggio",      subtitle: "Traccia l'utilizzo dei parcheggi TIR, costi e sedi approvate." },
      tollExpenses:       { title: "Spese pedaggi",                subtitle: "Traccia pedaggi, ponti e gallerie dell'intera flotta." },
      tollReceipts:       { title: "Ricevute pedaggi",             subtitle: "Acquisizione IVA per pedaggi della flotta." },
      fuelReceipts:       { title: "Ricevute carburante",          subtitle: "Gestione e approvazione delle ricevute carburante recuperabili ai fini IVA." },
      holidays:           { title: "Ferie e assenze",              subtitle: "Gestisci ferie annuali, giorni di malattia e assenze formative." },
      offShift:           { title: "Fuori turno e riposo",         subtitle: "Monitora la conformità ai tempi di riposo UE (min. 11h giornaliere)." },
      maintenance:        { title: "Hub manutenzione",             subtitle: "Pianifica e monitora revisioni, riparazioni e ispezioni dei veicoli." },
      maintenanceTrips:   { title: "Viaggi manutenzione",          subtitle: "Fermi veicolo ed eventi fuori strada dal calendario." },
      compliance:         { title: "Hub conformità",               subtitle: "Gestisci documenti normativi, licenze e preparazione agli audit." },
      inventory:          { title: "Hub inventario",               subtitle: "Traccia ricambi, materiali di consumo e scorte in tutti i depositi." },
      allocationSettings: { title: "Impostazioni di assegnazione", subtitle: "Configura le regole di abbinamento autisti e l'assegnazione automatica dei viaggi." },
      vehicles:           { title: "Veicoli",                      subtitle: "Visualizza e gestisci il registro completo dei veicoli." },
      fleets:             { title: "Flotte",                       subtitle: "Gestisci i gruppi di flotta e le assegnazioni degli autisti." },
    },
    rota: {
      step1Label: "Caricamento autisti",         step1Detail: "Caricamento profili e turni degli autisti",
      step2Label: "Caricamento ferie",           step2Detail: "Verifica delle ferie approvate e delle assenze",
      step3Label: "Verifica assegnazioni",       step3Detail: "Ricerca di viaggi non assegnati questa settimana",
      step4Label: "Costruzione del piano",       step4Detail: "Abbinamento autisti ai loro viaggi, quasi finito…",
      workingDay: "Giorno lavorativo", restDay: "Giorno di riposo", holiday: "Ferie",
      unavailable: "Non disponibile", off: "Libero", notOnRota: "Non in piano",
      sun: "Dom", mon: "Lun", tue: "Mar", wed: "Mer", thu: "Gio", fri: "Ven", sat: "Sab",
    },
    maintenance: {
      upcoming: "In arrivo", historical: "Storico",
      searchPlaceholder: "Cerca veicolo, motivo…",
      records: "voci", ofRecords: "di",
      refresh: "Aggiorna", export: "Esporta",
      colVehicle: "Veicolo", colDateRange: "Periodo", colDays: "Giorni", colWhen: "Quando",
      loading: "Caricamento eventi di manutenzione…", tryAgain: "Riprova",
      noUpcoming: "Nessuna manutenzione in arrivo",  noUpcomingDesc: "Nessun fermo veicolo è attualmente pianificato.",
      noHistorical: "Nessuno storico",               noHistoricalDesc: "Nessun evento di manutenzione passato trovato.",
      statusActive: "Attivo", statusUpcoming: "In arrivo", statusCompleted: "Completato",
      today: "Oggi", inDays: "Tra {n}g", daysAgo: "{n}g fa", durationDays: "{n}g",
    },
    login: {
      tagline:       "Conformità & Gestione flotta",
      signIn:        "Accedi",
      signInDesc:    "Inserisci le tue credenziali per accedere alla piattaforma",
      emailLabel:    "Indirizzo e-mail",
      emailPlaceholder: "tu@azienda.it",
      passwordLabel: "Password",
      rememberMe:    "Ricordami",
      forgotPassword:"Password dimenticata?",
      submit:        "Accedi",
      submitting:    "Accesso in corso…",
      resetTitle:    "Reimposta password",
      resetDesc:     "Inserisci la tua email e ti invieremo un link di reimpostazione.",
      sendLink:      "Invia link",
      sending:       "Invio in corso…",
      backToSignIn:  "← Torna all'accesso",
      checkInbox:    "Controlla la tua casella",
      checkInboxDesc:"Se {email} è registrata, riceverai un link a breve.",
      errorDefault:  "Accesso non riuscito. Verifica le credenziali e riprova.",
    },
  },

  // ── Polish ──────────────────────────────────────────────────────────────────
  pl: {
    nav: {
      dashboard:          "Panel",
      trips:              "Przejazdy",
      rota:               "Plan tygodniowy",
      importHub:          "Hub importu",
      calendar:           "Kalendarz",
      maintenanceTrips:   "Przejazdy serwisowe",
      drivers:            "Kierowcy",
      fleetManagement:    "Zarządzanie flotą",
      places:             "Miejsca",
      fuelTracking:       "Monitoring paliwa",
      parkingMonitoring:  "Monitoring parkingu",
      tollExpenses:       "Opłaty za przejazd",
      tollReceipts:       "Rachunki za przejazd",
      fuelReceipts:       "Rachunki za paliwo",
      holidays:           "Urlopy i nieobecności",
      offShift:           "Poza zmianą",
      maintenance:        "Serwis",
      compliance:         "Zgodność",
      inventory:          "Inwentarz",
      allocationSettings: "Ustawienia przydziału",
    },
    topbar: {
      profile:    "Mój profil",
      settings:   "Ustawienia",
      logout:     "Wyloguj się",
      lightMode:  "Jasny",
      darkMode:   "Ciemny",
      systemMode: "System",
      language:   "Język",
    },
    common: {
      save:"Zapisz",cancel:"Anuluj",upload:"Prześlij",download:"Pobierz",search:"Szukaj",new:"Nowy",edit:"Edytuj",delete:"Usuń",submit:"Wyślij",back:"Wstecz",loading:"Ładowanie…",addVehicle:"Dodaj pojazd",export:"Eksportuj",filter:"Filtruj",refresh:"Odśwież",active:"Aktywny",inactive:"Nieaktywny",pending:"Oczekujący",resolved:"Rozwiązany",allVehicles:"Wszystkie pojazdy",today:"Dziś",thisMonth:"W tym miesiącu",selectAll:"Zaznacz wszystkie",tryAgain:"Spróbuj ponownie",records:"wpisów",noData:"Brak danych",
      date:"Data",vehicle:"Pojazd",driver:"Kierowca",status:"Status",action:"Akcja",ref:"Ref",route:"Trasa",type:"Typ",amount:"Kwota",method:"Metoda",litres:"Litry",costPerLitre:"Koszt/L",totalCost:"Koszt całkowity",odometer:"Przebieg (km)",mpg:"L/100km",depot:"Baza",duration:"Czas trwania",location:"Lokalizacja",cost:"Koszt",fleet:"Flota",name:"Nazwa",phone:"Telefon",licence:"Prawo jazdy",notes:"Notatki",
      view:"Pokaż",reconcile:"Uzgodnij",addNew:"Dodaj",assign:"Przypisz",approve:"Zatwierdź",reject:"Odrzuć",newCharge:"Nowa opłata",details:"Szczegóły",close:"Zamknij",
      all:"Wszystkie",reconciled:"Uzgodnione",scheduled:"Zaplanowane",dispatched:"Wysłane",started:"Rozpoczęte",completed:"Ukończone",cancelled:"Anulowane",
      tripsToday:"Trasy dziś",driversAvailable:"Dostępni kierowcy",fleetSize:"Wielkość floty",thisWeek:"Ten tydzień",available:"dostępny/ch",onLeave:"na urlopie",noTripsToday:"Brak tras na dziś",nothingScheduled:"Nic nie zaplanowano na dziś",createTrip:"Utwórz trasę →",driverStatus:"Status kierowców",allDrivers:"Wszyscy kierowcy",todaysTrips:"Dzisiejsze trasy",weekAtGlance:"Tydzień w skrócie",vehicleDowntime:"Przestoje pojazdów",upcomingLeave:"Nadchodzące urlopy",viewCalendar:"Pokaż kalendarz",manage:"Zarządzaj",viewAll:"Pokaż wszystkie",tripsMonSun:"trasy pon–nd",active2:"aktywny/ch",done:"ukończony/ch",awaitingDispatch:"Oczekuje na wysyłkę",ofTotal:"z {n} ogółem",vehiclesRegistered:"zarejestrowanych pojazdów",vehiclesOff:"{n} pojazd(ów) nieobecny/ch dziś",needsDriver:"{n} trasa/y wymaga/ją kierowcy dziś",
      goodMorning:"Dzień dobry",goodAfternoon:"Dzień dobry",goodEvening:"Dobry wieczór",
      searchPlaceholder:"Szukaj…",searchVehicles:"Szukaj wg rejestrac., kierowcy, bazy…",searchDrivers:"Szukaj kierowców…",
      noDriverAssigned:"Brak przypisanego kierowcy",driverAssigned:"Kierowca przypisany",ongoing:"W toku",noUpcomingDowntime:"Brak zaplanowanych przestojów",noUpcomingLeave:"Brak urlopów w ciągu 7 dni",consumptionByVehicle:"Zużycie wg pojazdu (30 dni)",address:"Adres",
    },
    pages: {
      dashboard:          { title: "Panel",                        subtitle: "Twoje operacyjne podsumowanie dnia." },
      trips:              { title: "Przejazdy",                    subtitle: "Zarządzaj i monitoruj wszystkie zlecenia transportowe." },
      rota:               { title: "Tygodniowy plan kierowców",    subtitle: "Planuj i zarządzaj przydziałami kierowców na tydzień." },
      importHub:          { title: "Hub importu",                  subtitle: "Centralna kontrola wszystkich połączeń danych dostawców i ręcznych importów." },
      calendar:           { title: "Kalendarz",                    subtitle: "Przeglądaj i planuj przejazdy w kalendarzu." },
      drivers:            { title: "Kierowcy",                     subtitle: "Zarządzaj profilami kierowców, prawami jazdy i zgodnością CPC." },
      fleetManagement:    { title: "Zarządzanie flotą",            subtitle: "Telematyka na żywo, diagnostyka i administracja — zasilana przez API MyGeotab." },
      places:             { title: "Miejsca",                      subtitle: "Zarządzaj magazynami, lokalizacjami klientów i częstymi przystankami." },
      fuelTracking:       { title: "Monitoring paliwa",            subtitle: "Monitoruj zużycie, efektywność i koszty paliwa na pojazd." },
      parkingMonitoring:  { title: "Monitoring parkingu",          subtitle: "Śledź korzystanie z parkingów dla ciężarówek, koszty i zatwierdzone lokalizacje." },
      tollExpenses:       { title: "Opłaty za przejazd",           subtitle: "Śledź opłaty drogowe, mostowe i tunelowe w całej flocie." },
      tollReceipts:       { title: "Rachunki za przejazd",         subtitle: "Przechwytywanie faktur VAT za opłaty drogowe floty." },
      fuelReceipts:       { title: "Rachunki za paliwo",           subtitle: "Zarządzanie i zatwierdzanie rachunków za paliwo z odliczeniem VAT." },
      holidays:           { title: "Urlopy i nieobecności",        subtitle: "Zarządzaj urlopami wypoczynkowymi, zwolnieniami lekarskimi i nieobecnościami szkoleniowymi." },
      offShift:           { title: "Poza zmianą i odpoczynek",     subtitle: "Monitoruj zgodność czasu odpoczynku kierowców z przepisami UE (min. 11h na dobę)." },
      maintenance:        { title: "Hub serwisowy",                subtitle: "Planuj i śledź przeglądy, naprawy i inspekcje pojazdów." },
      maintenanceTrips:   { title: "Przejazdy serwisowe",          subtitle: "Przestoje pojazdów i zdarzenia trasowe z kalendarza." },
      compliance:         { title: "Hub zgodności",                subtitle: "Zarządzaj dokumentami regulacyjnymi, licencjami i gotowością do audytów." },
      inventory:          { title: "Hub inwentarza",               subtitle: "Śledź części, materiały eksploatacyjne i zapasy we wszystkich magazynach." },
      allocationSettings: { title: "Ustawienia przydziału",        subtitle: "Konfiguruj reguły parowania kierowców i automatyczny przydział przejazdów." },
      vehicles:           { title: "Pojazdy",                      subtitle: "Przeglądaj i zarządzaj pełnym rejestrem pojazdów." },
      fleets:             { title: "Floty",                        subtitle: "Zarządzaj grupami floty i przydziałami kierowców." },
    },
    rota: {
      step1Label: "Wczytywanie kierowców",       step1Detail: "Ładowanie profili kierowców i wzorców zmian",
      step2Label: "Pobieranie planu urlopów",    step2Detail: "Sprawdzanie zatwierdzonych urlopów i nieobecności",
      step3Label: "Sprawdzanie przydziałów",     step3Detail: "Wyszukiwanie nieprzypisanych przejazdów w tym tygodniu",
      step4Label: "Budowanie harmonogramu",      step4Detail: "Przypisywanie kierowców do ich przejazdów, prawie gotowe…",
      workingDay: "Dzień roboczy", restDay: "Dzień wolny", holiday: "Urlop",
      unavailable: "Niedostępny", off: "Wolny", notOnRota: "Nie w planie",
      sun: "Nd", mon: "Pn", tue: "Wt", wed: "Śr", thu: "Cz", fri: "Pt", sat: "Sb",
    },
    maintenance: {
      upcoming: "Nadchodzące", historical: "Historia",
      searchPlaceholder: "Szukaj pojazdu, powodu…",
      records: "wpisów", ofRecords: "z",
      refresh: "Odśwież", export: "Eksportuj",
      colVehicle: "Pojazd", colDateRange: "Okres", colDays: "Dni", colWhen: "Kiedy",
      loading: "Ładowanie zdarzeń serwisowych…", tryAgain: "Spróbuj ponownie",
      noUpcoming: "Brak nadchodzących serwisów",  noUpcomingDesc: "Żaden postój pojazdu nie jest aktualnie zaplanowany.",
      noHistorical: "Brak historycznych wpisów",  noHistoricalDesc: "Nie znaleziono minionych zdarzeń serwisowych.",
      statusActive: "Aktywny", statusUpcoming: "Nadchodzący", statusCompleted: "Zakończony",
      today: "Dziś", inDays: "Za {n}d", daysAgo: "{n}d temu", durationDays: "{n}d",
    },
    login: {
      tagline:       "Zgodność i zarządzanie flotą",
      signIn:        "Zaloguj się",
      signInDesc:    "Wprowadź swoje dane, aby uzyskać dostęp do platformy",
      emailLabel:    "Adres e-mail",
      emailPlaceholder: "ty@firma.pl",
      passwordLabel: "Hasło",
      rememberMe:    "Zapamiętaj mnie",
      forgotPassword:"Nie pamiętasz hasła?",
      submit:        "Zaloguj się",
      submitting:    "Logowanie…",
      resetTitle:    "Zresetuj hasło",
      resetDesc:     "Podaj swój adres e-mail, a wyślemy Ci link do resetowania.",
      sendLink:      "Wyślij link",
      sending:       "Wysyłanie…",
      backToSignIn:  "← Powrót do logowania",
      checkInbox:    "Sprawdź skrzynkę odbiorczą",
      checkInboxDesc:"Jeśli {email} jest zarejestrowany, wkrótce otrzymasz link resetujący.",
      errorDefault:  "Logowanie nie powiodło się. Sprawdź dane i spróbuj ponownie.",
    },
  },
}

// ─── CONTEXT ──────────────────────────────────────────────────────────────────

const ALL_LANGS: Lang[] = ["en", "de", "fr", "es", "it", "pl"]

type LangCtx = {
  lang: Lang
  setLang: (l: Lang) => void
  t: Translations
  dateLocale: string
}

const LangContext = React.createContext<LangCtx>({
  lang: "en",
  setLang: () => {},
  t: translations.en,
  dateLocale: "en-GB",
})

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = React.useState<Lang>("en")

  React.useEffect(() => {
    const stored = localStorage.getItem("fy-lang") as Lang | null
    if (stored && (ALL_LANGS as string[]).includes(stored)) setLangState(stored)
  }, [])

  function setLang(l: Lang) {
    setLangState(l)
    localStorage.setItem("fy-lang", l)
  }

  return (
    <LangContext.Provider value={{
      lang,
      setLang,
      t: translations[lang],
      dateLocale: LOCALE_TAG[lang],
    }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  return React.useContext(LangContext)
}
