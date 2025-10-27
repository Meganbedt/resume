import type { Eip1193Provider } from "ethers";
import { RelayerSDKLoader } from "./RelayerSDKLoader";

type FhevmInitSDKOptions = { apiKey?: string } | undefined;
type FhevmLoadSDKType = () => Promise<void>;
type FhevmInitSDKType = (options?: FhevmInitSDKOptions) => Promise<true>;

export type FhevmInstance = any;

type FhevmRelayerSDKType = {
  initSDK: FhevmInitSDKType;
  createInstance: (config: any) => Promise<FhevmInstance>;
  SepoliaConfig: any;
  __initialized__?: boolean;
};
type FhevmWindowType = Window & { relayerSDK: FhevmRelayerSDKType };

export type FhevmRelayerStatusType =
  | "idle"
  | "sdk-loading"
  | "sdk-loaded"
  | "sdk-initializing"
  | "sdk-initialized"
  | "creating";

const isFhevmWindowType = (w: any, trace?: (...a: unknown[]) => void): w is FhevmWindowType => {
  const ok = w && typeof w === "object" && "relayerSDK" in w && typeof (w as any).relayerSDK.initSDK === "function";
  if (!ok && trace) trace("window.relayerSDK invalid");
  return ok;
};

const isFhevmInitialized = () => {
  if (!isFhevmWindowType(window, console.log)) {
    return false;
  }
  return (window as unknown as FhevmWindowType).relayerSDK.__initialized__ === true;
};

const fhevmLoadSDK: FhevmLoadSDKType = () => {
  const loader = new RelayerSDKLoader({ trace: console.log });
  return loader.load();
};

const fhevmInitSDK: FhevmInitSDKType = async (options?: FhevmInitSDKOptions) => {
  if (!isFhevmWindowType(window, console.log)) {
    throw new Error("window.relayerSDK is not available");
  }
  const result = await (window as unknown as FhevmWindowType).relayerSDK.initSDK(options);
  (window as unknown as FhevmWindowType).relayerSDK.__initialized__ = result;
  if (!result) {
    throw new Error("window.relayerSDK.initSDK failed.");
  }
  return true;
};

type MockResolveResult = { isMock: true; chainId: number; rpcUrl: string };
type GenericResolveResult = { isMock: false; chainId: number; rpcUrl?: string };
type ResolveResult = MockResolveResult | GenericResolveResult;

async function getChainId(providerOrUrl: Eip1193Provider | string): Promise<number> {
  if (typeof providerOrUrl === "string") {
    // default mock chainId for localhost
    return 31337;
  }
  const idHex = await providerOrUrl.request({ method: "eth_chainId", params: [] });
  return parseInt(idHex as string, 16);
}

async function resolve(providerOrUrl: Eip1193Provider | string, mockChains?: Record<number, string>): Promise<ResolveResult> {
  const chainId = await getChainId(providerOrUrl);
  let rpcUrl = typeof providerOrUrl === "string" ? providerOrUrl : undefined;

  const _mockChains: Record<number, string> = {
    31337: "http://localhost:8545",
    ...(mockChains ?? {}),
  };

  if (Object.prototype.hasOwnProperty.call(_mockChains, chainId)) {
    if (!rpcUrl) {
      rpcUrl = _mockChains[chainId];
    }
    return { isMock: true, chainId, rpcUrl };
  }

  return { isMock: false, chainId, rpcUrl };
}

async function tryFetchFHEVMHardhatNodeRelayerMetadata(rpcUrl: string | undefined) {
  if (!rpcUrl) return undefined;
  try {
    const resp = await fetch(`${rpcUrl}/fhevm/relayer-metadata`);
    if (!resp.ok) return undefined;
    return await resp.json();
  } catch {
    return undefined;
  }
}

export const createFhevmInstance = async (parameters: {
  provider: Eip1193Provider | string;
  mockChains?: Record<number, string>;
  signal: AbortSignal;
  onStatusChange?: (status: FhevmRelayerStatusType) => void;
}): Promise<FhevmInstance> => {
  const throwIfAborted = () => {
    if (parameters.signal.aborted) throw new Error("aborted");
  };
  const notify = (status: FhevmRelayerStatusType) => {
    if (parameters.onStatusChange) parameters.onStatusChange(status);
  };

  const { isMock, rpcUrl, chainId } = await resolve(parameters.provider, parameters.mockChains);

  if (isMock) {
    const meta = await tryFetchFHEVMHardhatNodeRelayerMetadata(rpcUrl);
    if (meta) {
      notify("creating");
      const fhevmMock = await import("./mock/fhevmMock");
      const mockInstance = await fhevmMock.fhevmMockCreateInstance({ rpcUrl: rpcUrl!, chainId, metadata: meta });
      throwIfAborted();
      return mockInstance;
    }
  }

  throwIfAborted();

  if (!isFhevmWindowType(window, console.log)) {
    notify("sdk-loading");
    await fhevmLoadSDK();
    throwIfAborted();
    notify("sdk-loaded");
  }

  if (!isFhevmInitialized()) {
    notify("sdk-initializing");
    await fhevmInitSDK();
    throwIfAborted();
    notify("sdk-initialized");
  }

  const relayerSDK = (window as unknown as FhevmWindowType).relayerSDK;
  notify("creating");
  const instance = await relayerSDK.createInstance(relayerSDK.SepoliaConfig);
  throwIfAborted();
  return instance;
};



