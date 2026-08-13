import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import {
  getAnalytics,
  isSupported as isAnalyticsSupported,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import {
  doc,
  getFirestore,
  onSnapshot,
  runTransaction,
  setDoc,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDUGSaaW_z4NQxqzXH90MQlijElNHDNuTw",
  authDomain: "votacao-diretores2026.firebaseapp.com",
  projectId: "votacao-diretores2026",
  storageBucket: "votacao-diretores2026.firebasestorage.app",
  messagingSenderId: "312627708775",
  appId: "1:312627708775:web:186f3e944bf962c756a5c2",
  measurementId: "G-JY04QMQ9D3",
};

const STATE_COLLECTION = "urnaState";
const LEGACY_DOCUMENT_ID = "current";
const REGISTRY_DOCUMENT_ID = "chapas";
const VOTING_DOCUMENT_ID = "votacao";
const firestore = getFirestore(initializeApp(firebaseConfig));
const legacyStateRef = doc(firestore, STATE_COLLECTION, LEGACY_DOCUMENT_ID);
const registryStateRef = doc(firestore, STATE_COLLECTION, REGISTRY_DOCUMENT_ID);
const votingStateRef = doc(firestore, STATE_COLLECTION, VOTING_DOCUMENT_ID);

export const firebaseServices = {
  app: firestore.app,
  auth: getAuth(firestore.app),
  firestore,
  database: getDatabase(firestore.app),
  analytics: null,
};

window.firebaseServices = firebaseServices;

try {
  if (await isAnalyticsSupported()) {
    firebaseServices.analytics = getAnalytics(firebaseServices.app);
  }
} catch (error) {
  console.warn("Nao foi possivel inicializar o Firebase Analytics.", error);
}

export function createEmptyElectionState() {
  return {
    settings: {
      title: "Urna Escolar",
    },
    units: [],
    accessAccounts: [],
    candidates: [],
    boothAssignments: [],
    votingSessions: [],
    votes: [],
  };
}

function normalizeElectionState(rawState) {
  const emptyState = createEmptyElectionState();
  if (!rawState || typeof rawState !== "object") {
    return emptyState;
  }

  return {
    settings:
      rawState.settings && typeof rawState.settings === "object"
        ? {
            ...emptyState.settings,
            ...rawState.settings,
          }
        : emptyState.settings,
    units: Array.isArray(rawState.units) ? rawState.units : [],
    accessAccounts: Array.isArray(rawState.accessAccounts) ? rawState.accessAccounts : [],
    candidates: Array.isArray(rawState.candidates) ? rawState.candidates : [],
    boothAssignments: Array.isArray(rawState.boothAssignments) ? rawState.boothAssignments : [],
    votingSessions: Array.isArray(rawState.votingSessions) ? rawState.votingSessions : [],
    votes: Array.isArray(rawState.votes) ? rawState.votes : [],
  };
}

function splitElectionState(state) {
  const normalized = normalizeElectionState(state);
  return {
    registry: {
      settings: normalized.settings,
      units: normalized.units,
      accessAccounts: normalized.accessAccounts,
      candidates: normalized.candidates,
    },
    voting: {
      boothAssignments: normalized.boothAssignments,
      votingSessions: normalized.votingSessions,
      votes: normalized.votes,
    },
  };
}

function mergeElectionState(registryState, votingState) {
  const emptyState = createEmptyElectionState();
  return normalizeElectionState({
    ...emptyState,
    ...(registryState && typeof registryState === "object" ? registryState : {}),
    ...(votingState && typeof votingState === "object" ? votingState : {}),
  });
}

function cloneElectionState(state) {
  return JSON.parse(JSON.stringify(state));
}

function stampRegistryState(state) {
  const { registry } = splitElectionState(state);
  return {
    ...registry,
    updatedAt: new Date().toISOString(),
  };
}

function stampVotingState(state) {
  const { voting } = splitElectionState(state);
  return {
    ...voting,
    updatedAt: new Date().toISOString(),
  };
}

export async function ensureElectionSeed(seedState) {
  await runTransaction(firebaseServices.firestore, async (transaction) => {
    const registrySnapshot = await transaction.get(registryStateRef);
    const votingSnapshot = await transaction.get(votingStateRef);
    if (registrySnapshot.exists() && votingSnapshot.exists()) {
      return;
    }

    const legacySnapshot = await transaction.get(legacyStateRef);
    const sourceState = legacySnapshot.exists()
      ? normalizeElectionState(legacySnapshot.data())
      : normalizeElectionState(seedState);

    if (!registrySnapshot.exists()) {
      transaction.set(registryStateRef, {
        ...stampRegistryState(sourceState),
        seededAt: new Date().toISOString(),
      });
    }

    if (!votingSnapshot.exists()) {
      transaction.set(votingStateRef, {
        ...stampVotingState(sourceState),
        seededAt: new Date().toISOString(),
      });
    }
  });
}

export function subscribeToElectionState({ onChange, onReady, onError }) {
  let didSignalReady = false;
  let latestRegistryState = null;
  let latestVotingState = null;
  let hasRegistrySnapshot = false;
  let hasVotingSnapshot = false;

  function emitIfReady() {
    if (!hasRegistrySnapshot || !hasVotingSnapshot) {
      return;
    }

    const nextState = mergeElectionState(latestRegistryState, latestVotingState);
    onChange(nextState);

    if (!didSignalReady) {
      didSignalReady = true;
      if (typeof onReady === "function") {
        onReady(nextState);
      }
    }
  }

  const unsubscribeRegistry = onSnapshot(
    registryStateRef,
    (snapshot) => {
      latestRegistryState = snapshot.exists() ? snapshot.data() : {};
      hasRegistrySnapshot = true;
      emitIfReady();
    },
    (error) => {
      if (typeof onError === "function") {
        onError(error);
      }
    },
  );

  const unsubscribeVoting = onSnapshot(
    votingStateRef,
    (snapshot) => {
      latestVotingState = snapshot.exists() ? snapshot.data() : {};
      hasVotingSnapshot = true;
      emitIfReady();
    },
    (error) => {
      if (typeof onError === "function") {
        onError(error);
      }
    },
  );

  return () => {
    unsubscribeRegistry();
    unsubscribeVoting();
  };
}

export async function replaceElectionState(nextState) {
  await Promise.all([
    setDoc(registryStateRef, stampRegistryState(nextState)),
    setDoc(votingStateRef, stampVotingState(nextState)),
  ]);
}

export async function runElectionStateTransaction(mutator) {
  return runTransaction(firebaseServices.firestore, async (transaction) => {
    const registrySnapshot = await transaction.get(registryStateRef);
    const votingSnapshot = await transaction.get(votingStateRef);
    const currentState = mergeElectionState(
      registrySnapshot.exists() ? registrySnapshot.data() : {},
      votingSnapshot.exists() ? votingSnapshot.data() : {},
    );
    const draftState = cloneElectionState(currentState);
    const result = await mutator(draftState, currentState);

    transaction.set(registryStateRef, stampRegistryState(draftState));
    transaction.set(votingStateRef, stampVotingState(draftState));
    return result;
  });
}
