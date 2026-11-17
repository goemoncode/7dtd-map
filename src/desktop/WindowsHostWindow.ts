/// <reference lib="deno.ns" />

interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DesktopAppState {
  windowBounds: WindowBounds;
}

export interface WindowsHostWindowOptions {
  className: string;
  childWindowClassName: string;
  stateFilePath: string;
  title: string;
  initialWidth: number;
  initialHeight: number;
}

function isWindowBounds(value: unknown): value is WindowBounds {
  if (typeof value !== 'object' || value === null) return false;
  const bounds = value as Record<string, unknown>;
  return typeof bounds.x === 'number' && Number.isSafeInteger(bounds.x) &&
    typeof bounds.y === 'number' && Number.isSafeInteger(bounds.y) &&
    typeof bounds.width === 'number' && Number.isSafeInteger(bounds.width) && bounds.width >= 320 &&
    typeof bounds.height === 'number' && Number.isSafeInteger(bounds.height) && bounds.height >= 240;
}

function getWindowBounds(value: unknown): WindowBounds | null {
  if (typeof value !== 'object' || value === null) return null;
  const state = value as Record<string, unknown>;
  return isWindowBounds(state.windowBounds) ? state.windowBounds : null;
}

function openUser32() {
  return Deno.dlopen('user32.dll', {
    AdjustWindowRectEx: { parameters: ['buffer', 'u32', 'i32', 'u32'], result: 'i32' },
    CreateWindowExW: {
      parameters: [
        'u32',
        'pointer',
        'pointer',
        'u32',
        'i32',
        'i32',
        'i32',
        'i32',
        'pointer',
        'pointer',
        'pointer',
        'pointer',
      ],
      result: 'pointer',
    },
    DefWindowProcW: { parameters: ['pointer', 'u32', 'pointer', 'pointer'], result: 'pointer' },
    DestroyWindow: { parameters: ['pointer'], result: 'i32' },
    FindWindowExW: { parameters: ['pointer', 'pointer', 'pointer', 'pointer'], result: 'pointer' },
    GetClientRect: { parameters: ['pointer', 'buffer'], result: 'i32' },
    GetWindowRect: { parameters: ['pointer', 'buffer'], result: 'i32' },
    IsIconic: { parameters: ['pointer'], result: 'i32' },
    IsZoomed: { parameters: ['pointer'], result: 'i32' },
    GetSystemMetrics: { parameters: ['i32'], result: 'i32' },
    PostQuitMessage: { parameters: ['i32'], result: 'void' },
    RegisterClassExW: { parameters: ['buffer'], result: 'u16' },
    SetWindowPos: { parameters: ['pointer', 'pointer', 'i32', 'i32', 'i32', 'i32', 'u32'], result: 'i32' },
    ShowWindow: { parameters: ['pointer', 'i32'], result: 'i32' },
    UnregisterClassW: { parameters: ['pointer', 'pointer'], result: 'i32' },
    UpdateWindow: { parameters: ['pointer'], result: 'i32' },
  });
}

function openKernel32() {
  return Deno.dlopen('kernel32.dll', {
    GetLastError: { parameters: [], result: 'u32' },
    GetModuleHandleW: { parameters: ['pointer'], result: 'pointer' },
  });
}

function openOle32() {
  return Deno.dlopen('ole32.dll', {
    CoInitializeEx: { parameters: ['pointer', 'u32'], result: 'i32' },
    CoUninitialize: { parameters: [], result: 'void' },
  });
}

function toWideString(value: string) {
  const result = new Uint16Array(value.length + 1);
  for (let i = 0; i < value.length; i++) result[i] = value.charCodeAt(i);
  return result;
}

