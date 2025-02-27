import { red } from "https://deno.land/std@0.90.0/fmt/colors.ts";
let wasm;

const heap = new Array(32).fill(undefined);

heap.push(undefined, null, true, false);

function getObject(idx) {
  return heap[idx];
}

let WASM_VECTOR_LEN = 0;

let cachegetUint8Memory0 = null;
function getUint8Memory0() {
  if (
    cachegetUint8Memory0 === null ||
    cachegetUint8Memory0.buffer !== wasm.memory.buffer
  ) {
    cachegetUint8Memory0 = new Uint8Array(wasm.memory.buffer);
  }
  return cachegetUint8Memory0;
}

let cachedTextEncoder = new TextEncoder("utf-8");

const encodeString =
  (typeof cachedTextEncoder.encodeInto === "function"
    ? function (arg, view) {
      return cachedTextEncoder.encodeInto(arg, view);
    }
    : function (arg, view) {
      const buf = cachedTextEncoder.encode(arg);
      view.set(buf);
      return {
        read: arg.length,
        written: buf.length,
      };
    });

function passStringToWasm0(arg, malloc, realloc) {
  if (realloc === undefined) {
    const buf = cachedTextEncoder.encode(arg);
    const ptr = malloc(buf.length);
    getUint8Memory0().subarray(ptr, ptr + buf.length).set(buf);
    WASM_VECTOR_LEN = buf.length;
    return ptr;
  }

  let len = arg.length;
  let ptr = malloc(len);

  const mem = getUint8Memory0();

  let offset = 0;

  for (; offset < len; offset++) {
    const code = arg.charCodeAt(offset);
    if (code > 0x7F) break;
    mem[ptr + offset] = code;
  }

  if (offset !== len) {
    if (offset !== 0) {
      arg = arg.slice(offset);
    }
    ptr = realloc(ptr, len, len = offset + arg.length * 3);
    const view = getUint8Memory0().subarray(ptr + offset, ptr + len);
    const ret = encodeString(arg, view);

    offset += ret.written;
  }

  WASM_VECTOR_LEN = offset;
  return ptr;
}

let cachegetInt32Memory0 = null;
function getInt32Memory0() {
  if (
    cachegetInt32Memory0 === null ||
    cachegetInt32Memory0.buffer !== wasm.memory.buffer
  ) {
    cachegetInt32Memory0 = new Int32Array(wasm.memory.buffer);
  }
  return cachegetInt32Memory0;
}

let heap_next = heap.length;

function dropObject(idx) {
  if (idx < 36) return;
  heap[idx] = heap_next;
  heap_next = idx;
}

function takeObject(idx) {
  const ret = getObject(idx);
  dropObject(idx);
  return ret;
}

let cachedTextDecoder = new TextDecoder("utf-8", {
  ignoreBOM: true,
  fatal: true,
});

cachedTextDecoder.decode();

function getStringFromWasm0(ptr, len) {
  return cachedTextDecoder.decode(getUint8Memory0().subarray(ptr, ptr + len));
}

function addHeapObject(obj) {
  if (heap_next === heap.length) heap.push(heap.length + 1);
  const idx = heap_next;
  heap_next = heap[idx];

  heap[idx] = obj;
  return idx;
}
/**
* @param {string} url
* @param {string} code
* @param {any} options
* @returns {any}
*/
export function parseExportNamesSync(url, code, options) {
  var ptr0 = passStringToWasm0(
    url,
    wasm.__wbindgen_malloc,
    wasm.__wbindgen_realloc,
  );
  var len0 = WASM_VECTOR_LEN;
  var ptr1 = passStringToWasm0(
    code,
    wasm.__wbindgen_malloc,
    wasm.__wbindgen_realloc,
  );
  var len1 = WASM_VECTOR_LEN;
  var ret = wasm.parseExportNamesSync(
    ptr0,
    len0,
    ptr1,
    len1,
    addHeapObject(options),
  );
  return takeObject(ret);
}

