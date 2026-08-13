import {
  createEmptyElectionState,
  runElectionStateTransaction,
  subscribeToElectionState,
} from "./firebase-store.js";

const BOOTH_UNIT_KEY = "urna-escolar-booth-unit";
const FINISH_DELAY_MS = 2600;
const TECH_LOGO_SRC = "./assets/logo-detic.png";
const MUNICIPAL_LOGO_SRC = "./assets/logo-municipal.png";
const FINISH_SOUND_URL = "./assets/urna-final.mp3";

const appRoot = document.querySelector("#app");
const uiState = {
  selectedUnitId: getInitialUnitId(),
  ballotDigits: "",
  ballotBlank: false,
  ballotAlert: "",
  finishMessage: "",
};

let appState = createEmptyElectionState();
let finishTimer = null;
let isStateReady = false;
let isSeedCheckComplete = false;
let stateSyncError = "";

document.addEventListener("keydown", handleGlobalKeydown);
appRoot.addEventListener("click", handleClick);
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
      stateSyncError = "Nao foi possivel sincronizar a urna com o Firestore.";
      console.error(error);
      renderApp();
    },
  });

  isSeedCheckComplete = true;
  renderApp();
}

function getInitialUnitId() {
  const queryUnit = new URLSearchParams(window.location.search).get("unit");
  if (queryUnit) {
    localStorage.setItem(BOOTH_UNIT_KEY, queryUnit);
    return queryUnit;
  }
  return localStorage.getItem(BOOTH_UNIT_KEY) || "";
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return {
      units: [],
      candidates: [],
      boothAssignments: [],
      votingSessions: [],
      votes: [],
    };
  }

  try {
    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      !Array.isArray(parsed.units) ||
      !Array.isArray(parsed.candidates) ||
      !Array.isArray(parsed.boothAssignments) ||
      !Array.isArray(parsed.votingSessions) ||
      !Array.isArray(parsed.votes)
    ) {
      throw new Error("Estado inválido.");
    }
    return parsed;
  } catch (error) {
    return {
      units: [],
      candidates: [],
      boothAssignments: [],
      votingSessions: [],
      votes: [],
    };
  }
}

function persistState(nextState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
}

function handleExternalStateChange(event) {
  if (event.key !== STORAGE_KEY) {
    return;
  }

  appState = loadState();
  renderApp();
}

function handleGlobalKeydown(event) {
  if (!getLiveSessionForUnit(uiState.selectedUnitId) || uiState.finishMessage) {
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

  if (action === "digit") {
    pushDigit(value);
  } else if (action === "blank") {
    markBlank();
  } else if (action === "correct") {
    clearBallot();
  } else if (action === "confirm") {
    confirmVote();
  }
}

function handleChange(event) {
  const target = event.target;
  if (!(target instanceof HTMLSelectElement)) {
    return;
  }

  if (target.id === "booth-unit-select") {
    uiState.selectedUnitId = target.value;
    localStorage.setItem(BOOTH_UNIT_KEY, target.value);
    uiState.finishMessage = "";
    resetBallotState();
    renderApp();
  }
}

function getUnitById(unitId) {
  return appState.units.find((unit) => unit.id === unitId) || null;
}

function getBoothAssignmentForUnit(unitId) {
  return appState.boothAssignments.find((assignment) => assignment.unitId === unitId) || null;
}

function getLiveSessionForUnit(unitId) {
  const assignment = getBoothAssignmentForUnit(unitId);
  if (!assignment) {
    return null;
  }

  const session = appState.votingSessions.find((item) => item.id === assignment.sessionId) || null;
  if (!session || session.status !== "Liberado") {
    return null;
  }

  return session;
}

function getCurrentCandidate() {
  const session = getLiveSessionForUnit(uiState.selectedUnitId);
  if (!session || uiState.ballotDigits.length !== 3) {
    return null;
  }

  return (
    appState.candidates.find(
      (candidate) => candidate.unitId === session.unitId && candidate.number === uiState.ballotDigits,
    ) || null
  );
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

function resetBallotState() {
  uiState.ballotDigits = "";
  uiState.ballotBlank = false;
  uiState.ballotAlert = "";
}

async function confirmVote() {
  const session = getLiveSessionForUnit(uiState.selectedUnitId);
  if (!session) {
    uiState.ballotAlert = "Aguardando liberaÃ§Ã£o do mesÃ¡rio.";
    renderApp();
    return;
  }

  const candidate = getCurrentCandidate();
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
      const assignment = draftState.boothAssignments.find((item) => item.unitId === uiState.selectedUnitId) || null;
      if (!assignment) {
        return { status: "missing" };
      }

      const latestSession = draftState.votingSessions.find((item) => item.id === assignment.sessionId) || null;
      if (!latestSession || latestSession.status !== "Liberado") {
        return { status: "missing" };
      }

      if (draftState.votes.some((vote) => vote.sessionId === latestSession.id)) {
        return {
          status: "already-used",
          token: latestSession.token,
        };
      }

      const now = new Date().toISOString();
      draftState.votes.unshift({
        id: makeId(),
        sessionId: latestSession.id,
        token: latestSession.token,
        createdAt: now,
        candidateNumber,
        candidateName,
        voteType,
        voterType: latestSession.voterType,
        unitId: latestSession.unitId,
        unitName: latestSession.unitName,
        mesarioName: latestSession.mesarioName,
        mesarioEmail: latestSession.mesarioEmail,
      });

      latestSession.status = "Votou";
      latestSession.usedAt = now;
      draftState.boothAssignments = draftState.boothAssignments.filter(
        (item) => item.unitId !== latestSession.unitId,
      );

      return {
        status: "success",
        token: latestSession.token,
        voterType: latestSession.voterType,
      };
    });

    if (result.status === "missing") {
      uiState.ballotAlert = "Aguardando liberaÃ§Ã£o do mesÃ¡rio.";
      renderApp();
      return;
    }

    if (result.status === "already-used") {
      uiState.ballotAlert = `O token ${result.token} jÃ¡ foi utilizado.`;
      renderApp();
      return;
    }

    playBallotFinishSound();
    resetBallotState();
    uiState.finishMessage = `Token ${result.token} finalizado para ${result.voterType}.`;
    renderApp();

    clearTimeout(finishTimer);
    finishTimer = window.setTimeout(() => {
      uiState.finishMessage = "";
      renderApp();
    }, FINISH_DELAY_MS);
  } catch (error) {
    uiState.ballotAlert = "Nao foi possivel registrar o voto no Firestore.";
    console.error(error);
    renderApp();
  }
}

