import tape from 'tape';
import spawn from 'tape-spawn';
import * as path from 'path';
import hypc from '../';

tape('CLI', function (t) {
  t.test('--version', function (st) {
    const spt = spawn(st, './hypc.js --version');
    spt.stdout.match(hypc.version() + '\n');
    spt.stdout.match(/^\s*[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?\+commit\.[0-9a-f]+([a-zA-Z0-9.-]+)?\s*$/);
    spt.stderr.empty();
    spt.end();
  });

  t.test('no parameters', function (st) {
    const spt = spawn(st, './hypc.js');
    spt.stderr.match(/^Must provide a file/);
    spt.end();
  });

  t.test('no mode specified', function (st) {
    const spt = spawn(st, './hypc.js test/resources/fixtureSmoke.hyp');
    spt.stderr.match(/^Invalid option selected/);
    spt.end();
  });

  t.test('--bin', function (st) {
    const spt = spawn(st, './hypc.js --bin test/resources/fixtureSmoke.hyp');
    spt.stderr.empty();
    spt.succeeds();
    spt.end();
  });

  t.test('--bin --optimize', function (st) {
    const spt = spawn(st, './hypc.js --bin --optimize test/resources/fixtureSmoke.hyp');
    spt.stderr.empty();
    spt.succeeds();
    spt.end();
  });

  t.test('--bin --optimize-runs 666', function (st) {
    const spt = spawn(st, './hypc.js --bin --optimize-runs 666 test/resources/fixtureSmoke.hyp');
    spt.stderr.empty();
    spt.succeeds();
    spt.end();
  });

  t.test('--bin --optimize-runs not-a-number', function (st) {
    const spt = spawn(st, './hypc.js --bin --optimize-runs not-a-number test/resources/fixtureSmoke.hyp');
    spt.stderr.match(/^error: option '--optimize-runs <optimize-runs>' argument 'not-a-number' is invalid/);
    spt.end();
  });

  t.test('invalid file specified', function (st) {
    const spt = spawn(st, './hypc.js --bin test/fileNotFound.hyp');
    spt.stderr.match(/^Error reading /);
    spt.end();
  });

  t.test('incorrect source source', function (st) {
    const spt = spawn(st, './hypc.js --bin test/resources/fixtureIncorrectSource.hyp');
    spt.stderr.match(/SyntaxError: Invalid pragma "contract"/);
    spt.end();
  });

  t.test('--abi', function (st) {
    const spt = spawn(st, './hypc.js --abi test/resources/fixtureSmoke.hyp');
    spt.stderr.empty();
    spt.succeeds();
    spt.end();
  });

  t.test('--bin --abi', function (st) {
    const spt = spawn(st, './hypc.js --bin --abi test/resources/fixtureSmoke.hyp');
    spt.stderr.empty();
    spt.succeeds();
    spt.end();
  });

  t.test('no base path', function (st) {
    const spt = spawn(
      st,
      './hypc.js --bin ' +
        'test/resources/importA.hyp ' +
        './test/resources//importA.hyp ' +
        path.resolve('test/resources/importA.hyp')
    );
    spt.stderr.empty();
    spt.succeeds();
    spt.end();
  });

  t.test('relative base path', function (st) {
    // NOTE: This and other base path tests rely on the relative ./importB.hyp import in importA.hyp.
    // If base path is not stripped correctly from all source paths below, they will not be found
    // by the import callback when it appends the base path back.
    const spt = spawn(
      st,
      './hypc.js --bin --base-path test/resources ' +
        'test/resources/importA.hyp ' +
        './test/resources//importA.hyp ' +
        path.resolve('test/resources/importA.hyp')
    );
    spt.stderr.empty();
    spt.succeeds();
    spt.end();
  });

  t.test('relative non canonical base path', function (st) {
    const spt = spawn(
      st,
      './hypc.js --bin --base-path ./test/resources ' +
        'test/resources/importA.hyp ' +
        './test/resources//importA.hyp ' +
        path.resolve('test/resources/importA.hyp')
    );
    spt.stderr.empty();
    spt.succeeds();
    spt.end();
  });

  t.test('absolute base path', function (st) {
    const spt = spawn(
      st,
      './hypc.js --bin --base-path ' + path.resolve('test/resources') + ' ' +
        'test/resources/importA.hyp ' +
        './test/resources//importA.hyp ' +
        path.resolve('test/resources/importA.hyp')
    );
    spt.stderr.empty();
    spt.succeeds();
    spt.end();
  });

  t.test('include paths', function (st) {
    const spt = spawn(
      st,
      './hypc.js --bin ' +
        'test/resources/importCallback/base/contractB.hyp ' +
        'test/resources/importCallback/includeA/libY.hyp ' +
        './test/resources/importCallback/includeA//libY.hyp ' +
        path.resolve('test/resources/importCallback/includeA/libY.hyp') + ' ' +
        '--base-path test/resources/importCallback/base ' +
        '--include-path test/resources/importCallback/includeA ' +
        '--include-path ' + path.resolve('test/resources/importCallback/includeB/')
    );
    spt.stderr.empty();
    spt.succeeds();
    spt.end();
  });

  t.test('include paths without base path', function (st) {
    const spt = spawn(
      st,
      './hypc.js --bin ' +
        'test/resources/importCallback/contractC.hyp ' +
        '--include-path test/resources/importCallback/includeA'
    );
    spt.stderr.match(/--include-path option requires a non-empty base path\./);
    spt.fails();
    spt.end();
  });

  t.test('empty include paths', function (st) {
    const spt = spawn(
      st,
      './hypc.js --bin ' +
        'test/resources/importCallback/contractC.hyp ' +
        '--base-path test/resources/importCallback/base ' +
        '--include-path='
    );
    spt.stderr.match(/Empty values are not allowed in --include-path\./);
    spt.fails();
    spt.end();
  });

  t.test('standard json', function (st) {
    const input = {
      language: 'Hyperion',
      settings: {
        outputSelection: {
          '*': {
            '*': ['zvm.bytecode', 'userdoc']
          }
        }
      },
      sources: {
        'Contract.hyp': {
          content: 'pragma hyperion >=0.0.1; contract Contract { function f() pure public {} }'
        }
      }
    };
    const spt = spawn(st, './hypc.js --standard-json');
    spt.stdin.setEncoding('utf-8');
    spt.stdin.write(JSON.stringify(input));
    spt.stdin.end();
    spt.stdin.on('finish', function () {
      spt.stderr.empty();
      spt.stdout.match(/Contract.hyp/);
      spt.stdout.match(/userdoc/);
      spt.succeeds();
      spt.end();
    });
  });

  t.test('standard json base path', function (st) {
    const input = {
      language: 'Hyperion',
      settings: {
        outputSelection: {
          '*': {
            '*': ['metadata']
          }
        }
      },
      sources: {
        'importA.hyp': {
          content: 'import "./importB.hyp";'
        }
      }
    };
    const spt = spawn(st, './hypc.js --standard-json --base-path test/resources');
    spt.stdin.setEncoding('utf-8');
    spt.stdin.write(JSON.stringify(input));
    spt.stdin.end();
    spt.stdin.on('finish', function () {
      spt.stderr.empty();
      spt.stdout.match(/{"contracts":{"importB.hyp":{"D":{"metadata":/);
      spt.succeeds();
      spt.end();
    });
  });

  t.test('standard json include paths', function (st) {
    const input = {
      language: 'Hyperion',
      sources: {
        'contractB.hyp': {
          content:
            '// SPDX-License-Identifier: GPL-3.0\n' +
            'pragma hyperion >=0.0.1;\n' +
            'import "./contractA.hyp";\n'
        }
      }
    };
    const spt = spawn(
      st,
      './hypc.js --standard-json ' +
        '--base-path test/resources/importCallback/base ' +
        '--include-path test/resources/importCallback/includeA ' +
        '--include-path ' + path.resolve('test/resources/importCallback/includeB/')
    );
    spt.stdin.setEncoding('utf-8');
    spt.stdin.write(JSON.stringify(input));
    spt.stdin.end();
    spt.stdin.on('finish', function () {
      spt.stderr.empty();
      spt.stdout.match(/"sources":{"contractA.hyp":{"id":0},"contractB.hyp":{"id":1},"libX.hyp":{"id":2},"libY.hyp":{"id":3},"libZ.hyp":{"id":4},"utils.hyp":{"id":5}}}/);
      spt.succeeds();
      spt.end();
    });
  });
});
