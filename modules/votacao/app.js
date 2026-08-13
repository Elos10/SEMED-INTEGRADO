import {
  createEmptyElectionState,
  ensureElectionSeed,
  runElectionStateTransaction,
  subscribeToElectionState,
} from "./firebase-store.js";
const FINISH_DELAY_MS = 2600;
const UNIT_TYPOLOGIES = [
  { value: "1", label: "Tipo 1", roles: ["Diretor(a)"] },
  { value: "2", label: "Tipo 2", roles: ["Diretor(a)", "Vice-diretor(a)"] },
  { value: "3", label: "Tipo 3", roles: ["Diretor(a)", "Vice-diretor(a)"] },
  { value: "4", label: "Tipo 4", roles: ["Diretor(a)", "Vice-diretor(a)"] },
  { value: "5", label: "Tipo 5", roles: ["Diretor(a)", "Vice-diretor(a)", "Vice-diretor(a)"] },
];
const UNIT_TYPOLOGY_REFERENCE_VERSION = "porta-voz-2451-2024";
const UNIT_TYPOLOGY_BY_SLUG = {
  "e-m-adolfo-bezerra-de-menezes": "4",
  "e-m-arthur-de-mello-teixeira": "4",
  "e-m-boa-vista": "4",
  "e-m-celina-soares-de-paiva": "3",
  "e-m-doutor-aluizio-rosa-prata": "4",
  "e-m-frederico-peiro": "2",
  "e-m-gastao-mesquita-filho": "3",
  "e-m-joaozinho-e-maria": "2",
  "e-m-jose-marcus-cherem": "2",
  "e-m-joubert-de-carvalho": "4",
  "e-m-madre-maria-georgina": "3",
  "e-m-maria-carolina-mendes": "3",
  "e-m-maria-lourencina-palmerio": "3",
  "e-m-monteiro-lobato": "3",
  "e-m-norma-sueli-borges": "3",
  "e-m-padre-eddie-bernardes": "3",
  "e-m-pequeno-principe": "4",
  "e-m-prof-anisio-teixeira": "5",
  "e-m-prof-jose-geraldo-guimaraes": "5",
  "e-m-prof-jose-macciotti": "4",
  "e-m-prof-paulo-rodrigues": "4",
  "e-m-prof-esther-limirio-brigagao": "4",
  "e-m-prof-geni-chaves": "4",
  "e-m-prof-jane-luce-araujo": "3",
  "e-m-prof-luciene-aparecida-do-carmo": "2",
  "e-m-prof-niza-marquez-guarita": "4",
  "e-m-prof-olga-de-oliveira": "3",
  "e-m-prof-stella-chaves": "4",
  "e-m-prof-terezinha-hueb-de-menezes": "5",
  "e-m-reis-junior": "3",
  "e-m-ricardo-misson": "3",
  "e-m-santa-maria": "4",
  "e-m-sao-judas-tadeu": "3",
  "e-m-sebastiao-antonio-leal": "3",
  "e-m-sitio-do-pica-pau-amarelo": "3",
  "e-m-totonho-de-morais": "3",
  "e-m-uberaba": "5",
  "e-m-urbana-frei-eugenio": "5",
  "e-m-vicente-alves-trindade": "3",
  "cemei-angela-beatriz-bonadio-alves": "2",
  "cemei-aparecida-conceicao-ferreira": "2",
  "cemei-claudia-aparecida-vilela-mesquita": "2",
  "cemei-diego-jose-ferreira-lima": "3",
  "cemei-francisca-valias-wenceslau": "2",
  "cemei-gervasio-pedro-alves": "2",
  "cemei-integracao": "1",
  "cemei-joao-miguel-hueb": "2",
  "cemei-juscelino-kubitscheck": "3",
  "cemei-luciano-portelinha-mota": "2",
  "cemei-marcio-euripedes-martins-dos-santos": "2",
  "cemei-maria-assis-rezende": "2",
  "cemei-maria-de-lourdes-vasques-martins-marino": "2",
  "cemei-maria-de-nazare": "1",
  "cemei-maria-eduarda-farnezi-caetano": "3",
  "cemei-maria-elisabete-salge-melo": "3",
  "cemei-maria-rosa-de-oliveira": "1",
  "cemei-michelle-flavia-martins-pires": "2",
  "cemei-monica-machiyama": "3",
  "cemei-monsenhor-juvenal-arduini": "2",
  "cemei-nicanor-pedro-da-silveira": "2",
  "cemei-nossa-senhora-de-lourdes": "2",
  "cemei-octavia-alves-lopes": "1",
  "cemei-paraiso": "3",
  "cemei-prof-joao-wilson-de-freitas": "2",
  "cemei-professor-raimundo-edmundo-de-freitas": "2",
  "cemei-prof-beatriz-faustino-monteiro": "3",
  "cemei-prof-dirce-miziara": "3",
  "cemei-prof-eunice-de-sousa-puhler": "2",
  "cemei-prof-joana-darc-campos-oliveira": "3",
  "cemei-prof-maria-emerenciana-cardoso": "3",
  "cemei-prof-marilia-barbosa-pacheco-silva": "2",
  "cemei-prof-natalya-dayrell-decarvalho": "2",
  "cemei-prof-zita-terezinha-capuco": "2",
  "cemei-solange-aparecida-cardoso-da-silva": "3",
  "cemei-tutunas": "2",
  "cemei-vovo-adelina": "3",
  "cemei-vovo-tiana": "3",
};
const VOTER_TYPES = ["Familiar ou responsável legal do aluno", "Servidor, Servidora da Unidade","Aluno (EJA 16+)" ];
const TECH_LOGO_SRC = "./assets/logo-detic.png";
const MUNICIPAL_LOGO_SRC = "./assets/logo-municipal.png";
const FINISH_SOUND_URL = "./assets/urna-final.mp3";
const UNIT_NAMES = [
  "E. M. ADOLFO BEZERRA DE MENEZES",
  "E. M. ARTHUR DE MELLO TEIXEIRA",
  "E. M. BOA VISTA",
  "E. M. CELINA SOARES DE PAIVA",
  "E. M. DOUTOR ALUÍZIO ROSA PRATA",
  "E. M. FREDERICO PEIRÓ",
  "E. M. GASTÃO MESQUITA FILHO",
  "E. M. JOÃOZINHO E MARIA",
  "E. M. JOSÉ MARCUS CHERÉM",
  "E. M. JOUBERT DE CARVALHO",
  "E. M. MADRE MARIA GEORGINA",
  "E. M. MARIA CAROLINA MENDES",
  "E. M. MARIA LOURENCINA PALMÉRIO",
  "E. M. MONTEIRO LOBATO",
  "E. M. NORMA SUELI BORGES",
  "E. M. PADRE EDDIE BERNARDES",
  "E. M. PEQUENO PRÍNCIPE",
  "E. M. PROF. ANÍSIO TEIXEIRA",
  "E. M. PROF. JOSÉ GERALDO GUIMARÃES",
  "E. M. PROF. JOSÉ MACCIOTTI",
  "E. M. PROF. PAULO RODRIGUES",
  "E. M. PROF.ª ESTHER LIMÍRIO BRIGAGÃO",
  "E. M. PROF.ª GENI CHAVES",
  "E. M. PROF.ª JANE LUCE ARAÚJO",
  "E. M. PROF.ª LUCIENE APARECIDA DO CARMO",
  "E. M. PROF.ª NIZA MARQUEZ GUARITÁ",
  "E. M. PROF.ª OLGA DE OLIVEIRA",
  "E. M. PROF.ª STELLA CHAVES",
  "E. M. PROF.ª TEREZINHA HUEB DE MENEZES",
  "E. M. REIS JÚNIOR",
  "E. M. RICARDO MISSON",
  "E. M. SANTA MARIA",
  "E. M. SÃO JUDAS TADEU",
  "E. M. SEBASTIÃO ANTÔNIO LEAL",
  "E. M. SÍTIO DO PICA-PAU AMARELO",
  "E. M. TOTONHO DE MORAIS",
  "E. M. UBERABA",
  "E. M. URBANA FREI EUGÊNIO",
  "E. M. VICENTE ALVES TRINDADE",
  "CEMEI ÂNGELA BEATRIZ BONÁDIO ALVES",
  "CEMEI APARECIDA CONCEIÇÃO FERREIRA",
  "CEMEI CLÁUDIA APARECIDA VILELA MESQUITA",
  "CEMEI DIEGO JOSÉ FERREIRA LIMA",
  "CEMEI FRANCISCA VALIAS WENCESLAU",
  "CEMEI GERVÁSIO PEDRO ALVES",
  "CEMEI HILDO TOTI",
  "CEMEI INTEGRAÇÃO",
  "CEMEI JOÃO GILBERTO RIPPOSATI",
  "CEMEI JOÃO MIGUEL HUEB",
  "CEMEI JUSCELINO KUBITSCHECK",
  "CEMEI LUCIANO PORTELINHA MOTA",
  "CEMEI MÁRCIO EURÍPEDES MARTINS DOS SANTOS",
  "CEMEI MARIA ASSIS REZENDE",
  "CEMEI MARIA DE LOURDES VASQUES MARTINS MARINO",
  "CEMEI MARIA DE NAZARÉ",
  "CEMEI MARIA EDUARDA FARNEZI CAETANO",
  "CEMEI MARIA ELISABETE SALGE MELO",
  "CEMEI MARIA ROSA DE OLIVEIRA",
  "CEMEI MICHELLE FLÁVIA MARTINS PIRES",
  "CEMEI MÔNICA MACHIYAMA",
  "CEMEI MONSENHOR JUVENAL ARDUINI",
  "CEMEI NICANOR PEDRO DA SILVEIRA",
  "CEMEI NOSSA SENHORA DE LOURDES",
  "CEMEI OCTÁVIA ALVES LOPES",
  "CEMEI PARAÍSO",
  "CEMEI PROF. JOÃO WILSON DE FREITAS",
  "CEMEI PROFESSOR RAIMUNDO EDMUNDO DE FREITAS",
  "CEMEI PROFª. BEATRIZ FAUSTINO MONTEIRO",
  "CEMEI PROF.ª DIRCE MIZIARA",
  "CEMEI PROF.ª EUNICE DE SOUSA PÜHLER",
  "CEMEI PROF.ª JOANA DARC CAMPOS OLIVEIRA",
  "CEMEI PROF.ª MARIA EMERENCIANA CARDOSO",
  "CEMEI PROF.ª MARÍLIA BARBOSA PACHECO SILVA",
  "CEMEI PROF.ª NATALYA DAYRELL DE CARVALHO",
  "CEMEI PROF.ª ZITA TEREZINHA CAPUÇO",
  "CEMEI SOLANGE APARECIDA CARDOSO DA SILVA",
  "CEMEI TUTUNAS",
  "CEMEI VOVÓ ADELINA",
  "CEMEI VOVÓ TIANA",
];

const uiState = {
  screen: "login",
  currentAccessId: null,
  activeSessionId: null,
  loginError: "",
  loginEmail: "",
  adminTab: "access",
  activeAccessEditId: null,
  accessEditorOpen: false,
  activeUnitEditId: null,
  unitEditorOpen: false,
  activeCandidateId: null,
  accessNotice: "",
  candidateNotice: "",
  sessionNotice: "",
  resultUnitFilter: "",
  resultTypeFilter: "",
  ballotDigits: "",
  ballotBlank: false,
  ballotAlert: "",
  tempCandidatePhoto: "",
  candidateDraft: null,
  candidateDraftTypology: "",
  candidateDraftUnitId: "",
  candidateEditorOpen: false,
};

const appRoot = document.querySelector("#app");
let appState = createEmptyElectionState();
let finishTimer = null;
let isStateReady = false;
let isSeedCheckComplete = false;
let stateSyncError = "";

document.addEventListener("keydown", handleGlobalKeydown);
appRoot.addEventListener("click", handleClick);
appRoot.addEventListener("submit", handleSubmit);
appRoot.addEventListener("input", handleInput);
appRoot.addEventListener("change", handleChange);

renderApp();
startStateSync();

function startStateSync() {
  subscribeToElectionState({
    onChange(nextState) {
      appState = nextState;
      renderApp();
    },
    onReady() {
      isStateReady = true;
      renderApp();
    },
    onError(error) {
      stateSyncError = buildFirestoreErrorMessage(
        "Nao foi possivel sincronizar os dados da votacao com o Firestore.",
        error,
      );
      console.error(error);
      renderApp();
    },
  });

  initializeSeedState();
}

