/// <reference path="../type_declarations/DefinitelyTyped/node/node.d.ts" />
/// <reference path="../type_declarations/DefinitelyTyped/mocha/mocha.d.ts" />
var assert = require('assert');
var lexing = require('../index');
function readToEOF(iterable) {
    var items = [];
    while (1) {
        var item = iterable.next();
        items.push(item);
        if (item.name == 'EOF') {
            break;
        }
    }
    return items;
}
function Token(name, value) {
    if (value === void 0) { value = null; }
    return { name: name, value: value };
}
describe('tokenizer', function () {
    var tokenizer = new lexing.Tokenizer([
        [/^$/, function (match) { return Token('EOF'); }],
        [/^\s+/, function (match) { return null; }],
        [/^\w+/, function (match) { return Token('WORD', match[0]); }],
    ]);
    it('should lex simple string', function () {
        var input_iterable = lexing.BufferIterator.fromString('This is a simple sentence');
        var output_iterable = tokenizer.map(input_iterable);
        var expected_tokens = [
            Token('WORD', 'This'),
            Token('WORD', 'is'),
            Token('WORD', 'a'),
            Token('WORD', 'simple'),
            Token('WORD', 'sentence'),
            Token('EOF'),
        ];
        var actual_tokens = readToEOF(output_iterable);
        assert.deepEqual(actual_tokens, expected_tokens);
    });
});
describe('combiner', function () {
    var combiner = new lexing.Combiner([
        ['STRING', function (tokens) { return Token('STRING', tokens.map(function (token) { return token.value; }).join('')); }],
        ['ARRAY', function (tokens) { return Token('ARRAY', tokens.map(function (token) { return token.value; })); }],
    ]);
    it('should join a START/END delimited STRING in a series of tokens', function () {
        var input_iterable = new lexing.ArrayIterator([
            Token('WORD', 'BT'),
            Token('START', 'STRING'),
            Token('CHAR', 'A'),
            Token('CHAR', 'b'),
            Token('CHAR', 'c'),
            Token('END', 'STRING'),
            Token('WORD', 'ET'),
            Token('EOF'),
        ]);
        var output_iterable = combiner.map(input_iterable);
        var expected_tokens = [
            Token('WORD', 'BT'),
            Token('STRING', 'Abc'),
            Token('WORD', 'ET'),
            Token('EOF'),
        ];
        var actual_tokens = readToEOF(output_iterable);
        assert.deepEqual(actual_tokens, expected_tokens);
    });
    it('should combine a START/END delimited ARRAY as a basic Array', function () {
        var input_iterable = new lexing.ArrayIterator([
            Token('WORD', 'BT'),
            Token('START', 'ARRAY'),
            Token('CHAR', 'A'),
            Token('CHAR', 'b'),
            Token('CHAR', 'c'),
            Token('END', 'ARRAY'),
            Token('WORD', 'ET'),
            Token('EOF'),
        ]);
        var output_iterable = combiner.map(input_iterable);
        var expected_tokens = [
            Token('WORD', 'BT'),
            Token('ARRAY', ['A', 'b', 'c']),
            Token('WORD', 'ET'),
            Token('EOF'),
        ];
        var actual_tokens = readToEOF(output_iterable);
        assert.deepEqual(actual_tokens, expected_tokens);
    });
    it('should join strings nested inside an array', function () {
        var input_iterable = new lexing.ArrayIterator([
            Token('WORD', 'BT'),
            Token('START', 'ARRAY'),
            Token('START', 'STRING'),
            Token('CHAR', 'A'),
            Token('CHAR', 'b'),
            Token('CHAR', 'c'),
            Token('END', 'STRING'),
            Token('NUMBER', 10),
            Token('START', 'STRING'),
            Token('CHAR', 'D'),
            Token('CHAR', 'e'),
            Token('CHAR', 'f'),
            Token('END', 'STRING'),
            Token('NUMBER', 20),
            Token('END', 'ARRAY'),
            Token('WORD', 'ET'),
            Token('EOF'),
        ]);
        var output_iterable = combiner.map(input_iterable);
        var expected_tokens = [
            Token('WORD', 'BT'),
            Token('ARRAY', ['Abc', 10, 'Def', 20]),
            Token('WORD', 'ET'),
            Token('EOF'),
        ];
        var actual_tokens = readToEOF(output_iterable);
        assert.deepEqual(actual_tokens, expected_tokens);
    });
});
