// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.
"use strict";

((window) => {
  const illegalConstructorKey = Symbol("illegalConstructorKey");

  function requiredArguments(
    name,
    length,
    required,
  ) {
    if (length < required) {
      const errMsg = `${name} requires at least ${required} argument${
        required === 1 ? "" : "s"
      }, but only ${length} present`;
      throw new TypeError(errMsg);
    }
  }

  const objectCloneMemo = new WeakMap();

  function cloneArrayBuffer(
    srcBuffer,
    srcByteOffset,
    srcLength,
    _cloneConstructor,
  ) {
    // this function fudges the return type but SharedArrayBuffer is disabled for a while anyway
    return srcBuffer.slice(
      srcByteOffset,
      srcByteOffset + srcLength,
    );
  }

  /** Clone a value in a similar way to structured cloning.  It is similar to a
 * StructureDeserialize(StructuredSerialize(...)). */
  function cloneValue(value) {
    // Performance optimization for buffers, otherwise
    // `serialize/deserialize` will allocate new buffer.
    if (value instanceof ArrayBuffer) {
      const cloned = cloneArrayBuffer(
        value,
        0,
        value.byteLength,
        ArrayBuffer,
      );
      objectCloneMemo.set(value, cloned);
      return cloned;
    }
    if (ArrayBuffer.isView(value)) {
      const clonedBuffer = cloneValue(value.buffer);
      // Use DataViewConstructor type purely for type-checking, can be a
      // DataView or TypedArray.  They use the same constructor signature,
      // only DataView has a length in bytes and TypedArrays use a length in
      // terms of elements, so we adjust for that.
      let length;
      if (value instanceof DataView) {
        length = value.byteLength;
      } else {
        length = value.length;
      }
      return new (value.constructor)(
        clonedBuffer,
        value.byteOffset,
        length,
      );
    }

    try {
      return Deno.core.deserialize(Deno.core.serialize(value));
    } catch (e) {
      if (e instanceof TypeError) {
        throw new DOMException("Uncloneable value", "DataCloneError");
      }
      throw e;
    }
  }

  const handlerSymbol = Symbol("eventHandlers");
  function makeWrappedHandler(handler) {
    function wrappedHandler(...args) {
      if (typeof wrappedHandler.handler !== "function") {
        return;
      }
      return wrappedHandler.handler.call(this, ...args);
    }
    wrappedHandler.handler = handler;
    return wrappedHandler;
  }
  function defineEventHandler(emitter, name, defaultValue = undefined) {
    // HTML specification section 8.1.5.1
    Object.defineProperty(emitter, `on${name}`, {
      get() {
        return this[handlerSymbol]?.get(name)?.handler ?? defaultValue;
      },
      set(value) {
        if (!this[handlerSymbol]) {
          this[handlerSymbol] = new Map();
        }
        let handlerWrapper = this[handlerSymbol]?.get(name);
        if (handlerWrapper) {
          handlerWrapper.handler = value;
        } else {
          handlerWrapper = makeWrappedHandler(value);
          this.addEventListener(name, handlerWrapper);
        }
        this[handlerSymbol].set(name, handlerWrapper);
      },
      configurable: true,
      enumerable: true,
    });
  }
  window.__bootstrap.webUtil = {
    illegalConstructorKey,
    requiredArguments,
    defineEventHandler,
    cloneValue,
  };
})(this);