async function initializeSeedState() {
  try {
    await ensureElectionSeed(createSeedState());
    await applyUnitTypologiesFromReference();
  } catch (error) {
    stateSyncError = buildFirestoreErrorMessage(
      "Nao foi possivel preparar a base inicial no Firestore.",
      error,
    );
    console.error(error);
  } finally {
    isSeedCheckComplete = true;
    renderApp();
  }
}

function buildFirestoreErrorMessage(message, error) {
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
  const detail = error && typeof error === "object" && "message" in error ? String(error.message) : "";

  if (code === "permission-denied") {
    return `${message} Verifique as regras do Firestore no projeto Firebase e permita leitura/escrita para os documentos urnaState/chapas e urnaState/votacao.`;
  }

  if (code === "failed-precondition" || detail.toLowerCase().includes("database")) {
    return `${message} Verifique se o banco Cloud Firestore foi criado no projeto Firebase.`;
  }

  if (code || detail) {
    return `${message} Detalhe: ${code || detail}`;
  }

  return message;
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = createSeedState();
    persistState(seeded);
    return seeded;
  }

  try {
    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      !Array.isArray(parsed.units) ||
      !Array.isArray(parsed.accessAccounts) ||
      !Array.isArray(parsed.candidates) ||
      !Array.isArray(parsed.boothAssignments) ||
      !Array.isArray(parsed.votingSessions) ||
      !Array.isArray(parsed.votes)
    ) {
      throw new Error("Estado inválido.");
    }
    return parsed;
  } catch (error) {
    const seeded = createSeedState();
    persistState(seeded);
    return seeded;
  }
}

function persistState(nextState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
}

function normalizeTypology(value) {
  const normalized = String(value || "1").replace(/^tipo\s*/i, "");
  return UNIT_TYPOLOGIES.some((tipology) => tipology.value === normalized) ? normalized : "1";
}

function getTypology(value) {
  const normalized = normalizeTypology(value);
  return UNIT_TYPOLOGIES.find((tipology) => tipology.value === normalized) || UNIT_TYPOLOGIES[0];
}

function getDefaultTypologyForUnit(unitName) {
  return UNIT_TYPOLOGY_BY_SLUG[slugify(unitName)] || "1";
}

function candidateRoleLabels(tipologyValue) {
  let viceIndex = 0;
  const typology = getTypology(tipologyValue);
  const totalVices = typology.roles.filter((item) => item === "Vice-diretor(a)").length;
  return typology.roles.map((role) => {
    if (role !== "Vice-diretor(a)") {
      return role;
    }

    viceIndex += 1;
    return totalVices > 1 ? `${role} ${viceIndex}` : role;
  });
}

function getCandidateMembers(candidate) {
  if (Array.isArray(candidate?.members) && candidate.members.length) {
    return candidate.members;
  }

  if (!candidate) {
    return [];
  }

  return [
    {
      role: "Diretor(a)",
      name: candidate.name || "",
      photoData: candidate.photoData || "",
    },
  ];
}

function getCandidateTypology(candidate) {
  const unit = getUnitById(candidate?.unitId || "");
  if (unit?.typology) {
    return normalizeTypology(unit.typology);
  }

  if (candidate?.typology) {
    return normalizeTypology(candidate.typology);
  }

  return "1";
}

function renderCandidateMembersSummary(candidate) {
  const members = getCandidateMembers(candidate).filter((member) => member.name);
  if (!members.length) {
    return "";
  }

  return `
    <div class="candidate-members-summary">
      <p class="subtle">Composição da chapa</p>
      <ul>
        ${members
          .map(
            (member) => `
              <li>
                <strong>${escapeHtml(member.role)}</strong>
                <span>${escapeHtml(member.name)}</span>
              </li>
            `,
          )
          .join("")}
      </ul>
    </div>
  `;
}

function buildCandidateDraft(candidate) {
  const unitId = candidate?.unitId || appState.units[0]?.id || "";
  const typology = normalizeTypology(getUnitById(unitId)?.typology || candidate?.typology);
  const members = candidateRoleLabels(typology).map((role, index) => {
    const member = getCandidateMembers(candidate)[index] || {};
    return {
      role,
      name: member.name || "",
    };
  });

  return {
    number: candidate?.number || "",
    name: candidate?.name || "",
    unitId,
    typology,
    members,
  };
}

function resetCandidateDraft() {
  uiState.tempCandidatePhoto = "";
  uiState.candidateDraft = null;
  uiState.candidateDraftTypology = "";
  uiState.candidateDraftUnitId = "";
}

function ensureCandidateDraft(candidate) {
  if (!uiState.candidateDraft) {
    uiState.candidateDraft = buildCandidateDraft(candidate);
  }

  return uiState.candidateDraft;
}

function syncCandidateDraftFromForm(form) {
  if (!(form instanceof HTMLFormElement)) {
    return;
  }

  const formData = new FormData(form);
  const unitId = String(formData.get("unitId") || "");
  const typology = normalizeTypology(getUnitById(unitId)?.typology || uiState.candidateDraftTypology);
  uiState.candidateDraft = {
    number: String(formData.get("number") || "").trim(),
    name: String(formData.get("name") || "").trim(),
    unitId,
    typology,
    members: candidateRoleLabels(typology).map((role, index) => ({
      role,
      name: String(formData.get(`memberName${index}`) || "").trim(),
    })),
  };
  uiState.candidateDraftUnitId = unitId;
  uiState.candidateDraftTypology = typology;
}

function getVoterWeight(voterType) {
  const normalized = String(voterType || "").toLowerCase();
  return normalized.includes("servidor") ? 2 : 1;
}

function getVoteWeight(vote) {
  const storedWeight = Number(vote?.voteWeight || 0);
  return storedWeight > 0 ? storedWeight : getVoterWeight(vote?.voterType);
}

function isValidVoteType(voteType) {
  const normalized = String(voteType || "").toLowerCase();
  return normalized === "válido" || (normalized.startsWith("v") && normalized.includes("lido"));
}

function createSeedState() {
  const units = UNIT_NAMES.map((name, index) => {
    const typology = getDefaultTypologyForUnit(name);
    return {
      id: `unit-${String(index + 1).padStart(2, "0")}-${slugify(name).slice(0, 24)}`,
      name,
      typology,
      officeTitle: candidateRoleLabels(typology).join(", ").toUpperCase(),
    };
  });

  const accessAccounts = [
    {
      id: makeId(),
      accessKind: "ADMINISTRADOR",
      name: "Administrador Geral",
      email: "admin@urna.local",
      password: "admin123",
      unitId: "",
      active: true,
    },
    ...units.map((unit, index) => ({
      id: makeId(),
      accessKind: "MESARIO",
      name: `Mesário ${String(index + 1).padStart(2, "0")}`,
      email: `mesario${String(index + 1).padStart(2, "0")}@urna.local`,
      password: "123456",
      unitId: unit.id,
      active: true,
    })),
  ];

  const candidateTemplates = [
    { number: "101", name: "Chapa Horizonte Escolar", color: "#1f6b46" },
    { number: "102", name: "Chapa Comunidade Viva", color: "#255d8b" },
    { number: "103", name: "Chapa Futuro Aberto", color: "#b0521c" },
  ];

  const candidates = units.flatMap((unit) =>
    candidateTemplates.map((template) => ({
      id: makeId(),
      unitId: unit.id,
      typology: unit.typology,
      number: template.number,
      name: template.name,
      photoData: buildAvatar(template.name, template.color),
      members: [
        {
          role: "Diretor(a)",
          name: template.name,
          photoData: buildAvatar(template.name, template.color),
        },
      ],
    })),
  );

  return {
    settings: {
      title: "Urna Escolar",
    },
    units,
    accessAccounts,
    candidates,
    boothAssignments: [],
    votingSessions: [],
    votes: [],
  };
}

function handleExternalStateChange(event) {
  if (event.key !== STORAGE_KEY) {
    return;
  }

  appState = loadState();
  renderApp();
}

function buildAvatar(name, color) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((piece) => piece[0].toUpperCase())
    .join("");

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="480" viewBox="0 0 400 480">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop stop-color="${color}" offset="0%"/>
          <stop stop-color="#f0e6c8" offset="100%"/>
        </linearGradient>
      </defs>
      <rect width="400" height="480" rx="36" fill="url(#g)"/>
      <circle cx="200" cy="150" r="84" fill="rgba(255,255,255,0.78)"/>
      <path d="M88 392c16-74 65-114 112-114 54 0 96 35 112 114" fill="rgba(255,255,255,0.72)"/>
      <text x="200" y="452" text-anchor="middle" font-family="Trebuchet MS, sans-serif" font-size="56" font-weight="700" fill="#152116">${initials}</text>
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function handleGlobalKeydown(event) {
  if (uiState.screen !== "ballot") {
    return;
  }

  if (/^[0-9]$/.test(event.key)) {
    pushDigit(event.key);
  } else if (event.key === "Backspace") {
    clearBallot();
  } else if (event.key === "Enter") {
    confirmVote();
  }
}

function handleClick(event) {
  const actionTarget = event.target.closest("[data-action]");
  if (!actionTarget) {
    return;
  }

  const { action, value = "" } = actionTarget.dataset;

  if (action === "logout") {
    logout();
  } else if (action === "open-tab") {
    uiState.adminTab = value;
    uiState.accessNotice = "";
    uiState.candidateNotice = "";
    uiState.accessEditorOpen = false;
    uiState.unitEditorOpen = false;
    uiState.candidateEditorOpen = false;
    resetCandidateDraft();
    renderApp();
  } else if (action === "digit") {
    pushDigit(value);
  } else if (action === "blank") {
    markBlank();
  } else if (action === "correct") {
    clearBallot();
  } else if (action === "confirm") {
    confirmVote();
  } else if (action === "return-operator") {
    returnToMesarioPanel();
    renderApp();
  } else if (action === "resume-session") {
    resumeCurrentSession();
  } else if (action === "edit-access") {
    uiState.activeAccessEditId = value;
    uiState.accessEditorOpen = true;
    uiState.adminTab = "access";
    uiState.accessNotice = "";
    renderApp();
  } else if (action === "new-access") {
    uiState.activeAccessEditId = null;
    uiState.accessEditorOpen = true;
    uiState.accessNotice = "";
    renderApp();
  } else if (action === "close-access-editor") {
    uiState.activeAccessEditId = null;
    uiState.accessEditorOpen = false;
    uiState.accessNotice = "";
    renderApp();
  } else if (action === "toggle-access") {
    toggleAccessActive(value);
  } else if (action === "edit-unit") {
    uiState.activeUnitEditId = value;
    uiState.unitEditorOpen = true;
    uiState.adminTab = "units";
    uiState.accessNotice = "";
    renderApp();
  } else if (action === "close-unit-editor") {
    uiState.activeUnitEditId = null;
    uiState.unitEditorOpen = false;
    uiState.accessNotice = "";
    renderApp();
  } else if (action === "edit-candidate") {
    uiState.activeCandidateId = value;
    resetCandidateDraft();
    uiState.candidateDraft = buildCandidateDraft(getActiveCandidate());
    uiState.candidateEditorOpen = true;
    uiState.adminTab = "candidates";
    uiState.candidateNotice = "";
    renderApp();
  } else if (action === "new-candidate") {
    uiState.activeCandidateId = null;
    resetCandidateDraft();
    uiState.candidateDraft = buildCandidateDraft(null);
    uiState.candidateEditorOpen = true;
    uiState.candidateNotice = "";
    renderApp();
  } else if (action === "close-candidate-editor") {
    uiState.activeCandidateId = null;
    resetCandidateDraft();
    uiState.candidateEditorOpen = false;
    uiState.candidateNotice = "";
    renderApp();
  } else if (action === "delete-candidate") {
    deleteCandidate(value);
  } else if (action === "reset-form") {
    if (value === "access") {
      uiState.activeAccessEditId = null;
      uiState.accessEditorOpen = false;
      uiState.accessNotice = "";
    }
    if (value === "candidate") {
      uiState.activeCandidateId = null;
      uiState.candidateNotice = "";
      resetCandidateDraft();
      uiState.candidateEditorOpen = false;
    }
    renderApp();
  } else if (action === "set-demo-user") {
    uiState.loginEmail = value;
    renderApp();
  } else if (action === "clear-filters") {
    uiState.resultUnitFilter = "";
    uiState.resultTypeFilter = "";
    renderApp();
  }
}

