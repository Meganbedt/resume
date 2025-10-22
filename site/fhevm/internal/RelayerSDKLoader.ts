import { SDK_CDN_URL } from "./constants";

type TraceType = (...args: unknown[]) => void;

function isFhevmRelayerSDKType(sdk: any, trace?: TraceType): boolean {
  const ok = sdk && typeof sdk === "object" && typeof sdk.initSDK === "function" && typeof sdk.createInstance === "function";
  if (!ok && trace) trace("RelayerSDK invalid shape");
  return ok;
}

function isFhevmWindowType(win: any, trace?: TraceType): win is Window & { relayerSDK: any } {
  const ok = typeof win !== "undefined" && "relayerSDK" in win && isFhevmRelayerSDKType((win as any).relayerSDK, trace);
  if (!ok && trace) trace("window.relayerSDK missing");
  return ok;
}

export class RelayerSDKLoader {
  private _trace?: TraceType;

  constructor(parameters?: { trace?: TraceType }) {
    this._trace = parameters?.trace;
  }

  public isLoaded() {
    if (typeof window === "undefined") {
      return false;
    }
    return isFhevmWindowType(window, this._trace);
  }

  public load(): Promise<void> {
    if (typeof window === "undefined") {
      return Promise.reject(new Error("RelayerSDKLoader: can only be used in the browser."));
    }

    if ("relayerSDK" in window) {
      if (!isFhevmRelayerSDKType((window as any).relayerSDK, this._trace)) {
        throw new Error("RelayerSDKLoader: Unable to load FHEVM Relayer SDK");
      }
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const existingScript = document.querySelector(`script[src="${SDK_CDN_URL}"]`);
      if (existingScript) {
        if (!isFhevmWindowType(window, this._trace)) {
          reject(new Error("RelayerSDKLoader: window object does not contain a valid relayerSDK object."));
        }
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src = SDK_CDN_URL;
      script.type = "text/javascript";
      script.async = true;
      script.onload = () => {
        if (!isFhevmWindowType(window, this._trace)) {
          reject(new Error(`RelayerSDKLoader: Relayer SDK script has been successfully loaded from ${SDK_CDN_URL}, however, the window.relayerSDK object is invalid.`));
        }
        resolve();
      };
      script.onerror = () => {
        reject(new Error(`RelayerSDKLoader: Failed to load Relayer SDK from ${SDK_CDN_URL}`));
      };
      document.head.appendChild(script);
    });
  }
}