export class WindowsHostWindow {
  private readonly statePath: string;
  private user32: ReturnType<typeof openUser32> | null = null;
  private kernel32: ReturnType<typeof openKernel32> | null = null;
  private ole32: ReturnType<typeof openOle32> | null = null;
  private wndProc: Deno.UnsafeCallback<{ parameters: ['pointer', 'u32', 'pointer', 'pointer']; result: 'pointer' }> | null = null;
  private classNameBuffer: Uint16Array | null = null;
  private classNamePointer: Deno.PointerValue = null;
  private childClassNameBuffer: Uint16Array | null = null;
  private childClassNamePointer: Deno.PointerValue = null;
  private window: Deno.PointerValue = null;
  private initialBounds: WindowBounds | null = null;
  private normalBounds: WindowBounds | null = null;
  private instance: Deno.PointerValue = null;
  private comInitialized = false;
  private classRegistered = false;

  private constructor(private readonly options: WindowsHostWindowOptions) {
    this.statePath = options.stateFilePath;
  }

  static create(options: WindowsHostWindowOptions): WindowsHostWindow {
    if (!options.className || !options.childWindowClassName || !options.title) {
      throw new Error('The desktop window class names and title must not be empty.');
    }
    if (!Number.isSafeInteger(options.initialWidth) || options.initialWidth < 320) {
      throw new Error('The desktop window initial width must be an integer of at least 320 pixels.');
    }
    if (!Number.isSafeInteger(options.initialHeight) || options.initialHeight < 240) {
      throw new Error('The desktop window initial height must be an integer of at least 240 pixels.');
    }
    const lastSeparator = Math.max(options.stateFilePath.lastIndexOf('\\'), options.stateFilePath.lastIndexOf('/'));
    if (lastSeparator < 0 || lastSeparator === options.stateFilePath.length - 1) {
      throw new Error('The desktop window state path must include a parent directory and file name.');
    }

    const hostWindow = new WindowsHostWindow(options);
    try {
      hostWindow.initialize();
      return hostWindow;
    } catch (error) {
      hostWindow.close();
      throw error;
    }
  }

  get handle(): Deno.PointerValue {
    if (this.window === null) throw new Error('The desktop host window is not available.');
    return this.window;
  }

  show(): void {
    const user32 = this.requireUser32();
    const window = this.handle;
    user32.symbols.ShowWindow(window, 5);
    user32.symbols.UpdateWindow(window);
  }

  resizeWebview(): void {
    const user32 = this.requireUser32();
    const window = this.handle;
    const bounds = this.initialBounds;
    if (!bounds) throw new Error('The desktop window bounds are not available.');
    if (!user32.symbols.SetWindowPos(window, null, bounds.x, bounds.y, bounds.width, bounds.height, 0x0010)) {
      throw new Error(`Could not size the desktop window (Win32 error ${this.getLastError()}).`);
    }
    const clientRectBuffer = new Uint8Array(16);
    if (!user32.symbols.GetClientRect(window, clientRectBuffer)) {
      throw new Error(`Could not read the desktop window client area (Win32 error ${this.getLastError()}).`);
    }
    const clientRect = new DataView(clientRectBuffer.buffer);
    const width = clientRect.getInt32(8, true) - clientRect.getInt32(0, true);
    const height = clientRect.getInt32(12, true) - clientRect.getInt32(4, true);

    // The WebView handle is the host HWND; its internal widget is a separate child window.
    const childWindow = user32.symbols.FindWindowExW(window, null, this.childClassNamePointer, null);
    if (childWindow === null || width <= 0 || height <= 0) {
      throw new Error('Could not locate the embedded WebView window.');
    }
    if (!user32.symbols.SetWindowPos(childWindow, null, 0, 0, width, height, 0x0014)) {
      throw new Error(`Could not size the embedded WebView (Win32 error ${this.getLastError()}).`);
    }
  }

  close(): void {
    const user32 = this.user32;
    if (user32 && this.window !== null) {
      user32.symbols.DestroyWindow(this.window);
      this.window = null;
    }
    if (user32 && this.classRegistered && this.instance !== null && this.classNamePointer !== null) {
      if (!user32.symbols.UnregisterClassW(this.classNamePointer, this.instance)) {
        console.error(`Could not unregister the desktop window class (Win32 error ${this.getLastError()}).`);
      }
      this.classRegistered = false;
    }
    this.wndProc?.close();
    this.wndProc = null;
    if (this.comInitialized) {
      this.ole32?.symbols.CoUninitialize();
      this.comInitialized = false;
    }
    this.ole32?.close();
    this.ole32 = null;
    this.kernel32?.close();
    this.kernel32 = null;
    this.user32?.close();
    this.user32 = null;
    this.window = null;
    this.instance = null;
    this.classNamePointer = null;
    this.childClassNamePointer = null;
    this.classNameBuffer = null;
    this.childClassNameBuffer = null;
  }