function handleSubmit(event) {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) {
    return;
  }

  if (form.id === "login-form") {
    event.preventDefault();
    submitLogin(new FormData(form));
  }

  if (form.id === "session-form") {
    event.preventDefault();
    submitSessionForm(new FormData(form));
  }

  if (form.id === "access-form") {
    event.preventDefault();
    submitAccessForm(new FormData(form));
  }

  if (form.id === "units-form") {
    event.preventDefault();
    submitUnitsForm(new FormData(form));
  }

  if (form.id === "candidate-form") {
    event.preventDefault();
    submitCandidateForm(form);
  }
}

function handleInput(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const form = target.closest("#candidate-form");
  if (form instanceof HTMLFormElement) {
    syncCandidateDraftFromForm(form);
  }
}

async function handleChange(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  if (target.id === "results-unit-filter") {
    uiState.resultUnitFilter = target.value;
    renderApp();
  }

  if (target.id === "results-type-filter") {
    uiState.resultTypeFilter = target.value;
    renderApp();
  }

  if (target.id === "candidate-typology" && target instanceof HTMLSelectElement) {
    const form = target.closest("#candidate-form");
    if (form instanceof HTMLFormElement) {
      syncCandidateDraftFromForm(form);
    }
    uiState.candidateDraftTypology = normalizeTypology(target.value);
    renderApp();
  }

  if (target.id === "candidate-unit" && target instanceof HTMLSelectElement) {
    const form = target.closest("#candidate-form");
    const unit = getUnitById(target.value);
    if (form instanceof HTMLFormElement) {
      syncCandidateDraftFromForm(form);
    }
    uiState.candidateDraftUnitId = target.value;
    uiState.candidateDraftTypology = normalizeTypology(unit?.typology);
    if (uiState.candidateDraft) {
      uiState.candidateDraft.unitId = target.value;
      uiState.candidateDraft.typology = uiState.candidateDraftTypology;
      uiState.candidateDraft.members = candidateRoleLabels(uiState.candidateDraftTypology).map((role, index) => ({
        role,
        name: uiState.candidateDraft?.members?.[index]?.name || "",
      }));
    }
    renderApp();
  }

  if (target.id === "candidate-photo" && target instanceof HTMLInputElement && target.files && target.files[0]) {
    const form = target.closest("#candidate-form");
    if (form instanceof HTMLFormElement) {
      syncCandidateDraftFromForm(form);
    }
    uiState.tempCandidatePhoto = await imageFileToDataUrl(target.files[0]);
    renderApp();
  }

}

async function applyUnitTypologiesFromReference() {
  await runElectionStateTransaction((draftState) => {
    draftState.settings = draftState.settings || {};
    if (draftState.settings.unitTypologyReferenceVersion === UNIT_TYPOLOGY_REFERENCE_VERSION) {
      return { status: "current" };
    }

    draftState.units.forEach((unit) => {
      const typology = getDefaultTypologyForUnit(unit.name);
      unit.typology = typology;
      unit.officeTitle = candidateRoleLabels(typology).join(", ").toUpperCase();
    });

    draftState.candidates.forEach((candidate) => {
      const unit = draftState.units.find((item) => item.id === candidate.unitId) || null;
      if (unit) {
        candidate.typology = unit.typology;
      }
    });

    draftState.settings.unitTypologyReferenceVersion = UNIT_TYPOLOGY_REFERENCE_VERSION;
    return { status: "updated" };
  });
}

function submitLogin(formData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  uiState.loginEmail = email;

  const account = appState.accessAccounts.find(
    (item) => item.email.toLowerCase() === email && item.password === password && item.active,
  );

  if (!account) {
    uiState.loginError = "Credenciais inválidas ou acesso desativado.";
    renderApp();
    return;
  }

  clearTimeout(finishTimer);
  finishTimer = null;

  uiState.currentAccessId = account.id;
  uiState.activeSessionId = null;
  uiState.loginError = "";
  uiState.sessionNotice = "";
  resetBallotState();

  if (account.accessKind === "ADMINISTRADOR") {
    uiState.screen = "admin";
  } else {
    uiState.screen = "mesario";
  }

  renderApp();
}

async function submitSessionForm(formData) {
  const mesario = getCurrentAccess();
  if (!mesario || mesario.accessKind !== "MESARIO") {
    logout();
    return;
  }

  const activeBooth = getBoothAssignmentForUnit(mesario.unitId);
  const activeSession = activeBooth ? appState.votingSessions.find((session) => session.id === activeBooth.sessionId) || null : null;
  if (activeSession && activeSession.status === "Liberado") {
    uiState.sessionNotice = `A urna desta unidade já está liberada no token ${activeSession.token}. Conclua a votação atual antes de gerar uma nova.`;
    renderApp();
    return;
  }

  const voterType = String(formData.get("voterType") || "");
  if (!VOTER_TYPES.includes(voterType)) {
    uiState.sessionNotice = "Selecione o perfil do votante antes de iniciar a urna.";
    renderApp();
    return;
  }

  try {
    const result = await runElectionStateTransaction((draftState) => {
      const draftMesario = draftState.accessAccounts.find((item) => item.id === mesario.id && item.active);
      if (!draftMesario || draftMesario.accessKind !== "MESARIO") {
        return { status: "invalid-access" };
      }

      const draftBooth = draftState.boothAssignments.find((assignment) => assignment.unitId === draftMesario.unitId) || null;
      const draftSession = draftBooth
        ? draftState.votingSessions.find((session) => session.id === draftBooth.sessionId) || null
        : null;

      if (draftSession && draftSession.status === "Liberado") {
        return {
          status: "already-open",
          token: draftSession.token,
          voterType: draftSession.voterType,
        };
      }

      const unit = draftState.units.find((item) => item.id === draftMesario.unitId) || null;
      const createdAt = new Date().toISOString();
      const session = {
        id: makeId(),
        token: makeUniqueTokenFromState(draftState),
        voterType,
        unitId: draftMesario.unitId,
        unitName: unit ? unit.name : "",
        mesarioId: draftMesario.id,
        mesarioName: draftMesario.name,
        mesarioEmail: draftMesario.email,
        status: "Liberado",
        createdAt,
        usedAt: null,
      };

      draftState.boothAssignments = draftState.boothAssignments.filter(
        (assignment) => assignment.unitId !== draftMesario.unitId,
      );
      draftState.boothAssignments.unshift({
        id: makeId(),
        unitId: draftMesario.unitId,
        sessionId: session.id,
        releasedAt: createdAt,
      });
      draftState.votingSessions.unshift(session);

      return {
        status: "created",
        session,
      };
    });

    if (result.status === "invalid-access") {
      logout();
      return;
    }

    if (result.status === "already-open") {
      uiState.sessionNotice =
        `A urna desta unidade jÃ¡ estÃ¡ liberada no token ${result.token}. ` +
        "Conclua a votaÃ§Ã£o atual antes de gerar uma nova.";
      renderApp();
      return;
    }

    uiState.activeSessionId = result.session.id;
    uiState.sessionNotice = "";
    resetBallotState();
    uiState.screen = "ballot";
    renderApp();
  } catch (error) {
    uiState.sessionNotice = "Nao foi possivel liberar a urna no Firestore.";
    console.error(error);
    renderApp();
  }
}

async function submitAccessForm(formData) {
  const editing = getActiveAccessEdit();
  const accessKind = String(formData.get("accessKind") || "MESARIO");
  const payload = {
    name: String(formData.get("name") || "").trim(),
    email: String(formData.get("email") || "").trim().toLowerCase(),
    password: String(formData.get("password") || "").trim(),
    accessKind,
    unitId: String(formData.get("unitId") || ""),
    active: formData.get("active") === "on",
  };

  if (!payload.name || !payload.email || !payload.password) {
    uiState.accessNotice = "Preencha nome, e-mail e senha.";
    renderApp();
    return;
  }

  if (payload.accessKind === "MESARIO" && !payload.unitId) {
    uiState.accessNotice = "Selecione a unidade escolar do mesário.";
    renderApp();
    return;
  }

  const duplicate = appState.accessAccounts.find(
    (account) => account.email.toLowerCase() === payload.email && account.id !== (editing && editing.id),
  );

  if (duplicate) {
    uiState.accessNotice = "Já existe um acesso com este e-mail.";
    renderApp();
    return;
  }

  try {
    const result = await runElectionStateTransaction((draftState) => {
      const latestEditing = editing
        ? draftState.accessAccounts.find((account) => account.id === editing.id) || null
        : null;
      const latestDuplicate = draftState.accessAccounts.find(
        (account) => account.email.toLowerCase() === payload.email && account.id !== (latestEditing && latestEditing.id),
      );

      if (latestDuplicate) {
        return { status: "duplicate" };
      }

      if (editing && !latestEditing) {
        return { status: "missing" };
      }

      if (latestEditing) {
        latestEditing.name = payload.name;
        latestEditing.email = payload.email;
        latestEditing.password = payload.password;
        latestEditing.accessKind = payload.accessKind;
        latestEditing.unitId = payload.accessKind === "MESARIO" ? payload.unitId : "";
        latestEditing.active = payload.active;
        return { status: "updated" };
      }

      draftState.accessAccounts.unshift({
        id: makeId(),
        createdAt: new Date().toISOString(),
        name: payload.name,
        email: payload.email,
        password: payload.password,
        accessKind: payload.accessKind,
        unitId: payload.accessKind === "MESARIO" ? payload.unitId : "",
        active: payload.active,
      });

      return { status: "created" };
    });

    if (result.status === "duplicate") {
      uiState.accessNotice = "JÃ¡ existe um acesso com este e-mail.";
      renderApp();
      return;
    }

    if (result.status === "missing") {
      uiState.accessNotice = "O acesso em ediÃ§Ã£o nÃ£o foi encontrado.";
      uiState.activeAccessEditId = null;
      uiState.accessEditorOpen = false;
      renderApp();
      return;
    }

    uiState.accessNotice = result.status === "updated"
      ? "Acesso atualizado com sucesso."
      : "Acesso criado com sucesso.";
    uiState.activeAccessEditId = null;
    uiState.accessEditorOpen = false;
    renderApp();
  } catch (error) {
    uiState.accessNotice = "Nao foi possivel salvar o acesso no Firestore.";
    console.error(error);
    renderApp();
  }
}

async function submitUnitsForm(formData) {
  const editingUnitId = String(formData.get("unitId") || "");
  try {
    await runElectionStateTransaction((draftState) => {
      const unitsToUpdate = editingUnitId
        ? draftState.units.filter((unit) => unit.id === editingUnitId)
        : draftState.units;

      unitsToUpdate.forEach((unit) => {
          const typology = normalizeTypology(formData.get("typology") || formData.get(`typology:${unit.id}`));
          unit.typology = typology;
          unit.officeTitle = candidateRoleLabels(typology).join(", ").toUpperCase();
        });

      draftState.candidates.forEach((candidate) => {
        const unit = draftState.units.find((item) => item.id === candidate.unitId) || null;
        if (unit) {
          candidate.typology = unit.typology;
        }
      });

      draftState.settings = draftState.settings || {};
      draftState.settings.unitTypologyReferenceVersion = UNIT_TYPOLOGY_REFERENCE_VERSION;
      return { status: "updated" };
    });

    uiState.accessNotice = "Tipologias das unidades atualizadas com sucesso.";
    uiState.activeUnitEditId = null;
    uiState.unitEditorOpen = false;
    renderApp();
  } catch (error) {
    uiState.accessNotice = "Nao foi possivel atualizar as tipologias das unidades.";
    console.error(error);
    renderApp();
  }
}

function imageFileToDataUrl(file) {
  return new Promise((resolve) => {
    if (!file) {
      resolve("");
      return;
    }

    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      const maxSide = 520;
      const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d");
      if (!context) {
        URL.revokeObjectURL(objectUrl);
        resolve("");
        return;
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL("image/jpeg", 0.72));
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve("");
    };
    image.src = objectUrl;
  });
}

