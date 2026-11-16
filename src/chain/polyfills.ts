/// <reference types="node" />
// Chain code expects Node's Buffer (and is typed against it); React Native doesn't ship it. Import this first, before any chain code.
import { Buffer } from "buffer";

const g = globalThis as unknown as { Buffer?: typeof Buffer };
if (!g.Buffer) g.Buffer = Buffer;