/**
* @param {string} url
* @param {string} code
* @param {any} options
* @returns {any}
*/
export function transformSync(url, code, options) {
  var ptr0 = passStringToWasm0(
    url,
    wasm.__wbindgen_malloc,
    wasm.__wbindgen_realloc,
  );
  var len0 = WASM_VECTOR_LEN;
  var ptr1 = passStringToWasm0(
    code,
    wasm.__wbindgen_malloc,
    wasm.__wbindgen_realloc,
  );
  var len1 = WASM_VECTOR_LEN;
  var ret = wasm.transformSync(ptr0, len0, ptr1, len1, addHeapObject(options));
  return takeObject(ret);
}

async function load(module, imports) {
  if (typeof Response === "function" && module instanceof Response) {
    if (typeof WebAssembly.instantiateStreaming === "function") {
      try {
        return await WebAssembly.instantiateStreaming(module, imports);
      } catch (e) {
        if (module.headers.get("Content-Type") != "application/wasm") {
          console.warn(
            "`WebAssembly.instantiateStreaming` failed because your server does not serve wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n",
            e,
          );
        } else {
          throw e;
        }
      }
    }

    const bytes = await module.arrayBuffer();
    return await WebAssembly.instantiate(bytes, imports);
  } else {
    const instance = await WebAssembly.instantiate(module, imports);

    if (instance instanceof WebAssembly.Instance) {
      return { instance, module };
    } else {
      return instance;
    }
  }
}

async function init(input) {
  if (typeof input === "undefined") {
    input = new URL("aleph_compiler_bg.wasm", import.meta.url);
  }
  const imports = {};
  imports.wbg = {};
  imports.wbg.__wbindgen_json_serialize = function (arg0, arg1) {
    const obj = getObject(arg1);
    var ret = JSON.stringify(obj === undefined ? null : obj);
    var ptr0 = passStringToWasm0(
      ret,
      wasm.__wbindgen_malloc,
      wasm.__wbindgen_realloc,
    );
    var len0 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len0;
    getInt32Memory0()[arg0 / 4 + 0] = ptr0;
  };
  imports.wbg.__wbindgen_object_drop_ref = function (arg0) {
    takeObject(arg0);
  };
  imports.wbg.__wbindgen_json_parse = function (arg0, arg1) {
    var ret = JSON.parse(getStringFromWasm0(arg0, arg1));
    return addHeapObject(ret);
  };
  imports.wbg.__wbg_new_59cb74e423758ede = function () {
    var ret = new Error();
    return addHeapObject(ret);
  };
  imports.wbg.__wbg_stack_558ba5917b466edd = function (arg0, arg1) {
    var ret = getObject(arg1).stack;
    var ptr0 = passStringToWasm0(
      ret,
      wasm.__wbindgen_malloc,
      wasm.__wbindgen_realloc,
    );
    var len0 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len0;
    getInt32Memory0()[arg0 / 4 + 0] = ptr0;
  };
  imports.wbg.__wbg_error_4bb6c2a97407129a = function (arg0, arg1) {
    try {
      const msg = getStringFromWasm0(arg0, arg1);
      if (msg.includes('DiagnosticBuffer(["')) {
        const diagnostic = msg.split('DiagnosticBuffer(["')[1].split('"])')[0];
        console.error(red("ERROR"), "swc:", diagnostic);
      } else {
        console.error(red("ERROR"), msg);
      }
    } finally {
      wasm.__wbindgen_free(arg0, arg1);
    }
  };

  if (
    typeof input === "string" ||
    (typeof Request === "function" && input instanceof Request) ||
    (typeof URL === "function" && input instanceof URL)
  ) {
    input = fetch(input);
  }

  const { instance, module } = await load(await input, imports);

  wasm = instance.exports;
  init.__wbindgen_wasm_module = module;

  return wasm;
}

export default init;