async function submitCandidateForm(form) {
  const submitButton = form.querySelector('button[type="submit"]');
  if (submitButton instanceof HTMLButtonElement) {
    submitButton.disabled = true;
  }

  syncCandidateDraftFromForm(form);
  const formData = new FormData(form);
  const editing = getActiveCandidate();
  const mainPhotoInput = form.querySelector("#candidate-photo");
  const submittedPhoto = mainPhotoInput instanceof HTMLInputElement && mainPhotoInput.files && mainPhotoInput.files[0]
    ? await imageFileToDataUrl(mainPhotoInput.files[0])
    : "";
  const payload = {
    number: String(formData.get("number") || "").trim(),
    name: String(formData.get("name") || "").trim(),
    unitId: String(formData.get("unitId") || ""),
    typology: normalizeTypology(getUnitById(String(formData.get("unitId") || ""))?.typology),
    photoData: submittedPhoto || uiState.tempCandidatePhoto || (editing ? editing.photoData : ""),
  };
  const members = candidateRoleLabels(payload.typology).map((role, index) => ({
    role,
    name: String(formData.get(`memberName${index}`) || "").trim(),
  }));

  if (!/^\d{3}$/.test(payload.number)) {
    uiState.candidateNotice = "O número da chapa precisa ter exatamente 3 dígitos.";
    renderApp();
    return;
  }

  if (!payload.name || !payload.unitId) {
    uiState.candidateNotice = "Preencha nome, número e unidade.";
    renderApp();
    return;
  }

  if (members.some((member) => !member.name)) {
    uiState.candidateNotice = "Preencha os nomes de todos os cargos da tipologia selecionada.";
    renderApp();
    return;
  }

  const duplicate = appState.candidates.find(
    (candidate) =>
      candidate.number === payload.number &&
      candidate.unitId === payload.unitId &&
      candidate.id !== (editing && editing.id),
  );

  if (duplicate) {
    uiState.candidateNotice = "Já existe uma chapa com este número nessa unidade.";
    renderApp();
    return;
  }

  try {
    const result = await runElectionStateTransaction((draftState) => {
      const latestEditing = editing
        ? draftState.candidates.find((candidate) => candidate.id === editing.id) || null
        : null;
      const latestDuplicate = draftState.candidates.find(
        (candidate) =>
          candidate.number === payload.number &&
          candidate.unitId === payload.unitId &&
          candidate.id !== (latestEditing && latestEditing.id),
      );

      if (latestDuplicate) {
        return { status: "duplicate" };
      }

      if (editing && !latestEditing) {
        return { status: "missing" };
      }

      if (latestEditing) {
        latestEditing.number = payload.number;
        latestEditing.name = payload.name;
        latestEditing.unitId = payload.unitId;
        latestEditing.typology = payload.typology;
        latestEditing.photoData = payload.photoData || buildAvatar(payload.name, "#1f6b46");
        latestEditing.members = members;
        return { status: "updated" };
      }

      const photoData = payload.photoData || buildAvatar(payload.name, "#1f6b46");
      draftState.candidates.unshift({
        id: makeId(),
        createdAt: new Date().toISOString(),
        number: payload.number,
        name: payload.name,
        unitId: payload.unitId,
        typology: payload.typology,
        photoData,
        members,
      });
      return { status: "created" };
    });

    if (result.status === "duplicate") {
      uiState.candidateNotice = "JÃ¡ existe uma chapa com este nÃºmero nessa unidade.";
      renderApp();
      return;
    }

    if (result.status === "missing") {
      uiState.candidateNotice = "A chapa em ediÃ§Ã£o nÃ£o foi encontrada.";
      uiState.activeCandidateId = null;
      resetCandidateDraft();
      uiState.candidateEditorOpen = false;
      renderApp();
      return;
    }

    uiState.candidateNotice = result.status === "updated"
      ? "Chapa atualizada com sucesso."
      : "Chapa cadastrada com sucesso.";
    uiState.activeCandidateId = null;
    resetCandidateDraft();
    uiState.candidateEditorOpen = false;
    renderApp();
  } catch (error) {
    uiState.candidateNotice = buildFirestoreErrorMessage("Nao foi possivel salvar a chapa no Firestore.", error);
    console.error(error);
    renderApp();
  } finally {
    if (submitButton instanceof HTMLButtonElement) {
      submitButton.disabled = false;
    }
  }
}

async function toggleAccessActive(accessId) {
  try {
    const result = await runElectionStateTransaction((draftState) => {
      const account = draftState.accessAccounts.find((item) => item.id === accessId) || null;
      if (!account) {
        return { status: "missing" };
      }

      account.active = !account.active;
      return { status: "updated" };
    });

    if (result.status === "missing") {
      return;
    }

    renderApp();
  } catch (error) {
    uiState.accessNotice = "Nao foi possivel atualizar o acesso no Firestore.";
    console.error(error);
    renderApp();
  }
}

async function deleteCandidate(candidateId) {
  try {
    const result = await runElectionStateTransaction((draftState) => {
      const nextCandidates = draftState.candidates.filter((candidate) => candidate.id !== candidateId);
      if (nextCandidates.length === draftState.candidates.length) {
        return { status: "missing" };
      }

      draftState.candidates = nextCandidates;
      return { status: "deleted" };
    });

    if (result.status === "missing") {
      return;
    }

    if (uiState.activeCandidateId === candidateId) {
      uiState.activeCandidateId = null;
    }

    renderApp();
  } catch (error) {
    uiState.candidateNotice = "Nao foi possivel remover a chapa no Firestore.";
    console.error(error);
    renderApp();
  }
}

function pushDigit(digit) {
  if (uiState.ballotDigits.length >= 3) {
    return;
  }

  uiState.ballotBlank = false;
  uiState.ballotDigits += digit;
  uiState.ballotAlert = "";
  renderApp();
}

function markBlank() {
  if (uiState.ballotDigits.length > 0) {
    uiState.ballotAlert = "Use BRANCO apenas antes de digitar o número.";
    renderApp();
    return;
  }

  uiState.ballotBlank = true;
  uiState.ballotAlert = "";
  renderApp();
}

function clearBallot() {
  resetBallotState();
  renderApp();
}

async function confirmVote() {
  const mesario = getCurrentAccess();
  const session = getActiveSession();
  if (!mesario || mesario.accessKind !== "MESARIO" || !session) {
    returnToMesarioPanel("SessÃ£o de votaÃ§Ã£o indisponÃ­vel. Gere um novo token para continuar.");
    renderApp();
    return;
  }

  if (session.status === "Votou" || appState.votes.some((vote) => vote.sessionId === session.id)) {
    returnToMesarioPanel(`O token ${session.token} jÃ¡ foi utilizado. Gere um novo token para outra votaÃ§Ã£o.`);
    renderApp();
    return;
  }

  const candidate = getCurrentBallotCandidate();
  let voteType = "VÃ¡lido";
  let candidateNumber = uiState.ballotDigits;
  let candidateName = candidate ? candidate.name : "";

  if (uiState.ballotBlank && uiState.ballotDigits.length === 0) {
    voteType = "Em Branco";
    candidateNumber = "";
    candidateName = "";
  } else if (uiState.ballotDigits.length !== 3) {
    uiState.ballotAlert = "Digite os 3 dÃ­gitos do candidato ou escolha BRANCO.";
    renderApp();
    return;
  } else if (!candidate) {
    voteType = "Nulo";
    candidateName = "";
  }

  try {
    const result = await runElectionStateTransaction((draftState) => {
      const latestSession = draftState.votingSessions.find((item) => item.id === session.id) || null;
      if (!latestSession) {
        return { status: "missing" };
      }

      if (latestSession.status === "Votou" || draftState.votes.some((vote) => vote.sessionId === latestSession.id)) {
        return {
          status: "already-used",
          token: latestSession.token,
        };
      }

      const voteTime = new Date().toISOString();
      draftState.votes.unshift({
        id: makeId(),
        sessionId: latestSession.id,
        token: latestSession.token,
        createdAt: voteTime,
        candidateNumber,
        candidateName,
        voteType,
        voteWeight: getVoterWeight(latestSession.voterType),
        voterType: latestSession.voterType,
        unitId: latestSession.unitId,
        unitName: latestSession.unitName,
        mesarioName: mesario.name,
        mesarioEmail: mesario.email,
      });

      latestSession.status = "Votou";
      latestSession.usedAt = voteTime;
      draftState.boothAssignments = draftState.boothAssignments.filter(
        (assignment) => assignment.unitId !== latestSession.unitId,
      );

      return {
        status: "success",
        token: latestSession.token,
        voterType: latestSession.voterType,
      };
    });

    if (result.status === "missing") {
      returnToMesarioPanel("SessÃ£o de votaÃ§Ã£o indisponÃ­vel. Gere um novo token para continuar.");
      renderApp();
      return;
    }

    if (result.status === "already-used") {
      returnToMesarioPanel(`O token ${result.token} jÃ¡ foi utilizado. Gere um novo token para outra votaÃ§Ã£o.`);
      renderApp();
      return;
    }

    resetBallotState();
    uiState.screen = "finish";
    playBallotFinishSound();
    renderApp();

    clearTimeout(finishTimer);
    finishTimer = window.setTimeout(() => {
      returnToMesarioPanel(`VotaÃ§Ã£o concluÃ­da. Token ${result.token} finalizado para ${result.voterType}.`);
      renderApp();
    }, FINISH_DELAY_MS);
  } catch (error) {
    uiState.ballotAlert = "Nao foi possivel registrar o voto no Firestore.";
    console.error(error);
    renderApp();
  }
}

function confirmVoteLegacy() {
  const mesario = getCurrentAccess();
  const session = getActiveSession();
  if (!mesario || mesario.accessKind !== "MESARIO" || !session) {
    returnToMesarioPanel("Sessão de votação indisponível. Gere um novo token para continuar.");
    renderApp();
    return;
  }

  if (session.status === "Votou" || appState.votes.some((vote) => vote.sessionId === session.id)) {
    returnToMesarioPanel(`O token ${session.token} já foi utilizado. Gere um novo token para outra votação.`);
    renderApp();
    return;
  }

  const candidate = getCurrentBallotCandidate();
  let voteType = "Válido";
  let candidateNumber = uiState.ballotDigits;
  let candidateName = candidate ? candidate.name : "";

  if (uiState.ballotBlank && uiState.ballotDigits.length === 0) {
    voteType = "Em Branco";
    candidateNumber = "";
    candidateName = "";
  } else if (uiState.ballotDigits.length !== 3) {
    uiState.ballotAlert = "Digite os 3 dígitos do candidato ou escolha BRANCO.";
    renderApp();
    return;
  } else if (!candidate) {
    voteType = "Nulo";
    candidateName = "";
  }

  const voteTime = new Date().toISOString();
  appState.votes.unshift({
    id: makeId(),
    sessionId: session.id,
    token: session.token,
    createdAt: voteTime,
    candidateNumber,
    candidateName,
    voteType,
    voterType: session.voterType,
    unitId: session.unitId,
    unitName: session.unitName,
    mesarioName: mesario.name,
    mesarioEmail: mesario.email,
  });

  session.status = "Votou";
  session.usedAt = voteTime;
  persistState(appState);

  resetBallotState();
  uiState.screen = "finish";
  playBallotFinishSound();
  renderApp();

  clearTimeout(finishTimer);
  finishTimer = window.setTimeout(() => {
    returnToMesarioPanel(`Votação concluída. Token ${session.token} finalizado para ${session.voterType}.`);
    renderApp();
  }, FINISH_DELAY_MS);
}

function playBallotFinishSound() {
  const sound = new Audio(FINISH_SOUND_URL);
  sound.play().catch(() => {});
}

function returnToMesarioPanel(message = "") {
  clearTimeout(finishTimer);
  finishTimer = null;
  uiState.screen = "mesario";
  uiState.activeSessionId = null;
  uiState.sessionNotice = message;
  resetBallotState();
}

function resumeCurrentSession() {
  const mesario = getCurrentAccess();
  if (!mesario || mesario.accessKind !== "MESARIO") {
    logout();
    return;
  }

  const liveAssignment = getBoothAssignmentForUnit(mesario.unitId);
  const liveSession = liveAssignment
    ? appState.votingSessions.find((session) => session.id === liveAssignment.sessionId) || null
    : null;

  if (!liveSession || liveSession.status !== "Liberado") {
    uiState.sessionNotice = "Nao ha votacao em andamento para retomar.";
    renderApp();
    return;
  }

  uiState.activeSessionId = liveSession.id;
  uiState.sessionNotice = "";
  resetBallotState();
  uiState.screen = "ballot";
  renderApp();
}

function resetBallotState() {
  uiState.ballotDigits = "";
  uiState.ballotBlank = false;
  uiState.ballotAlert = "";
}

function logout() {
  clearTimeout(finishTimer);
  finishTimer = null;
  uiState.screen = "login";
  uiState.currentAccessId = null;
  uiState.activeSessionId = null;
  uiState.loginError = "";
  uiState.sessionNotice = "";
  resetBallotState();
  renderApp();
}

function getCurrentAccess() {
  return appState.accessAccounts.find((account) => account.id === uiState.currentAccessId) || null;
}