function confirmVoteLegacy() {
  const session = getLiveSessionForUnit(uiState.selectedUnitId);
  if (!session) {
    uiState.ballotAlert = "Aguardando liberação do mesário.";
    renderApp();
    return;
  }

  const candidate = getCurrentCandidate();
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

  const now = new Date().toISOString();
  appState.votes.unshift({
    id: makeId(),
    sessionId: session.id,
    token: session.token,
    createdAt: now,
    candidateNumber,
    candidateName,
    voteType,
    voterType: session.voterType,
    unitId: session.unitId,
    unitName: session.unitName,
    mesarioName: session.mesarioName,
    mesarioEmail: session.mesarioEmail,
  });

  session.status = "Votou";
  session.usedAt = now;
  appState.boothAssignments = appState.boothAssignments.filter((assignment) => assignment.unitId !== session.unitId);
  persistState(appState);

  playBallotFinishSound();
  resetBallotState();
  uiState.finishMessage = `Token ${session.token} finalizado para ${session.voterType}.`;
  renderApp();

  clearTimeout(finishTimer);
  finishTimer = window.setTimeout(() => {
    uiState.finishMessage = "";
    renderApp();
  }, FINISH_DELAY_MS);
}

function playBallotFinishSound() {
  const sound = new Audio(FINISH_SOUND_URL);
  sound.play().catch(() => {});
}

function renderApp() {
  if (stateSyncError) {
    appRoot.innerHTML = renderAppFrame(renderStatusScreen("Falha na sincronizacao", stateSyncError));
    return;
  }

  if (!isStateReady || !isSeedCheckComplete) {
    appRoot.innerHTML = renderAppFrame(
      renderStatusScreen("Conectando ao Firestore", "A urna esta carregando os dados em tempo real."),
    );
    return;
  }

  if (!uiState.selectedUnitId || !getUnitById(uiState.selectedUnitId)) {
    appRoot.innerHTML = renderAppFrame(renderUnitChooserScreen());
    return;
  }

  if (uiState.finishMessage) {
    appRoot.innerHTML = renderAppFrame(renderFinishScreen());
    return;
  }

  const liveSession = getLiveSessionForUnit(uiState.selectedUnitId);
  if (!liveSession) {
    appRoot.innerHTML = renderAppFrame(renderWaitingScreen());
    return;
  }

  appRoot.innerHTML = renderAppFrame(renderBallotScreen(liveSession));
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
  return `
    <div class="brand-frame">
      <header class="brand-header">
        <div class="brand-header-inner">
          <img class="brand-logo municipal" src="${MUNICIPAL_LOGO_SRC}" alt="Logotipo Secretaria de Educação de Uberaba">
          <img class="brand-logo tech" src="${TECH_LOGO_SRC}" alt="Logotipo Departamento de Educação Tecnológica">
        </div>
      </header>
      ${content}
      <footer class="brand-footer">
        <div class="brand-footer-inner">
          <img class="brand-logo-footer tech" src="${TECH_LOGO_SRC}" alt="Logotipo Departamento de Educação Tecnológica">
          <img class="brand-logo-footer municipal" src="${MUNICIPAL_LOGO_SRC}" alt="Logotipo Secretaria de Educação de Uberaba">
        </div>
      </footer>
    </div>
  `;
}

