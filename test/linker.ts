import tape from 'tape';
import linker from '../linker';

const LIB_HYP_L_64_BYTE_HASH = '7b407da2c9e54c64181b59f93be76d2e1be3a7a0dd4078c3bae5ca6125235fe45e6d0232229f7006f00e49901dd0bb51b52ac3ea8beef0422713a65cf0';
const LIB_HYP_L_64_BYTE_PLACEHOLDER = `__$${LIB_HYP_L_64_BYTE_HASH}$__`;
const ADDRESS_64_BYTES = '42'.repeat(64);
const PREFIXED_ADDRESS_64_BYTES = `Q${ADDRESS_64_BYTES}`;

function oldStylePlaceholder (libraryName) {
  return `__${libraryName.slice(0, 124).padEnd(124, '_')}__`;
}

tape('Link references', function (t) {
  t.test('Empty bytecode', function (st) {
    st.deepEqual(linker.findLinkReferences(''), {});
    st.end();
  });

  t.test('No references', function (st) {
    st.deepEqual(linker.findLinkReferences('6060604052341561000f57600080fd'), {});
    st.end();
  });

  t.test('One 64-byte hashed reference', function (st) {
    const bytecode = `6060${LIB_HYP_L_64_BYTE_PLACEHOLDER}6060`;
    st.deepEqual(
      linker.findLinkReferences(bytecode),
      { [`$${LIB_HYP_L_64_BYTE_HASH}$`]: [{ start: 2, length: 64 }] }
    );
    st.end();
  });

  t.test('One 64-byte old-style reference', function (st) {
    const bytecode = `6060${oldStylePlaceholder('lib.hyp:L')}6060`;
    st.deepEqual(
      linker.findLinkReferences(bytecode),
      { 'lib.hyp:L': [{ start: 2, length: 64 }] }
    );
    st.end();
  });

  t.test('Two references with same library name', function (st) {
    const bytecode = `6060${oldStylePlaceholder('lib.hyp:L')}6060${oldStylePlaceholder('lib.hyp:L')}6060`;
    st.deepEqual(
      linker.findLinkReferences(bytecode),
      { 'lib.hyp:L': [{ start: 2, length: 64 }, { start: 68, length: 64 }] }
    );
    st.end();
  });

  t.test('Invalid 20-byte reference is ignored', function (st) {
    const bytecode = '6060__$7484607a72fb0587588e5a1e608f0b16de$__6060';
    st.deepEqual(linker.findLinkReferences(bytecode), {});
    st.end();
  });
});

tape('Linking', function (t) {
  t.test('64-byte hashed placeholder', function (st) {
    let bytecode = `6060${LIB_HYP_L_64_BYTE_PLACEHOLDER}6060`;
    bytecode = linker.linkBytecode(bytecode, { 'lib.hyp:L': PREFIXED_ADDRESS_64_BYTES });
    st.equal(bytecode, `6060${ADDRESS_64_BYTES}6060`);
    st.end();
  });

  t.test('64-byte old-style placeholder', function (st) {
    let bytecode = `6060${oldStylePlaceholder('lib.hyp:L')}6060`;
    bytecode = linker.linkBytecode(bytecode, { 'lib.hyp:L': PREFIXED_ADDRESS_64_BYTES });
    st.equal(bytecode, `6060${ADDRESS_64_BYTES}6060`);
    st.end();
  });

  t.test('64-byte old-style placeholder with two-level configuration', function (st) {
    let bytecode = `6060${oldStylePlaceholder('lib.hyp:L')}6060`;
    bytecode = linker.linkBytecode(bytecode, { 'lib.hyp': { L: PREFIXED_ADDRESS_64_BYTES } });
    st.equal(bytecode, `6060${ADDRESS_64_BYTES}6060`);
    st.end();
  });

  t.test('missing library leaves placeholder unresolved', function (st) {
    const bytecode = `6060${oldStylePlaceholder('lib.hyp:L')}6060`;
    st.equal(linker.linkBytecode(bytecode, {}), bytecode);
    st.end();
  });

  t.test('short address is invalid', function (st) {
    const bytecode = `6060${oldStylePlaceholder('lib.hyp:L')}6060`;
    st.throws(function () {
      linker.linkBytecode(bytecode, { 'lib.hyp:L': 'Q123456' });
    });
    st.end();
  });

  t.test('non-hex address is invalid', function (st) {
    const bytecode = `6060${oldStylePlaceholder('lib.hyp:L')}6060`;
    st.throws(function () {
      linker.linkBytecode(bytecode, { 'lib.hyp:L': `Q${'z'.repeat(128)}` });
    });
    st.end();
  });

  t.test('20-byte placeholder is not linked', function (st) {
    const bytecode = '6060__$7484607a72fb0587588e5a1e608f0b16de$__6060';
    st.equal(linker.linkBytecode(bytecode, { 'lib2.hyp:L': PREFIXED_ADDRESS_64_BYTES }), bytecode);
    st.end();
  });
});