  private initialize(): void {
    const stateDirectory = this.statePath.slice(0, Math.max(this.statePath.lastIndexOf('\\'), this.statePath.lastIndexOf('/')));
    Deno.mkdirSync(stateDirectory, { recursive: true });
    const savedBounds = this.loadBounds();
    this.user32 = openUser32();
    this.kernel32 = openKernel32();
    this.ole32 = openOle32();

    const coInitResult = this.ole32.symbols.CoInitializeEx(null, 0x2);
    if (coInitResult < 0) {
      throw new Error(`Could not initialize COM for the WebView (HRESULT 0x${(coInitResult >>> 0).toString(16)}).`);
    }
    this.comInitialized = true;

    this.classNameBuffer = toWideString(this.options.className);
    this.classNamePointer = Deno.UnsafePointer.of(this.classNameBuffer);
    this.childClassNameBuffer = toWideString(this.options.childWindowClassName);
    this.childClassNamePointer = Deno.UnsafePointer.of(this.childClassNameBuffer);

    this.instance = this.requireKernel32().symbols.GetModuleHandleW(null);
    if (this.instance === null) throw new Error('Could not get the desktop application module handle.');

    this.wndProc = new Deno.UnsafeCallback(
      { parameters: ['pointer', 'u32', 'pointer', 'pointer'], result: 'pointer' },
      (window, message, wParam, lParam) => {
        if (message === 0x0005 && lParam !== null) {
          const dimensions = Deno.UnsafePointer.value(lParam);
          this.resizeChild(Number(dimensions & 0xffffn), Number((dimensions >> 16n) & 0xffffn));
          this.updateNormalBounds(window);
          return null;
        }
        if (message === 0x0003) {
          this.updateNormalBounds(window);
          return null;
        }
        if (message === 0x0010) {
          if (this.normalBounds) this.saveBounds(this.normalBounds);
          if (window !== null) this.requireUser32().symbols.DestroyWindow(window);
          return null;
        }
        if (message === 0x0002) {
          this.window = null;
          this.requireUser32().symbols.PostQuitMessage(0);
          return null;
        }
        return this.requireUser32().symbols.DefWindowProcW(window, message, wParam, lParam);
      },
    );

    const windowClass = new Uint8Array(80);
    const classView = new DataView(windowClass.buffer);
    classView.setUint32(0, windowClass.byteLength, true);
    classView.setUint32(4, 0x0003, true);
    classView.setBigUint64(8, Deno.UnsafePointer.value(this.wndProc.pointer), true);
    classView.setBigUint64(24, Deno.UnsafePointer.value(this.instance), true);
    classView.setBigUint64(48, 6n, true);
    classView.setBigUint64(64, Deno.UnsafePointer.value(this.classNamePointer), true);
    if (this.requireUser32().symbols.RegisterClassExW(windowClass) === 0) {
      throw new Error(`Could not register the desktop window class (Win32 error ${this.getLastError()}).`);
    }
    this.classRegistered = true;

    this.createWindow(savedBounds);
  }

