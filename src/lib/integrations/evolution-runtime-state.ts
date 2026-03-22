import QRCode from "qrcode";

export interface EvolutionRuntimeState {
  connected: boolean;
  state: string;
  qrCode: string | null;
  qrCodeRaw: string | null;
  phoneNumber: string | null;
  name: string | null;
  lastDisconnectReason: number | null;
  lastDisconnectError: string | null;
  lastUpdatedAt: number | null;
}

const defaultState: EvolutionRuntimeState = {
  connected: false,
  state: "close",
  qrCode: null,
  qrCodeRaw: null,
  phoneNumber: null,
  name: null,
  lastDisconnectReason: null,
  lastDisconnectError: null,
  lastUpdatedAt: null,
};

const globalForEvolutionState = globalThis as typeof globalThis & {
  __evolutionRuntimeState?: EvolutionRuntimeState;
};

function getMutableState() {
  if (!globalForEvolutionState.__evolutionRuntimeState) {
    globalForEvolutionState.__evolutionRuntimeState = { ...defaultState };
  }
  return globalForEvolutionState.__evolutionRuntimeState;
}

export function getEvolutionRuntimeState() {
  return { ...getMutableState() };
}

export function clearEvolutionRuntimeState() {
  globalForEvolutionState.__evolutionRuntimeState = { ...defaultState, lastUpdatedAt: Date.now() };
  return getEvolutionRuntimeState();
}

export async function updateEvolutionRuntimeState(
  patch: Partial<Omit<EvolutionRuntimeState, "qrCode">> & { qrCodeRaw?: string | null }
) {
  const state = getMutableState();
  Object.assign(state, patch, { lastUpdatedAt: Date.now() });

  if (patch.qrCodeRaw !== undefined) {
    state.qrCodeRaw = patch.qrCodeRaw;
    if (patch.qrCodeRaw) {
      try {
        state.qrCode = await QRCode.toDataURL(patch.qrCodeRaw, {
          width: 300,
          margin: 2,
          color: { dark: "#000000", light: "#FFFFFF" },
        });
      } catch {
        state.qrCode = null;
      }
    } else {
      state.qrCode = null;
    }
  }

  if (patch.connected === true) {
    state.qrCodeRaw = null;
    state.qrCode = null;
    state.lastDisconnectReason = null;
    state.lastDisconnectError = null;
  }

  return getEvolutionRuntimeState();
}
