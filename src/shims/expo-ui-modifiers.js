function modifier() {
  return {};
}

module.exports = new Proxy(
  {},
  {
    get(_target, prop) {
      if (prop === '__esModule') return false;
      if (prop === 'then') return undefined;
      return modifier;
    },
  },
);