  private createWindow(savedBounds: WindowBounds | null): void {
    const user32 = this.requireUser32();
    const outerBounds = new Uint8Array(16);
    new DataView(outerBounds.buffer).setInt32(8, this.options.initialWidth, true);
    new DataView(outerBounds.buffer).setInt32(12, this.options.initialHeight, true);
    if (!user32.symbols.AdjustWindowRectEx(outerBounds, 0x00cf0000, 0, 0)) {
      throw new Error(`Could not calculate the desktop window size (Win32 error ${this.getLastError()}).`);
    }
    const bounds = new DataView(outerBounds.buffer);
    const defaultWidth = bounds.getInt32(8, true) - bounds.getInt32(0, true);
    const defaultHeight = bounds.getInt32(12, true) - bounds.getInt32(4, true);
    const virtualLeft = user32.symbols.GetSystemMetrics(76);
    const virtualTop = user32.symbols.GetSystemMetrics(77);
    const virtualWidth = user32.symbols.GetSystemMetrics(78);
    const virtualHeight = user32.symbols.GetSystemMetrics(79);
    const width = Math.min(savedBounds?.width ?? defaultWidth, virtualWidth);
    const height = Math.min(savedBounds?.height ?? defaultHeight, virtualHeight);
    const x = Math.max(
      virtualLeft,
      Math.min(savedBounds?.x ?? Math.floor(virtualLeft + (virtualWidth - width) / 2), virtualLeft + virtualWidth - width),
    );
    const y = Math.max(
      virtualTop,
      Math.min(savedBounds?.y ?? Math.floor(virtualTop + (virtualHeight - height) / 2), virtualTop + virtualHeight - height),
    );

    this.initialBounds = { x, y, width, height };
    this.normalBounds = { ...this.initialBounds };
    this.window = user32.symbols.CreateWindowExW(
      0,
      this.classNamePointer,
      Deno.UnsafePointer.of(toWideString(this.options.title)),
      0x00cf0000,
      x,
      y,
      width,
      height,
      null,
      null,
      this.instance,
      null,
    );
    if (this.window === null) {
      throw new Error(`Could not create the desktop window (Win32 error ${this.getLastError()}).`);
    }
  }

  private loadBounds(): WindowBounds | null {
    try {
      const stateContents = Deno.readTextFileSync(this.statePath);
      try {
        const parsed: unknown = JSON.parse(stateContents);
        const savedBounds = getWindowBounds(parsed);
        if (!savedBounds) console.warn(`Ignoring invalid saved desktop state at ${this.statePath}.`);
        return savedBounds;
      } catch (error) {
        if (!(error instanceof SyntaxError)) throw error;
        console.warn(`Ignoring malformed saved desktop state at ${this.statePath}.`, error);
        return null;
      }
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) return null;
      throw error;
    }
  }

  private updateNormalBounds(window: Deno.PointerValue): void {
    if (window === null) return;
    const user32 = this.requireUser32();
    if (user32.symbols.IsZoomed(window) || user32.symbols.IsIconic(window)) return;

    const windowBounds = new Uint8Array(16);
    if (!user32.symbols.GetWindowRect(window, windowBounds)) {
      console.error('Could not read the desktop window bounds.');
      return;
    }
    const rect = new DataView(windowBounds.buffer);
    this.normalBounds = {
      x: rect.getInt32(0, true),
      y: rect.getInt32(4, true),
      width: rect.getInt32(8, true) - rect.getInt32(0, true),
      height: rect.getInt32(12, true) - rect.getInt32(4, true),
    };
  }

  private saveBounds(bounds: WindowBounds): void {
    try {
      Deno.writeTextFileSync(
        this.statePath,
        JSON.stringify(
          { windowBounds: bounds } satisfies DesktopAppState,
        ),
      );
    } catch (error) {
      console.error('Could not save the desktop window bounds.', error);
    }
  }

  private resizeChild(width: number, height: number): void {
    if (this.window === null || width <= 0 || height <= 0 || this.childClassNamePointer === null) return;
    const user32 = this.requireUser32();
    const childWindow = user32.symbols.FindWindowExW(this.window, null, this.childClassNamePointer, null);
    if (childWindow !== null) user32.symbols.SetWindowPos(childWindow, null, 0, 0, width, height, 0x0014);
  }

  private getLastError(): number {
    return this.kernel32?.symbols.GetLastError() ?? 0;
  }

  private requireUser32(): ReturnType<typeof openUser32> {
    if (!this.user32) throw new Error('The Windows user32 library is not available.');
    return this.user32;
  }

  private requireKernel32(): ReturnType<typeof openKernel32> {
    if (!this.kernel32) throw new Error('The Windows kernel32 library is not available.');
    return this.kernel32;
  }
}
