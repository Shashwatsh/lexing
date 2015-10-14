//// export module lexing {
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
/**
Wraps a Buffer as a stateful iterable.
*/
var BufferIterator = (function () {
    function BufferIterator(_buffer, position) {
        if (position === void 0) { position = 0; }
        this._buffer = _buffer;
        this.position = position;
    }
    BufferIterator.fromString = function (str, encoding) {
        var buffer = new Buffer(str, encoding);
        return new BufferIterator(buffer);
    };
    Object.defineProperty(BufferIterator.prototype, "size", {
        /**
        Return the total length of the underlying Buffer.
        */
        get: function () {
            return this._buffer.length;
        },
        enumerable: true,
        configurable: true
    });
    /**
    Read the next `length` bytes from the underlying Buffer, or fewer iff we reach
    EOF, without advancing our position within the Buffer. Returns a Buffer slice.
    */
    BufferIterator.prototype.peek = function (length) {
        return this._buffer.slice(this.position, this.position + length);
    };
    /**
    Read the next `length` bytes from the underlying Buffer, or fewer iff we reach
    EOF, and advance our position within the Buffer. Returns a Buffer slice.
  
    Buffer#slice never returns entries beyond the end of the buffer:
  
        `new Buffer([1, 2, 3, 4]).slice(2, 10)` produces `<Buffer 03 04>`
    */
    BufferIterator.prototype.next = function (length) {
        var buffer = this._buffer.slice(this.position, this.position + length);
        this.position += buffer.length;
        return buffer;
    };
    /**
    Skip over the next `length` characters, returning the number of skipped
    characters (which may be < `length` iff EOF has been reached).
  
    We do not allow skipping beyond the end of the buffer.
    */
    BufferIterator.prototype.skip = function (length) {
        var bytesSkipped = Math.min(length, this._buffer.length - this.position);
        this.position += bytesSkipped;
        return bytesSkipped;
    };
    return BufferIterator;
})();
exports.BufferIterator = BufferIterator;
/**
Wraps a string as a stateful iterable.
*/
var StringIterator = (function () {
    function StringIterator(_string, position) {
        if (position === void 0) { position = 0; }
        this._string = _string;
        this.position = position;
    }
    StringIterator.fromBuffer = function (buffer, encoding, start, end) {
        var str = buffer.toString(encoding, start, end);
        return new StringIterator(str);
    };
    Object.defineProperty(StringIterator.prototype, "size", {
        /**
        Return the total length of the underlying Buffer.
        */
        get: function () {
            return this._string.length;
        },
        enumerable: true,
        configurable: true
    });
    /**
    Read the next `length` characters from the underlying string, or fewer iff
    we reach EOF, without advancing our position within the string.
    */
    StringIterator.prototype.peek = function (length) {
        return this._string.slice(this.position, this.position + length);
    };
    /**
    Read the next `length` characters from the underlying string, or fewer iff
    we reach EOF, and advance our position within the string.
    */
    StringIterator.prototype.next = function (length) {
        var chunk = this._string.slice(this.position, this.position + length);
        this.position += chunk.length;
        return chunk;
    };
    /**
    Skip over the next `length` characters, returning the number of skipped
    characters (which may be < `length` iff EOF has been reached).
  
    We do not allow skipping beyond the end of the string.
    */
    StringIterator.prototype.skip = function (length) {
        var charsSkipped = Math.min(length, this._string.length - this.position);
        this.position += charsSkipped;
        return charsSkipped;
    };
    return StringIterator;
})();
exports.StringIterator = StringIterator;
/**
Wrap an Array as an iterable.
*/
var ArrayIterator = (function () {
    function ArrayIterator(_array, position) {
        if (position === void 0) { position = 0; }
        this._array = _array;
        this.position = position;
    }
    Object.defineProperty(ArrayIterator.prototype, "size", {
        get: function () {
            return this._array.length;
        },
        enumerable: true,
        configurable: true
    });
    ArrayIterator.prototype.next = function () {
        return this._array[this.position++];
    };
    ArrayIterator.prototype.peek = function () {
        return this._array[this.position + 1];
    };
    ArrayIterator.prototype.skip = function () {
        if (this.position < this._array.length) {
            this.position++;
            return true;
        }
        return false;
    };
    return ArrayIterator;
})();
exports.ArrayIterator = ArrayIterator;
// #############################################################################
//                          SYNCHRONOUS FILE READER
/**
Provide iterative access to a file.

It is buffered, which means you can call `peek(same_number)` repeatedly without
triggering a `read(2)` system call on the underlying file each time. Likewise,
calling `read(small_number)` repeatedly will issue a `read(2)` system call only
when the buffer doesn't have enough data.

When calling `read()` on the underlying file, it will read in batches of
`_block_size` (default: 1024) bytes.
*/
var BufferedSourceReader = (function () {
    // when reading more data, pull in chunks of `block_size` bytes.
    function BufferedSourceReader(_source, _position, _block_size) {
        if (_position === void 0) { _position = 0; }
        if (_block_size === void 0) { _block_size = 1024; }
        this._source = _source;
        this._position = _position;
        this._block_size = _block_size;
        this._buffer = new Buffer(0);
    }
    Object.defineProperty(BufferedSourceReader.prototype, "position", {
        /**
        Return the position in the file that would be read from if we called
        read(...). This is different from the internally-held position, which
        points to the end of the currently held buffer.
        */
        get: function () {
            return this._position - this._buffer.length;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BufferedSourceReader.prototype, "size", {
        /**
        Return the total size (in bytes) of the underlying file.
        */
        get: function () {
            return this._source.size;
        },
        enumerable: true,
        configurable: true
    });
    /**
    Read data from the underlying file and append it to the buffer.
  
    Returns false if the read operation reads fewer than the requested bytes,
    usually signifying that EOF has been reached.
    */
    BufferedSourceReader.prototype._fillBuffer = function (length) {
        var buffer = new Buffer(length);
        // always read from the current position
        var bytesRead = this._source.read(buffer, 0, length, this._position);
        // and update it accordingly
        this._position += bytesRead;
        // use the Buffer.concat totalLength argument to slice the fresh buffer if needed
        this._buffer = Buffer.concat([this._buffer, buffer], this._buffer.length + bytesRead);
        return bytesRead < length;
    };
    /**
    Read from the underlying file, appending to the currently held buffer,
    until the given predicate function returns false. That function will be called
    repeatedly with no arguments. If it returns false the first time it is called,
    nothing will be read.
  
    This may return without the condition being met, if the end of the underlying
    file has been reached.
    */
    BufferedSourceReader.prototype._readWhile = function (predicate) {
        while (predicate(this._buffer)) {
            var EOF = this._fillBuffer(this._block_size);
            if (EOF) {
                // exit regardless
                break;
            }
        }
    };
    return BufferedSourceReader;
})();
exports.BufferedSourceReader = BufferedSourceReader;
var SourceBufferIterator = (function (_super) {
    __extends(SourceBufferIterator, _super);
    function SourceBufferIterator(source, position, block_size) {
        if (position === void 0) { position = 0; }
        if (block_size === void 0) { block_size = 1024; }
        _super.call(this, source, position, block_size);
    }
    SourceBufferIterator.prototype._ensureLength = function (length) {
        var _this = this;
        // all the action happens only if we need more bytes than are in the buffer
        this._readWhile(function () { return length > _this._buffer.length; });
    };
    SourceBufferIterator.prototype.next = function (length) {
        this._ensureLength(length);
        var buffer = this._buffer.slice(0, length);
        this._buffer = this._buffer.slice(length);
        return buffer;
    };
    SourceBufferIterator.prototype.peek = function (length) {
        this._ensureLength(length);
        return this._buffer.slice(0, length);
    };
    /**
    Skip over the next `length` bytes, returning the number of skipped
    bytes (which may be < `length` iff EOF has been reached).
    */
    SourceBufferIterator.prototype.skip = function (length) {
        this._ensureLength(length);
        // we cannot skip more than `this._buffer.length` bytes
        var bytesSkipped = Math.min(length, this._buffer.length);
        this._buffer = this._buffer.slice(length);
        return bytesSkipped;
    };
    return SourceBufferIterator;
})(BufferedSourceReader);
exports.SourceBufferIterator = SourceBufferIterator;
var SourceStringIterator = (function (_super) {
    __extends(SourceStringIterator, _super);
    function SourceStringIterator(source, _encoding, position, block_size) {
        if (position === void 0) { position = 0; }
        if (block_size === void 0) { block_size = 1024; }
        _super.call(this, source, position, block_size);
        this._encoding = _encoding;
    }
    SourceStringIterator.prototype._ensureLength = function (length) {
        var _this = this;
        // TODO: count characters without reencoding
        this._readWhile(function () { return length > _this._buffer.toString(_this._encoding).length; });
    };
    SourceStringIterator.prototype.next = function (length) {
        // TODO: don't re-encode the whole string and then only use a tiny bit of it
        this._ensureLength(length);
        var str = this._buffer.toString(this._encoding).slice(0, length);
        var byteLength = Buffer.byteLength(str, this._encoding);
        this._buffer = this._buffer.slice(byteLength);
        return str;
    };
    SourceStringIterator.prototype.peek = function (length) {
        // TODO (see TODO in next())
        this._ensureLength(length);
        return this._buffer.toString(this._encoding).slice(0, length);
    };
    /**
    Skip over the next `length` characters, returning the number of skipped
    characters (which may be < `length` iff EOF has been reached).
    */
    SourceStringIterator.prototype.skip = function (length) {
        // TODO (see TODO in next())
        // _ensureLength(length) ensures that our subsequent call to toString() will
        // return a string that is at least `length` long.
        this._ensureLength(length);
        var consumed_string = this._buffer.toString(this._encoding).slice(0, length);
        // even though we know we consumed (at least) `length` number of characters,
        // we also need to know exactly how long that string is in bytes, in order
        // to advance the underlying buffer appropriately
        var byteLength = Buffer.byteLength(consumed_string, this._encoding);
        // we cannot skip more than `this._buffer.length` bytes
        // var bytesSkipped = Math.min(byteLength, this._buffer.length); // is this necessary?
        this._buffer = this._buffer.slice(byteLength);
        return consumed_string.length;
    };
    /**
    Provide raw Buffer-level access, too.
    */
    SourceStringIterator.prototype.nextBytes = function (length) {
        this._ensureLength(length);
        var buffer = this._buffer.slice(0, length);
        this._buffer = this._buffer.slice(length);
        return buffer;
    };
    SourceStringIterator.prototype.peekBytes = function (length) {
        this._ensureLength(length);
        return this._buffer.slice(0, length);
    };
    SourceStringIterator.prototype.skipBytes = function (length) {
        this._ensureLength(length);
        var bytesSkipped = Math.min(length, this._buffer.length);
        this._buffer = this._buffer.slice(length);
        return bytesSkipped;
    };
    return SourceStringIterator;
})(BufferedSourceReader);
exports.SourceStringIterator = SourceStringIterator;
function Token(name, value) {
    if (value === void 0) { value = null; }
    return { name: name, value: value };
}
exports.Token = Token;
/**
The type T is the type of each token value, usually `any` (the token name is
always a string).
*/
var Tokenizer = (function () {
    function Tokenizer(default_rules, state_rules, peek_length) {
        if (state_rules === void 0) { state_rules = {}; }
        if (peek_length === void 0) { peek_length = 256; }
        this.default_rules = default_rules;
        this.state_rules = state_rules;
        this.peek_length = peek_length;
    }
    Tokenizer.prototype.getRules = function (state_name) {
        return (state_name === undefined) ? this.default_rules : this.state_rules[state_name];
    };
    /**
    Create a closure around the iterable.
  
    Unfortunately, it seems that TypeScript doesn't like inline functions, so we
    use a helper class (TokenizerIterator).
    */
    Tokenizer.prototype.map = function (iterable, states) {
        if (states === void 0) { states = []; }
        return new TokenizerIterator(this, iterable, states);
    };
    return Tokenizer;
})();
exports.Tokenizer = Tokenizer;
var TokenizerIterator = (function () {
    function TokenizerIterator(tokenizer, iterable, states) {
        this.tokenizer = tokenizer;
        this.iterable = iterable;
        this.states = states;
    }
    /**
    Returns the next available Token from the input reader.
    If the matching rule's action returns null, this will return null.
  
    TODO: optimize string conversion; abstract out the peek + toString, back into the reader?
    */
    TokenizerIterator.prototype._next = function () {
        var state = this.states[this.states.length - 1];
        var rules = this.tokenizer.getRules(state);
        var input = this.iterable.peek(this.tokenizer.peek_length);
        for (var i = 0, rule; (rule = rules[i]); i++) {
            var match = input.match(rule[0]);
            if (match) {
                this.iterable.skip(match[0].length);
                return rule[1].call(this, match);
            }
        }
        var state_description = (state === undefined) ? 'the default state' : "state \"" + state + "\"";
        throw new Error("Invalid language; could not find a match in input \"" + input + "\" while in " + state_description);
    };
    /**
    Returns the next available non-null token / symbol output from the input
    reader (usually a token_data: [string, any] tuple).
  
    This will never return null, but may return undefined if one of the rules
    returns undefined, which the rule should not do! It will never a Token with
    a null name.
    */
    TokenizerIterator.prototype.next = function () {
        while (1) {
            var token = this._next();
            if (token !== null && token.name !== null) {
                return token;
            }
        }
    };
    return TokenizerIterator;
})();
/**
Recombine a stream of tokens using a stack of lists, e.g.,

    WORD:BT START:STRING CHAR:A CHAR:b CHAR:c END:STRING WORD:ET

becomes:

    WORD:BT STRING:Abc WORD:ET

*/
var Combiner = (function () {
    function Combiner(rules) {
        this.rules = rules;
    }
    Combiner.prototype.findRule = function (name) {
        for (var i = 0, rule; (rule = this.rules[i]); i++) {
            if (rule[0] === name) {
                return rule;
            }
        }
        throw new Error("No combiner rule found with the name: " + name);
    };
    Combiner.prototype.map = function (iterable, stack) {
        if (stack === void 0) { stack = []; }
        return new CombinerIterator(this, iterable, stack);
    };
    return Combiner;
})();
exports.Combiner = Combiner;
var CombinerIterator = (function () {
    function CombinerIterator(combiner, iterable, stack) {
        this.combiner = combiner;
        this.iterable = iterable;
        this.stack = stack;
    }
    /**
    Returns the next available pair from the input reader (usually [token, data]).
  
    If the matching rule's action returns null, this will return null.
    */
    CombinerIterator.prototype.next = function () {
        var token = this.iterable.next();
        if (token.name == 'END') {
            // TODO: check that the preceding START token has the same value
            var tokens = this.stack.pop();
            // type hack with <any>
            var rule = this.combiner.findRule(token.value);
            // reduce into combined token
            token = rule[1](tokens);
        }
        if (token.name == 'START') {
            // TODO: store the START token's value somewhere so that we can verify the END token's value matches
            this.stack.push([]);
            return this.next();
        }
        else if (this.stack.length > 0) {
            // push it onto the list at the top of the stack
            this.stack[this.stack.length - 1].push(token);
            return this.next();
        }
        else {
            // tokens at root level pass through transparently
            return token;
        }
    };
    return CombinerIterator;
})();
function MachineRule(regexp, callback) {
    return [regexp, callback];
}
exports.MachineRule = MachineRule;
/**
Every MachineState has:

* value: I
  An internal value, which is incrementally built based on the input.
* read(): T
  This derives a value of type T from the input.
* rules: MachineRule[]
  Each MachineRule maps a string pattern to an instance method, which returns
  a value of type T (or null). If a rule matches the input and the corresponding
  instance method returns a non-null value, we should exit (pop) this state by
  returning from read().

`T` is the result Type
`I` is the internal Type
*/
var MachineState = (function () {
    function MachineState(iterable, peek_length) {
        if (peek_length === void 0) { peek_length = 256; }
        this.iterable = iterable;
        this.peek_length = peek_length;
    }
    Object.defineProperty(MachineState.prototype, "name", {
        get: function () {
            return this.constructor['name'];
        },
        enumerable: true,
        configurable: true
    });
    // generic callbacks
    MachineState.prototype.pop = function () {
        return this.value;
    };
    MachineState.prototype.ignore = function () {
        return undefined;
    };
    MachineState.prototype.attachState = function (SubState) {
        return new SubState(this.iterable, this.peek_length);
    };
    MachineState.prototype.read = function () {
        while (1) {
            var input = this.iterable.peek(this.peek_length);
            var match;
            for (var i = 0, rule; (rule = this.rules[i]); i++) {
                // rule[0] is the RegExp; rule[1] is the instance method to call on success
                match = input.match(rule[0]);
                if (match !== null) {
                    // advance the input tape over the matched input
                    this.iterable.skip(match[0].length);
                    // apply the matched transition
                    var result = rule[1].call(this, match);
                    if (result !== undefined) {
                        return result;
                    }
                    if (input.length === 0) {
                        throw new Error("EOF reached without termination; cannot continue");
                    }
                    // break out of the for loop while match is still defined
                    break;
                }
            }
            // If at some point in the input iterable we run through all the patterns
            // and none of them match, we cannot proceed further.
            if (match === null) {
                var clean_input = input.slice(0, 128).replace(/\r\n|\r/g, '\n').replace(/\t|\v|\f/g, ' ').replace(/\0|\b/g, '');
                throw new Error("Invalid language; could not find a match in input \"" + clean_input + "\" for state \"" + this.name + "\"");
            }
        }
    };
    return MachineState;
})();
exports.MachineState = MachineState;
//// }
