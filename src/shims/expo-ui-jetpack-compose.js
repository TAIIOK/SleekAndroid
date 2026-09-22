/** TV dev client has no ExpoUI native module. Compose toolbar is unused on TV. */
function ExpoUiStub() {
  return null;
}

module.exports = new Proxy(
  {},
  {
    get(_target, prop) {
      if (prop === '__esModule') return false;
      if (prop === 'then') return undefined;
      return ExpoUiStub;
    },
  },
);