function getActiveAccessEdit() {
  return appState.accessAccounts.find((account) => account.id === uiState.activeAccessEditId) || null;
}

function getActiveUnitEdit() {
  return appState.units.find((unit) => unit.id === uiState.activeUnitEditId) || null;
}

function getActiveCandidate() {
  return appState.candidates.find((candidate) => candidate.id === uiState.activeCandidateId) || null;
}

function getActiveSession() {
  return appState.votingSessions.find((session) => session.id === uiState.activeSessionId) || null;
}

function getUnitById(unitId) {
  return appState.units.find((unit) => unit.id === unitId) || null;
}

function getCurrentBallotCandidate() {
  const session = getActiveSession();
  if (!session || uiState.ballotDigits.length !== 3) {
    return null;
  }

  return (
    appState.candidates.find(
      (candidate) => candidate.number === uiState.ballotDigits && candidate.unitId === session.unitId,
    ) || null
  );
}

function getBoothAssignmentForUnit(unitId) {
  return appState.boothAssignments.find((assignment) => assignment.unitId === unitId) || null;
}

function renderApp() {
  appRoot.innerHTML = renderScreen();
}

function renderScreen() {
  if (stateSyncError) {
    return renderAppFrame(renderStatusScreen("Falha na sincronizacao", stateSyncError));
  }
  if (!isStateReady || !isSeedCheckComplete) {
    return renderAppFrame(renderStatusScreen("Conectando ao Firestore", "Carregando a base da votacao em tempo real."));
  }
  if (uiState.screen === "admin") {
    return renderAppFrame(renderAdminScreen());
  }
  if (uiState.screen === "mesario") {
    return renderAppFrame(renderMesarioScreen());
  }
  if (uiState.screen === "ballot") {
    return renderAppFrame(renderBallotScreen());
  }
  if (uiState.screen === "finish") {
    return renderAppFrame(renderFinishScreen());
  }
  return renderLoginScreen();
}

function renderStatusScreen(title, message) {
  return `
    <main class="shell-simple">
      <section class="panel">
        <span class="eyebrow">Sincronizacao de dados</span>
        <h1 class="panel-title">${escapeHtml(title)}</h1>
        <p class="lead">${escapeHtml(message)}</p>
      </section>
    </main>
  `;
}

function renderAppFrame(content) {
  const currentAccess = getCurrentAccess();
  const showLogout = currentAccess && ["admin", "mesario"].includes(uiState.screen);

  return `
    <div class="brand-frame">
      <header class="brand-header">
        <div class="brand-header-inner">
          <div class="app-brand">
            <div class="login-mark">L&Nn</div>
            <div>
              <strong>Urna Escolar SEMED</strong>
              <span>Eleição de Diretores das Unidades Escolares</span>
            </div>
          </div>
          ${showLogout ? '<button class="topbar-logout" type="button" data-action="logout">Sair</button>' : ""}
        </div>
      </header>
      ${content}
      <footer class="brand-footer">
        <div class="brand-footer-inner">
          <img class="brand-logo-footer tech" src="${TECH_LOGO_SRC}" alt="Logotipo Departamento de Educação Tecnológica">
        </div>
      </footer>
    </div>
  `;
}

function renderLoginScreen() {
  return `
    <main class="login-page">
      <header class="login-topbar">
        <div class="login-mark">L&Nn</div>
        <div>
          <strong>Urna Escolar SEMED</strong>
          <span>Eleição de Diretores das Unidades Escolares</span>
        </div>
      </header>
      <img class="login-watermark" src="${MUNICIPAL_LOGO_SRC}" alt="">
      <section class="login-panel">
        <aside class="login-card">
          <div>
            <h2>Acesso ao sistema</h2>
          </div>
          ${uiState.loginError ? `<div class="flash flash-error">${escapeHtml(uiState.loginError)}</div>` : ""}
          <form id="login-form" class="field-grid">
            <div class="field">
              <label for="email">E-mail</label>
              <input id="email" name="email" type="email" autocomplete="username" placeholder="mesario@exemplo.com" value="${escapeHtml(
                uiState.loginEmail,
              )}" required>
            </div>
            <div class="field">
              <label for="password">Senha</label>
              <input id="password" name="password" type="password" autocomplete="current-password" placeholder="Digite a senha" required>
            </div>
            <button class="btn btn-primary" type="submit">Entrar</button>
          </form>
        </aside>
      </section>
    </main>
  `;
}

function renderMesarioScreen() {
  const mesario = getCurrentAccess();
  if (!mesario || mesario.accessKind !== "MESARIO") {
    uiState.screen = "login";
    return renderLoginScreen();
  }

  const unit = getUnitById(mesario.unitId);
  const liveAssignment = getBoothAssignmentForUnit(mesario.unitId);
  const liveSession = liveAssignment
    ? appState.votingSessions.find((session) => session.id === liveAssignment.sessionId) || null
    : null;

  return `
    <main class="mesario-page">
      <section class="mesario-dashboard">
        <div class="mesario-context">
          <strong>Mesário: ${escapeHtml(mesario.email)}</strong>
          <span>${unit ? escapeHtml(unit.name) : "Sem unidade"}</span>
        </div>
        ${uiState.sessionNotice ? `<div class="flash flash-success">${escapeHtml(uiState.sessionNotice)}</div>` : ""}
        ${
          liveSession
            ? `<div class="flash flash-neutral">Votação em andamento: <strong>${escapeHtml(liveSession.token)}</strong></div>`
            : ""
        }

        <form id="session-form" class="vote-release-form">
          <section class="mesario-flow-row mesario-flow-row-profile">
            <div class="mesario-step-card mesario-step-card-primary">
              <strong>1. Escolha o perfil da pessoa que irá votar</strong>
            </div>
            <div class="voter-type-grid">
              ${[1, 0, 2].map((index) => renderVoterTypeCard(VOTER_TYPES[index], index)).join("")}
            </div>
          </section>

          <section class="mesario-flow-row mesario-flow-row-release">
            <div class="mesario-step-card">
              <strong>2. Gere o código para liberar a votação</strong>
            </div>
            <button class="mesario-action-button mesario-action-button-release" type="submit">
              <strong>Código de liberação da votação</strong>
            </button>
          </section>

          <section class="mesario-flow-row mesario-flow-row-open">
            <div class="mesario-step-card">
              <strong>3. Abra a urna e entregue o tablet para o(a) eleitor(a)</strong>
            </div>
            ${
              liveSession
                ? '<button class="mesario-action-button mesario-action-button-open" type="button" data-action="resume-session"><strong>Abertura da urna</strong></button>'
                : '<button class="mesario-action-button mesario-action-button-open" type="submit"><strong>Abertura da urna</strong></button>'
            }
          </section>
        </form>
      </section>
    </main>
  `;
  return `
    <main class="mesario-page">
      <section class="mesario-dashboard">
        <aside class="mesario-profile-card">
          <button class="mesario-info-button" type="button">
            <em>1º</em>
            <strong>Eleitor(a)</strong>
            <span>Qual é o perfil da pessoa que irá votar?</span>
          </button>
          <p>Mesário: ${escapeHtml(mesario.email)}</p>
          <small>${unit ? escapeHtml(unit.name) : "Sem unidade"}</small>
        </aside>

        <section class="vote-release-card">
          ${uiState.sessionNotice ? `<div class="flash flash-success">${escapeHtml(uiState.sessionNotice)}</div>` : ""}
          ${
            liveSession
              ? `<div class="flash flash-neutral">Votação em andamento: <strong>${escapeHtml(liveSession.token)}</strong></div>`
              : ""
          }

          <form id="session-form" class="vote-release-form">
            <div class="voter-type-grid">
              ${[1, 0, 2].map((index) => renderVoterTypeCard(VOTER_TYPES[index], index)).join("")}
            </div>
            <div class="release-actions">
              <button class="mesario-action-button" type="submit">
                <em>2º</em>
                <strong>Liberação da urna</strong>
                <span>(clique aqui para gerar o código para liberar a votação)</span>
              </button>
              ${
                liveSession
                  ? '<button class="mesario-action-button" type="button" data-action="resume-session"><em>3º</em><strong>Abertura da urna</strong><span>(clique aqui para abrir a urna para o(a) eleitor(a) iniciar a votação)</span></button>'
                  : '<button class="mesario-action-button" type="submit"><em>3º</em><strong>Abertura da urna</strong><span>(clique aqui para abrir a urna para o(a) eleitor(a) iniciar a votação)</span></button>'
              }
            </div>
          </form>
        </section>
      </section>
    </main>
  `;
}

function renderVoterTypeCard(type, index) {
  const cards = [
    {
      title: "Familiar ou responsável legal do(a) aluno(a)",
      icon: "family",
    },
    {
      title: "Servidor(a) da unidade de ensino",
      icon: "server",
    },
    {
      title: "Aluno (EJA com 16 anos ou mais)",
      icon: "book",
    },
  ];
  const card = cards[index] || { title: type, icon: "book" };

  return `
    <label class="voter-type-card">
      <input type="radio" name="voterType" value="${escapeHtml(type)}" ${index === 0 ? "checked" : ""}>
      <strong>${escapeHtml(card.title)}</strong>
    </label>
  `;
}

function renderBallotScreen() {
  const mesario = getCurrentAccess();
  const session = getActiveSession();
  if (!mesario || mesario.accessKind !== "MESARIO" || !session) {
    uiState.screen = "mesario";
    return renderMesarioScreen();
  }

  const unit = getUnitById(session.unitId);
  const candidate = getCurrentBallotCandidate();
  const unitCandidates = appState.candidates
    .filter((item) => item.unitId === session.unitId)
    .sort((left, right) => left.number.localeCompare(right.number));
  const digits = [
    uiState.ballotDigits[0] || "",
    uiState.ballotDigits[1] || "",
    uiState.ballotDigits[2] || "",
  ];

  let candidateContent = `<p class="subtle">Digite os 3 dígitos para localizar a chapa desta unidade escolar.</p>`;

  if (uiState.ballotBlank && uiState.ballotDigits.length === 0) {
    candidateContent = `
      <div class="vote-highlight blank">VOTO EM BRANCO</div>
      <p class="subtle">Ao confirmar agora, o registro será salvo como voto em branco.</p>
    `;
  } else if (uiState.ballotDigits.length === 3 && candidate) {
    candidateContent = `
      <div class="urna-callout">
        <div>
          <p class="subtle">Nome</p>
          <strong>${escapeHtml(candidate.name)}</strong>
          <p class="subtle">Unidade</p>
          <strong>${unit ? escapeHtml(unit.name) : "-"}</strong>
          ${renderCandidateMembersSummary(candidate)}
        </div>
        <img class="candidate-photo" src="${candidate.photoData}" alt="Foto da chapa ${escapeHtml(candidate.name)}">
      </div>
    `;
  } else if (uiState.ballotDigits.length === 3 && !candidate) {
    candidateContent = `
      <div class="vote-highlight null">VOTO NULO</div>
      <p class="subtle">Esse número não corresponde a nenhuma chapa desta unidade escolar.</p>
    `;
  }

  return `
    <main class="urna-shell">
      <div class="urna-topbar">
        <div class="badge">Mesário: ${escapeHtml(mesario.name)}</div>
        <div class="actions-row">
          <div class="badge">Perfil do votante: ${escapeHtml(session.voterType)}</div>
          <div class="badge">Token: ${escapeHtml(session.token)}</div>
          <button class="btn btn-neutral" type="button" data-action="return-operator">Voltar à operação</button>
        </div>
      </div>
      <section class="urna-card">
        <aside class="candidate-list-panel">
          <div class="candidate-list-header">
            <strong>Chapas da unidade</strong>
            <span class="subtle">${unit ? escapeHtml(unit.name) : "Unidade não identificada"}</span>
          </div>
          <div class="candidate-list">
            ${unitCandidates
              .map(
                (item) => `
                  <article class="candidate-list-item ${candidate && candidate.id === item.id ? "active" : ""}">
                    <img class="candidate-list-photo" src="${item.photoData}" alt="Foto da chapa ${escapeHtml(item.name)}">
                    <div class="candidate-list-copy">
                      <strong>${escapeHtml(item.number)}</strong>
                      <span>${escapeHtml(item.name)}</span>
                    </div>
                  </article>
                `,
              )
              .join("")}
          </div>
        </aside>
        <div class="urna-display">
          <p class="subtle">SEU VOTO PARA</p>
          <h1 class="panel-title">${unit ? escapeHtml(unit.officeTitle) : "DIRETOR"}</h1>
          <div class="digit-row">
            ${digits
              .map(
                (digit) => `
                  <div class="digit-box ${digit ? "" : "empty"}">${digit || ""}</div>
                `,
              )
              .join("")}
          </div>
          <div class="candidate-meta">${candidateContent}</div>
          ${uiState.ballotAlert ? `<div class="flash flash-neutral">${escapeHtml(uiState.ballotAlert)}</div>` : ""}
          <div class="urna-footer">
            <div>
              <strong>Unidade atual</strong>
              <p class="subtle">${unit ? escapeHtml(unit.name) : "Unidade não identificada"}</p>
            </div>
            <div>
              <strong>Perfil selecionado</strong>
              <p class="subtle">${escapeHtml(session.voterType)}</p>
            </div>
          </div>
        </div>
        <aside class="urna-keypad">
          <p>Teclado numérico</p>
          <div class="keypad-grid">
            ${[1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, ""]
              .map((value) =>
                value === ""
                  ? `<div></div>`
                  : `<button class="key" type="button" data-action="digit" data-value="${value}">${value}</button>`,
              )
              .join("")}
          </div>
          <div class="action-keys">
            <button class="action-key blank" type="button" data-action="blank">Branco</button>
            <button class="action-key correct" type="button" data-action="correct">Corrige</button>
            <button class="action-key confirm" type="button" data-action="confirm">Confirma</button>
          </div>
          <p class="keyboard-note">A urna aceita o teclado físico para os números e a tecla Enter para confirmar.</p>
        </aside>
      </section>
    </main>
  `;
}