function renderUnitChooserScreen() {
  return `
    <main class="shell-simple">
      <section class="panel">
        <span class="eyebrow">Configuração da urna</span>
        <h1 class="panel-title">Esta urna precisa ser aberta pela tela do mesário</h1>
        <p class="lead">Abra a aba da urna a partir do botão da unidade na área do mesário para vinculá-la corretamente e deixá-la aguardando liberação.</p>
      </section>
    </main>
  `;
}

function renderWaitingScreen() {
  const unit = getUnitById(uiState.selectedUnitId);
  const unitCandidates = appState.candidates
    .filter((candidate) => candidate.unitId === uiState.selectedUnitId)
    .sort((left, right) => left.number.localeCompare(right.number));

  return `
    <main class="urna-shell">
      <div class="urna-topbar">
        <div class="badge">Urna em espera</div>
        <div class="badge">${unit ? escapeHtml(unit.name) : "Unidade não identificada"}</div>
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
                (candidate) => `
                  <article class="candidate-list-item">
                    <img class="candidate-list-photo" src="${candidate.photoData}" alt="Foto da chapa ${escapeHtml(candidate.name)}">
                    <div class="candidate-list-copy">
                      <strong>${escapeHtml(candidate.number)}</strong>
                      <span>${escapeHtml(candidate.name)}</span>
                    </div>
                  </article>
                `,
              )
              .join("")}
          </div>
        </aside>

        <div class="urna-display urna-waiting-display">
          <p class="subtle">URNA PRONTA</p>
          <h1 class="panel-title">${unit ? escapeHtml(unit.officeTitle) : "DIRETOR"}</h1>
          <div class="vote-highlight blank">AGUARDANDO LIBERAÇÃO</div>
          <p class="lead" style="margin-top: 18px;">
            Esta aba permanece aberta para a <strong>${unit ? escapeHtml(unit.name) : "unidade selecionada"}</strong>.
            Quando o mesário liberar um token, a votação será exibida automaticamente aqui.
          </p>
        </div>

        <aside class="urna-keypad">
          <p>Urna bloqueada</p>
          <div class="keyboard-note">
            O teclado e os botões só são habilitados depois da liberação do mesário na outra aba.
          </div>
        </aside>
      </section>
    </main>
  `;
}

function renderBallotScreen(session) {
  const unit = getUnitById(session.unitId);
  const candidate = getCurrentCandidate();
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
        <div class="badge">Unidade: ${unit ? escapeHtml(unit.name) : "Sem unidade"}</div>
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
              .map((digit) => `<div class="digit-box ${digit ? "" : "empty"}">${digit || ""}</div>`)
              .join("")}
          </div>
          <div class="candidate-meta">${candidateContent}</div>
          ${uiState.ballotAlert ? `<div class="flash flash-neutral">${escapeHtml(uiState.ballotAlert)}</div>` : ""}
          <div class="urna-footer">
            <div>
              <strong>Unidade atual</strong>
              <p class="subtle">${unit ? escapeHtml(unit.name) : "Unidade não identificada"}</p>
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
  return `
    <main class="shell-simple">
      <section class="panel">
        <span class="eyebrow">Registro concluído</span>
        <h1 class="panel-title">FIM</h1>
        <p class="lead">${escapeHtml(uiState.finishMessage)} Em instantes, esta urna volta para o modo de espera.</p>
        <div class="vote-highlight finish">FIM</div>
      </section>
    </main>
  `;
}

function optionTag(value, selectedValue, label) {
  return `<option value="${escapeHtml(value)}" ${value === selectedValue ? "selected" : ""}>${escapeHtml(label)}</option>`;
}

function makeId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