function renderFinishScreen() {
  const session = getActiveSession();
  return `
    <main class="shell-simple">
      <section class="panel">
        <span class="eyebrow">Registro concluído</span>
        <h1 class="panel-title">FIM</h1>
        <p class="lead">
          ${session ? `O token <strong>${escapeHtml(session.token)}</strong> foi utilizado com sucesso.` : "A votação foi finalizada com sucesso."}
          Em instantes a aplicação retorna para a tela do mesário para iniciar um novo processo.
        </p>
        <div class="vote-highlight finish">FIM</div>
      </section>
    </main>
  `;
}

function renderAdminScreen() {
  const currentAccess = getCurrentAccess();
  if (!currentAccess || currentAccess.accessKind !== "ADMINISTRADOR") {
    uiState.screen = "login";
    return renderLoginScreen();
  }

  return `
    <main class="admin-shell">
      <section class="admin-layout">
        <header class="admin-header">
          <div>
            <span class="eyebrow">Área administrativa</span>
            <h1 class="headline" style="font-size: clamp(2rem, 3.2vw, 3.2rem); margin-bottom: 8px;">Gestão de mesários, chapas, tokens e resultados</h1>
            <p class="lead">Controle os acessos por unidade escolar, acompanhe as sessões geradas e consulte a apuração consolidada.</p>
          </div>
          <div class="actions-row">
            <div class="badge">${escapeHtml(currentAccess.email)}</div>
            <button class="btn btn-neutral" type="button" data-action="logout">Sair</button>
          </div>
        </header>

        <section class="summary-grid">
          ${renderAdminSummaryCards()}
        </section>

        <nav class="admin-tabs">
          ${renderTab("access", "Acessos")}
          ${renderTab("units", "Unidades")}
          ${renderTab("candidates", "Chapas")}
          ${renderTab("sessions", "Tokens")}
          ${renderTab("results", "Resultados")}
        </nav>

        ${renderAdminTabBody()}
      </section>
    </main>
  `;
}

function renderAdminSummaryCards() {
  const mesarios = appState.accessAccounts.filter((account) => account.accessKind === "MESARIO");
  const activeMesarios = mesarios.filter((account) => account.active).length;
  const pendingSessions = appState.votingSessions.filter((session) => session.status === "Aguardando").length;
  const usedSessions = appState.votingSessions.filter((session) => session.status === "Votou").length;
  const totalVotes = appState.votes.length;

  return [
    summaryCard("Mesários ativos", activeMesarios, "Acessos operacionais habilitados por unidade escolar."),
    summaryCard("Tokens aguardando", pendingSessions, "Sessões abertas que ainda não foram consumidas."),
    summaryCard("Tokens utilizados", usedSessions, "Sessões que já concluíram uma votação."),
    summaryCard("Votos gravados", totalVotes, "Registros válidos, nulos e em branco."),
  ].join("");
}

function renderTab(tabKey, label) {
  return `<button class="tab ${uiState.adminTab === tabKey ? "active" : ""}" type="button" data-action="open-tab" data-value="${tabKey}">${label}</button>`;
}

function renderAdminTabBody() {
  if (uiState.adminTab === "access") {
    return renderAccessTab();
  }
  if (uiState.adminTab === "units") {
    return renderUnitsTab();
  }
  if (uiState.adminTab === "candidates") {
    return renderCandidatesTab();
  }
  if (uiState.adminTab === "sessions") {
    return renderSessionsTab();
  }
  return renderResultsTab();
}

function renderAccessTab() {
  const editing = getActiveAccessEdit();
  const accounts = [...appState.accessAccounts].sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));

  if (uiState.accessEditorOpen) {
    return renderAccessEditorPage(editing);
  }

  return `
    <section class="candidate-list-page">
      <article class="form-card stack" hidden>
        <div>
          <h2 class="section-title">${editing ? "Editar acesso" : "Novo acesso"}</h2>
          <p class="subtle">Cadastre o administrador ou os mesários vinculados às unidades escolares.</p>
        </div>
        ${uiState.accessNotice ? `<div class="flash flash-neutral">${escapeHtml(uiState.accessNotice)}</div>` : ""}
        <form id="access-form" class="field-grid">
          <div class="field field-light">
            <label for="access-name">Nome do acesso</label>
            <input id="access-name" name="name" value="${escapeHtml(editing ? editing.name : "")}" placeholder="Ex.: Mesário 01" required>
          </div>
          <div class="field field-light">
            <label for="access-email">E-mail</label>
            <input id="access-email" name="email" type="email" value="${escapeHtml(editing ? editing.email : "")}" required>
          </div>
          <div class="field field-light">
            <label for="access-password">Senha</label>
            <input id="access-password" name="password" value="${escapeHtml(editing ? editing.password : "")}" required>
          </div>
          <div class="split-fields">
            <div class="field field-light">
              <label for="access-kind">Tipo de acesso</label>
              <select id="access-kind" name="accessKind">
                ${optionTag("ADMINISTRADOR", editing ? editing.accessKind : "MESARIO", "Administrador")}
                ${optionTag("MESARIO", editing ? editing.accessKind : "MESARIO", "Mesário")}
              </select>
            </div>
            <div class="field field-light">
              <label for="access-unit">Unidade escolar</label>
              <select id="access-unit" name="unitId">
                <option value="">Selecione</option>
                ${appState.units.map((unit) => optionTag(unit.id, editing ? editing.unitId : "", unit.name)).join("")}
              </select>
            </div>
          </div>
          <label class="status-strip">
            <span>
              <strong>Acesso ativo</strong><br>
              <span class="subtle">Contas inativas não conseguem entrar no sistema.</span>
            </span>
            <input type="checkbox" name="active" ${editing ? (editing.active ? "checked" : "") : "checked"}>
          </label>
          <div class="actions-row">
            <button class="btn btn-primary" type="submit">${editing ? "Salvar acesso" : "Criar acesso"}</button>
            <button class="btn btn-neutral" type="button" data-action="reset-form" data-value="access">Limpar formulário</button>
          </div>
        </form>
      </article>

      <article class="table-card stack">
        <div class="status-strip">
          <span>
            <strong>Lista de acessos</strong><br>
            <span class="subtle">Cada mesário deve estar vinculado à unidade escolar que filtrará as chapas na urna.</span>
          </span>
          <button class="btn btn-neutral" type="button" data-action="new-access">Novo acesso</button>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Tipo</th>
                <th>Unidade</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              ${accounts
                .map((account) => {
                  const unit = getUnitById(account.unitId);
                  return `
                    <tr>
                      <td><strong>${escapeHtml(account.name)}</strong></td>
                      <td>${escapeHtml(account.email)}</td>
                      <td>${escapeHtml(account.accessKind === "ADMINISTRADOR" ? "Administrador" : "Mesário")}</td>
                      <td>${unit ? escapeHtml(unit.name) : "-"}</td>
                      <td><span class="pill ${account.active ? "pill-voted" : "pill-inactive"}">${account.active ? "Ativo" : "Inativo"}</span></td>
                      <td>
                        <div class="inline-actions">
                          <button class="btn btn-neutral" type="button" data-action="edit-access" data-value="${account.id}">Editar</button>
                          <button class="btn ${account.active ? "btn-danger" : "btn-success"}" type="button" data-action="toggle-access" data-value="${account.id}">
                            ${account.active ? "Desativar" : "Ativar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  `;
                })
                .join("")}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  `;
}

function renderAccessEditorPage(editing) {
  return `
    <section class="candidate-editor-page">
      <article class="form-card stack">
        <div class="status-strip">
          <span>
            <strong>${editing ? "Editar acesso" : "Novo acesso"}</strong><br>
            <span class="subtle">Cadastre o administrador ou os mesários vinculados às unidades escolares.</span>
          </span>
          <button class="btn btn-neutral" type="button" data-action="close-access-editor">Voltar para acessos</button>
        </div>
        ${uiState.accessNotice ? `<div class="flash flash-neutral">${escapeHtml(uiState.accessNotice)}</div>` : ""}
        <form id="access-form" class="field-grid">
          <div class="field field-light">
            <label for="access-name">Nome do acesso</label>
            <input id="access-name" name="name" value="${escapeHtml(editing ? editing.name : "")}" placeholder="Ex.: Mesário 01" required>
          </div>
          <div class="field field-light">
            <label for="access-email">E-mail</label>
            <input id="access-email" name="email" type="email" value="${escapeHtml(editing ? editing.email : "")}" required>
          </div>
          <div class="field field-light">
            <label for="access-password">Senha</label>
            <input id="access-password" name="password" value="${escapeHtml(editing ? editing.password : "")}" required>
          </div>
          <div class="split-fields">
            <div class="field field-light">
              <label for="access-kind">Tipo de acesso</label>
              <select id="access-kind" name="accessKind">
                ${optionTag("ADMINISTRADOR", editing ? editing.accessKind : "MESARIO", "Administrador")}
                ${optionTag("MESARIO", editing ? editing.accessKind : "MESARIO", "Mesário")}
              </select>
            </div>
            <div class="field field-light">
              <label for="access-unit">Unidade escolar</label>
              <select id="access-unit" name="unitId">
                <option value="">Selecione</option>
                ${appState.units.map((unit) => optionTag(unit.id, editing ? editing.unitId : "", unit.name)).join("")}
              </select>
            </div>
          </div>
          <label class="status-strip">
            <span>
              <strong>Acesso ativo</strong><br>
              <span class="subtle">Contas inativas não conseguem entrar no sistema.</span>
            </span>
            <input type="checkbox" name="active" ${editing ? (editing.active ? "checked" : "") : "checked"}>
          </label>
          <div class="actions-row">
            <button class="btn btn-primary" type="submit">${editing ? "Salvar acesso" : "Criar acesso"}</button>
            <button class="btn btn-neutral" type="button" data-action="close-access-editor">Cancelar</button>
          </div>
        </form>
      </article>
    </section>
  `;
}

function renderUnitsTab() {
  const units = [...appState.units].sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));
  const editing = getActiveUnitEdit();

  if (uiState.unitEditorOpen) {
    return renderUnitEditorPage(editing);
  }

  return renderUnitListPage(units);

  return `
    <section class="table-card stack">
      <div class="status-strip">
        <span>
          <strong>Perfil das unidades</strong><br>
          <span class="subtle">A tipologia da unidade define a composição das chapas cadastradas para ela.</span>
        </span>
      </div>
      ${uiState.accessNotice ? `<div class="flash flash-neutral">${escapeHtml(uiState.accessNotice)}</div>` : ""}
      <form id="units-form" class="stack">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Unidade escolar</th>
                <th>Tipologia</th>
                <th>Composição da chapa</th>
              </tr>
            </thead>
            <tbody>
              ${units
                .map((unit) => {
                  const typology = getTypology(unit.typology);
                  return `
                    <tr>
                      <td><strong>${escapeHtml(unit.name)}</strong></td>
                      <td>
                        <select name="typology:${escapeHtml(unit.id)}" class="table-select">
                          ${UNIT_TYPOLOGIES.map((item) => optionTag(item.value, typology.value, item.label)).join("")}
                        </select>
                      </td>
                      <td>${escapeHtml(typology.roles.join(", "))}</td>
                    </tr>
                  `;
                })
                .join("")}
            </tbody>
          </table>
        </div>
        <div class="actions-row">
          <button class="btn btn-primary" type="submit">Salvar tipologias</button>
        </div>
      </form>
    </section>
  `;
}

function renderUnitListPage(units) {
  return `
    <section class="candidate-list-page">
      <article class="table-card stack">
        <div class="status-strip">
          <span>
            <strong>Perfil das unidades</strong><br>
            <span class="subtle">A tipologia da unidade define a composição das chapas cadastradas para ela.</span>
          </span>
        </div>
        ${uiState.accessNotice ? `<div class="flash flash-neutral">${escapeHtml(uiState.accessNotice)}</div>` : ""}
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Unidade escolar</th>
                <th>Tipologia</th>
                <th>Composição da chapa</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              ${units
                .map((unit) => {
                  const typology = getTypology(unit.typology);
                  return `
                    <tr>
                      <td><strong>${escapeHtml(unit.name)}</strong></td>
                      <td>${escapeHtml(typology.label)}</td>
                      <td>${escapeHtml(typology.roles.join(", "))}</td>
                      <td>
                        <button class="btn btn-neutral" type="button" data-action="edit-unit" data-value="${escapeHtml(unit.id)}">Editar</button>
                      </td>
                    </tr>
                  `;
                })
                .join("")}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  `;
}

function renderUnitEditorPage(unit) {
  if (!unit) {
    return `
      <section class="candidate-editor-page">
        <article class="form-card stack">
          <div class="flash flash-neutral">Unidade não encontrada.</div>
          <button class="btn btn-neutral" type="button" data-action="close-unit-editor">Voltar para unidades</button>
        </article>
      </section>
    `;
  }

  const typology = getTypology(unit.typology);
  return `
    <section class="candidate-editor-page">
      <article class="form-card stack">
        <div class="status-strip">
          <span>
            <strong>Editar unidade</strong><br>
            <span class="subtle">${escapeHtml(unit.name)}</span>
          </span>
          <button class="btn btn-neutral" type="button" data-action="close-unit-editor">Voltar para unidades</button>
        </div>
        ${uiState.accessNotice ? `<div class="flash flash-neutral">${escapeHtml(uiState.accessNotice)}</div>` : ""}
        <form id="units-form" class="field-grid">
          <input type="hidden" name="unitId" value="${escapeHtml(unit.id)}">
          <div class="field field-light">
            <label for="unit-typology">Tipologia da unidade</label>
            <select id="unit-typology" name="typology">
              ${UNIT_TYPOLOGIES.map((item) => optionTag(item.value, typology.value, `${item.label} - ${item.roles.join(", ")}`)).join("")}
            </select>
          </div>
          <div class="release-note">
            Composição atual: <strong>${escapeHtml(typology.roles.join(", "))}</strong>
          </div>
          <div class="actions-row">
            <button class="btn btn-primary" type="submit">Salvar unidade</button>
            <button class="btn btn-neutral" type="button" data-action="close-unit-editor">Cancelar</button>
          </div>
        </form>
      </article>
    </section>
  `;
}

function renderCandidateMemberFields(candidate, typologyValue, draft) {
  const members = getCandidateMembers(candidate);
  const draftMembers = Array.isArray(draft?.members) ? draft.members : [];
  return candidateRoleLabels(typologyValue)
    .map((role, index) => {
      const member = members[index] || {};
      const draftMember = draftMembers[index] || {};
      return `
        <article class="candidate-member-card">
          <div class="candidate-member-fields">
            <div class="field field-light">
              <label for="member-name-${index}">${escapeHtml(role)}</label>
              <input id="member-name-${index}" name="memberName${index}" value="${escapeHtml(draftMember.name ?? member.name ?? "")}" placeholder="Nome completo" required>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderCandidateEditorPage(editing, selectedUnit, selectedTypology) {
  const draft = ensureCandidateDraft(editing);
  const currentPhoto = uiState.tempCandidatePhoto || (editing ? editing.photoData : "");
  const draftUnitId = draft.unitId || selectedUnit?.id || "";
  const draftTypology = draft.typology || selectedTypology;

  return `
    <section class="candidate-editor-page">
      <article class="form-card stack">
        <div class="status-strip">
          <span>
            <strong>${editing ? "Editar chapa" : "Nova chapa"}</strong><br>
            <span class="subtle">Cadastre a unidade, a tipologia e os integrantes que compõem a chapa.</span>
          </span>
          <button class="btn btn-neutral" type="button" data-action="close-candidate-editor">Voltar para chapas</button>
        </div>
        ${uiState.candidateNotice ? `<div class="flash flash-neutral">${escapeHtml(uiState.candidateNotice)}</div>` : ""}
        <form id="candidate-form" class="field-grid">
          <div class="split-fields">
            <div class="field field-light">
              <label for="candidate-number">Número</label>
              <input id="candidate-number" name="number" inputmode="numeric" maxlength="3" value="${escapeHtml(draft.number)}" placeholder="101" required>
            </div>
            <div class="field field-light">
              <label for="candidate-unit">Unidade escolar</label>
              <select id="candidate-unit" name="unitId">
                ${appState.units.map((unit) => optionTag(unit.id, draftUnitId, unit.name)).join("")}
              </select>
            </div>
          </div>
          <div class="release-note">
            Tipologia da unidade: <strong>${escapeHtml(getTypology(draftTypology).label)}</strong> - ${escapeHtml(getTypology(draftTypology).roles.join(", "))}
          </div>
          <div class="field field-light">
            <label for="candidate-name">Nome da chapa</label>
            <input id="candidate-name" name="name" value="${escapeHtml(draft.name)}" placeholder="Chapa Exemplo" required>
          </div>
          <div class="field field-light">
            <label for="candidate-photo">Foto da chapa</label>
            <input id="candidate-photo" type="file" accept="image/*">
          </div>
          ${currentPhoto ? `<img class="photo-preview" src="${currentPhoto}" alt="Prévia da chapa">` : ""}
          <div class="candidate-members">
            ${renderCandidateMemberFields(editing, draftTypology, draft)}
          </div>
          <div class="actions-row">
            <button class="btn btn-primary" type="submit">${editing ? "Salvar chapa" : "Cadastrar chapa"}</button>
            <button class="btn btn-neutral" type="button" data-action="close-candidate-editor">Cancelar</button>
          </div>
        </form>
      </article>
    </section>
  `;
}

function renderCandidateListPage(candidates) {
  return `
    <section class="candidate-list-page">
      <article class="table-card stack">
        <div class="status-strip">
          <span>
            <strong>Chapas cadastradas</strong><br>
            <span class="subtle">A unidade escolar é o filtro que determina quais opções aparecem na urna.</span>
          </span>
          <button class="btn btn-neutral" type="button" data-action="new-candidate">Nova chapa</button>
        </div>
        ${uiState.candidateNotice ? `<div class="flash flash-neutral">${escapeHtml(uiState.candidateNotice)}</div>` : ""}
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Unidade</th>
                <th>Número</th>
                <th>Tipologia</th>
                <th>Nome</th>
                <th>Integrantes</th>
                <th>Foto</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              ${candidates
                .map((candidate) => {
                  const unit = getUnitById(candidate.unitId);
                  return `
                    <tr>
                      <td>${unit ? escapeHtml(unit.name) : "-"}</td>
                      <td><strong>${escapeHtml(candidate.number)}</strong></td>
                      <td>${escapeHtml(getTypology(getCandidateTypology(candidate)).label)}</td>
                      <td>${escapeHtml(candidate.name)}</td>
                      <td>${getCandidateMembers(candidate).map((member) => `<strong>${escapeHtml(member.role)}</strong>: ${escapeHtml(member.name)}`).join("<br>")}</td>
                      <td><img class="photo-preview" style="max-width: 88px;" src="${candidate.photoData}" alt="Foto da chapa ${escapeHtml(candidate.name)}"></td>
                      <td>
                        <div class="inline-actions">
                          <button class="btn btn-neutral" type="button" data-action="edit-candidate" data-value="${candidate.id}">Editar</button>
                          <button class="btn btn-danger" type="button" data-action="delete-candidate" data-value="${candidate.id}">Remover</button>
                        </div>
                      </td>
                    </tr>
                  `;
                })
                .join("")}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  `;
}

function renderCandidatesTab() {
  const editing = getActiveCandidate();
  const currentPhoto = uiState.tempCandidatePhoto || (editing ? editing.photoData : "");
  const selectedUnitId = uiState.candidateDraftUnitId || (editing ? editing.unitId : "");
  const selectedUnit = selectedUnitId ? getUnitById(selectedUnitId) : appState.units[0];
  const selectedTypology = uiState.candidateDraftTypology || (editing ? getCandidateTypology(editing) : normalizeTypology(selectedUnit?.typology));
  const candidates = [...appState.candidates].sort((left, right) => {
    const unitCompare = (getUnitById(left.unitId)?.name || "").localeCompare(getUnitById(right.unitId)?.name || "", "pt-BR");
    return unitCompare || left.number.localeCompare(right.number);
  });

  if (uiState.candidateEditorOpen) {
    return renderCandidateEditorPage(editing, selectedUnit, selectedTypology);
  }

  return renderCandidateListPage(candidates);

  return `
    <section class="admin-grid">
      <article class="form-card stack">
        <div>
          <h2 class="section-title">${editing ? "Editar chapa" : "Nova chapa"}</h2>
          <p class="subtle">Cadastre a unidade, a tipologia e os integrantes que compõem a chapa.</p>
        </div>
        ${uiState.candidateNotice ? `<div class="flash flash-neutral">${escapeHtml(uiState.candidateNotice)}</div>` : ""}
        <form id="candidate-form" class="field-grid">
          <div class="split-fields">
            <div class="field field-light">
              <label for="candidate-number">Número</label>
              <input id="candidate-number" name="number" inputmode="numeric" maxlength="3" value="${escapeHtml(editing ? editing.number : "")}" placeholder="101" required>
            </div>
            <div class="field field-light">
              <label for="candidate-unit">Unidade escolar</label>
              <select id="candidate-unit" name="unitId">
                ${appState.units.map((unit) => optionTag(unit.id, selectedUnit ? selectedUnit.id : "", unit.name)).join("")}
              </select>
            </div>
            <div class="field field-light">
              <label for="candidate-typology">Tipologia da unidade</label>
              <select id="candidate-typology" name="typology">
                ${UNIT_TYPOLOGIES.map((tipology) => optionTag(tipology.value, selectedTypology, `${tipology.label} - ${tipology.roles.join(", ")}`)).join("")}
              </select>
            </div>
          </div>
          <div class="field field-light">
            <label for="candidate-name">Nome da chapa</label>
            <input id="candidate-name" name="name" value="${escapeHtml(editing ? editing.name : "")}" placeholder="Chapa Exemplo" required>
          </div>
          <div class="field field-light">
            <label for="candidate-photo">Foto da chapa</label>
            <input id="candidate-photo" type="file" accept="image/*">
          </div>
          ${currentPhoto ? `<img class="photo-preview" src="${currentPhoto}" alt="Prévia da chapa">` : ""}
          <div class="candidate-members">
            ${renderCandidateMemberFields(editing, selectedTypology)}
          </div>
          <div class="actions-row">
            <button class="btn btn-primary" type="submit">${editing ? "Salvar chapa" : "Cadastrar chapa"}</button>
            <button class="btn btn-neutral" type="button" data-action="reset-form" data-value="candidate">Limpar formulário</button>
          </div>
        </form>
      </article>

      <article class="table-card stack">
        <div class="status-strip">
          <span>
            <strong>Chapas cadastradas</strong><br>
            <span class="subtle">A unidade escolar é o filtro que determina quais opções aparecem na urna.</span>
          </span>
          <button class="btn btn-neutral" type="button" data-action="new-candidate">Nova chapa</button>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Unidade</th>
                <th>Número</th>
                <th>Tipologia</th>
                <th>Nome</th>
                <th>Integrantes</th>
                <th>Foto</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              ${candidates
                .map((candidate) => {
                  const unit = getUnitById(candidate.unitId);
                  return `
                    <tr>
                      <td>${unit ? escapeHtml(unit.name) : "-"}</td>
                      <td><strong>${escapeHtml(candidate.number)}</strong></td>
                      <td>${escapeHtml(getTypology(getCandidateTypology(candidate)).label)}</td>
                      <td>${escapeHtml(candidate.name)}</td>
                      <td>${getCandidateMembers(candidate).map((member) => `<strong>${escapeHtml(member.role)}</strong>: ${escapeHtml(member.name)}`).join("<br>")}</td>
                      <td><img class="photo-preview" style="max-width: 88px;" src="${candidate.photoData}" alt="Foto da chapa ${escapeHtml(candidate.name)}"></td>
                      <td>
                        <div class="inline-actions">
                          <button class="btn btn-neutral" type="button" data-action="edit-candidate" data-value="${candidate.id}">Editar</button>
                          <button class="btn btn-danger" type="button" data-action="delete-candidate" data-value="${candidate.id}">Remover</button>
                        </div>
                      </td>
                    </tr>
                  `;
                })
                .join("")}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  `;
}

function renderSessionsTab() {
  const sessions = [...appState.votingSessions].sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));

  return `
    <section class="table-card stack">
      <div class="status-strip">
        <span>
          <strong>Controle de tokens gerados</strong><br>
          <span class="subtle">Acompanhe quem gerou a sessão, em qual unidade escolar e se o token já foi consumido.</span>
        </span>
      </div>
      ${
        sessions.length
          ? `
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Data/hora</th>
                    <th>Mesário</th>
                    <th>Unidade</th>
                    <th>Perfil do votante</th>
                    <th>Token</th>
                    <th>Status</th>
                    <th>Uso</th>
                  </tr>
                </thead>
                <tbody>
                  ${sessions
                    .map(
                      (session) => `
                        <tr>
                          <td>${formatDateTime(session.createdAt)}</td>
                          <td>${escapeHtml(session.mesarioName)}<br><span class="subtle">${escapeHtml(session.mesarioEmail)}</span></td>
                          <td>${escapeHtml(session.unitName)}</td>
                          <td>${escapeHtml(session.voterType)}</td>
                          <td><code>${escapeHtml(session.token)}</code></td>
                          <td><span class="pill ${session.status === "Votou" ? "pill-voted" : "pill-awaiting"}">${session.status}</span></td>
                          <td>${session.usedAt ? formatDateTime(session.usedAt) : "-"}</td>
                        </tr>
                      `,
                    )
                    .join("")}
                </tbody>
              </table>
            </div>
          `
          : `<div class="empty-state">Nenhum token foi gerado até o momento.</div>`
      }
    </section>
  `;
}

function renderResultsTab() {
  const filteredVotes = appState.votes.filter((vote) => {
    const unitMatch = !uiState.resultUnitFilter || vote.unitId === uiState.resultUnitFilter;
    const typeMatch = !uiState.resultTypeFilter || vote.voterType === uiState.resultTypeFilter;
    return unitMatch && typeMatch;
  });

  const validVotes = filteredVotes.filter((vote) => isValidVoteType(vote.voteType));
  const blankVotes = filteredVotes.filter((vote) => vote.voteType === "Em Branco").length;
  const nullVotes = filteredVotes.filter((vote) => vote.voteType === "Nulo").length;
  const weightedValidVotes = validVotes.reduce((sum, vote) => sum + getVoteWeight(vote), 0);

  const totals = new Map();
  validVotes.forEach((vote) => {
    const key = `${vote.unitId}:${vote.candidateNumber}`;
    if (!totals.has(key)) {
      totals.set(key, {
        unitId: vote.unitId,
        candidateNumber: vote.candidateNumber,
        candidateName: vote.candidateName,
        count: 0,
        rawCount: 0,
      });
    }
    const item = totals.get(key);
    item.count += getVoteWeight(vote);
    item.rawCount += 1;
  });

  const sortedTotals = [...totals.values()].sort(
    (left, right) => right.count - left.count || left.candidateNumber.localeCompare(right.candidateNumber),
  );
  const maxCandidateVotes = sortedTotals.length ? Math.max(...sortedTotals.map((item) => item.count)) : 0;

  const unitTotals = new Map();
  filteredVotes.forEach((vote) => {
    const key = vote.unitId || vote.unitName || "sem-unidade";
    if (!unitTotals.has(key)) {
      unitTotals.set(key, {
        unitId: vote.unitId,
        unitName: vote.unitName || getUnitById(vote.unitId)?.name || "-",
        total: 0,
        valid: 0,
        weightedValid: 0,
        blank: 0,
        nullVotes: 0,
      });
    }

    const item = unitTotals.get(key);
    item.total += 1;
    if (isValidVoteType(vote.voteType)) {
      item.valid += 1;
      item.weightedValid += getVoteWeight(vote);
    } else if (vote.voteType === "Em Branco") {
      item.blank += 1;
    } else if (vote.voteType === "Nulo") {
      item.nullVotes += 1;
    }
  });

  const sortedUnitTotals = [...unitTotals.values()].sort(
    (left, right) => right.total - left.total || left.unitName.localeCompare(right.unitName, "pt-BR"),
  );

  return `
    <section class="stack">
      <article class="table-card stack">
        <div class="status-strip">
          <span>
            <strong>Filtros de apuração</strong><br>
            <span class="subtle">Refine a leitura por unidade escolar e perfil do votante.</span>
          </span>
          <div class="filters-row">
            <div class="field field-light" style="min-width: 220px;">
              <label for="results-unit-filter">Unidade escolar</label>
              <select id="results-unit-filter">
                <option value="">Todas</option>
                ${appState.units.map((unit) => optionTag(unit.id, uiState.resultUnitFilter, unit.name)).join("")}
              </select>
            </div>
            <div class="field field-light" style="min-width: 220px;">
              <label for="results-type-filter">Perfil do votante</label>
              <select id="results-type-filter">
                <option value="">Todos</option>
                ${VOTER_TYPES.map((type) => optionTag(type, uiState.resultTypeFilter, type)).join("")}
              </select>
            </div>
            <button class="btn btn-neutral" type="button" data-action="clear-filters">Limpar filtros</button>
          </div>
        </div>

        <section class="results-grid">
          ${summaryCard("Votos filtrados", filteredVotes.length, "Total de registros dentro dos filtros atuais.")}
          ${summaryCard("Válidos", validVotes.length, "Votos atribuídos a chapas da unidade do mesário.")}
          ${summaryCard("Peso válido", weightedValidVotes, "Soma ponderada: familiares e EJA valem 1; servidores valem 2.")}
          ${summaryCard("Em branco", blankVotes, "Registros confirmados sem número digitado.")}
          ${summaryCard("Nulos", nullVotes, "Números sem correspondência nas chapas da escola.")}
        </section>
      </article>

      <article class="table-card stack">
        <div>
          <h2 class="section-title">Gráfico por unidade e chapa</h2>
          <p class="subtle">Total ponderado por chapa, respeitando os filtros de unidade escolar e perfil.</p>
        </div>
        ${
          sortedTotals.length
            ? `
              <div class="results-chart">
                ${sortedTotals
                  .map((item) => {
                    const unitName = getUnitById(item.unitId)?.name || "-";
                    const width = maxCandidateVotes ? Math.max((item.count / maxCandidateVotes) * 100, 5) : 0;
                    return `
                      <article class="results-chart-row">
                        <div class="results-chart-copy">
                          <strong>${escapeHtml(unitName)}</strong>
                          <span>${escapeHtml(item.candidateNumber)} - ${escapeHtml(item.candidateName || "-")} | ${item.rawCount} voto(s)</span>
                        </div>
                        <div class="results-chart-track" aria-label="${escapeHtml(`${unitName} ${item.candidateNumber}`)}">
                          <div class="results-chart-bar" style="width: ${width.toFixed(2)}%"></div>
                        </div>
                        <strong class="results-chart-value">${item.count}</strong>
                      </article>
                    `;
                  })
                  .join("")}
              </div>
            `
            : `<div class="empty-state">Ainda não há votos válidos dentro dos filtros escolhidos.</div>`
        }
      </article>

      <article class="table-card stack">
        <div>
          <h2 class="section-title">Total por unidade de ensino</h2>
          <p class="subtle">Quantidade de votos por unidade dentro dos filtros atuais.</p>
        </div>
        ${
          sortedUnitTotals.length
            ? `
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Unidade</th>
                      <th>Total</th>
                      <th>Válidos</th>
                      <th>Peso válido</th>
                      <th>Em branco</th>
                      <th>Nulos</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${sortedUnitTotals
                      .map(
                        (item) => `
                          <tr>
                            <td>${escapeHtml(item.unitName)}</td>
                            <td><strong>${item.total}</strong></td>
                            <td>${item.valid}</td>
                            <td>${item.weightedValid}</td>
                            <td>${item.blank}</td>
                            <td>${item.nullVotes}</td>
                          </tr>
                        `,
                      )
                      .join("")}
                  </tbody>
                </table>
              </div>
            `
            : `<div class="empty-state">Nenhum voto encontrado para os filtros selecionados.</div>`
        }
      </article>

      <article class="table-card stack">
        <div>
          <h2 class="section-title">Total por chapa</h2>
          <p class="subtle">Total de votos ponderados por chapa conforme os filtros selecionados.</p>
        </div>
        ${
          sortedTotals.length
            ? `
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Unidade</th>
                      <th>Número</th>
                      <th>Chapa</th>
                      <th>Votos</th>
                      <th>Peso total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${sortedTotals
                      .map(
                        (item) => `
                          <tr>
                            <td>${escapeHtml(getUnitById(item.unitId)?.name || "-")}</td>
                            <td><strong>${escapeHtml(item.candidateNumber)}</strong></td>
                            <td>${escapeHtml(item.candidateName || "-")}</td>
                            <td>${item.rawCount}</td>
                            <td><strong>${item.count}</strong></td>
                          </tr>
                        `,
                      )
                      .join("")}
                  </tbody>
                </table>
              </div>
            `
            : `<div class="empty-state">Ainda não há votos válidos dentro dos filtros escolhidos.</div>`
        }
      </article>

      <article class="table-card stack">
        <div>
          <h2 class="section-title">Listagem detalhada de votos</h2>
          <p class="subtle">Cada linha mostra o token, o tipo do voto, a unidade, o perfil do votante e o mesário responsável pela sessão.</p>
        </div>
        ${
          filteredVotes.length
            ? `
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Data/hora</th>
                      <th>Token</th>
                      <th>Tipo do voto</th>
                      <th>Número</th>
                      <th>Chapa</th>
                      <th>Unidade</th>
                      <th>Perfil do votante</th>
                      <th>Peso</th>
                      <th>Mesário</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${filteredVotes
                      .map(
                        (vote) => `
                          <tr>
                            <td>${formatDateTime(vote.createdAt)}</td>
                            <td><code>${escapeHtml(vote.token)}</code></td>
                            <td>${escapeHtml(vote.voteType)}</td>
                            <td>${escapeHtml(vote.candidateNumber || "-")}</td>
                            <td>${escapeHtml(vote.candidateName || "-")}</td>
                            <td>${escapeHtml(vote.unitName)}</td>
                            <td>${escapeHtml(vote.voterType)}</td>
                            <td>${getVoteWeight(vote)}</td>
                            <td>${escapeHtml(vote.mesarioName)}<br><span class="subtle">${escapeHtml(vote.mesarioEmail)}</span></td>
                          </tr>
                        `,
                      )
                      .join("")}
                  </tbody>
                </table>
              </div>
            `
            : `<div class="empty-state">Nenhum voto encontrado para os filtros selecionados.</div>`
        }
      </article>
    </section>
  `;
}

function summaryCard(label, value) {
  return `
    <article class="summary-card">
      <small>${escapeHtml(label)}</small>
      <strong>${escapeHtml(value)}</strong>
    </article>
  `;
}

function optionTag(value, selectedValue, label) {
  return `<option value="${escapeHtml(value)}" ${value === selectedValue ? "selected" : ""}>${escapeHtml(label)}</option>`;
}

function slugify(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function makeId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function makeUniqueToken() {
  return makeUniqueTokenFromState(appState);
}

function makeUniqueTokenFromState(state) {
  let token = "";
  do {
    token = randomToken();
  } while (state.votingSessions.some((session) => session.token === token));
  return token;
}

function randomToken() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(8);
  if (window.crypto && typeof window.crypto.getRandomValues === "function") {
    window.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 255);
    }
  }

  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join("");
}

function formatDateTime(isoString) {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "medium",
    }).format(new Date(isoString));
  } catch (error) {
    return isoString;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
