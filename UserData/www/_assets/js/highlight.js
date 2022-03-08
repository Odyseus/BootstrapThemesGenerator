/*!
  Highlight.js v11.3.1 (git: 2a972d8658)
  (c) 2006-2021 Ivan Sagalaev and other contributors
  License: BSD-3-Clause
 */
var hljs = (function () {
    'use strict';

    var deepFreezeEs6 = {exports: {}};

    function deepFreeze(obj) {
        if (obj instanceof Map) {
            obj.clear = obj.delete = obj.set = function () {
                throw new Error('map is read-only');
            };
        } else if (obj instanceof Set) {
            obj.add = obj.clear = obj.delete = function () {
                throw new Error('set is read-only');
            };
        }

        // Freeze self
        Object.freeze(obj);

        Object.getOwnPropertyNames(obj).forEach(function (name) {
            var prop = obj[name];

            // Freeze prop if it is an object
            if (typeof prop == 'object' && !Object.isFrozen(prop)) {
                deepFreeze(prop);
            }
        });

        return obj;
    }

    deepFreezeEs6.exports = deepFreeze;
    deepFreezeEs6.exports.default = deepFreeze;

    var deepFreeze$1 = deepFreezeEs6.exports;

    /** @typedef {import('highlight.js').CallbackResponse} CallbackResponse */
    /** @typedef {import('highlight.js').CompiledMode} CompiledMode */
    /** @implements CallbackResponse */

    class Response {
      /**
       * @param {CompiledMode} mode
       */
      constructor(mode) {
        // eslint-disable-next-line no-undefined
        if (mode.data === undefined) mode.data = {};

        this.data = mode.data;
        this.isMatchIgnored = false;
      }

      ignoreMatch() {
        this.isMatchIgnored = true;
      }
    }

    /**
     * @param {string} value
     * @returns {string}
     */
    function escapeHTML(value) {
      return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
    }

    /**
     * performs a shallow merge of multiple objects into one
     *
     * @template T
     * @param {T} original
     * @param {Record<string,any>[]} objects
     * @returns {T} a single new object
     */
    function inherit$1(original, ...objects) {
      /** @type Record<string,any> */
      const result = Object.create(null);

      for (const key in original) {
        result[key] = original[key];
      }
      objects.forEach(function(obj) {
        for (const key in obj) {
          result[key] = obj[key];
        }
      });
      return /** @type {T} */ (result);
    }

    /**
     * @typedef {object} Renderer
     * @property {(text: string) => void} addText
     * @property {(node: Node) => void} openNode
     * @property {(node: Node) => void} closeNode
     * @property {() => string} value
     */

    /** @typedef {{kind?: string, sublanguage?: boolean}} Node */
    /** @typedef {{walk: (r: Renderer) => void}} Tree */
    /** */

    const SPAN_CLOSE = '</span>';

    /**
     * Determines if a node needs to be wrapped in <span>
     *
     * @param {Node} node */
    const emitsWrappingTags = (node) => {
      return !!node.kind;
    };

    /**
     *
     * @param {string} name
     * @param {{prefix:string}} options
     */
    const expandScopeName = (name, { prefix }) => {
      if (name.includes(".")) {
        const pieces = name.split(".");
        return [
          `${prefix}${pieces.shift()}`,
          ...(pieces.map((x, i) => `${x}${"_".repeat(i + 1)}`))
        ].join(" ");
      }
      return `${prefix}${name}`;
    };

    /** @type {Renderer} */
    class HTMLRenderer {
      /**
       * Creates a new HTMLRenderer
       *
       * @param {Tree} parseTree - the parse tree (must support `walk` API)
       * @param {{classPrefix: string}} options
       */
      constructor(parseTree, options) {
        this.buffer = "";
        this.classPrefix = options.classPrefix;
        parseTree.walk(this);
      }

      /**
       * Adds texts to the output stream
       *
       * @param {string} text */
      addText(text) {
        this.buffer += escapeHTML(text);
      }

      /**
       * Adds a node open to the output stream (if needed)
       *
       * @param {Node} node */
      openNode(node) {
        if (!emitsWrappingTags(node)) return;

        let scope = node.kind;
        if (node.sublanguage) {
          scope = `language-${scope}`;
        } else {
          scope = expandScopeName(scope, { prefix: this.classPrefix });
        }
        this.span(scope);
      }

      /**
       * Adds a node close to the output stream (if needed)
       *
       * @param {Node} node */
      closeNode(node) {
        if (!emitsWrappingTags(node)) return;

        this.buffer += SPAN_CLOSE;
      }

      /**
       * returns the accumulated buffer
      */
      value() {
        return this.buffer;
      }

      // helpers

      /**
       * Builds a span element
       *
       * @param {string} className */
      span(className) {
        this.buffer += `<span class="${className}">`;
      }
    }

    /** @typedef {{kind?: string, sublanguage?: boolean, children: Node[]} | string} Node */
    /** @typedef {{kind?: string, sublanguage?: boolean, children: Node[]} } DataNode */
    /** @typedef {import('highlight.js').Emitter} Emitter */
    /**  */

    class TokenTree {
      constructor() {
        /** @type DataNode */
        this.rootNode = { children: [] };
        this.stack = [this.rootNode];
      }

      get top() {
        return this.stack[this.stack.length - 1];
      }

      get root() { return this.rootNode; }

      /** @param {Node} node */
      add(node) {
        this.top.children.push(node);
      }

      /** @param {string} kind */
      openNode(kind) {
        /** @type Node */
        const node = { kind, children: [] };
        this.add(node);
        this.stack.push(node);
      }

      closeNode() {
        if (this.stack.length > 1) {
          return this.stack.pop();
        }
        // eslint-disable-next-line no-undefined
        return undefined;
      }

      closeAllNodes() {
        while (this.closeNode());
      }

      toJSON() {
        return JSON.stringify(this.rootNode, null, 4);
      }

      /**
       * @typedef { import("./html_renderer").Renderer } Renderer
       * @param {Renderer} builder
       */
      walk(builder) {
        // this does not
        return this.constructor._walk(builder, this.rootNode);
        // this works
        // return TokenTree._walk(builder, this.rootNode);
      }

      /**
       * @param {Renderer} builder
       * @param {Node} node
       */
      static _walk(builder, node) {
        if (typeof node === "string") {
          builder.addText(node);
        } else if (node.children) {
          builder.openNode(node);
          node.children.forEach((child) => this._walk(builder, child));
          builder.closeNode(node);
        }
        return builder;
      }

      /**
       * @param {Node} node
       */
      static _collapse(node) {
        if (typeof node === "string") return;
        if (!node.children) return;

        if (node.children.every(el => typeof el === "string")) {
          // node.text = node.children.join("");
          // delete node.children;
          node.children = [node.children.join("")];
        } else {
          node.children.forEach((child) => {
            TokenTree._collapse(child);
          });
        }
      }
    }

    /**
      Currently this is all private API, but this is the minimal API necessary
      that an Emitter must implement to fully support the parser.

      Minimal interface:

      - addKeyword(text, kind)
      - addText(text)
      - addSublanguage(emitter, subLanguageName)
      - finalize()
      - openNode(kind)
      - closeNode()
      - closeAllNodes()
      - toHTML()

    */

    /**
     * @implements {Emitter}
     */
    class TokenTreeEmitter extends TokenTree {
      /**
       * @param {*} options
       */
      constructor(options) {
        super();
        this.options = options;
      }

      /**
       * @param {string} text
       * @param {string} kind
       */
      addKeyword(text, kind) {
        if (text === "") { return; }

        this.openNode(kind);
        this.addText(text);
        this.closeNode();
      }

      /**
       * @param {string} text
       */
      addText(text) {
        if (text === "") { return; }

        this.add(text);
      }

      /**
       * @param {Emitter & {root: DataNode}} emitter
       * @param {string} name
       */
      addSublanguage(emitter, name) {
        /** @type DataNode */
        const node = emitter.root;
        node.kind = name;
        node.sublanguage = true;
        this.add(node);
      }

      toHTML() {
        const renderer = new HTMLRenderer(this, this.options);
        return renderer.value();
      }

      finalize() {
        return true;
      }
    }

    /**
     * @param {string} value
     * @returns {RegExp}
     * */

    /**
     * @param {RegExp | string } re
     * @returns {string}
     */
    function source(re) {
      if (!re) return null;
      if (typeof re === "string") return re;

      return re.source;
    }

    /**
     * @param {RegExp | string } re
     * @returns {string}
     */
    function lookahead(re) {
      return concat('(?=', re, ')');
    }

    /**
     * @param {RegExp | string } re
     * @returns {string}
     */
    function anyNumberOfTimes(re) {
      return concat('(?:', re, ')*');
    }

    /**
     * @param {RegExp | string } re
     * @returns {string}
     */
    function optional(re) {
      return concat('(?:', re, ')?');
    }

    /**
     * @param {...(RegExp | string) } args
     * @returns {string}
     */
    function concat(...args) {
      const joined = args.map((x) => source(x)).join("");
      return joined;
    }

    /**
     * @param { Array<string | RegExp | Object> } args
     * @returns {object}
     */
    function stripOptionsFromArgs(args) {
      const opts = args[args.length - 1];

      if (typeof opts === 'object' && opts.constructor === Object) {
        args.splice(args.length - 1, 1);
        return opts;
      } else {
        return {};
      }
    }

    /**
     * Any of the passed expresssions may match
     *
     * Creates a huge this | this | that | that match
     * @param {(RegExp | string)[] } args
     * @returns {string}
     */
    function either(...args) {
      /** @type { object & {capture?: boolean} }  */
      const opts = stripOptionsFromArgs(args);
      const joined = '('
        + (opts.capture ? "" : "?:")
        + args.map((x) => source(x)).join("|") + ")";
      return joined;
    }

    /**
     * @param {RegExp | string} re
     * @returns {number}
     */
    function countMatchGroups(re) {
      return (new RegExp(re.toString() + '|')).exec('').length - 1;
    }

    /**
     * Does lexeme start with a regular expression match at the beginning
     * @param {RegExp} re
     * @param {string} lexeme
     */
    function startsWith(re, lexeme) {
      const match = re && re.exec(lexeme);
      return match && match.index === 0;
    }

    // BACKREF_RE matches an open parenthesis or backreference. To avoid
    // an incorrect parse, it additionally matches the following:
    // - [...] elements, where the meaning of parentheses and escapes change
    // - other escape sequences, so we do not misparse escape sequences as
    //   interesting elements
    // - non-matching or lookahead parentheses, which do not capture. These
    //   follow the '(' with a '?'.
    const BACKREF_RE = /\[(?:[^\\\]]|\\.)*\]|\(\??|\\([1-9][0-9]*)|\\./;

    // **INTERNAL** Not intended for outside usage
    // join logically computes regexps.join(separator), but fixes the
    // backreferences so they continue to match.
    // it also places each individual regular expression into it's own
    // match group, keeping track of the sequencing of those match groups
    // is currently an exercise for the caller. :-)
    /**
     * @param {(string | RegExp)[]} regexps
     * @param {{joinWith: string}} opts
     * @returns {string}
     */
    function _rewriteBackreferences(regexps, { joinWith }) {
      let numCaptures = 0;

      return regexps.map((regex) => {
        numCaptures += 1;
        const offset = numCaptures;
        let re = source(regex);
        let out = '';

        while (re.length > 0) {
          const match = BACKREF_RE.exec(re);
          if (!match) {
            out += re;
            break;
          }
          out += re.substring(0, match.index);
          re = re.substring(match.index + match[0].length);
          if (match[0][0] === '\\' && match[1]) {
            // Adjust the backreference.
            out += '\\' + String(Number(match[1]) + offset);
          } else {
            out += match[0];
            if (match[0] === '(') {
              numCaptures++;
            }
          }
        }
        return out;
      }).map(re => `(${re})`).join(joinWith);
    }

    /** @typedef {import('highlight.js').Mode} Mode */
    /** @typedef {import('highlight.js').ModeCallback} ModeCallback */

    // Common regexps
    const MATCH_NOTHING_RE = /\b\B/;
    const IDENT_RE$1 = '[a-zA-Z]\\w*';
    const UNDERSCORE_IDENT_RE = '[a-zA-Z_]\\w*';
    const NUMBER_RE = '\\b\\d+(\\.\\d+)?';
    const C_NUMBER_RE = '(-?)(\\b0[xX][a-fA-F0-9]+|(\\b\\d+(\\.\\d*)?|\\.\\d+)([eE][-+]?\\d+)?)'; // 0x..., 0..., decimal, float
    const BINARY_NUMBER_RE = '\\b(0b[01]+)'; // 0b...
    const RE_STARTERS_RE = '!|!=|!==|%|%=|&|&&|&=|\\*|\\*=|\\+|\\+=|,|-|-=|/=|/|:|;|<<|<<=|<=|<|===|==|=|>>>=|>>=|>=|>>>|>>|>|\\?|\\[|\\{|\\(|\\^|\\^=|\\||\\|=|\\|\\||~';

    /**
    * @param { Partial<Mode> & {binary?: string | RegExp} } opts
    */
    const SHEBANG = (opts = {}) => {
      const beginShebang = /^#![ ]*\//;
      if (opts.binary) {
        opts.begin = concat(
          beginShebang,
          /.*\b/,
          opts.binary,
          /\b.*/);
      }
      return inherit$1({
        scope: 'meta',
        begin: beginShebang,
        end: /$/,
        relevance: 0,
        /** @type {ModeCallback} */
        "on:begin": (m, resp) => {
          if (m.index !== 0) resp.ignoreMatch();
        }
      }, opts);
    };

    // Common modes
    const BACKSLASH_ESCAPE = {
      begin: '\\\\[\\s\\S]', relevance: 0
    };
    const APOS_STRING_MODE = {
      scope: 'string',
      begin: '\'',
      end: '\'',
      illegal: '\\n',
      contains: [BACKSLASH_ESCAPE]
    };
    const QUOTE_STRING_MODE = {
      scope: 'string',
      begin: '"',
      end: '"',
      illegal: '\\n',
      contains: [BACKSLASH_ESCAPE]
    };
    const PHRASAL_WORDS_MODE = {
      begin: /\b(a|an|the|are|I'm|isn't|don't|doesn't|won't|but|just|should|pretty|simply|enough|gonna|going|wtf|so|such|will|you|your|they|like|more)\b/
    };
    /**
     * Creates a comment mode
     *
     * @param {string | RegExp} begin
     * @param {string | RegExp} end
     * @param {Mode | {}} [modeOptions]
     * @returns {Partial<Mode>}
     */
    const COMMENT = function(begin, end, modeOptions = {}) {
      const mode = inherit$1(
        {
          scope: 'comment',
          begin,
          end,
          contains: []
        },
        modeOptions
      );
      mode.contains.push({
        scope: 'doctag',
        // hack to avoid the space from being included. the space is necessary to
        // match here to prevent the plain text rule below from gobbling up doctags
        begin: '[ ]*(?=(TODO|FIXME|NOTE|BUG|OPTIMIZE|HACK|XXX):)',
        end: /(TODO|FIXME|NOTE|BUG|OPTIMIZE|HACK|XXX):/,
        excludeBegin: true,
        relevance: 0
      });
      const ENGLISH_WORD = either(
        // list of common 1 and 2 letter words in English
        "I",
        "a",
        "is",
        "so",
        "us",
        "to",
        "at",
        "if",
        "in",
        "it",
        "on",
        // note: this is not an exhaustive list of contractions, just popular ones
        /[A-Za-z]+['](d|ve|re|ll|t|s|n)/, // contractions - can't we'd they're let's, etc
        /[A-Za-z]+[-][a-z]+/, // `no-way`, etc.
        /[A-Za-z][a-z]{2,}/ // allow capitalized words at beginning of sentences
      );
      // looking like plain text, more likely to be a comment
      mode.contains.push(
        {
          // TODO: how to include ", (, ) without breaking grammars that use these for
          // comment delimiters?
          // begin: /[ ]+([()"]?([A-Za-z'-]{3,}|is|a|I|so|us|[tT][oO]|at|if|in|it|on)[.]?[()":]?([.][ ]|[ ]|\))){3}/
          // ---

          // this tries to find sequences of 3 english words in a row (without any
          // "programming" type syntax) this gives us a strong signal that we've
          // TRULY found a comment - vs perhaps scanning with the wrong language.
          // It's possible to find something that LOOKS like the start of the
          // comment - but then if there is no readable text - good chance it is a
          // false match and not a comment.
          //
          // for a visual example please see:
          // https://github.com/highlightjs/highlight.js/issues/2827

          begin: concat(
            /[ ]+/, // necessary to prevent us gobbling up doctags like /* @author Bob Mcgill */
            '(',
            ENGLISH_WORD,
            /[.]?[:]?([.][ ]|[ ])/,
            '){3}') // look for 3 words in a row
        }
      );
      return mode;
    };
    const C_LINE_COMMENT_MODE = COMMENT('//', '$');
    const C_BLOCK_COMMENT_MODE = COMMENT('/\\*', '\\*/');
    const HASH_COMMENT_MODE = COMMENT('#', '$');
    const NUMBER_MODE = {
      scope: 'number',
      begin: NUMBER_RE,
      relevance: 0
    };
    const C_NUMBER_MODE = {
      scope: 'number',
      begin: C_NUMBER_RE,
      relevance: 0
    };
    const BINARY_NUMBER_MODE = {
      scope: 'number',
      begin: BINARY_NUMBER_RE,
      relevance: 0
    };
    const REGEXP_MODE = {
      // this outer rule makes sure we actually have a WHOLE regex and not simply
      // an expression such as:
      //
      //     3 / something
      //
      // (which will then blow up when regex's `illegal` sees the newline)
      begin: /(?=\/[^/\n]*\/)/,
      contains: [{
        scope: 'regexp',
        begin: /\//,
        end: /\/[gimuy]*/,
        illegal: /\n/,
        contains: [
          BACKSLASH_ESCAPE,
          {
            begin: /\[/,
            end: /\]/,
            relevance: 0,
            contains: [BACKSLASH_ESCAPE]
          }
        ]
      }]
    };
    const TITLE_MODE = {
      scope: 'title',
      begin: IDENT_RE$1,
      relevance: 0
    };
    const UNDERSCORE_TITLE_MODE = {
      scope: 'title',
      begin: UNDERSCORE_IDENT_RE,
      relevance: 0
    };
    const METHOD_GUARD = {
      // excludes method names from keyword processing
      begin: '\\.\\s*' + UNDERSCORE_IDENT_RE,
      relevance: 0
    };

    /**
     * Adds end same as begin mechanics to a mode
     *
     * Your mode must include at least a single () match group as that first match
     * group is what is used for comparison
     * @param {Partial<Mode>} mode
     */
    const END_SAME_AS_BEGIN = function(mode) {
      return Object.assign(mode,
        {
          /** @type {ModeCallback} */
          'on:begin': (m, resp) => { resp.data._beginMatch = m[1]; },
          /** @type {ModeCallback} */
          'on:end': (m, resp) => { if (resp.data._beginMatch !== m[1]) resp.ignoreMatch(); }
        });
    };

    var MODES$1 = /*#__PURE__*/Object.freeze({
        __proto__: null,
        MATCH_NOTHING_RE: MATCH_NOTHING_RE,
        IDENT_RE: IDENT_RE$1,
        UNDERSCORE_IDENT_RE: UNDERSCORE_IDENT_RE,
        NUMBER_RE: NUMBER_RE,
        C_NUMBER_RE: C_NUMBER_RE,
        BINARY_NUMBER_RE: BINARY_NUMBER_RE,
        RE_STARTERS_RE: RE_STARTERS_RE,
        SHEBANG: SHEBANG,
        BACKSLASH_ESCAPE: BACKSLASH_ESCAPE,
        APOS_STRING_MODE: APOS_STRING_MODE,
        QUOTE_STRING_MODE: QUOTE_STRING_MODE,
        PHRASAL_WORDS_MODE: PHRASAL_WORDS_MODE,
        COMMENT: COMMENT,
        C_LINE_COMMENT_MODE: C_LINE_COMMENT_MODE,
        C_BLOCK_COMMENT_MODE: C_BLOCK_COMMENT_MODE,
        HASH_COMMENT_MODE: HASH_COMMENT_MODE,
        NUMBER_MODE: NUMBER_MODE,
        C_NUMBER_MODE: C_NUMBER_MODE,
        BINARY_NUMBER_MODE: BINARY_NUMBER_MODE,
        REGEXP_MODE: REGEXP_MODE,
        TITLE_MODE: TITLE_MODE,
        UNDERSCORE_TITLE_MODE: UNDERSCORE_TITLE_MODE,
        METHOD_GUARD: METHOD_GUARD,
        END_SAME_AS_BEGIN: END_SAME_AS_BEGIN
    });

    /**
    @typedef {import('highlight.js').CallbackResponse} CallbackResponse
    @typedef {import('highlight.js').CompilerExt} CompilerExt
    */

    // Grammar extensions / plugins
    // See: https://github.com/highlightjs/highlight.js/issues/2833

    // Grammar extensions allow "syntactic sugar" to be added to the grammar modes
    // without requiring any underlying changes to the compiler internals.

    // `compileMatch` being the perfect small example of now allowing a grammar
    // author to write `match` when they desire to match a single expression rather
    // than being forced to use `begin`.  The extension then just moves `match` into
    // `begin` when it runs.  Ie, no features have been added, but we've just made
    // the experience of writing (and reading grammars) a little bit nicer.

    // ------

    // TODO: We need negative look-behind support to do this properly
    /**
     * Skip a match if it has a preceding dot
     *
     * This is used for `beginKeywords` to prevent matching expressions such as
     * `bob.keyword.do()`. The mode compiler automatically wires this up as a
     * special _internal_ 'on:begin' callback for modes with `beginKeywords`
     * @param {RegExpMatchArray} match
     * @param {CallbackResponse} response
     */
    function skipIfHasPrecedingDot(match, response) {
      const before = match.input[match.index - 1];
      if (before === ".") {
        response.ignoreMatch();
      }
    }

    /**
     *
     * @type {CompilerExt}
     */
    function scopeClassName(mode, _parent) {
      // eslint-disable-next-line no-undefined
      if (mode.className !== undefined) {
        mode.scope = mode.className;
        delete mode.className;
      }
    }

    /**
     * `beginKeywords` syntactic sugar
     * @type {CompilerExt}
     */
    function beginKeywords(mode, parent) {
      if (!parent) return;
      if (!mode.beginKeywords) return;

      // for languages with keywords that include non-word characters checking for
      // a word boundary is not sufficient, so instead we check for a word boundary
      // or whitespace - this does no harm in any case since our keyword engine
      // doesn't allow spaces in keywords anyways and we still check for the boundary
      // first
      mode.begin = '\\b(' + mode.beginKeywords.split(' ').join('|') + ')(?!\\.)(?=\\b|\\s)';
      mode.__beforeBegin = skipIfHasPrecedingDot;
      mode.keywords = mode.keywords || mode.beginKeywords;
      delete mode.beginKeywords;

      // prevents double relevance, the keywords themselves provide
      // relevance, the mode doesn't need to double it
      // eslint-disable-next-line no-undefined
      if (mode.relevance === undefined) mode.relevance = 0;
    }

    /**
     * Allow `illegal` to contain an array of illegal values
     * @type {CompilerExt}
     */
    function compileIllegal(mode, _parent) {
      if (!Array.isArray(mode.illegal)) return;

      mode.illegal = either(...mode.illegal);
    }

    /**
     * `match` to match a single expression for readability
     * @type {CompilerExt}
     */
    function compileMatch(mode, _parent) {
      if (!mode.match) return;
      if (mode.begin || mode.end) throw new Error("begin & end are not supported with match");

      mode.begin = mode.match;
      delete mode.match;
    }

    /**
     * provides the default 1 relevance to all modes
     * @type {CompilerExt}
     */
    function compileRelevance(mode, _parent) {
      // eslint-disable-next-line no-undefined
      if (mode.relevance === undefined) mode.relevance = 1;
    }

    // allow beforeMatch to act as a "qualifier" for the match
    // the full match begin must be [beforeMatch][begin]
    const beforeMatchExt = (mode, parent) => {
      if (!mode.beforeMatch) return;
      // starts conflicts with endsParent which we need to make sure the child
      // rule is not matched multiple times
      if (mode.starts) throw new Error("beforeMatch cannot be used with starts");

      const originalMode = Object.assign({}, mode);
      Object.keys(mode).forEach((key) => { delete mode[key]; });

      mode.keywords = originalMode.keywords;
      mode.begin = concat(originalMode.beforeMatch, lookahead(originalMode.begin));
      mode.starts = {
        relevance: 0,
        contains: [
          Object.assign(originalMode, { endsParent: true })
        ]
      };
      mode.relevance = 0;

      delete originalMode.beforeMatch;
    };

    // keywords that should have no default relevance value
    const COMMON_KEYWORDS = [
      'of',
      'and',
      'for',
      'in',
      'not',
      'or',
      'if',
      'then',
      'parent', // common variable name
      'list', // common variable name
      'value' // common variable name
    ];

    const DEFAULT_KEYWORD_SCOPE = "keyword";

    /**
     * Given raw keywords from a language definition, compile them.
     *
     * @param {string | Record<string,string|string[]> | Array<string>} rawKeywords
     * @param {boolean} caseInsensitive
     */
    function compileKeywords(rawKeywords, caseInsensitive, scopeName = DEFAULT_KEYWORD_SCOPE) {
      /** @type KeywordDict */
      const compiledKeywords = Object.create(null);

      // input can be a string of keywords, an array of keywords, or a object with
      // named keys representing scopeName (which can then point to a string or array)
      if (typeof rawKeywords === 'string') {
        compileList(scopeName, rawKeywords.split(" "));
      } else if (Array.isArray(rawKeywords)) {
        compileList(scopeName, rawKeywords);
      } else {
        Object.keys(rawKeywords).forEach(function(scopeName) {
          // collapse all our objects back into the parent object
          Object.assign(
            compiledKeywords,
            compileKeywords(rawKeywords[scopeName], caseInsensitive, scopeName)
          );
        });
      }
      return compiledKeywords;

      // ---

      /**
       * Compiles an individual list of keywords
       *
       * Ex: "for if when while|5"
       *
       * @param {string} scopeName
       * @param {Array<string>} keywordList
       */
      function compileList(scopeName, keywordList) {
        if (caseInsensitive) {
          keywordList = keywordList.map(x => x.toLowerCase());
        }
        keywordList.forEach(function(keyword) {
          const pair = keyword.split('|');
          compiledKeywords[pair[0]] = [scopeName, scoreForKeyword(pair[0], pair[1])];
        });
      }
    }

    /**
     * Returns the proper score for a given keyword
     *
     * Also takes into account comment keywords, which will be scored 0 UNLESS
     * another score has been manually assigned.
     * @param {string} keyword
     * @param {string} [providedScore]
     */
    function scoreForKeyword(keyword, providedScore) {
      // manual scores always win over common keywords
      // so you can force a score of 1 if you really insist
      if (providedScore) {
        return Number(providedScore);
      }

      return commonKeyword(keyword) ? 0 : 1;
    }

    /**
     * Determines if a given keyword is common or not
     *
     * @param {string} keyword */
    function commonKeyword(keyword) {
      return COMMON_KEYWORDS.includes(keyword.toLowerCase());
    }

    /*

    For the reasoning behind this please see:
    https://github.com/highlightjs/highlight.js/issues/2880#issuecomment-747275419

    */

    /**
     * @type {Record<string, boolean>}
     */
    const seenDeprecations = {};

    /**
     * @param {string} message
     */
    const error = (message) => {
      console.error(message);
    };

    /**
     * @param {string} message
     * @param {any} args
     */
    const warn = (message, ...args) => {
      console.log(`WARN: ${message}`, ...args);
    };

    /**
     * @param {string} version
     * @param {string} message
     */
    const deprecated = (version, message) => {
      if (seenDeprecations[`${version}/${message}`]) return;

      console.log(`Deprecated as of ${version}. ${message}`);
      seenDeprecations[`${version}/${message}`] = true;
    };

    /* eslint-disable no-throw-literal */

    /**
    @typedef {import('highlight.js').CompiledMode} CompiledMode
    */

    const MultiClassError = new Error();

    /**
     * Renumbers labeled scope names to account for additional inner match
     * groups that otherwise would break everything.
     *
     * Lets say we 3 match scopes:
     *
     *   { 1 => ..., 2 => ..., 3 => ... }
     *
     * So what we need is a clean match like this:
     *
     *   (a)(b)(c) => [ "a", "b", "c" ]
     *
     * But this falls apart with inner match groups:
     *
     * (a)(((b)))(c) => ["a", "b", "b", "b", "c" ]
     *
     * Our scopes are now "out of alignment" and we're repeating `b` 3 times.
     * What needs to happen is the numbers are remapped:
     *
     *   { 1 => ..., 2 => ..., 5 => ... }
     *
     * We also need to know that the ONLY groups that should be output
     * are 1, 2, and 5.  This function handles this behavior.
     *
     * @param {CompiledMode} mode
     * @param {Array<RegExp | string>} regexes
     * @param {{key: "beginScope"|"endScope"}} opts
     */
    function remapScopeNames(mode, regexes, { key }) {
      let offset = 0;
      const scopeNames = mode[key];
      /** @type Record<number,boolean> */
      const emit = {};
      /** @type Record<number,string> */
      const positions = {};

      for (let i = 1; i <= regexes.length; i++) {
        positions[i + offset] = scopeNames[i];
        emit[i + offset] = true;
        offset += countMatchGroups(regexes[i - 1]);
      }
      // we use _emit to keep track of which match groups are "top-level" to avoid double
      // output from inside match groups
      mode[key] = positions;
      mode[key]._emit = emit;
      mode[key]._multi = true;
    }

    /**
     * @param {CompiledMode} mode
     */
    function beginMultiClass(mode) {
      if (!Array.isArray(mode.begin)) return;

      if (mode.skip || mode.excludeBegin || mode.returnBegin) {
        error("skip, excludeBegin, returnBegin not compatible with beginScope: {}");
        throw MultiClassError;
      }

      if (typeof mode.beginScope !== "object" || mode.beginScope === null) {
        error("beginScope must be object");
        throw MultiClassError;
      }

      remapScopeNames(mode, mode.begin, { key: "beginScope" });
      mode.begin = _rewriteBackreferences(mode.begin, { joinWith: "" });
    }

    /**
     * @param {CompiledMode} mode
     */
    function endMultiClass(mode) {
      if (!Array.isArray(mode.end)) return;

      if (mode.skip || mode.excludeEnd || mode.returnEnd) {
        error("skip, excludeEnd, returnEnd not compatible with endScope: {}");
        throw MultiClassError;
      }

      if (typeof mode.endScope !== "object" || mode.endScope === null) {
        error("endScope must be object");
        throw MultiClassError;
      }

      remapScopeNames(mode, mode.end, { key: "endScope" });
      mode.end = _rewriteBackreferences(mode.end, { joinWith: "" });
    }

    /**
     * this exists only to allow `scope: {}` to be used beside `match:`
     * Otherwise `beginScope` would necessary and that would look weird

      {
        match: [ /def/, /\w+/ ]
        scope: { 1: "keyword" , 2: "title" }
      }

     * @param {CompiledMode} mode
     */
    function scopeSugar(mode) {
      if (mode.scope && typeof mode.scope === "object" && mode.scope !== null) {
        mode.beginScope = mode.scope;
        delete mode.scope;
      }
    }

    /**
     * @param {CompiledMode} mode
     */
    function MultiClass(mode) {
      scopeSugar(mode);

      if (typeof mode.beginScope === "string") {
        mode.beginScope = { _wrap: mode.beginScope };
      }
      if (typeof mode.endScope === "string") {
        mode.endScope = { _wrap: mode.endScope };
      }

      beginMultiClass(mode);
      endMultiClass(mode);
    }

    /**
    @typedef {import('highlight.js').Mode} Mode
    @typedef {import('highlight.js').CompiledMode} CompiledMode
    @typedef {import('highlight.js').Language} Language
    @typedef {import('highlight.js').HLJSPlugin} HLJSPlugin
    @typedef {import('highlight.js').CompiledLanguage} CompiledLanguage
    */

    // compilation

    /**
     * Compiles a language definition result
     *
     * Given the raw result of a language definition (Language), compiles this so
     * that it is ready for highlighting code.
     * @param {Language} language
     * @returns {CompiledLanguage}
     */
    function compileLanguage(language) {
      /**
       * Builds a regex with the case sensitivity of the current language
       *
       * @param {RegExp | string} value
       * @param {boolean} [global]
       */
      function langRe(value, global) {
        return new RegExp(
          source(value),
          'm'
          + (language.case_insensitive ? 'i' : '')
          + (language.unicodeRegex ? 'u' : '')
          + (global ? 'g' : '')
        );
      }

      /**
        Stores multiple regular expressions and allows you to quickly search for
        them all in a string simultaneously - returning the first match.  It does
        this by creating a huge (a|b|c) regex - each individual item wrapped with ()
        and joined by `|` - using match groups to track position.  When a match is
        found checking which position in the array has content allows us to figure
        out which of the original regexes / match groups triggered the match.

        The match object itself (the result of `Regex.exec`) is returned but also
        enhanced by merging in any meta-data that was registered with the regex.
        This is how we keep track of which mode matched, and what type of rule
        (`illegal`, `begin`, end, etc).
      */
      class MultiRegex {
        constructor() {
          this.matchIndexes = {};
          // @ts-ignore
          this.regexes = [];
          this.matchAt = 1;
          this.position = 0;
        }

        // @ts-ignore
        addRule(re, opts) {
          opts.position = this.position++;
          // @ts-ignore
          this.matchIndexes[this.matchAt] = opts;
          this.regexes.push([opts, re]);
          this.matchAt += countMatchGroups(re) + 1;
        }

        compile() {
          if (this.regexes.length === 0) {
            // avoids the need to check length every time exec is called
            // @ts-ignore
            this.exec = () => null;
          }
          const terminators = this.regexes.map(el => el[1]);
          this.matcherRe = langRe(_rewriteBackreferences(terminators, { joinWith: '|' }), true);
          this.lastIndex = 0;
        }

        /** @param {string} s */
        exec(s) {
          this.matcherRe.lastIndex = this.lastIndex;
          const match = this.matcherRe.exec(s);
          if (!match) { return null; }

          // eslint-disable-next-line no-undefined
          const i = match.findIndex((el, i) => i > 0 && el !== undefined);
          // @ts-ignore
          const matchData = this.matchIndexes[i];
          // trim off any earlier non-relevant match groups (ie, the other regex
          // match groups that make up the multi-matcher)
          match.splice(0, i);

          return Object.assign(match, matchData);
        }
      }

      /*
        Created to solve the key deficiently with MultiRegex - there is no way to
        test for multiple matches at a single location.  Why would we need to do
        that?  In the future a more dynamic engine will allow certain matches to be
        ignored.  An example: if we matched say the 3rd regex in a large group but
        decided to ignore it - we'd need to started testing again at the 4th
        regex... but MultiRegex itself gives us no real way to do that.

        So what this class creates MultiRegexs on the fly for whatever search
        position they are needed.

        NOTE: These additional MultiRegex objects are created dynamically.  For most
        grammars most of the time we will never actually need anything more than the
        first MultiRegex - so this shouldn't have too much overhead.

        Say this is our search group, and we match regex3, but wish to ignore it.

          regex1 | regex2 | regex3 | regex4 | regex5    ' ie, startAt = 0

        What we need is a new MultiRegex that only includes the remaining
        possibilities:

          regex4 | regex5                               ' ie, startAt = 3

        This class wraps all that complexity up in a simple API... `startAt` decides
        where in the array of expressions to start doing the matching. It
        auto-increments, so if a match is found at position 2, then startAt will be
        set to 3.  If the end is reached startAt will return to 0.

        MOST of the time the parser will be setting startAt manually to 0.
      */
      class ResumableMultiRegex {
        constructor() {
          // @ts-ignore
          this.rules = [];
          // @ts-ignore
          this.multiRegexes = [];
          this.count = 0;

          this.lastIndex = 0;
          this.regexIndex = 0;
        }

        // @ts-ignore
        getMatcher(index) {
          if (this.multiRegexes[index]) return this.multiRegexes[index];

          const matcher = new MultiRegex();
          this.rules.slice(index).forEach(([re, opts]) => matcher.addRule(re, opts));
          matcher.compile();
          this.multiRegexes[index] = matcher;
          return matcher;
        }

        resumingScanAtSamePosition() {
          return this.regexIndex !== 0;
        }

        considerAll() {
          this.regexIndex = 0;
        }

        // @ts-ignore
        addRule(re, opts) {
          this.rules.push([re, opts]);
          if (opts.type === "begin") this.count++;
        }

        /** @param {string} s */
        exec(s) {
          const m = this.getMatcher(this.regexIndex);
          m.lastIndex = this.lastIndex;
          let result = m.exec(s);

          // The following is because we have no easy way to say "resume scanning at the
          // existing position but also skip the current rule ONLY". What happens is
          // all prior rules are also skipped which can result in matching the wrong
          // thing. Example of matching "booger":

          // our matcher is [string, "booger", number]
          //
          // ....booger....

          // if "booger" is ignored then we'd really need a regex to scan from the
          // SAME position for only: [string, number] but ignoring "booger" (if it
          // was the first match), a simple resume would scan ahead who knows how
          // far looking only for "number", ignoring potential string matches (or
          // future "booger" matches that might be valid.)

          // So what we do: We execute two matchers, one resuming at the same
          // position, but the second full matcher starting at the position after:

          //     /--- resume first regex match here (for [number])
          //     |/---- full match here for [string, "booger", number]
          //     vv
          // ....booger....

          // Which ever results in a match first is then used. So this 3-4 step
          // process essentially allows us to say "match at this position, excluding
          // a prior rule that was ignored".
          //
          // 1. Match "booger" first, ignore. Also proves that [string] does non match.
          // 2. Resume matching for [number]
          // 3. Match at index + 1 for [string, "booger", number]
          // 4. If #2 and #3 result in matches, which came first?
          if (this.resumingScanAtSamePosition()) {
            if (result && result.index === this.lastIndex) ; else { // use the second matcher result
              const m2 = this.getMatcher(0);
              m2.lastIndex = this.lastIndex + 1;
              result = m2.exec(s);
            }
          }

          if (result) {
            this.regexIndex += result.position + 1;
            if (this.regexIndex === this.count) {
              // wrap-around to considering all matches again
              this.considerAll();
            }
          }

          return result;
        }
      }

      /**
       * Given a mode, builds a huge ResumableMultiRegex that can be used to walk
       * the content and find matches.
       *
       * @param {CompiledMode} mode
       * @returns {ResumableMultiRegex}
       */
      function buildModeRegex(mode) {
        const mm = new ResumableMultiRegex();

        mode.contains.forEach(term => mm.addRule(term.begin, { rule: term, type: "begin" }));

        if (mode.terminatorEnd) {
          mm.addRule(mode.terminatorEnd, { type: "end" });
        }
        if (mode.illegal) {
          mm.addRule(mode.illegal, { type: "illegal" });
        }

        return mm;
      }

      /** skip vs abort vs ignore
       *
       * @skip   - The mode is still entered and exited normally (and contains rules apply),
       *           but all content is held and added to the parent buffer rather than being
       *           output when the mode ends.  Mostly used with `sublanguage` to build up
       *           a single large buffer than can be parsed by sublanguage.
       *
       *             - The mode begin ands ends normally.
       *             - Content matched is added to the parent mode buffer.
       *             - The parser cursor is moved forward normally.
       *
       * @abort  - A hack placeholder until we have ignore.  Aborts the mode (as if it
       *           never matched) but DOES NOT continue to match subsequent `contains`
       *           modes.  Abort is bad/suboptimal because it can result in modes
       *           farther down not getting applied because an earlier rule eats the
       *           content but then aborts.
       *
       *             - The mode does not begin.
       *             - Content matched by `begin` is added to the mode buffer.
       *             - The parser cursor is moved forward accordingly.
       *
       * @ignore - Ignores the mode (as if it never matched) and continues to match any
       *           subsequent `contains` modes.  Ignore isn't technically possible with
       *           the current parser implementation.
       *
       *             - The mode does not begin.
       *             - Content matched by `begin` is ignored.
       *             - The parser cursor is not moved forward.
       */

      /**
       * Compiles an individual mode
       *
       * This can raise an error if the mode contains certain detectable known logic
       * issues.
       * @param {Mode} mode
       * @param {CompiledMode | null} [parent]
       * @returns {CompiledMode | never}
       */
      function compileMode(mode, parent) {
        const cmode = /** @type CompiledMode */ (mode);
        if (mode.isCompiled) return cmode;

        [
          scopeClassName,
          // do this early so compiler extensions generally don't have to worry about
          // the distinction between match/begin
          compileMatch,
          MultiClass,
          beforeMatchExt
        ].forEach(ext => ext(mode, parent));

        language.compilerExtensions.forEach(ext => ext(mode, parent));

        // __beforeBegin is considered private API, internal use only
        mode.__beforeBegin = null;

        [
          beginKeywords,
          // do this later so compiler extensions that come earlier have access to the
          // raw array if they wanted to perhaps manipulate it, etc.
          compileIllegal,
          // default to 1 relevance if not specified
          compileRelevance
        ].forEach(ext => ext(mode, parent));

        mode.isCompiled = true;

        let keywordPattern = null;
        if (typeof mode.keywords === "object" && mode.keywords.$pattern) {
          // we need a copy because keywords might be compiled multiple times
          // so we can't go deleting $pattern from the original on the first
          // pass
          mode.keywords = Object.assign({}, mode.keywords);
          keywordPattern = mode.keywords.$pattern;
          delete mode.keywords.$pattern;
        }
        keywordPattern = keywordPattern || /\w+/;

        if (mode.keywords) {
          mode.keywords = compileKeywords(mode.keywords, language.case_insensitive);
        }

        cmode.keywordPatternRe = langRe(keywordPattern, true);

        if (parent) {
          if (!mode.begin) mode.begin = /\B|\b/;
          cmode.beginRe = langRe(cmode.begin);
          if (!mode.end && !mode.endsWithParent) mode.end = /\B|\b/;
          if (mode.end) cmode.endRe = langRe(cmode.end);
          cmode.terminatorEnd = source(cmode.end) || '';
          if (mode.endsWithParent && parent.terminatorEnd) {
            cmode.terminatorEnd += (mode.end ? '|' : '') + parent.terminatorEnd;
          }
        }
        if (mode.illegal) cmode.illegalRe = langRe(/** @type {RegExp | string} */ (mode.illegal));
        if (!mode.contains) mode.contains = [];

        mode.contains = [].concat(...mode.contains.map(function(c) {
          return expandOrCloneMode(c === 'self' ? mode : c);
        }));
        mode.contains.forEach(function(c) { compileMode(/** @type Mode */ (c), cmode); });

        if (mode.starts) {
          compileMode(mode.starts, parent);
        }

        cmode.matcher = buildModeRegex(cmode);
        return cmode;
      }

      if (!language.compilerExtensions) language.compilerExtensions = [];

      // self is not valid at the top-level
      if (language.contains && language.contains.includes('self')) {
        throw new Error("ERR: contains `self` is not supported at the top-level of a language.  See documentation.");
      }

      // we need a null object, which inherit will guarantee
      language.classNameAliases = inherit$1(language.classNameAliases || {});

      return compileMode(/** @type Mode */ (language));
    }

    /**
     * Determines if a mode has a dependency on it's parent or not
     *
     * If a mode does have a parent dependency then often we need to clone it if
     * it's used in multiple places so that each copy points to the correct parent,
     * where-as modes without a parent can often safely be re-used at the bottom of
     * a mode chain.
     *
     * @param {Mode | null} mode
     * @returns {boolean} - is there a dependency on the parent?
     * */
    function dependencyOnParent(mode) {
      if (!mode) return false;

      return mode.endsWithParent || dependencyOnParent(mode.starts);
    }

    /**
     * Expands a mode or clones it if necessary
     *
     * This is necessary for modes with parental dependenceis (see notes on
     * `dependencyOnParent`) and for nodes that have `variants` - which must then be
     * exploded into their own individual modes at compile time.
     *
     * @param {Mode} mode
     * @returns {Mode | Mode[]}
     * */
    function expandOrCloneMode(mode) {
      if (mode.variants && !mode.cachedVariants) {
        mode.cachedVariants = mode.variants.map(function(variant) {
          return inherit$1(mode, { variants: null }, variant);
        });
      }

      // EXPAND
      // if we have variants then essentially "replace" the mode with the variants
      // this happens in compileMode, where this function is called from
      if (mode.cachedVariants) {
        return mode.cachedVariants;
      }

      // CLONE
      // if we have dependencies on parents then we need a unique
      // instance of ourselves, so we can be reused with many
      // different parents without issue
      if (dependencyOnParent(mode)) {
        return inherit$1(mode, { starts: mode.starts ? inherit$1(mode.starts) : null });
      }

      if (Object.isFrozen(mode)) {
        return inherit$1(mode);
      }

      // no special dependency issues, just return ourselves
      return mode;
    }

    var version = "11.3.1";

    class HTMLInjectionError extends Error {
      constructor(reason, html) {
        super(reason);
        this.name = "HTMLInjectionError";
        this.html = html;
      }
    }

    /*
    Syntax highlighting with language autodetection.
    https://highlightjs.org/
    */

    /**
    @typedef {import('highlight.js').Mode} Mode
    @typedef {import('highlight.js').CompiledMode} CompiledMode
    @typedef {import('highlight.js').CompiledScope} CompiledScope
    @typedef {import('highlight.js').Language} Language
    @typedef {import('highlight.js').HLJSApi} HLJSApi
    @typedef {import('highlight.js').HLJSPlugin} HLJSPlugin
    @typedef {import('highlight.js').PluginEvent} PluginEvent
    @typedef {import('highlight.js').HLJSOptions} HLJSOptions
    @typedef {import('highlight.js').LanguageFn} LanguageFn
    @typedef {import('highlight.js').HighlightedHTMLElement} HighlightedHTMLElement
    @typedef {import('highlight.js').BeforeHighlightContext} BeforeHighlightContext
    @typedef {import('highlight.js/private').MatchType} MatchType
    @typedef {import('highlight.js/private').KeywordData} KeywordData
    @typedef {import('highlight.js/private').EnhancedMatch} EnhancedMatch
    @typedef {import('highlight.js/private').AnnotatedError} AnnotatedError
    @typedef {import('highlight.js').AutoHighlightResult} AutoHighlightResult
    @typedef {import('highlight.js').HighlightOptions} HighlightOptions
    @typedef {import('highlight.js').HighlightResult} HighlightResult
    */


    const escape = escapeHTML;
    const inherit = inherit$1;
    const NO_MATCH = Symbol("nomatch");
    const MAX_KEYWORD_HITS = 7;

    /**
     * @param {any} hljs - object that is extended (legacy)
     * @returns {HLJSApi}
     */
    const HLJS = function(hljs) {
      // Global internal variables used within the highlight.js library.
      /** @type {Record<string, Language>} */
      const languages = Object.create(null);
      /** @type {Record<string, string>} */
      const aliases = Object.create(null);
      /** @type {HLJSPlugin[]} */
      const plugins = [];

      // safe/production mode - swallows more errors, tries to keep running
      // even if a single syntax or parse hits a fatal error
      let SAFE_MODE = true;
      const LANGUAGE_NOT_FOUND = "Could not find the language '{}', did you forget to load/include a language module?";
      /** @type {Language} */
      const PLAINTEXT_LANGUAGE = { disableAutodetect: true, name: 'Plain text', contains: [] };

      // Global options used when within external APIs. This is modified when
      // calling the `hljs.configure` function.
      /** @type HLJSOptions */
      let options = {
        ignoreUnescapedHTML: false,
        throwUnescapedHTML: false,
        noHighlightRe: /^(no-?highlight)$/i,
        languageDetectRe: /\blang(?:uage)?-([\w-]+)\b/i,
        classPrefix: 'hljs-',
        cssSelector: 'pre code',
        languages: null,
        // beta configuration options, subject to change, welcome to discuss
        // https://github.com/highlightjs/highlight.js/issues/1086
        __emitter: TokenTreeEmitter
      };

      /* Utility functions */

      /**
       * Tests a language name to see if highlighting should be skipped
       * @param {string} languageName
       */
      function shouldNotHighlight(languageName) {
        return options.noHighlightRe.test(languageName);
      }

      /**
       * @param {HighlightedHTMLElement} block - the HTML element to determine language for
       */
      function blockLanguage(block) {
        let classes = block.className + ' ';

        classes += block.parentNode ? block.parentNode.className : '';

        // language-* takes precedence over non-prefixed class names.
        const match = options.languageDetectRe.exec(classes);
        if (match) {
          const language = getLanguage(match[1]);
          if (!language) {
            warn(LANGUAGE_NOT_FOUND.replace("{}", match[1]));
            warn("Falling back to no-highlight mode for this block.", block);
          }
          return language ? match[1] : 'no-highlight';
        }

        return classes
          .split(/\s+/)
          .find((_class) => shouldNotHighlight(_class) || getLanguage(_class));
      }

      /**
       * Core highlighting function.
       *
       * OLD API
       * highlight(lang, code, ignoreIllegals, continuation)
       *
       * NEW API
       * highlight(code, {lang, ignoreIllegals})
       *
       * @param {string} codeOrLanguageName - the language to use for highlighting
       * @param {string | HighlightOptions} optionsOrCode - the code to highlight
       * @param {boolean} [ignoreIllegals] - whether to ignore illegal matches, default is to bail
       *
       * @returns {HighlightResult} Result - an object that represents the result
       * @property {string} language - the language name
       * @property {number} relevance - the relevance score
       * @property {string} value - the highlighted HTML code
       * @property {string} code - the original raw code
       * @property {CompiledMode} top - top of the current mode stack
       * @property {boolean} illegal - indicates whether any illegal matches were found
      */
      function highlight(codeOrLanguageName, optionsOrCode, ignoreIllegals) {
        let code = "";
        let languageName = "";
        if (typeof optionsOrCode === "object") {
          code = codeOrLanguageName;
          ignoreIllegals = optionsOrCode.ignoreIllegals;
          languageName = optionsOrCode.language;
        } else {
          // old API
          deprecated("10.7.0", "highlight(lang, code, ...args) has been deprecated.");
          deprecated("10.7.0", "Please use highlight(code, options) instead.\nhttps://github.com/highlightjs/highlight.js/issues/2277");
          languageName = codeOrLanguageName;
          code = optionsOrCode;
        }

        // https://github.com/highlightjs/highlight.js/issues/3149
        // eslint-disable-next-line no-undefined
        if (ignoreIllegals === undefined) { ignoreIllegals = true; }

        /** @type {BeforeHighlightContext} */
        const context = {
          code,
          language: languageName
        };
        // the plugin can change the desired language or the code to be highlighted
        // just be changing the object it was passed
        fire("before:highlight", context);

        // a before plugin can usurp the result completely by providing it's own
        // in which case we don't even need to call highlight
        const result = context.result
          ? context.result
          : _highlight(context.language, context.code, ignoreIllegals);

        result.code = context.code;
        // the plugin can change anything in result to suite it
        fire("after:highlight", result);

        return result;
      }

      /**
       * private highlight that's used internally and does not fire callbacks
       *
       * @param {string} languageName - the language to use for highlighting
       * @param {string} codeToHighlight - the code to highlight
       * @param {boolean?} [ignoreIllegals] - whether to ignore illegal matches, default is to bail
       * @param {CompiledMode?} [continuation] - current continuation mode, if any
       * @returns {HighlightResult} - result of the highlight operation
      */
      function _highlight(languageName, codeToHighlight, ignoreIllegals, continuation) {
        const keywordHits = Object.create(null);

        /**
         * Return keyword data if a match is a keyword
         * @param {CompiledMode} mode - current mode
         * @param {string} matchText - the textual match
         * @returns {KeywordData | false}
         */
        function keywordData(mode, matchText) {
          return mode.keywords[matchText];
        }

        function processKeywords() {
          if (!top.keywords) {
            emitter.addText(modeBuffer);
            return;
          }

          let lastIndex = 0;
          top.keywordPatternRe.lastIndex = 0;
          let match = top.keywordPatternRe.exec(modeBuffer);
          let buf = "";

          while (match) {
            buf += modeBuffer.substring(lastIndex, match.index);
            const word = language.case_insensitive ? match[0].toLowerCase() : match[0];
            const data = keywordData(top, word);
            if (data) {
              const [kind, keywordRelevance] = data;
              emitter.addText(buf);
              buf = "";

              keywordHits[word] = (keywordHits[word] || 0) + 1;
              if (keywordHits[word] <= MAX_KEYWORD_HITS) relevance += keywordRelevance;
              if (kind.startsWith("_")) {
                // _ implied for relevance only, do not highlight
                // by applying a class name
                buf += match[0];
              } else {
                const cssClass = language.classNameAliases[kind] || kind;
                emitter.addKeyword(match[0], cssClass);
              }
            } else {
              buf += match[0];
            }
            lastIndex = top.keywordPatternRe.lastIndex;
            match = top.keywordPatternRe.exec(modeBuffer);
          }
          buf += modeBuffer.substr(lastIndex);
          emitter.addText(buf);
        }

        function processSubLanguage() {
          if (modeBuffer === "") return;
          /** @type HighlightResult */
          let result = null;

          if (typeof top.subLanguage === 'string') {
            if (!languages[top.subLanguage]) {
              emitter.addText(modeBuffer);
              return;
            }
            result = _highlight(top.subLanguage, modeBuffer, true, continuations[top.subLanguage]);
            continuations[top.subLanguage] = /** @type {CompiledMode} */ (result._top);
          } else {
            result = highlightAuto(modeBuffer, top.subLanguage.length ? top.subLanguage : null);
          }

          // Counting embedded language score towards the host language may be disabled
          // with zeroing the containing mode relevance. Use case in point is Markdown that
          // allows XML everywhere and makes every XML snippet to have a much larger Markdown
          // score.
          if (top.relevance > 0) {
            relevance += result.relevance;
          }
          emitter.addSublanguage(result._emitter, result.language);
        }

        function processBuffer() {
          if (top.subLanguage != null) {
            processSubLanguage();
          } else {
            processKeywords();
          }
          modeBuffer = '';
        }

        /**
         * @param {CompiledScope} scope
         * @param {RegExpMatchArray} match
         */
        function emitMultiClass(scope, match) {
          let i = 1;
          // eslint-disable-next-line no-undefined
          while (match[i] !== undefined) {
            if (!scope._emit[i]) { i++; continue; }
            const klass = language.classNameAliases[scope[i]] || scope[i];
            const text = match[i];
            if (klass) {
              emitter.addKeyword(text, klass);
            } else {
              modeBuffer = text;
              processKeywords();
              modeBuffer = "";
            }
            i++;
          }
        }

        /**
         * @param {CompiledMode} mode - new mode to start
         * @param {RegExpMatchArray} match
         */
        function startNewMode(mode, match) {
          if (mode.scope && typeof mode.scope === "string") {
            emitter.openNode(language.classNameAliases[mode.scope] || mode.scope);
          }
          if (mode.beginScope) {
            // beginScope just wraps the begin match itself in a scope
            if (mode.beginScope._wrap) {
              emitter.addKeyword(modeBuffer, language.classNameAliases[mode.beginScope._wrap] || mode.beginScope._wrap);
              modeBuffer = "";
            } else if (mode.beginScope._multi) {
              // at this point modeBuffer should just be the match
              emitMultiClass(mode.beginScope, match);
              modeBuffer = "";
            }
          }

          top = Object.create(mode, { parent: { value: top } });
          return top;
        }

        /**
         * @param {CompiledMode } mode - the mode to potentially end
         * @param {RegExpMatchArray} match - the latest match
         * @param {string} matchPlusRemainder - match plus remainder of content
         * @returns {CompiledMode | void} - the next mode, or if void continue on in current mode
         */
        function endOfMode(mode, match, matchPlusRemainder) {
          let matched = startsWith(mode.endRe, matchPlusRemainder);

          if (matched) {
            if (mode["on:end"]) {
              const resp = new Response(mode);
              mode["on:end"](match, resp);
              if (resp.isMatchIgnored) matched = false;
            }

            if (matched) {
              while (mode.endsParent && mode.parent) {
                mode = mode.parent;
              }
              return mode;
            }
          }
          // even if on:end fires an `ignore` it's still possible
          // that we might trigger the end node because of a parent mode
          if (mode.endsWithParent) {
            return endOfMode(mode.parent, match, matchPlusRemainder);
          }
        }

        /**
         * Handle matching but then ignoring a sequence of text
         *
         * @param {string} lexeme - string containing full match text
         */
        function doIgnore(lexeme) {
          if (top.matcher.regexIndex === 0) {
            // no more regexes to potentially match here, so we move the cursor forward one
            // space
            modeBuffer += lexeme[0];
            return 1;
          } else {
            // no need to move the cursor, we still have additional regexes to try and
            // match at this very spot
            resumeScanAtSamePosition = true;
            return 0;
          }
        }

        /**
         * Handle the start of a new potential mode match
         *
         * @param {EnhancedMatch} match - the current match
         * @returns {number} how far to advance the parse cursor
         */
        function doBeginMatch(match) {
          const lexeme = match[0];
          const newMode = match.rule;

          const resp = new Response(newMode);
          // first internal before callbacks, then the public ones
          const beforeCallbacks = [newMode.__beforeBegin, newMode["on:begin"]];
          for (const cb of beforeCallbacks) {
            if (!cb) continue;
            cb(match, resp);
            if (resp.isMatchIgnored) return doIgnore(lexeme);
          }

          if (newMode.skip) {
            modeBuffer += lexeme;
          } else {
            if (newMode.excludeBegin) {
              modeBuffer += lexeme;
            }
            processBuffer();
            if (!newMode.returnBegin && !newMode.excludeBegin) {
              modeBuffer = lexeme;
            }
          }
          startNewMode(newMode, match);
          return newMode.returnBegin ? 0 : lexeme.length;
        }

        /**
         * Handle the potential end of mode
         *
         * @param {RegExpMatchArray} match - the current match
         */
        function doEndMatch(match) {
          const lexeme = match[0];
          const matchPlusRemainder = codeToHighlight.substr(match.index);

          const endMode = endOfMode(top, match, matchPlusRemainder);
          if (!endMode) { return NO_MATCH; }

          const origin = top;
          if (top.endScope && top.endScope._wrap) {
            processBuffer();
            emitter.addKeyword(lexeme, top.endScope._wrap);
          } else if (top.endScope && top.endScope._multi) {
            processBuffer();
            emitMultiClass(top.endScope, match);
          } else if (origin.skip) {
            modeBuffer += lexeme;
          } else {
            if (!(origin.returnEnd || origin.excludeEnd)) {
              modeBuffer += lexeme;
            }
            processBuffer();
            if (origin.excludeEnd) {
              modeBuffer = lexeme;
            }
          }
          do {
            if (top.scope) {
              emitter.closeNode();
            }
            if (!top.skip && !top.subLanguage) {
              relevance += top.relevance;
            }
            top = top.parent;
          } while (top !== endMode.parent);
          if (endMode.starts) {
            startNewMode(endMode.starts, match);
          }
          return origin.returnEnd ? 0 : lexeme.length;
        }

        function processContinuations() {
          const list = [];
          for (let current = top; current !== language; current = current.parent) {
            if (current.scope) {
              list.unshift(current.scope);
            }
          }
          list.forEach(item => emitter.openNode(item));
        }

        /** @type {{type?: MatchType, index?: number, rule?: Mode}}} */
        let lastMatch = {};

        /**
         *  Process an individual match
         *
         * @param {string} textBeforeMatch - text preceding the match (since the last match)
         * @param {EnhancedMatch} [match] - the match itself
         */
        function processLexeme(textBeforeMatch, match) {
          const lexeme = match && match[0];

          // add non-matched text to the current mode buffer
          modeBuffer += textBeforeMatch;

          if (lexeme == null) {
            processBuffer();
            return 0;
          }

          // we've found a 0 width match and we're stuck, so we need to advance
          // this happens when we have badly behaved rules that have optional matchers to the degree that
          // sometimes they can end up matching nothing at all
          // Ref: https://github.com/highlightjs/highlight.js/issues/2140
          if (lastMatch.type === "begin" && match.type === "end" && lastMatch.index === match.index && lexeme === "") {
            // spit the "skipped" character that our regex choked on back into the output sequence
            modeBuffer += codeToHighlight.slice(match.index, match.index + 1);
            if (!SAFE_MODE) {
              /** @type {AnnotatedError} */
              const err = new Error(`0 width match regex (${languageName})`);
              err.languageName = languageName;
              err.badRule = lastMatch.rule;
              throw err;
            }
            return 1;
          }
          lastMatch = match;

          if (match.type === "begin") {
            return doBeginMatch(match);
          } else if (match.type === "illegal" && !ignoreIllegals) {
            // illegal match, we do not continue processing
            /** @type {AnnotatedError} */
            const err = new Error('Illegal lexeme "' + lexeme + '" for mode "' + (top.scope || '<unnamed>') + '"');
            err.mode = top;
            throw err;
          } else if (match.type === "end") {
            const processed = doEndMatch(match);
            if (processed !== NO_MATCH) {
              return processed;
            }
          }

          // edge case for when illegal matches $ (end of line) which is technically
          // a 0 width match but not a begin/end match so it's not caught by the
          // first handler (when ignoreIllegals is true)
          if (match.type === "illegal" && lexeme === "") {
            // advance so we aren't stuck in an infinite loop
            return 1;
          }

          // infinite loops are BAD, this is a last ditch catch all. if we have a
          // decent number of iterations yet our index (cursor position in our
          // parsing) still 3x behind our index then something is very wrong
          // so we bail
          if (iterations > 100000 && iterations > match.index * 3) {
            const err = new Error('potential infinite loop, way more iterations than matches');
            throw err;
          }

          /*
          Why might be find ourselves here?  An potential end match that was
          triggered but could not be completed.  IE, `doEndMatch` returned NO_MATCH.
          (this could be because a callback requests the match be ignored, etc)

          This causes no real harm other than stopping a few times too many.
          */

          modeBuffer += lexeme;
          return lexeme.length;
        }

        const language = getLanguage(languageName);
        if (!language) {
          error(LANGUAGE_NOT_FOUND.replace("{}", languageName));
          throw new Error('Unknown language: "' + languageName + '"');
        }

        const md = compileLanguage(language);
        let result = '';
        /** @type {CompiledMode} */
        let top = continuation || md;
        /** @type Record<string,CompiledMode> */
        const continuations = {}; // keep continuations for sub-languages
        const emitter = new options.__emitter(options);
        processContinuations();
        let modeBuffer = '';
        let relevance = 0;
        let index = 0;
        let iterations = 0;
        let resumeScanAtSamePosition = false;

        try {
          top.matcher.considerAll();

          for (;;) {
            iterations++;
            if (resumeScanAtSamePosition) {
              // only regexes not matched previously will now be
              // considered for a potential match
              resumeScanAtSamePosition = false;
            } else {
              top.matcher.considerAll();
            }
            top.matcher.lastIndex = index;

            const match = top.matcher.exec(codeToHighlight);
            // console.log("match", match[0], match.rule && match.rule.begin)

            if (!match) break;

            const beforeMatch = codeToHighlight.substring(index, match.index);
            const processedCount = processLexeme(beforeMatch, match);
            index = match.index + processedCount;
          }
          processLexeme(codeToHighlight.substr(index));
          emitter.closeAllNodes();
          emitter.finalize();
          result = emitter.toHTML();

          return {
            language: languageName,
            value: result,
            relevance: relevance,
            illegal: false,
            _emitter: emitter,
            _top: top
          };
        } catch (err) {
          if (err.message && err.message.includes('Illegal')) {
            return {
              language: languageName,
              value: escape(codeToHighlight),
              illegal: true,
              relevance: 0,
              _illegalBy: {
                message: err.message,
                index: index,
                context: codeToHighlight.slice(index - 100, index + 100),
                mode: err.mode,
                resultSoFar: result
              },
              _emitter: emitter
            };
          } else if (SAFE_MODE) {
            return {
              language: languageName,
              value: escape(codeToHighlight),
              illegal: false,
              relevance: 0,
              errorRaised: err,
              _emitter: emitter,
              _top: top
            };
          } else {
            throw err;
          }
        }
      }

      /**
       * returns a valid highlight result, without actually doing any actual work,
       * auto highlight starts with this and it's possible for small snippets that
       * auto-detection may not find a better match
       * @param {string} code
       * @returns {HighlightResult}
       */
      function justTextHighlightResult(code) {
        const result = {
          value: escape(code),
          illegal: false,
          relevance: 0,
          _top: PLAINTEXT_LANGUAGE,
          _emitter: new options.__emitter(options)
        };
        result._emitter.addText(code);
        return result;
      }

      /**
      Highlighting with language detection. Accepts a string with the code to
      highlight. Returns an object with the following properties:

      - language (detected language)
      - relevance (int)
      - value (an HTML string with highlighting markup)
      - secondBest (object with the same structure for second-best heuristically
        detected language, may be absent)

        @param {string} code
        @param {Array<string>} [languageSubset]
        @returns {AutoHighlightResult}
      */
      function highlightAuto(code, languageSubset) {
        languageSubset = languageSubset || options.languages || Object.keys(languages);
        const plaintext = justTextHighlightResult(code);

        const results = languageSubset.filter(getLanguage).filter(autoDetection).map(name =>
          _highlight(name, code, false)
        );
        results.unshift(plaintext); // plaintext is always an option

        const sorted = results.sort((a, b) => {
          // sort base on relevance
          if (a.relevance !== b.relevance) return b.relevance - a.relevance;

          // always award the tie to the base language
          // ie if C++ and Arduino are tied, it's more likely to be C++
          if (a.language && b.language) {
            if (getLanguage(a.language).supersetOf === b.language) {
              return 1;
            } else if (getLanguage(b.language).supersetOf === a.language) {
              return -1;
            }
          }

          // otherwise say they are equal, which has the effect of sorting on
          // relevance while preserving the original ordering - which is how ties
          // have historically been settled, ie the language that comes first always
          // wins in the case of a tie
          return 0;
        });

        const [best, secondBest] = sorted;

        /** @type {AutoHighlightResult} */
        const result = best;
        result.secondBest = secondBest;

        return result;
      }

      /**
       * Builds new class name for block given the language name
       *
       * @param {HTMLElement} element
       * @param {string} [currentLang]
       * @param {string} [resultLang]
       */
      function updateClassName(element, currentLang, resultLang) {
        const language = (currentLang && aliases[currentLang]) || resultLang;

        element.classList.add("hljs");
        element.classList.add(`language-${language}`);
      }

      /**
       * Applies highlighting to a DOM node containing code.
       *
       * @param {HighlightedHTMLElement} element - the HTML element to highlight
      */
      function highlightElement(element) {
        /** @type HTMLElement */
        let node = null;
        const language = blockLanguage(element);

        if (shouldNotHighlight(language)) return;

        fire("before:highlightElement",
          { el: element, language: language });

        // we should be all text, no child nodes (unescaped HTML) - this is possibly
        // an HTML injection attack - it's likely too late if this is already in
        // production (the code has likely already done its damage by the time
        // we're seeing it)... but we yell loudly about this so that hopefully it's
        // more likely to be caught in development before making it to production
        if (element.children.length > 0) {
          if (!options.ignoreUnescapedHTML) {
            console.warn("One of your code blocks includes unescaped HTML. This is a potentially serious security risk.");
            console.warn("https://github.com/highlightjs/highlight.js/issues/2886");
            console.warn(element);
          }
          if (options.throwUnescapedHTML) {
            const err = new HTMLInjectionError(
              "One of your code blocks includes unescaped HTML.",
              element.innerHTML
            );
            throw err;
          }
        }

        node = element;
        const text = node.textContent;
        const result = language ? highlight(text, { language, ignoreIllegals: true }) : highlightAuto(text);

        element.innerHTML = result.value;
        updateClassName(element, language, result.language);
        element.result = {
          language: result.language,
          // TODO: remove with version 11.0
          re: result.relevance,
          relevance: result.relevance
        };
        if (result.secondBest) {
          element.secondBest = {
            language: result.secondBest.language,
            relevance: result.secondBest.relevance
          };
        }

        fire("after:highlightElement", { el: element, result, text });
      }

      /**
       * Updates highlight.js global options with the passed options
       *
       * @param {Partial<HLJSOptions>} userOptions
       */
      function configure(userOptions) {
        options = inherit(options, userOptions);
      }

      // TODO: remove v12, deprecated
      const initHighlighting = () => {
        highlightAll();
        deprecated("10.6.0", "initHighlighting() deprecated.  Use highlightAll() now.");
      };

      // TODO: remove v12, deprecated
      function initHighlightingOnLoad() {
        highlightAll();
        deprecated("10.6.0", "initHighlightingOnLoad() deprecated.  Use highlightAll() now.");
      }

      let wantsHighlight = false;

      /**
       * auto-highlights all pre>code elements on the page
       */
      function highlightAll() {
        // if we are called too early in the loading process
        if (document.readyState === "loading") {
          wantsHighlight = true;
          return;
        }

        const blocks = document.querySelectorAll(options.cssSelector);
        blocks.forEach(highlightElement);
      }

      function boot() {
        // if a highlight was requested before DOM was loaded, do now
        if (wantsHighlight) highlightAll();
      }

      // make sure we are in the browser environment
      if (typeof window !== 'undefined' && window.addEventListener) {
        window.addEventListener('DOMContentLoaded', boot, false);
      }

      /**
       * Register a language grammar module
       *
       * @param {string} languageName
       * @param {LanguageFn} languageDefinition
       */
      function registerLanguage(languageName, languageDefinition) {
        let lang = null;
        try {
          lang = languageDefinition(hljs);
        } catch (error$1) {
          error("Language definition for '{}' could not be registered.".replace("{}", languageName));
          // hard or soft error
          if (!SAFE_MODE) { throw error$1; } else { error(error$1); }
          // languages that have serious errors are replaced with essentially a
          // "plaintext" stand-in so that the code blocks will still get normal
          // css classes applied to them - and one bad language won't break the
          // entire highlighter
          lang = PLAINTEXT_LANGUAGE;
        }
        // give it a temporary name if it doesn't have one in the meta-data
        if (!lang.name) lang.name = languageName;
        languages[languageName] = lang;
        lang.rawDefinition = languageDefinition.bind(null, hljs);

        if (lang.aliases) {
          registerAliases(lang.aliases, { languageName });
        }
      }

      /**
       * Remove a language grammar module
       *
       * @param {string} languageName
       */
      function unregisterLanguage(languageName) {
        delete languages[languageName];
        for (const alias of Object.keys(aliases)) {
          if (aliases[alias] === languageName) {
            delete aliases[alias];
          }
        }
      }

      /**
       * @returns {string[]} List of language internal names
       */
      function listLanguages() {
        return Object.keys(languages);
      }

      /**
       * @param {string} name - name of the language to retrieve
       * @returns {Language | undefined}
       */
      function getLanguage(name) {
        name = (name || '').toLowerCase();
        return languages[name] || languages[aliases[name]];
      }

      /**
       *
       * @param {string|string[]} aliasList - single alias or list of aliases
       * @param {{languageName: string}} opts
       */
      function registerAliases(aliasList, { languageName }) {
        if (typeof aliasList === 'string') {
          aliasList = [aliasList];
        }
        aliasList.forEach(alias => { aliases[alias.toLowerCase()] = languageName; });
      }

      /**
       * Determines if a given language has auto-detection enabled
       * @param {string} name - name of the language
       */
      function autoDetection(name) {
        const lang = getLanguage(name);
        return lang && !lang.disableAutodetect;
      }

      /**
       * Upgrades the old highlightBlock plugins to the new
       * highlightElement API
       * @param {HLJSPlugin} plugin
       */
      function upgradePluginAPI(plugin) {
        // TODO: remove with v12
        if (plugin["before:highlightBlock"] && !plugin["before:highlightElement"]) {
          plugin["before:highlightElement"] = (data) => {
            plugin["before:highlightBlock"](
              Object.assign({ block: data.el }, data)
            );
          };
        }
        if (plugin["after:highlightBlock"] && !plugin["after:highlightElement"]) {
          plugin["after:highlightElement"] = (data) => {
            plugin["after:highlightBlock"](
              Object.assign({ block: data.el }, data)
            );
          };
        }
      }

      /**
       * @param {HLJSPlugin} plugin
       */
      function addPlugin(plugin) {
        upgradePluginAPI(plugin);
        plugins.push(plugin);
      }

      /**
       *
       * @param {PluginEvent} event
       * @param {any} args
       */
      function fire(event, args) {
        const cb = event;
        plugins.forEach(function(plugin) {
          if (plugin[cb]) {
            plugin[cb](args);
          }
        });
      }

      /**
       * DEPRECATED
       * @param {HighlightedHTMLElement} el
       */
      function deprecateHighlightBlock(el) {
        deprecated("10.7.0", "highlightBlock will be removed entirely in v12.0");
        deprecated("10.7.0", "Please use highlightElement now.");

        return highlightElement(el);
      }

      /* Interface definition */
      Object.assign(hljs, {
        highlight,
        highlightAuto,
        highlightAll,
        highlightElement,
        // TODO: Remove with v12 API
        highlightBlock: deprecateHighlightBlock,
        configure,
        initHighlighting,
        initHighlightingOnLoad,
        registerLanguage,
        unregisterLanguage,
        listLanguages,
        getLanguage,
        registerAliases,
        autoDetection,
        inherit,
        addPlugin
      });

      hljs.debugMode = function() { SAFE_MODE = false; };
      hljs.safeMode = function() { SAFE_MODE = true; };
      hljs.versionString = version;

      hljs.regex = {
        concat: concat,
        lookahead: lookahead,
        either: either,
        optional: optional,
        anyNumberOfTimes: anyNumberOfTimes
      };

      for (const key in MODES$1) {
        // @ts-ignore
        if (typeof MODES$1[key] === "object") {
          // @ts-ignore
          deepFreeze$1(MODES$1[key]);
        }
      }

      // merge all the modes/regexes into our main object
      Object.assign(hljs, MODES$1);

      return hljs;
    };

    // export an "instance" of the highlighter
    var HighlightJS = HLJS({});

    /*
    Language: HTML, XML
    Website: https://www.w3.org/XML/
    Category: common, web
    Audit: 2020
    */

    /** @type LanguageFn */
    function xml(hljs) {
      const regex = hljs.regex;
      // Element names can contain letters, digits, hyphens, underscores, and periods
      const TAG_NAME_RE = regex.concat(/[A-Z_]/, regex.optional(/[A-Z0-9_.-]*:/), /[A-Z0-9_.-]*/);
      const XML_IDENT_RE = /[A-Za-z0-9._:-]+/;
      const XML_ENTITIES = {
        className: 'symbol',
        begin: /&[a-z]+;|&#[0-9]+;|&#x[a-f0-9]+;/
      };
      const XML_META_KEYWORDS = {
        begin: /\s/,
        contains: [
          {
            className: 'keyword',
            begin: /#?[a-z_][a-z1-9_-]+/,
            illegal: /\n/
          }
        ]
      };
      const XML_META_PAR_KEYWORDS = hljs.inherit(XML_META_KEYWORDS, {
        begin: /\(/,
        end: /\)/
      });
      const APOS_META_STRING_MODE = hljs.inherit(hljs.APOS_STRING_MODE, {
        className: 'string'
      });
      const QUOTE_META_STRING_MODE = hljs.inherit(hljs.QUOTE_STRING_MODE, {
        className: 'string'
      });
      const TAG_INTERNALS = {
        endsWithParent: true,
        illegal: /</,
        relevance: 0,
        contains: [
          {
            className: 'attr',
            begin: XML_IDENT_RE,
            relevance: 0
          },
          {
            begin: /=\s*/,
            relevance: 0,
            contains: [
              {
                className: 'string',
                endsParent: true,
                variants: [
                  {
                    begin: /"/,
                    end: /"/,
                    contains: [ XML_ENTITIES ]
                  },
                  {
                    begin: /'/,
                    end: /'/,
                    contains: [ XML_ENTITIES ]
                  },
                  {
                    begin: /[^\s"'=<>`]+/
                  }
                ]
              }
            ]
          }
        ]
      };
      return {
        name: 'HTML, XML',
        aliases: [
          'html',
          'xhtml',
          'rss',
          'atom',
          'xjb',
          'xsd',
          'xsl',
          'plist',
          'wsf',
          'svg'
        ],
        case_insensitive: true,
        contains: [
          {
            className: 'meta',
            begin: /<![a-z]/,
            end: />/,
            relevance: 10,
            contains: [
              XML_META_KEYWORDS,
              QUOTE_META_STRING_MODE,
              APOS_META_STRING_MODE,
              XML_META_PAR_KEYWORDS,
              {
                begin: /\[/,
                end: /\]/,
                contains: [
                  {
                    className: 'meta',
                    begin: /<![a-z]/,
                    end: />/,
                    contains: [
                      XML_META_KEYWORDS,
                      XML_META_PAR_KEYWORDS,
                      QUOTE_META_STRING_MODE,
                      APOS_META_STRING_MODE
                    ]
                  }
                ]
              }
            ]
          },
          hljs.COMMENT(
            /<!--/,
            /-->/,
            {
              relevance: 10
            }
          ),
          {
            begin: /<!\[CDATA\[/,
            end: /\]\]>/,
            relevance: 10
          },
          XML_ENTITIES,
          {
            className: 'meta',
            begin: /<\?xml/,
            end: /\?>/,
            relevance: 10
          },
          {
            className: 'tag',
            /*
            The lookahead pattern (?=...) ensures that 'begin' only matches
            '<style' as a single word, followed by a whitespace or an
            ending bracket.
            */
            begin: /<style(?=\s|>)/,
            end: />/,
            keywords: {
              name: 'style'
            },
            contains: [ TAG_INTERNALS ],
            starts: {
              end: /<\/style>/,
              returnEnd: true,
              subLanguage: [
                'css',
                'xml'
              ]
            }
          },
          {
            className: 'tag',
            // See the comment in the <style tag about the lookahead pattern
            begin: /<script(?=\s|>)/,
            end: />/,
            keywords: {
              name: 'script'
            },
            contains: [ TAG_INTERNALS ],
            starts: {
              end: /<\/script>/,
              returnEnd: true,
              subLanguage: [
                'javascript',
                'handlebars',
                'xml'
              ]
            }
          },
          // we need this for now for jSX
          {
            className: 'tag',
            begin: /<>|<\/>/
          },
          // open tag
          {
            className: 'tag',
            begin: regex.concat(
              /</,
              regex.lookahead(regex.concat(
                TAG_NAME_RE,
                // <tag/>
                // <tag>
                // <tag ...
                regex.either(/\/>/, />/, /\s/)
              ))
            ),
            end: /\/?>/,
            contains: [
              {
                className: 'name',
                begin: TAG_NAME_RE,
                relevance: 0,
                starts: TAG_INTERNALS
              }
            ]
          },
          // close tag
          {
            className: 'tag',
            begin: regex.concat(
              /<\//,
              regex.lookahead(regex.concat(
                TAG_NAME_RE, />/
              ))
            ),
            contains: [
              {
                className: 'name',
                begin: TAG_NAME_RE,
                relevance: 0
              },
              {
                begin: />/,
                relevance: 0,
                endsParent: true
              }
            ]
          }
        ]
      };
    }

    /*
    Language: AsciiDoc
    Requires: xml.js
    Author: Dan Allen <dan.j.allen@gmail.com>
    Website: http://asciidoc.org
    Description: A semantic, text-based document format that can be exported to HTML, DocBook and other backends.
    Category: markup
    */

    /** @type LanguageFn */
    function asciidoc(hljs) {
      const regex = hljs.regex;
      const HORIZONTAL_RULE = {
        begin: '^\'{3,}[ \\t]*$',
        relevance: 10
      };
      const ESCAPED_FORMATTING = [
        // escaped constrained formatting marks (i.e., \* \_ or \`)
        {
          begin: /\\[*_`]/
        },
        // escaped unconstrained formatting marks (i.e., \\** \\__ or \\``)
        // must ignore until the next formatting marks
        // this rule might not be 100% compliant with Asciidoctor 2.0 but we are entering undefined behavior territory...
        {
          begin: /\\\\\*{2}[^\n]*?\*{2}/
        },
        {
          begin: /\\\\_{2}[^\n]*_{2}/
        },
        {
          begin: /\\\\`{2}[^\n]*`{2}/
        },
        // guard: constrained formatting mark may not be preceded by ":", ";" or
        // "}". match these so the constrained rule doesn't see them
        {
          begin: /[:;}][*_`](?![*_`])/
        }
      ];
      const STRONG = [
        // inline unconstrained strong (single line)
        {
          className: 'strong',
          begin: /\*{2}([^\n]+?)\*{2}/
        },
        // inline unconstrained strong (multi-line)
        {
          className: 'strong',
          begin: regex.concat(
            /\*\*/,
            /((\*(?!\*)|\\[^\n]|[^*\n\\])+\n)+/,
            /(\*(?!\*)|\\[^\n]|[^*\n\\])*/,
            /\*\*/
          ),
          relevance: 0
        },
        // inline constrained strong (single line)
        {
          className: 'strong',
          // must not precede or follow a word character
          begin: /\B\*(\S|\S[^\n]*?\S)\*(?!\w)/
        },
        // inline constrained strong (multi-line)
        {
          className: 'strong',
          // must not precede or follow a word character
          begin: /\*[^\s]([^\n]+\n)+([^\n]+)\*/
        }
      ];
      const EMPHASIS = [
        // inline unconstrained emphasis (single line)
        {
          className: 'emphasis',
          begin: /_{2}([^\n]+?)_{2}/
        },
        // inline unconstrained emphasis (multi-line)
        {
          className: 'emphasis',
          begin: regex.concat(
            /__/,
            /((_(?!_)|\\[^\n]|[^_\n\\])+\n)+/,
            /(_(?!_)|\\[^\n]|[^_\n\\])*/,
            /__/
          ),
          relevance: 0
        },
        // inline constrained emphasis (single line)
        {
          className: 'emphasis',
          // must not precede or follow a word character
          begin: /\b_(\S|\S[^\n]*?\S)_(?!\w)/
        },
        // inline constrained emphasis (multi-line)
        {
          className: 'emphasis',
          // must not precede or follow a word character
          begin: /_[^\s]([^\n]+\n)+([^\n]+)_/
        },
        // inline constrained emphasis using single quote (legacy)
        {
          className: 'emphasis',
          // must not follow a word character or be followed by a single quote or space
          begin: '\\B\'(?![\'\\s])',
          end: '(\\n{2}|\')',
          // allow escaped single quote followed by word char
          contains: [{
            begin: '\\\\\'\\w',
            relevance: 0
          }],
          relevance: 0
        }
      ];
      const ADMONITION = {
        className: 'symbol',
        begin: '^(NOTE|TIP|IMPORTANT|WARNING|CAUTION):\\s+',
        relevance: 10
      };
      const BULLET_LIST = {
        className: 'bullet',
        begin: '^(\\*+|-+|\\.+|[^\\n]+?::)\\s+'
      };

      return {
        name: 'AsciiDoc',
        aliases: ['adoc'],
        contains: [
          // block comment
          hljs.COMMENT(
            '^/{4,}\\n',
            '\\n/{4,}$',
            // can also be done as...
            // '^/{4,}$',
            // '^/{4,}$',
            {
              relevance: 10
            }
          ),
          // line comment
          hljs.COMMENT(
            '^//',
            '$',
            {
              relevance: 0
            }
          ),
          // title
          {
            className: 'title',
            begin: '^\\.\\w.*$'
          },
          // example, admonition & sidebar blocks
          {
            begin: '^[=\\*]{4,}\\n',
            end: '\\n^[=\\*]{4,}$',
            relevance: 10
          },
          // headings
          {
            className: 'section',
            relevance: 10,
            variants: [
              {
                begin: '^(={1,6})[ \t].+?([ \t]\\1)?$'
              },
              {
                begin: '^[^\\[\\]\\n]+?\\n[=\\-~\\^\\+]{2,}$'
              }
            ]
          },
          // document attributes
          {
            className: 'meta',
            begin: '^:.+?:',
            end: '\\s',
            excludeEnd: true,
            relevance: 10
          },
          // block attributes
          {
            className: 'meta',
            begin: '^\\[.+?\\]$',
            relevance: 0
          },
          // quoteblocks
          {
            className: 'quote',
            begin: '^_{4,}\\n',
            end: '\\n_{4,}$',
            relevance: 10
          },
          // listing and literal blocks
          {
            className: 'code',
            begin: '^[\\-\\.]{4,}\\n',
            end: '\\n[\\-\\.]{4,}$',
            relevance: 10
          },
          // passthrough blocks
          {
            begin: '^\\+{4,}\\n',
            end: '\\n\\+{4,}$',
            contains: [{
              begin: '<',
              end: '>',
              subLanguage: 'xml',
              relevance: 0
            }],
            relevance: 10
          },

          BULLET_LIST,
          ADMONITION,
          ...ESCAPED_FORMATTING,
          ...STRONG,
          ...EMPHASIS,

          // inline smart quotes
          {
            className: 'string',
            variants: [
              {
                begin: "``.+?''"
              },
              {
                begin: "`.+?'"
              }
            ]
          },
          // inline unconstrained emphasis
          {
            className: 'code',
            begin: /`{2}/,
            end: /(\n{2}|`{2})/
          },
          // inline code snippets (TODO should get same treatment as strong and emphasis)
          {
            className: 'code',
            begin: '(`.+?`|\\+.+?\\+)',
            relevance: 0
          },
          // indented literal block
          {
            className: 'code',
            begin: '^[ \\t]',
            end: '$',
            relevance: 0
          },
          HORIZONTAL_RULE,
          // images and links
          {
            begin: '(link:)?(http|https|ftp|file|irc|image:?):\\S+?\\[[^[]*?\\]',
            returnBegin: true,
            contains: [
              {
                begin: '(link|image:?):',
                relevance: 0
              },
              {
                className: 'link',
                begin: '\\w',
                end: '[^\\[]+',
                relevance: 0
              },
              {
                className: 'string',
                begin: '\\[',
                end: '\\]',
                excludeBegin: true,
                excludeEnd: true,
                relevance: 0
              }
            ],
            relevance: 10
          }
        ]
      };
    }

    /*
    Language: Awk
    Author: Matthew Daly <matthewbdaly@gmail.com>
    Website: https://www.gnu.org/software/gawk/manual/gawk.html
    Description: language definition for Awk scripts
    */

    /** @type LanguageFn */
    function awk(hljs) {
      const VARIABLE = {
        className: 'variable',
        variants: [
          {
            begin: /\$[\w\d#@][\w\d_]*/
          },
          {
            begin: /\$\{(.*?)\}/
          }
        ]
      };
      const KEYWORDS = 'BEGIN END if else while do for in break continue delete next nextfile function func exit|10';
      const STRING = {
        className: 'string',
        contains: [hljs.BACKSLASH_ESCAPE],
        variants: [
          {
            begin: /(u|b)?r?'''/,
            end: /'''/,
            relevance: 10
          },
          {
            begin: /(u|b)?r?"""/,
            end: /"""/,
            relevance: 10
          },
          {
            begin: /(u|r|ur)'/,
            end: /'/,
            relevance: 10
          },
          {
            begin: /(u|r|ur)"/,
            end: /"/,
            relevance: 10
          },
          {
            begin: /(b|br)'/,
            end: /'/
          },
          {
            begin: /(b|br)"/,
            end: /"/
          },
          hljs.APOS_STRING_MODE,
          hljs.QUOTE_STRING_MODE
        ]
      };
      return {
        name: 'Awk',
        keywords: {
          keyword: KEYWORDS
        },
        contains: [
          VARIABLE,
          STRING,
          hljs.REGEXP_MODE,
          hljs.HASH_COMMENT_MODE,
          hljs.NUMBER_MODE
        ]
      };
    }

    /*
    Language: Bash
    Author: vah <vahtenberg@gmail.com>
    Contributrors: Benjamin Pannell <contact@sierrasoftworks.com>
    Website: https://www.gnu.org/software/bash/
    Category: common
    */

    /** @type LanguageFn */
    function bash(hljs) {
      const regex = hljs.regex;
      const VAR = {};
      const BRACED_VAR = {
        begin: /\$\{/,
        end:/\}/,
        contains: [
          "self",
          {
            begin: /:-/,
            contains: [ VAR ]
          } // default values
        ]
      };
      Object.assign(VAR,{
        className: 'variable',
        variants: [
          {begin: regex.concat(/\$[\w\d#@][\w\d_]*/,
            // negative look-ahead tries to avoid matching patterns that are not
            // Perl at all like $ident$, @ident@, etc.
            `(?![\\w\\d])(?![$])`) },
          BRACED_VAR
        ]
      });

      const SUBST = {
        className: 'subst',
        begin: /\$\(/, end: /\)/,
        contains: [hljs.BACKSLASH_ESCAPE]
      };
      const HERE_DOC = {
        begin: /<<-?\s*(?=\w+)/,
        starts: {
          contains: [
            hljs.END_SAME_AS_BEGIN({
              begin: /(\w+)/,
              end: /(\w+)/,
              className: 'string'
            })
          ]
        }
      };
      const QUOTE_STRING = {
        className: 'string',
        begin: /"/, end: /"/,
        contains: [
          hljs.BACKSLASH_ESCAPE,
          VAR,
          SUBST
        ]
      };
      SUBST.contains.push(QUOTE_STRING);
      const ESCAPED_QUOTE = {
        className: '',
        begin: /\\"/

      };
      const APOS_STRING = {
        className: 'string',
        begin: /'/, end: /'/
      };
      const ARITHMETIC = {
        begin: /\$\(\(/,
        end: /\)\)/,
        contains: [
          { begin: /\d+#[0-9a-f]+/, className: "number" },
          hljs.NUMBER_MODE,
          VAR
        ]
      };
      const SH_LIKE_SHELLS = [
        "fish",
        "bash",
        "zsh",
        "sh",
        "csh",
        "ksh",
        "tcsh",
        "dash",
        "scsh",
      ];
      const KNOWN_SHEBANG = hljs.SHEBANG({
        binary: `(${SH_LIKE_SHELLS.join("|")})`,
        relevance: 10
      });
      const FUNCTION = {
        className: 'function',
        begin: /\w[\w\d_]*\s*\(\s*\)\s*\{/,
        returnBegin: true,
        contains: [hljs.inherit(hljs.TITLE_MODE, {begin: /\w[\w\d_]*/})],
        relevance: 0
      };

      const KEYWORDS = [
        "if",
        "then",
        "else",
        "elif",
        "fi",
        "for",
        "while",
        "in",
        "do",
        "done",
        "case",
        "esac",
        "function"
      ];

      const LITERALS = [
        "true",
        "false"
      ];

      // to consume paths to prevent keyword matches inside them
      const PATH_MODE = {
        match: /(\/[a-z._-]+)+/
      };

      // http://www.gnu.org/software/bash/manual/html_node/Shell-Builtin-Commands.html
      const SHELL_BUILT_INS = [
        "break",
        "cd",
        "continue",
        "eval",
        "exec",
        "exit",
        "export",
        "getopts",
        "hash",
        "pwd",
        "readonly",
        "return",
        "shift",
        "test",
        "times",
        "trap",
        "umask",
        "unset"
      ];

      const BASH_BUILT_INS = [
        "alias",
        "bind",
        "builtin",
        "caller",
        "command",
        "declare",
        "echo",
        "enable",
        "help",
        "let",
        "local",
        "logout",
        "mapfile",
        "printf",
        "read",
        "readarray",
        "source",
        "type",
        "typeset",
        "ulimit",
        "unalias"
      ];

      const ZSH_BUILT_INS = [
        "autoload",
        "bg",
        "bindkey",
        "bye",
        "cap",
        "chdir",
        "clone",
        "comparguments",
        "compcall",
        "compctl",
        "compdescribe",
        "compfiles",
        "compgroups",
        "compquote",
        "comptags",
        "comptry",
        "compvalues",
        "dirs",
        "disable",
        "disown",
        "echotc",
        "echoti",
        "emulate",
        "fc",
        "fg",
        "float",
        "functions",
        "getcap",
        "getln",
        "history",
        "integer",
        "jobs",
        "kill",
        "limit",
        "log",
        "noglob",
        "popd",
        "print",
        "pushd",
        "pushln",
        "rehash",
        "sched",
        "setcap",
        "setopt",
        "stat",
        "suspend",
        "ttyctl",
        "unfunction",
        "unhash",
        "unlimit",
        "unsetopt",
        "vared",
        "wait",
        "whence",
        "where",
        "which",
        "zcompile",
        "zformat",
        "zftp",
        "zle",
        "zmodload",
        "zparseopts",
        "zprof",
        "zpty",
        "zregexparse",
        "zsocket",
        "zstyle",
        "ztcp"
      ];

      const GNU_CORE_UTILS = [
        "chcon",
        "chgrp",
        "chown",
        "chmod",
        "cp",
        "dd",
        "df",
        "dir",
        "dircolors",
        "ln",
        "ls",
        "mkdir",
        "mkfifo",
        "mknod",
        "mktemp",
        "mv",
        "realpath",
        "rm",
        "rmdir",
        "shred",
        "sync",
        "touch",
        "truncate",
        "vdir",
        "b2sum",
        "base32",
        "base64",
        "cat",
        "cksum",
        "comm",
        "csplit",
        "cut",
        "expand",
        "fmt",
        "fold",
        "head",
        "join",
        "md5sum",
        "nl",
        "numfmt",
        "od",
        "paste",
        "ptx",
        "pr",
        "sha1sum",
        "sha224sum",
        "sha256sum",
        "sha384sum",
        "sha512sum",
        "shuf",
        "sort",
        "split",
        "sum",
        "tac",
        "tail",
        "tr",
        "tsort",
        "unexpand",
        "uniq",
        "wc",
        "arch",
        "basename",
        "chroot",
        "date",
        "dirname",
        "du",
        "echo",
        "env",
        "expr",
        "factor",
        // "false", // keyword literal already
        "groups",
        "hostid",
        "id",
        "link",
        "logname",
        "nice",
        "nohup",
        "nproc",
        "pathchk",
        "pinky",
        "printenv",
        "printf",
        "pwd",
        "readlink",
        "runcon",
        "seq",
        "sleep",
        "stat",
        "stdbuf",
        "stty",
        "tee",
        "test",
        "timeout",
        // "true", // keyword literal already
        "tty",
        "uname",
        "unlink",
        "uptime",
        "users",
        "who",
        "whoami",
        "yes"
      ];

      return {
        name: 'Bash',
        aliases: ['sh'],
        keywords: {
          $pattern: /\b[a-z._-]+\b/,
          keyword: KEYWORDS,
          literal: LITERALS,
          built_in:[
            ...SHELL_BUILT_INS,
            ...BASH_BUILT_INS,
            // Shell modifiers
            "set",
            "shopt",
            ...ZSH_BUILT_INS,
            ...GNU_CORE_UTILS
          ]
        },
        contains: [
          KNOWN_SHEBANG, // to catch known shells and boost relevancy
          hljs.SHEBANG(), // to catch unknown shells but still highlight the shebang
          FUNCTION,
          ARITHMETIC,
          hljs.HASH_COMMENT_MODE,
          HERE_DOC,
          PATH_MODE,
          QUOTE_STRING,
          ESCAPED_QUOTE,
          APOS_STRING,
          VAR
        ]
      };
    }

    /*
    Language: C
    Category: common, system
    Website: https://en.wikipedia.org/wiki/C_(programming_language)
    */

    /** @type LanguageFn */
    function c(hljs) {
      const regex = hljs.regex;
      // added for historic reasons because `hljs.C_LINE_COMMENT_MODE` does
      // not include such support nor can we be sure all the grammars depending
      // on it would desire this behavior
      const C_LINE_COMMENT_MODE = hljs.COMMENT('//', '$', {
        contains: [
          {
            begin: /\\\n/
          }
        ]
      });
      const DECLTYPE_AUTO_RE = 'decltype\\(auto\\)';
      const NAMESPACE_RE = '[a-zA-Z_]\\w*::';
      const TEMPLATE_ARGUMENT_RE = '<[^<>]+>';
      const FUNCTION_TYPE_RE = '(' +
        DECLTYPE_AUTO_RE + '|' +
        regex.optional(NAMESPACE_RE) +
        '[a-zA-Z_]\\w*' + regex.optional(TEMPLATE_ARGUMENT_RE) +
      ')';


      const TYPES = {
        className: 'type',
        variants: [
          { begin: '\\b[a-z\\d_]*_t\\b' },
          { match: /\batomic_[a-z]{3,6}\b/}
        ]

      };

      // https://en.cppreference.com/w/cpp/language/escape
      // \\ \x \xFF \u2837 \u00323747 \374
      const CHARACTER_ESCAPES = '\\\\(x[0-9A-Fa-f]{2}|u[0-9A-Fa-f]{4,8}|[0-7]{3}|\\S)';
      const STRINGS = {
        className: 'string',
        variants: [
          {
            begin: '(u8?|U|L)?"',
            end: '"',
            illegal: '\\n',
            contains: [ hljs.BACKSLASH_ESCAPE ]
          },
          {
            begin: '(u8?|U|L)?\'(' + CHARACTER_ESCAPES + "|.)",
            end: '\'',
            illegal: '.'
          },
          hljs.END_SAME_AS_BEGIN({
            begin: /(?:u8?|U|L)?R"([^()\\ ]{0,16})\(/,
            end: /\)([^()\\ ]{0,16})"/
          })
        ]
      };

      const NUMBERS = {
        className: 'number',
        variants: [
          {
            begin: '\\b(0b[01\']+)'
          },
          {
            begin: '(-?)\\b([\\d\']+(\\.[\\d\']*)?|\\.[\\d\']+)((ll|LL|l|L)(u|U)?|(u|U)(ll|LL|l|L)?|f|F|b|B)'
          },
          {
            begin: '(-?)(\\b0[xX][a-fA-F0-9\']+|(\\b[\\d\']+(\\.[\\d\']*)?|\\.[\\d\']+)([eE][-+]?[\\d\']+)?)'
          }
        ],
        relevance: 0
      };

      const PREPROCESSOR = {
        className: 'meta',
        begin: /#\s*[a-z]+\b/,
        end: /$/,
        keywords: {
          keyword:
            'if else elif endif define undef warning error line ' +
            'pragma _Pragma ifdef ifndef include'
        },
        contains: [
          {
            begin: /\\\n/,
            relevance: 0
          },
          hljs.inherit(STRINGS, {
            className: 'string'
          }),
          {
            className: 'string',
            begin: /<.*?>/
          },
          C_LINE_COMMENT_MODE,
          hljs.C_BLOCK_COMMENT_MODE
        ]
      };

      const TITLE_MODE = {
        className: 'title',
        begin: regex.optional(NAMESPACE_RE) + hljs.IDENT_RE,
        relevance: 0
      };

      const FUNCTION_TITLE = regex.optional(NAMESPACE_RE) + hljs.IDENT_RE + '\\s*\\(';

      const C_KEYWORDS = [
        "asm",
        "auto",
        "break",
        "case",
        "continue",
        "default",
        "do",
        "else",
        "enum",
        "extern",
        "for",
        "fortran",
        "goto",
        "if",
        "inline",
        "register",
        "restrict",
        "return",
        "sizeof",
        "struct",
        "switch",
        "typedef",
        "union",
        "volatile",
        "while",
        "_Alignas",
        "_Alignof",
        "_Atomic",
        "_Generic",
        "_Noreturn",
        "_Static_assert",
        "_Thread_local",
        // aliases
        "alignas",
        "alignof",
        "noreturn",
        "static_assert",
        "thread_local",
        // not a C keyword but is, for all intents and purposes, treated exactly like one.
        "_Pragma"
      ];

      const C_TYPES = [
        "float",
        "double",
        "signed",
        "unsigned",
        "int",
        "short",
        "long",
        "char",
        "void",
        "_Bool",
        "_Complex",
        "_Imaginary",
        "_Decimal32",
        "_Decimal64",
        "_Decimal128",
        // modifiers
        "const",
        "static",
        // aliases
        "complex",
        "bool",
        "imaginary"
      ];

      const KEYWORDS = {
        keyword: C_KEYWORDS,
        type: C_TYPES,
        literal: 'true false NULL',
        // TODO: apply hinting work similar to what was done in cpp.js
        built_in: 'std string wstring cin cout cerr clog stdin stdout stderr stringstream istringstream ostringstream ' +
          'auto_ptr deque list queue stack vector map set pair bitset multiset multimap unordered_set ' +
          'unordered_map unordered_multiset unordered_multimap priority_queue make_pair array shared_ptr abort terminate abs acos ' +
          'asin atan2 atan calloc ceil cosh cos exit exp fabs floor fmod fprintf fputs free frexp ' +
          'fscanf future isalnum isalpha iscntrl isdigit isgraph islower isprint ispunct isspace isupper ' +
          'isxdigit tolower toupper labs ldexp log10 log malloc realloc memchr memcmp memcpy memset modf pow ' +
          'printf putchar puts scanf sinh sin snprintf sprintf sqrt sscanf strcat strchr strcmp ' +
          'strcpy strcspn strlen strncat strncmp strncpy strpbrk strrchr strspn strstr tanh tan ' +
          'vfprintf vprintf vsprintf endl initializer_list unique_ptr',
      };

      const EXPRESSION_CONTAINS = [
        PREPROCESSOR,
        TYPES,
        C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
        NUMBERS,
        STRINGS
      ];

      const EXPRESSION_CONTEXT = {
        // This mode covers expression context where we can't expect a function
        // definition and shouldn't highlight anything that looks like one:
        // `return some()`, `else if()`, `(x*sum(1, 2))`
        variants: [
          {
            begin: /=/,
            end: /;/
          },
          {
            begin: /\(/,
            end: /\)/
          },
          {
            beginKeywords: 'new throw return else',
            end: /;/
          }
        ],
        keywords: KEYWORDS,
        contains: EXPRESSION_CONTAINS.concat([
          {
            begin: /\(/,
            end: /\)/,
            keywords: KEYWORDS,
            contains: EXPRESSION_CONTAINS.concat([ 'self' ]),
            relevance: 0
          }
        ]),
        relevance: 0
      };

      const FUNCTION_DECLARATION = {
        begin: '(' + FUNCTION_TYPE_RE + '[\\*&\\s]+)+' + FUNCTION_TITLE,
        returnBegin: true,
        end: /[{;=]/,
        excludeEnd: true,
        keywords: KEYWORDS,
        illegal: /[^\w\s\*&:<>.]/,
        contains: [
          { // to prevent it from being confused as the function title
            begin: DECLTYPE_AUTO_RE,
            keywords: KEYWORDS,
            relevance: 0
          },
          {
            begin: FUNCTION_TITLE,
            returnBegin: true,
            contains: [
              hljs.inherit(TITLE_MODE, { className: "title.function" })
            ],
            relevance: 0
          },
          // allow for multiple declarations, e.g.:
          // extern void f(int), g(char);
          {
            relevance: 0,
            match: /,/
          },
          {
            className: 'params',
            begin: /\(/,
            end: /\)/,
            keywords: KEYWORDS,
            relevance: 0,
            contains: [
              C_LINE_COMMENT_MODE,
              hljs.C_BLOCK_COMMENT_MODE,
              STRINGS,
              NUMBERS,
              TYPES,
              // Count matching parentheses.
              {
                begin: /\(/,
                end: /\)/,
                keywords: KEYWORDS,
                relevance: 0,
                contains: [
                  'self',
                  C_LINE_COMMENT_MODE,
                  hljs.C_BLOCK_COMMENT_MODE,
                  STRINGS,
                  NUMBERS,
                  TYPES
                ]
              }
            ]
          },
          TYPES,
          C_LINE_COMMENT_MODE,
          hljs.C_BLOCK_COMMENT_MODE,
          PREPROCESSOR
        ]
      };

      return {
        name: "C",
        aliases: [
          'h'
        ],
        keywords: KEYWORDS,
        // Until differentiations are added between `c` and `cpp`, `c` will
        // not be auto-detected to avoid auto-detect conflicts between C and C++
        disableAutodetect: true,
        illegal: '</',
        contains: [].concat(
          EXPRESSION_CONTEXT,
          FUNCTION_DECLARATION,
          EXPRESSION_CONTAINS,
          [
            PREPROCESSOR,
            {
              begin: hljs.IDENT_RE + '::',
              keywords: KEYWORDS
            },
            {
              className: 'class',
              beginKeywords: 'enum class struct union',
              end: /[{;:<>=]/,
              contains: [
                {
                  beginKeywords: "final class struct"
                },
                hljs.TITLE_MODE
              ]
            }
          ]),
        exports: {
          preprocessor: PREPROCESSOR,
          strings: STRINGS,
          keywords: KEYWORDS
        }
      };
    }

    /*
    Language: CMake
    Description: CMake is an open-source cross-platform system for build automation.
    Author: Igor Kalnitsky <igor@kalnitsky.org>
    Website: https://cmake.org
    */

    /** @type LanguageFn */
    function cmake(hljs) {
      return {
        name: 'CMake',
        aliases: ['cmake.in'],
        case_insensitive: true,
        keywords: {
          keyword:
            // scripting commands
            'break cmake_host_system_information cmake_minimum_required cmake_parse_arguments ' +
            'cmake_policy configure_file continue elseif else endforeach endfunction endif endmacro ' +
            'endwhile execute_process file find_file find_library find_package find_path ' +
            'find_program foreach function get_cmake_property get_directory_property ' +
            'get_filename_component get_property if include include_guard list macro ' +
            'mark_as_advanced math message option return separate_arguments ' +
            'set_directory_properties set_property set site_name string unset variable_watch while ' +
            // project commands
            'add_compile_definitions add_compile_options add_custom_command add_custom_target ' +
            'add_definitions add_dependencies add_executable add_library add_link_options ' +
            'add_subdirectory add_test aux_source_directory build_command create_test_sourcelist ' +
            'define_property enable_language enable_testing export fltk_wrap_ui ' +
            'get_source_file_property get_target_property get_test_property include_directories ' +
            'include_external_msproject include_regular_expression install link_directories ' +
            'link_libraries load_cache project qt_wrap_cpp qt_wrap_ui remove_definitions ' +
            'set_source_files_properties set_target_properties set_tests_properties source_group ' +
            'target_compile_definitions target_compile_features target_compile_options ' +
            'target_include_directories target_link_directories target_link_libraries ' +
            'target_link_options target_sources try_compile try_run ' +
            // CTest commands
            'ctest_build ctest_configure ctest_coverage ctest_empty_binary_directory ctest_memcheck ' +
            'ctest_read_custom_files ctest_run_script ctest_sleep ctest_start ctest_submit ' +
            'ctest_test ctest_update ctest_upload ' +
            // deprecated commands
            'build_name exec_program export_library_dependencies install_files install_programs ' +
            'install_targets load_command make_directory output_required_files remove ' +
            'subdir_depends subdirs use_mangled_mesa utility_source variable_requires write_file ' +
            'qt5_use_modules qt5_use_package qt5_wrap_cpp ' +
            // core keywords
            'on off true false and or not command policy target test exists is_newer_than ' +
            'is_directory is_symlink is_absolute matches less greater equal less_equal ' +
            'greater_equal strless strgreater strequal strless_equal strgreater_equal version_less ' +
            'version_greater version_equal version_less_equal version_greater_equal in_list defined'
        },
        contains: [
          {
            className: 'variable',
            begin: /\$\{/,
            end: /\}/
          },
          hljs.HASH_COMMENT_MODE,
          hljs.QUOTE_STRING_MODE,
          hljs.NUMBER_MODE
        ]
      };
    }

    /*
    Language: C++
    Category: common, system
    Website: https://isocpp.org
    */

    /** @type LanguageFn */
    function cpp(hljs) {
      const regex = hljs.regex;
      // added for historic reasons because `hljs.C_LINE_COMMENT_MODE` does
      // not include such support nor can we be sure all the grammars depending
      // on it would desire this behavior
      const C_LINE_COMMENT_MODE = hljs.COMMENT('//', '$', {
        contains: [
          {
            begin: /\\\n/
          }
        ]
      });
      const DECLTYPE_AUTO_RE = 'decltype\\(auto\\)';
      const NAMESPACE_RE = '[a-zA-Z_]\\w*::';
      const TEMPLATE_ARGUMENT_RE = '<[^<>]+>';
      const FUNCTION_TYPE_RE = '(?!struct)(' +
        DECLTYPE_AUTO_RE + '|' +
        regex.optional(NAMESPACE_RE) +
        '[a-zA-Z_]\\w*' + regex.optional(TEMPLATE_ARGUMENT_RE) +
      ')';

      const CPP_PRIMITIVE_TYPES = {
        className: 'type',
        begin: '\\b[a-z\\d_]*_t\\b'
      };

      // https://en.cppreference.com/w/cpp/language/escape
      // \\ \x \xFF \u2837 \u00323747 \374
      const CHARACTER_ESCAPES = '\\\\(x[0-9A-Fa-f]{2}|u[0-9A-Fa-f]{4,8}|[0-7]{3}|\\S)';
      const STRINGS = {
        className: 'string',
        variants: [
          {
            begin: '(u8?|U|L)?"',
            end: '"',
            illegal: '\\n',
            contains: [ hljs.BACKSLASH_ESCAPE ]
          },
          {
            begin: '(u8?|U|L)?\'(' + CHARACTER_ESCAPES + '|.)',
            end: '\'',
            illegal: '.'
          },
          hljs.END_SAME_AS_BEGIN({
            begin: /(?:u8?|U|L)?R"([^()\\ ]{0,16})\(/,
            end: /\)([^()\\ ]{0,16})"/
          })
        ]
      };

      const NUMBERS = {
        className: 'number',
        variants: [
          {
            begin: '\\b(0b[01\']+)'
          },
          {
            begin: '(-?)\\b([\\d\']+(\\.[\\d\']*)?|\\.[\\d\']+)((ll|LL|l|L)(u|U)?|(u|U)(ll|LL|l|L)?|f|F|b|B)'
          },
          {
            begin: '(-?)(\\b0[xX][a-fA-F0-9\']+|(\\b[\\d\']+(\\.[\\d\']*)?|\\.[\\d\']+)([eE][-+]?[\\d\']+)?)'
          }
        ],
        relevance: 0
      };

      const PREPROCESSOR = {
        className: 'meta',
        begin: /#\s*[a-z]+\b/,
        end: /$/,
        keywords: {
          keyword:
            'if else elif endif define undef warning error line ' +
            'pragma _Pragma ifdef ifndef include'
        },
        contains: [
          {
            begin: /\\\n/,
            relevance: 0
          },
          hljs.inherit(STRINGS, {
            className: 'string'
          }),
          {
            className: 'string',
            begin: /<.*?>/
          },
          C_LINE_COMMENT_MODE,
          hljs.C_BLOCK_COMMENT_MODE
        ]
      };

      const TITLE_MODE = {
        className: 'title',
        begin: regex.optional(NAMESPACE_RE) + hljs.IDENT_RE,
        relevance: 0
      };

      const FUNCTION_TITLE = regex.optional(NAMESPACE_RE) + hljs.IDENT_RE + '\\s*\\(';

      // https://en.cppreference.com/w/cpp/keyword
      const RESERVED_KEYWORDS = [
        'alignas',
        'alignof',
        'and',
        'and_eq',
        'asm',
        'atomic_cancel',
        'atomic_commit',
        'atomic_noexcept',
        'auto',
        'bitand',
        'bitor',
        'break',
        'case',
        'catch',
        'class',
        'co_await',
        'co_return',
        'co_yield',
        'compl',
        'concept',
        'const_cast|10',
        'consteval',
        'constexpr',
        'constinit',
        'continue',
        'decltype',
        'default',
        'delete',
        'do',
        'dynamic_cast|10',
        'else',
        'enum',
        'explicit',
        'export',
        'extern',
        'false',
        'final',
        'for',
        'friend',
        'goto',
        'if',
        'import',
        'inline',
        'module',
        'mutable',
        'namespace',
        'new',
        'noexcept',
        'not',
        'not_eq',
        'nullptr',
        'operator',
        'or',
        'or_eq',
        'override',
        'private',
        'protected',
        'public',
        'reflexpr',
        'register',
        'reinterpret_cast|10',
        'requires',
        'return',
        'sizeof',
        'static_assert',
        'static_cast|10',
        'struct',
        'switch',
        'synchronized',
        'template',
        'this',
        'thread_local',
        'throw',
        'transaction_safe',
        'transaction_safe_dynamic',
        'true',
        'try',
        'typedef',
        'typeid',
        'typename',
        'union',
        'using',
        'virtual',
        'volatile',
        'while',
        'xor',
        'xor_eq'
      ];

      // https://en.cppreference.com/w/cpp/keyword
      const RESERVED_TYPES = [
        'bool',
        'char',
        'char16_t',
        'char32_t',
        'char8_t',
        'double',
        'float',
        'int',
        'long',
        'short',
        'void',
        'wchar_t',
        'unsigned',
        'signed',
        'const',
        'static'
      ];

      const TYPE_HINTS = [
        'any',
        'auto_ptr',
        'barrier',
        'binary_semaphore',
        'bitset',
        'complex',
        'condition_variable',
        'condition_variable_any',
        'counting_semaphore',
        'deque',
        'false_type',
        'future',
        'imaginary',
        'initializer_list',
        'istringstream',
        'jthread',
        'latch',
        'lock_guard',
        'multimap',
        'multiset',
        'mutex',
        'optional',
        'ostringstream',
        'packaged_task',
        'pair',
        'promise',
        'priority_queue',
        'queue',
        'recursive_mutex',
        'recursive_timed_mutex',
        'scoped_lock',
        'set',
        'shared_future',
        'shared_lock',
        'shared_mutex',
        'shared_timed_mutex',
        'shared_ptr',
        'stack',
        'string_view',
        'stringstream',
        'timed_mutex',
        'thread',
        'true_type',
        'tuple',
        'unique_lock',
        'unique_ptr',
        'unordered_map',
        'unordered_multimap',
        'unordered_multiset',
        'unordered_set',
        'variant',
        'vector',
        'weak_ptr',
        'wstring',
        'wstring_view'
      ];

      const FUNCTION_HINTS = [
        'abort',
        'abs',
        'acos',
        'apply',
        'as_const',
        'asin',
        'atan',
        'atan2',
        'calloc',
        'ceil',
        'cerr',
        'cin',
        'clog',
        'cos',
        'cosh',
        'cout',
        'declval',
        'endl',
        'exchange',
        'exit',
        'exp',
        'fabs',
        'floor',
        'fmod',
        'forward',
        'fprintf',
        'fputs',
        'free',
        'frexp',
        'fscanf',
        'future',
        'invoke',
        'isalnum',
        'isalpha',
        'iscntrl',
        'isdigit',
        'isgraph',
        'islower',
        'isprint',
        'ispunct',
        'isspace',
        'isupper',
        'isxdigit',
        'labs',
        'launder',
        'ldexp',
        'log',
        'log10',
        'make_pair',
        'make_shared',
        'make_shared_for_overwrite',
        'make_tuple',
        'make_unique',
        'malloc',
        'memchr',
        'memcmp',
        'memcpy',
        'memset',
        'modf',
        'move',
        'pow',
        'printf',
        'putchar',
        'puts',
        'realloc',
        'scanf',
        'sin',
        'sinh',
        'snprintf',
        'sprintf',
        'sqrt',
        'sscanf',
        'std',
        'stderr',
        'stdin',
        'stdout',
        'strcat',
        'strchr',
        'strcmp',
        'strcpy',
        'strcspn',
        'strlen',
        'strncat',
        'strncmp',
        'strncpy',
        'strpbrk',
        'strrchr',
        'strspn',
        'strstr',
        'swap',
        'tan',
        'tanh',
        'terminate',
        'to_underlying',
        'tolower',
        'toupper',
        'vfprintf',
        'visit',
        'vprintf',
        'vsprintf'
      ];

      const LITERALS = [
        'NULL',
        'false',
        'nullopt',
        'nullptr',
        'true'
      ];

      // https://en.cppreference.com/w/cpp/keyword
      const BUILT_IN = [
        '_Pragma'
      ];

      const CPP_KEYWORDS = {
        type: RESERVED_TYPES,
        keyword: RESERVED_KEYWORDS,
        literal: LITERALS,
        built_in: BUILT_IN,
        _type_hints: TYPE_HINTS
      };

      const FUNCTION_DISPATCH = {
        className: 'function.dispatch',
        relevance: 0,
        keywords: {
          // Only for relevance, not highlighting.
          _hint: FUNCTION_HINTS
        },
        begin: regex.concat(
          /\b/,
          /(?!decltype)/,
          /(?!if)/,
          /(?!for)/,
          /(?!switch)/,
          /(?!while)/,
          hljs.IDENT_RE,
          regex.lookahead(/(<[^<>]+>|)\s*\(/))
      };

      const EXPRESSION_CONTAINS = [
        FUNCTION_DISPATCH,
        PREPROCESSOR,
        CPP_PRIMITIVE_TYPES,
        C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
        NUMBERS,
        STRINGS
      ];

      const EXPRESSION_CONTEXT = {
        // This mode covers expression context where we can't expect a function
        // definition and shouldn't highlight anything that looks like one:
        // `return some()`, `else if()`, `(x*sum(1, 2))`
        variants: [
          {
            begin: /=/,
            end: /;/
          },
          {
            begin: /\(/,
            end: /\)/
          },
          {
            beginKeywords: 'new throw return else',
            end: /;/
          }
        ],
        keywords: CPP_KEYWORDS,
        contains: EXPRESSION_CONTAINS.concat([
          {
            begin: /\(/,
            end: /\)/,
            keywords: CPP_KEYWORDS,
            contains: EXPRESSION_CONTAINS.concat([ 'self' ]),
            relevance: 0
          }
        ]),
        relevance: 0
      };

      const FUNCTION_DECLARATION = {
        className: 'function',
        begin: '(' + FUNCTION_TYPE_RE + '[\\*&\\s]+)+' + FUNCTION_TITLE,
        returnBegin: true,
        end: /[{;=]/,
        excludeEnd: true,
        keywords: CPP_KEYWORDS,
        illegal: /[^\w\s\*&:<>.]/,
        contains: [
          { // to prevent it from being confused as the function title
            begin: DECLTYPE_AUTO_RE,
            keywords: CPP_KEYWORDS,
            relevance: 0
          },
          {
            begin: FUNCTION_TITLE,
            returnBegin: true,
            contains: [ TITLE_MODE ],
            relevance: 0
          },
          // needed because we do not have look-behind on the below rule
          // to prevent it from grabbing the final : in a :: pair
          {
            begin: /::/,
            relevance: 0
          },
          // initializers
          {
            begin: /:/,
            endsWithParent: true,
            contains: [
              STRINGS,
              NUMBERS
            ]
          },
          // allow for multiple declarations, e.g.:
          // extern void f(int), g(char);
          {
            relevance: 0,
            match: /,/
          },
          {
            className: 'params',
            begin: /\(/,
            end: /\)/,
            keywords: CPP_KEYWORDS,
            relevance: 0,
            contains: [
              C_LINE_COMMENT_MODE,
              hljs.C_BLOCK_COMMENT_MODE,
              STRINGS,
              NUMBERS,
              CPP_PRIMITIVE_TYPES,
              // Count matching parentheses.
              {
                begin: /\(/,
                end: /\)/,
                keywords: CPP_KEYWORDS,
                relevance: 0,
                contains: [
                  'self',
                  C_LINE_COMMENT_MODE,
                  hljs.C_BLOCK_COMMENT_MODE,
                  STRINGS,
                  NUMBERS,
                  CPP_PRIMITIVE_TYPES
                ]
              }
            ]
          },
          CPP_PRIMITIVE_TYPES,
          C_LINE_COMMENT_MODE,
          hljs.C_BLOCK_COMMENT_MODE,
          PREPROCESSOR
        ]
      };

      return {
        name: 'C++',
        aliases: [
          'cc',
          'c++',
          'h++',
          'hpp',
          'hh',
          'hxx',
          'cxx'
        ],
        keywords: CPP_KEYWORDS,
        illegal: '</',
        classNameAliases: {
          'function.dispatch': 'built_in'
        },
        contains: [].concat(
          EXPRESSION_CONTEXT,
          FUNCTION_DECLARATION,
          FUNCTION_DISPATCH,
          EXPRESSION_CONTAINS,
          [
            PREPROCESSOR,
            { // containers: ie, `vector <int> rooms (9);`
              begin: '\\b(deque|list|queue|priority_queue|pair|stack|vector|map|set|bitset|multiset|multimap|unordered_map|unordered_set|unordered_multiset|unordered_multimap|array|tuple|optional|variant|function)\\s*<',
              end: '>',
              keywords: CPP_KEYWORDS,
              contains: [
                'self',
                CPP_PRIMITIVE_TYPES
              ]
            },
            {
              begin: hljs.IDENT_RE + '::',
              keywords: CPP_KEYWORDS
            },
            {
              match: [
                // extra complexity to deal with `enum class` and `enum struct`
                /\b(?:enum(?:\s+(?:class|struct))?|class|struct|union)/,
                /\s+/,
                /\w+/
              ],
              className: {
                1: 'keyword',
                3: 'title.class'
              }
            }
          ])
      };
    }

    const MODES = (hljs) => {
      return {
        IMPORTANT: {
          scope: 'meta',
          begin: '!important'
        },
        BLOCK_COMMENT: hljs.C_BLOCK_COMMENT_MODE,
        HEXCOLOR: {
          scope: 'number',
          begin: /#(([0-9a-fA-F]{3,4})|(([0-9a-fA-F]{2}){3,4}))\b/
        },
        FUNCTION_DISPATCH: {
          className: "built_in",
          begin: /[\w-]+(?=\()/
        },
        ATTRIBUTE_SELECTOR_MODE: {
          scope: 'selector-attr',
          begin: /\[/,
          end: /\]/,
          illegal: '$',
          contains: [
            hljs.APOS_STRING_MODE,
            hljs.QUOTE_STRING_MODE
          ]
        },
        CSS_NUMBER_MODE: {
          scope: 'number',
          begin: hljs.NUMBER_RE + '(' +
            '%|em|ex|ch|rem' +
            '|vw|vh|vmin|vmax' +
            '|cm|mm|in|pt|pc|px' +
            '|deg|grad|rad|turn' +
            '|s|ms' +
            '|Hz|kHz' +
            '|dpi|dpcm|dppx' +
            ')?',
          relevance: 0
        },
        CSS_VARIABLE: {
          className: "attr",
          begin: /--[A-Za-z][A-Za-z0-9_-]*/
        }
      };
    };

    const TAGS = [
      'a',
      'abbr',
      'address',
      'article',
      'aside',
      'audio',
      'b',
      'blockquote',
      'body',
      'button',
      'canvas',
      'caption',
      'cite',
      'code',
      'dd',
      'del',
      'details',
      'dfn',
      'div',
      'dl',
      'dt',
      'em',
      'fieldset',
      'figcaption',
      'figure',
      'footer',
      'form',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'header',
      'hgroup',
      'html',
      'i',
      'iframe',
      'img',
      'input',
      'ins',
      'kbd',
      'label',
      'legend',
      'li',
      'main',
      'mark',
      'menu',
      'nav',
      'object',
      'ol',
      'p',
      'q',
      'quote',
      'samp',
      'section',
      'span',
      'strong',
      'summary',
      'sup',
      'table',
      'tbody',
      'td',
      'textarea',
      'tfoot',
      'th',
      'thead',
      'time',
      'tr',
      'ul',
      'var',
      'video'
    ];

    const MEDIA_FEATURES = [
      'any-hover',
      'any-pointer',
      'aspect-ratio',
      'color',
      'color-gamut',
      'color-index',
      'device-aspect-ratio',
      'device-height',
      'device-width',
      'display-mode',
      'forced-colors',
      'grid',
      'height',
      'hover',
      'inverted-colors',
      'monochrome',
      'orientation',
      'overflow-block',
      'overflow-inline',
      'pointer',
      'prefers-color-scheme',
      'prefers-contrast',
      'prefers-reduced-motion',
      'prefers-reduced-transparency',
      'resolution',
      'scan',
      'scripting',
      'update',
      'width',
      // TODO: find a better solution?
      'min-width',
      'max-width',
      'min-height',
      'max-height'
    ];

    // https://developer.mozilla.org/en-US/docs/Web/CSS/Pseudo-classes
    const PSEUDO_CLASSES = [
      'active',
      'any-link',
      'blank',
      'checked',
      'current',
      'default',
      'defined',
      'dir', // dir()
      'disabled',
      'drop',
      'empty',
      'enabled',
      'first',
      'first-child',
      'first-of-type',
      'fullscreen',
      'future',
      'focus',
      'focus-visible',
      'focus-within',
      'has', // has()
      'host', // host or host()
      'host-context', // host-context()
      'hover',
      'indeterminate',
      'in-range',
      'invalid',
      'is', // is()
      'lang', // lang()
      'last-child',
      'last-of-type',
      'left',
      'link',
      'local-link',
      'not', // not()
      'nth-child', // nth-child()
      'nth-col', // nth-col()
      'nth-last-child', // nth-last-child()
      'nth-last-col', // nth-last-col()
      'nth-last-of-type', //nth-last-of-type()
      'nth-of-type', //nth-of-type()
      'only-child',
      'only-of-type',
      'optional',
      'out-of-range',
      'past',
      'placeholder-shown',
      'read-only',
      'read-write',
      'required',
      'right',
      'root',
      'scope',
      'target',
      'target-within',
      'user-invalid',
      'valid',
      'visited',
      'where' // where()
    ];

    // https://developer.mozilla.org/en-US/docs/Web/CSS/Pseudo-elements
    const PSEUDO_ELEMENTS = [
      'after',
      'backdrop',
      'before',
      'cue',
      'cue-region',
      'first-letter',
      'first-line',
      'grammar-error',
      'marker',
      'part',
      'placeholder',
      'selection',
      'slotted',
      'spelling-error'
    ];

    const ATTRIBUTES = [
      'align-content',
      'align-items',
      'align-self',
      'all',
      'animation',
      'animation-delay',
      'animation-direction',
      'animation-duration',
      'animation-fill-mode',
      'animation-iteration-count',
      'animation-name',
      'animation-play-state',
      'animation-timing-function',
      'backface-visibility',
      'background',
      'background-attachment',
      'background-clip',
      'background-color',
      'background-image',
      'background-origin',
      'background-position',
      'background-repeat',
      'background-size',
      'border',
      'border-bottom',
      'border-bottom-color',
      'border-bottom-left-radius',
      'border-bottom-right-radius',
      'border-bottom-style',
      'border-bottom-width',
      'border-collapse',
      'border-color',
      'border-image',
      'border-image-outset',
      'border-image-repeat',
      'border-image-slice',
      'border-image-source',
      'border-image-width',
      'border-left',
      'border-left-color',
      'border-left-style',
      'border-left-width',
      'border-radius',
      'border-right',
      'border-right-color',
      'border-right-style',
      'border-right-width',
      'border-spacing',
      'border-style',
      'border-top',
      'border-top-color',
      'border-top-left-radius',
      'border-top-right-radius',
      'border-top-style',
      'border-top-width',
      'border-width',
      'bottom',
      'box-decoration-break',
      'box-shadow',
      'box-sizing',
      'break-after',
      'break-before',
      'break-inside',
      'caption-side',
      'caret-color',
      'clear',
      'clip',
      'clip-path',
      'clip-rule',
      'color',
      'column-count',
      'column-fill',
      'column-gap',
      'column-rule',
      'column-rule-color',
      'column-rule-style',
      'column-rule-width',
      'column-span',
      'column-width',
      'columns',
      'contain',
      'content',
      'content-visibility',
      'counter-increment',
      'counter-reset',
      'cue',
      'cue-after',
      'cue-before',
      'cursor',
      'direction',
      'display',
      'empty-cells',
      'filter',
      'flex',
      'flex-basis',
      'flex-direction',
      'flex-flow',
      'flex-grow',
      'flex-shrink',
      'flex-wrap',
      'float',
      'flow',
      'font',
      'font-display',
      'font-family',
      'font-feature-settings',
      'font-kerning',
      'font-language-override',
      'font-size',
      'font-size-adjust',
      'font-smoothing',
      'font-stretch',
      'font-style',
      'font-synthesis',
      'font-variant',
      'font-variant-caps',
      'font-variant-east-asian',
      'font-variant-ligatures',
      'font-variant-numeric',
      'font-variant-position',
      'font-variation-settings',
      'font-weight',
      'gap',
      'glyph-orientation-vertical',
      'grid',
      'grid-area',
      'grid-auto-columns',
      'grid-auto-flow',
      'grid-auto-rows',
      'grid-column',
      'grid-column-end',
      'grid-column-start',
      'grid-gap',
      'grid-row',
      'grid-row-end',
      'grid-row-start',
      'grid-template',
      'grid-template-areas',
      'grid-template-columns',
      'grid-template-rows',
      'hanging-punctuation',
      'height',
      'hyphens',
      'icon',
      'image-orientation',
      'image-rendering',
      'image-resolution',
      'ime-mode',
      'isolation',
      'justify-content',
      'left',
      'letter-spacing',
      'line-break',
      'line-height',
      'list-style',
      'list-style-image',
      'list-style-position',
      'list-style-type',
      'margin',
      'margin-bottom',
      'margin-left',
      'margin-right',
      'margin-top',
      'marks',
      'mask',
      'mask-border',
      'mask-border-mode',
      'mask-border-outset',
      'mask-border-repeat',
      'mask-border-slice',
      'mask-border-source',
      'mask-border-width',
      'mask-clip',
      'mask-composite',
      'mask-image',
      'mask-mode',
      'mask-origin',
      'mask-position',
      'mask-repeat',
      'mask-size',
      'mask-type',
      'max-height',
      'max-width',
      'min-height',
      'min-width',
      'mix-blend-mode',
      'nav-down',
      'nav-index',
      'nav-left',
      'nav-right',
      'nav-up',
      'none',
      'normal',
      'object-fit',
      'object-position',
      'opacity',
      'order',
      'orphans',
      'outline',
      'outline-color',
      'outline-offset',
      'outline-style',
      'outline-width',
      'overflow',
      'overflow-wrap',
      'overflow-x',
      'overflow-y',
      'padding',
      'padding-bottom',
      'padding-left',
      'padding-right',
      'padding-top',
      'page-break-after',
      'page-break-before',
      'page-break-inside',
      'pause',
      'pause-after',
      'pause-before',
      'perspective',
      'perspective-origin',
      'pointer-events',
      'position',
      'quotes',
      'resize',
      'rest',
      'rest-after',
      'rest-before',
      'right',
      'row-gap',
      'scroll-margin',
      'scroll-margin-block',
      'scroll-margin-block-end',
      'scroll-margin-block-start',
      'scroll-margin-bottom',
      'scroll-margin-inline',
      'scroll-margin-inline-end',
      'scroll-margin-inline-start',
      'scroll-margin-left',
      'scroll-margin-right',
      'scroll-margin-top',
      'scroll-padding',
      'scroll-padding-block',
      'scroll-padding-block-end',
      'scroll-padding-block-start',
      'scroll-padding-bottom',
      'scroll-padding-inline',
      'scroll-padding-inline-end',
      'scroll-padding-inline-start',
      'scroll-padding-left',
      'scroll-padding-right',
      'scroll-padding-top',
      'scroll-snap-align',
      'scroll-snap-stop',
      'scroll-snap-type',
      'shape-image-threshold',
      'shape-margin',
      'shape-outside',
      'speak',
      'speak-as',
      'src', // @font-face
      'tab-size',
      'table-layout',
      'text-align',
      'text-align-all',
      'text-align-last',
      'text-combine-upright',
      'text-decoration',
      'text-decoration-color',
      'text-decoration-line',
      'text-decoration-style',
      'text-emphasis',
      'text-emphasis-color',
      'text-emphasis-position',
      'text-emphasis-style',
      'text-indent',
      'text-justify',
      'text-orientation',
      'text-overflow',
      'text-rendering',
      'text-shadow',
      'text-transform',
      'text-underline-position',
      'top',
      'transform',
      'transform-box',
      'transform-origin',
      'transform-style',
      'transition',
      'transition-delay',
      'transition-duration',
      'transition-property',
      'transition-timing-function',
      'unicode-bidi',
      'vertical-align',
      'visibility',
      'voice-balance',
      'voice-duration',
      'voice-family',
      'voice-pitch',
      'voice-range',
      'voice-rate',
      'voice-stress',
      'voice-volume',
      'white-space',
      'widows',
      'width',
      'will-change',
      'word-break',
      'word-spacing',
      'word-wrap',
      'writing-mode',
      'z-index'
      // reverse makes sure longer attributes `font-weight` are matched fully
      // instead of getting false positives on say `font`
    ].reverse();

    /*
    Language: CSS
    Category: common, css, web
    Website: https://developer.mozilla.org/en-US/docs/Web/CSS
    */

    /** @type LanguageFn */
    function css(hljs) {
      const regex = hljs.regex;
      const modes = MODES(hljs);
      const VENDOR_PREFIX = {
        begin: /-(webkit|moz|ms|o)-(?=[a-z])/
      };
      const AT_MODIFIERS = "and or not only";
      const AT_PROPERTY_RE = /@-?\w[\w]*(-\w+)*/; // @-webkit-keyframes
      const IDENT_RE = '[a-zA-Z-][a-zA-Z0-9_-]*';
      const STRINGS = [
        hljs.APOS_STRING_MODE,
        hljs.QUOTE_STRING_MODE
      ];

      return {
        name: 'CSS',
        case_insensitive: true,
        illegal: /[=|'\$]/,
        keywords: {
          keyframePosition: "from to"
        },
        classNameAliases: {
          // for visual continuity with `tag {}` and because we
          // don't have a great class for this?
          keyframePosition: "selector-tag"
        },
        contains: [
          modes.BLOCK_COMMENT,
          VENDOR_PREFIX,
          // to recognize keyframe 40% etc which are outside the scope of our
          // attribute value mode
          modes.CSS_NUMBER_MODE,
          {
            className: 'selector-id',
            begin: /#[A-Za-z0-9_-]+/,
            relevance: 0
          },
          {
            className: 'selector-class',
            begin: '\\.' + IDENT_RE,
            relevance: 0
          },
          modes.ATTRIBUTE_SELECTOR_MODE,
          {
            className: 'selector-pseudo',
            variants: [
              {
                begin: ':(' + PSEUDO_CLASSES.join('|') + ')'
              },
              {
                begin: ':(:)?(' + PSEUDO_ELEMENTS.join('|') + ')'
              }
            ]
          },
          // we may actually need this (12/2020)
          // { // pseudo-selector params
          //   begin: /\(/,
          //   end: /\)/,
          //   contains: [ hljs.CSS_NUMBER_MODE ]
          // },
          modes.CSS_VARIABLE,
          {
            className: 'attribute',
            begin: '\\b(' + ATTRIBUTES.join('|') + ')\\b'
          },
          // attribute values
          {
            begin: /:/,
            end: /[;}{]/,
            contains: [
              modes.BLOCK_COMMENT,
              modes.HEXCOLOR,
              modes.IMPORTANT,
              modes.CSS_NUMBER_MODE,
              ...STRINGS,
              // needed to highlight these as strings and to avoid issues with
              // illegal characters that might be inside urls that would tigger the
              // languages illegal stack
              {
                begin: /(url|data-uri)\(/,
                end: /\)/,
                relevance: 0, // from keywords
                keywords: {
                  built_in: "url data-uri"
                },
                contains: [
                  {
                    className: "string",
                    // any character other than `)` as in `url()` will be the start
                    // of a string, which ends with `)` (from the parent mode)
                    begin: /[^)]/,
                    endsWithParent: true,
                    excludeEnd: true
                  }
                ]
              },
              modes.FUNCTION_DISPATCH
            ]
          },
          {
            begin: regex.lookahead(/@/),
            end: '[{;]',
            relevance: 0,
            illegal: /:/, // break on Less variables @var: ...
            contains: [
              {
                className: 'keyword',
                begin: AT_PROPERTY_RE
              },
              {
                begin: /\s/,
                endsWithParent: true,
                excludeEnd: true,
                relevance: 0,
                keywords: {
                  $pattern: /[a-z-]+/,
                  keyword: AT_MODIFIERS,
                  attribute: MEDIA_FEATURES.join(" ")
                },
                contains: [
                  {
                    begin: /[a-z-]+(?=:)/,
                    className: "attribute"
                  },
                  ...STRINGS,
                  modes.CSS_NUMBER_MODE
                ]
              }
            ]
          },
          {
            className: 'selector-tag',
            begin: '\\b(' + TAGS.join('|') + ')\\b'
          }
        ]
      };
    }

    /*
    Language: Markdown
    Requires: xml.js
    Author: John Crepezzi <john.crepezzi@gmail.com>
    Website: https://daringfireball.net/projects/markdown/
    Category: common, markup
    */

    function markdown(hljs) {
      const regex = hljs.regex;
      const INLINE_HTML = {
        begin: /<\/?[A-Za-z_]/,
        end: '>',
        subLanguage: 'xml',
        relevance: 0
      };
      const HORIZONTAL_RULE = {
        begin: '^[-\\*]{3,}',
        end: '$'
      };
      const CODE = {
        className: 'code',
        variants: [
          // TODO: fix to allow these to work with sublanguage also
          {
            begin: '(`{3,})[^`](.|\\n)*?\\1`*[ ]*'
          },
          {
            begin: '(~{3,})[^~](.|\\n)*?\\1~*[ ]*'
          },
          // needed to allow markdown as a sublanguage to work
          {
            begin: '```',
            end: '```+[ ]*$'
          },
          {
            begin: '~~~',
            end: '~~~+[ ]*$'
          },
          {
            begin: '`.+?`'
          },
          {
            begin: '(?=^( {4}|\\t))',
            // use contains to gobble up multiple lines to allow the block to be whatever size
            // but only have a single open/close tag vs one per line
            contains: [
              {
                begin: '^( {4}|\\t)',
                end: '(\\n)$'
              }
            ],
            relevance: 0
          }
        ]
      };
      const LIST = {
        className: 'bullet',
        begin: '^[ \t]*([*+-]|(\\d+\\.))(?=\\s+)',
        end: '\\s+',
        excludeEnd: true
      };
      const LINK_REFERENCE = {
        begin: /^\[[^\n]+\]:/,
        returnBegin: true,
        contains: [
          {
            className: 'symbol',
            begin: /\[/,
            end: /\]/,
            excludeBegin: true,
            excludeEnd: true
          },
          {
            className: 'link',
            begin: /:\s*/,
            end: /$/,
            excludeBegin: true
          }
        ]
      };
      const URL_SCHEME = /[A-Za-z][A-Za-z0-9+.-]*/;
      const LINK = {
        variants: [
          // too much like nested array access in so many languages
          // to have any real relevance
          {
            begin: /\[.+?\]\[.*?\]/,
            relevance: 0
          },
          // popular internet URLs
          {
            begin: /\[.+?\]\(((data|javascript|mailto):|(?:http|ftp)s?:\/\/).*?\)/,
            relevance: 2
          },
          {
            begin: regex.concat(/\[.+?\]\(/, URL_SCHEME, /:\/\/.*?\)/),
            relevance: 2
          },
          // relative urls
          {
            begin: /\[.+?\]\([./?&#].*?\)/,
            relevance: 1
          },
          // whatever else, lower relevance (might not be a link at all)
          {
            begin: /\[.*?\]\(.*?\)/,
            relevance: 0
          }
        ],
        returnBegin: true,
        contains: [
          {
            // empty strings for alt or link text
            match: /\[(?=\])/
          },
          {
            className: 'string',
            relevance: 0,
            begin: '\\[',
            end: '\\]',
            excludeBegin: true,
            returnEnd: true
          },
          {
            className: 'link',
            relevance: 0,
            begin: '\\]\\(',
            end: '\\)',
            excludeBegin: true,
            excludeEnd: true
          },
          {
            className: 'symbol',
            relevance: 0,
            begin: '\\]\\[',
            end: '\\]',
            excludeBegin: true,
            excludeEnd: true
          }
        ]
      };
      const BOLD = {
        className: 'strong',
        contains: [], // defined later
        variants: [
          {
            begin: /_{2}/,
            end: /_{2}/
          },
          {
            begin: /\*{2}/,
            end: /\*{2}/
          }
        ]
      };
      const ITALIC = {
        className: 'emphasis',
        contains: [], // defined later
        variants: [
          {
            begin: /\*(?!\*)/,
            end: /\*/
          },
          {
            begin: /_(?!_)/,
            end: /_/,
            relevance: 0
          }
        ]
      };
      BOLD.contains.push(ITALIC);
      ITALIC.contains.push(BOLD);

      let CONTAINABLE = [
        INLINE_HTML,
        LINK
      ];

      BOLD.contains = BOLD.contains.concat(CONTAINABLE);
      ITALIC.contains = ITALIC.contains.concat(CONTAINABLE);

      CONTAINABLE = CONTAINABLE.concat(BOLD, ITALIC);

      const HEADER = {
        className: 'section',
        variants: [
          {
            begin: '^#{1,6}',
            end: '$',
            contains: CONTAINABLE
          },
          {
            begin: '(?=^.+?\\n[=-]{2,}$)',
            contains: [
              {
                begin: '^[=-]*$'
              },
              {
                begin: '^',
                end: "\\n",
                contains: CONTAINABLE
              }
            ]
          }
        ]
      };

      const BLOCKQUOTE = {
        className: 'quote',
        begin: '^>\\s+',
        contains: CONTAINABLE,
        end: '$'
      };

      return {
        name: 'Markdown',
        aliases: [
          'md',
          'mkdown',
          'mkd'
        ],
        contains: [
          HEADER,
          INLINE_HTML,
          LIST,
          BOLD,
          ITALIC,
          BLOCKQUOTE,
          CODE,
          HORIZONTAL_RULE,
          LINK,
          LINK_REFERENCE
        ]
      };
    }

    /*
    Language: Dart
    Requires: markdown.js
    Author: Maxim Dikun <dikmax@gmail.com>
    Description: Dart a modern, object-oriented language developed by Google. For more information see https://www.dartlang.org/
    Website: https://dart.dev
    Category: scripting
    */

    /** @type LanguageFn */
    function dart(hljs) {
      const SUBST = {
        className: 'subst',
        variants: [{
          begin: '\\$[A-Za-z0-9_]+'
        }]
      };

      const BRACED_SUBST = {
        className: 'subst',
        variants: [{
          begin: /\$\{/,
          end: /\}/
        }],
        keywords: 'true false null this is new super'
      };

      const STRING = {
        className: 'string',
        variants: [
          {
            begin: 'r\'\'\'',
            end: '\'\'\''
          },
          {
            begin: 'r"""',
            end: '"""'
          },
          {
            begin: 'r\'',
            end: '\'',
            illegal: '\\n'
          },
          {
            begin: 'r"',
            end: '"',
            illegal: '\\n'
          },
          {
            begin: '\'\'\'',
            end: '\'\'\'',
            contains: [
              hljs.BACKSLASH_ESCAPE,
              SUBST,
              BRACED_SUBST
            ]
          },
          {
            begin: '"""',
            end: '"""',
            contains: [
              hljs.BACKSLASH_ESCAPE,
              SUBST,
              BRACED_SUBST
            ]
          },
          {
            begin: '\'',
            end: '\'',
            illegal: '\\n',
            contains: [
              hljs.BACKSLASH_ESCAPE,
              SUBST,
              BRACED_SUBST
            ]
          },
          {
            begin: '"',
            end: '"',
            illegal: '\\n',
            contains: [
              hljs.BACKSLASH_ESCAPE,
              SUBST,
              BRACED_SUBST
            ]
          }
        ]
      };
      BRACED_SUBST.contains = [
        hljs.C_NUMBER_MODE,
        STRING
      ];

      const BUILT_IN_TYPES = [
        // dart:core
        'Comparable',
        'DateTime',
        'Duration',
        'Function',
        'Iterable',
        'Iterator',
        'List',
        'Map',
        'Match',
        'Object',
        'Pattern',
        'RegExp',
        'Set',
        'Stopwatch',
        'String',
        'StringBuffer',
        'StringSink',
        'Symbol',
        'Type',
        'Uri',
        'bool',
        'double',
        'int',
        'num',
        // dart:html
        'Element',
        'ElementList'
      ];
      const NULLABLE_BUILT_IN_TYPES = BUILT_IN_TYPES.map((e) => `${e}?`);

      const BASIC_KEYWORDS = [
        "abstract",
        "as",
        "assert",
        "async",
        "await",
        "break",
        "case",
        "catch",
        "class",
        "const",
        "continue",
        "covariant",
        "default",
        "deferred",
        "do",
        "dynamic",
        "else",
        "enum",
        "export",
        "extends",
        "extension",
        "external",
        "factory",
        "false",
        "final",
        "finally",
        "for",
        "Function",
        "get",
        "hide",
        "if",
        "implements",
        "import",
        "in",
        "inferface",
        "is",
        "late",
        "library",
        "mixin",
        "new",
        "null",
        "on",
        "operator",
        "part",
        "required",
        "rethrow",
        "return",
        "set",
        "show",
        "static",
        "super",
        "switch",
        "sync",
        "this",
        "throw",
        "true",
        "try",
        "typedef",
        "var",
        "void",
        "while",
        "with",
        "yield"
      ];

      const KEYWORDS = {
        keyword: BASIC_KEYWORDS,
        built_in:
          BUILT_IN_TYPES
            .concat(NULLABLE_BUILT_IN_TYPES)
            .concat([
              // dart:core
              'Never',
              'Null',
              'dynamic',
              'print',
              // dart:html
              'document',
              'querySelector',
              'querySelectorAll',
              'window'
            ]),
        $pattern: /[A-Za-z][A-Za-z0-9_]*\??/
      };

      return {
        name: 'Dart',
        keywords: KEYWORDS,
        contains: [
          STRING,
          hljs.COMMENT(
            /\/\*\*(?!\/)/,
            /\*\//,
            {
              subLanguage: 'markdown',
              relevance: 0
            }
          ),
          hljs.COMMENT(
            /\/{3,} ?/,
            /$/, {
              contains: [{
                subLanguage: 'markdown',
                begin: '.',
                end: '$',
                relevance: 0
              }]
            }
          ),
          hljs.C_LINE_COMMENT_MODE,
          hljs.C_BLOCK_COMMENT_MODE,
          {
            className: 'class',
            beginKeywords: 'class interface',
            end: /\{/,
            excludeEnd: true,
            contains: [
              {
                beginKeywords: 'extends implements'
              },
              hljs.UNDERSCORE_TITLE_MODE
            ]
          },
          hljs.C_NUMBER_MODE,
          {
            className: 'meta',
            begin: '@[A-Za-z]+'
          },
          {
            begin: '=>' // No markup, just a relevance booster
          }
        ]
      };
    }

    /*
    Language: Diff
    Description: Unified and context diff
    Author: Vasily Polovnyov <vast@whiteants.net>
    Website: https://www.gnu.org/software/diffutils/
    Category: common
    */

    /** @type LanguageFn */
    function diff(hljs) {
      const regex = hljs.regex;
      return {
        name: 'Diff',
        aliases: ['patch'],
        contains: [
          {
            className: 'meta',
            relevance: 10,
            match: regex.either(
              /^@@ +-\d+,\d+ +\+\d+,\d+ +@@/,
              /^\*\*\* +\d+,\d+ +\*\*\*\*$/,
              /^--- +\d+,\d+ +----$/
            )
          },
          {
            className: 'comment',
            variants: [
              {
                begin: regex.either(
                  /Index: /,
                  /^index/,
                  /={3,}/,
                  /^-{3}/,
                  /^\*{3} /,
                  /^\+{3}/,
                  /^diff --git/
                ),
                end: /$/
              },
              {
                match: /^\*{15}$/
              }
            ]
          },
          {
            className: 'addition',
            begin: /^\+/,
            end: /$/
          },
          {
            className: 'deletion',
            begin: /^-/,
            end: /$/
          },
          {
            className: 'addition',
            begin: /^!/,
            end: /$/
          }
        ]
      };
    }

    /*
    Language: D
    Author: Aleksandar Ruzicic <aleksandar@ruzicic.info>
    Description: D is a language with C-like syntax and static typing. It pragmatically combines efficiency, control, and modeling power, with safety and programmer productivity.
    Version: 1.0a
    Website: https://dlang.org
    Date: 2012-04-08
    */

    /**
     * Known issues:
     *
     * - invalid hex string literals will be recognized as a double quoted strings
     *   but 'x' at the beginning of string will not be matched
     *
     * - delimited string literals are not checked for matching end delimiter
     *   (not possible to do with js regexp)
     *
     * - content of token string is colored as a string (i.e. no keyword coloring inside a token string)
     *   also, content of token string is not validated to contain only valid D tokens
     *
     * - special token sequence rule is not strictly following D grammar (anything following #line
     *   up to the end of line is matched as special token sequence)
     */

    /** @type LanguageFn */
    function d(hljs) {
      /**
       * Language keywords
       *
       * @type {Object}
       */
      const D_KEYWORDS = {
        $pattern: hljs.UNDERSCORE_IDENT_RE,
        keyword:
          'abstract alias align asm assert auto body break byte case cast catch class ' +
          'const continue debug default delete deprecated do else enum export extern final ' +
          'finally for foreach foreach_reverse|10 goto if immutable import in inout int ' +
          'interface invariant is lazy macro mixin module new nothrow out override package ' +
          'pragma private protected public pure ref return scope shared static struct ' +
          'super switch synchronized template this throw try typedef typeid typeof union ' +
          'unittest version void volatile while with __FILE__ __LINE__ __gshared|10 ' +
          '__thread __traits __DATE__ __EOF__ __TIME__ __TIMESTAMP__ __VENDOR__ __VERSION__',
        built_in:
          'bool cdouble cent cfloat char creal dchar delegate double dstring float function ' +
          'idouble ifloat ireal long real short string ubyte ucent uint ulong ushort wchar ' +
          'wstring',
        literal:
          'false null true'
      };

      /**
       * Number literal regexps
       *
       * @type {String}
       */
      const decimal_integer_re = '(0|[1-9][\\d_]*)';
      const decimal_integer_nosus_re = '(0|[1-9][\\d_]*|\\d[\\d_]*|[\\d_]+?\\d)';
      const binary_integer_re = '0[bB][01_]+';
      const hexadecimal_digits_re = '([\\da-fA-F][\\da-fA-F_]*|_[\\da-fA-F][\\da-fA-F_]*)';
      const hexadecimal_integer_re = '0[xX]' + hexadecimal_digits_re;

      const decimal_exponent_re = '([eE][+-]?' + decimal_integer_nosus_re + ')';
      const decimal_float_re = '(' + decimal_integer_nosus_re + '(\\.\\d*|' + decimal_exponent_re + ')|' +
                    '\\d+\\.' + decimal_integer_nosus_re + '|' +
                    '\\.' + decimal_integer_re + decimal_exponent_re + '?' +
                  ')';
      const hexadecimal_float_re = '(0[xX](' +
                      hexadecimal_digits_re + '\\.' + hexadecimal_digits_re + '|' +
                      '\\.?' + hexadecimal_digits_re +
                     ')[pP][+-]?' + decimal_integer_nosus_re + ')';

      const integer_re = '(' +
          decimal_integer_re + '|' +
          binary_integer_re + '|' +
           hexadecimal_integer_re +
        ')';

      const float_re = '(' +
          hexadecimal_float_re + '|' +
          decimal_float_re +
        ')';

      /**
       * Escape sequence supported in D string and character literals
       *
       * @type {String}
       */
      const escape_sequence_re = '\\\\(' +
                  '[\'"\\?\\\\abfnrtv]|' + // common escapes
                  'u[\\dA-Fa-f]{4}|' + // four hex digit unicode codepoint
                  '[0-7]{1,3}|' + // one to three octal digit ascii char code
                  'x[\\dA-Fa-f]{2}|' + // two hex digit ascii char code
                  'U[\\dA-Fa-f]{8}' + // eight hex digit unicode codepoint
                  ')|' +
                  '&[a-zA-Z\\d]{2,};'; // named character entity

      /**
       * D integer number literals
       *
       * @type {Object}
       */
      const D_INTEGER_MODE = {
        className: 'number',
        begin: '\\b' + integer_re + '(L|u|U|Lu|LU|uL|UL)?',
        relevance: 0
      };

      /**
       * [D_FLOAT_MODE description]
       * @type {Object}
       */
      const D_FLOAT_MODE = {
        className: 'number',
        begin: '\\b(' +
            float_re + '([fF]|L|i|[fF]i|Li)?|' +
            integer_re + '(i|[fF]i|Li)' +
          ')',
        relevance: 0
      };

      /**
       * D character literal
       *
       * @type {Object}
       */
      const D_CHARACTER_MODE = {
        className: 'string',
        begin: '\'(' + escape_sequence_re + '|.)',
        end: '\'',
        illegal: '.'
      };

      /**
       * D string escape sequence
       *
       * @type {Object}
       */
      const D_ESCAPE_SEQUENCE = {
        begin: escape_sequence_re,
        relevance: 0
      };

      /**
       * D double quoted string literal
       *
       * @type {Object}
       */
      const D_STRING_MODE = {
        className: 'string',
        begin: '"',
        contains: [D_ESCAPE_SEQUENCE],
        end: '"[cwd]?'
      };

      /**
       * D wysiwyg and delimited string literals
       *
       * @type {Object}
       */
      const D_WYSIWYG_DELIMITED_STRING_MODE = {
        className: 'string',
        begin: '[rq]"',
        end: '"[cwd]?',
        relevance: 5
      };

      /**
       * D alternate wysiwyg string literal
       *
       * @type {Object}
       */
      const D_ALTERNATE_WYSIWYG_STRING_MODE = {
        className: 'string',
        begin: '`',
        end: '`[cwd]?'
      };

      /**
       * D hexadecimal string literal
       *
       * @type {Object}
       */
      const D_HEX_STRING_MODE = {
        className: 'string',
        begin: 'x"[\\da-fA-F\\s\\n\\r]*"[cwd]?',
        relevance: 10
      };

      /**
       * D delimited string literal
       *
       * @type {Object}
       */
      const D_TOKEN_STRING_MODE = {
        className: 'string',
        begin: 'q"\\{',
        end: '\\}"'
      };

      /**
       * Hashbang support
       *
       * @type {Object}
       */
      const D_HASHBANG_MODE = {
        className: 'meta',
        begin: '^#!',
        end: '$',
        relevance: 5
      };

      /**
       * D special token sequence
       *
       * @type {Object}
       */
      const D_SPECIAL_TOKEN_SEQUENCE_MODE = {
        className: 'meta',
        begin: '#(line)',
        end: '$',
        relevance: 5
      };

      /**
       * D attributes
       *
       * @type {Object}
       */
      const D_ATTRIBUTE_MODE = {
        className: 'keyword',
        begin: '@[a-zA-Z_][a-zA-Z_\\d]*'
      };

      /**
       * D nesting comment
       *
       * @type {Object}
       */
      const D_NESTING_COMMENT_MODE = hljs.COMMENT(
        '\\/\\+',
        '\\+\\/',
        {
          contains: ['self'],
          relevance: 10
        }
      );

      return {
        name: 'D',
        keywords: D_KEYWORDS,
        contains: [
          hljs.C_LINE_COMMENT_MODE,
          hljs.C_BLOCK_COMMENT_MODE,
          D_NESTING_COMMENT_MODE,
          D_HEX_STRING_MODE,
          D_STRING_MODE,
          D_WYSIWYG_DELIMITED_STRING_MODE,
          D_ALTERNATE_WYSIWYG_STRING_MODE,
          D_TOKEN_STRING_MODE,
          D_FLOAT_MODE,
          D_INTEGER_MODE,
          D_CHARACTER_MODE,
          D_HASHBANG_MODE,
          D_SPECIAL_TOKEN_SEQUENCE_MODE,
          D_ATTRIBUTE_MODE
        ]
      };
    }

    /*
    Language: GLSL
    Description: OpenGL Shading Language
    Author: Sergey Tikhomirov <sergey@tikhomirov.io>
    Website: https://en.wikipedia.org/wiki/OpenGL_Shading_Language
    Category: graphics
    */

    function glsl(hljs) {
      return {
        name: 'GLSL',
        keywords: {
          keyword:
            // Statements
            'break continue discard do else for if return while switch case default ' +
            // Qualifiers
            'attribute binding buffer ccw centroid centroid varying coherent column_major const cw ' +
            'depth_any depth_greater depth_less depth_unchanged early_fragment_tests equal_spacing ' +
            'flat fractional_even_spacing fractional_odd_spacing highp in index inout invariant ' +
            'invocations isolines layout line_strip lines lines_adjacency local_size_x local_size_y ' +
            'local_size_z location lowp max_vertices mediump noperspective offset origin_upper_left ' +
            'out packed patch pixel_center_integer point_mode points precise precision quads r11f_g11f_b10f ' +
            'r16 r16_snorm r16f r16i r16ui r32f r32i r32ui r8 r8_snorm r8i r8ui readonly restrict ' +
            'rg16 rg16_snorm rg16f rg16i rg16ui rg32f rg32i rg32ui rg8 rg8_snorm rg8i rg8ui rgb10_a2 ' +
            'rgb10_a2ui rgba16 rgba16_snorm rgba16f rgba16i rgba16ui rgba32f rgba32i rgba32ui rgba8 ' +
            'rgba8_snorm rgba8i rgba8ui row_major sample shared smooth std140 std430 stream triangle_strip ' +
            'triangles triangles_adjacency uniform varying vertices volatile writeonly',
          type:
            'atomic_uint bool bvec2 bvec3 bvec4 dmat2 dmat2x2 dmat2x3 dmat2x4 dmat3 dmat3x2 dmat3x3 ' +
            'dmat3x4 dmat4 dmat4x2 dmat4x3 dmat4x4 double dvec2 dvec3 dvec4 float iimage1D iimage1DArray ' +
            'iimage2D iimage2DArray iimage2DMS iimage2DMSArray iimage2DRect iimage3D iimageBuffer ' +
            'iimageCube iimageCubeArray image1D image1DArray image2D image2DArray image2DMS image2DMSArray ' +
            'image2DRect image3D imageBuffer imageCube imageCubeArray int isampler1D isampler1DArray ' +
            'isampler2D isampler2DArray isampler2DMS isampler2DMSArray isampler2DRect isampler3D ' +
            'isamplerBuffer isamplerCube isamplerCubeArray ivec2 ivec3 ivec4 mat2 mat2x2 mat2x3 ' +
            'mat2x4 mat3 mat3x2 mat3x3 mat3x4 mat4 mat4x2 mat4x3 mat4x4 sampler1D sampler1DArray ' +
            'sampler1DArrayShadow sampler1DShadow sampler2D sampler2DArray sampler2DArrayShadow ' +
            'sampler2DMS sampler2DMSArray sampler2DRect sampler2DRectShadow sampler2DShadow sampler3D ' +
            'samplerBuffer samplerCube samplerCubeArray samplerCubeArrayShadow samplerCubeShadow ' +
            'image1D uimage1DArray uimage2D uimage2DArray uimage2DMS uimage2DMSArray uimage2DRect ' +
            'uimage3D uimageBuffer uimageCube uimageCubeArray uint usampler1D usampler1DArray ' +
            'usampler2D usampler2DArray usampler2DMS usampler2DMSArray usampler2DRect usampler3D ' +
            'samplerBuffer usamplerCube usamplerCubeArray uvec2 uvec3 uvec4 vec2 vec3 vec4 void',
          built_in:
            // Constants
            'gl_MaxAtomicCounterBindings gl_MaxAtomicCounterBufferSize gl_MaxClipDistances gl_MaxClipPlanes ' +
            'gl_MaxCombinedAtomicCounterBuffers gl_MaxCombinedAtomicCounters gl_MaxCombinedImageUniforms ' +
            'gl_MaxCombinedImageUnitsAndFragmentOutputs gl_MaxCombinedTextureImageUnits gl_MaxComputeAtomicCounterBuffers ' +
            'gl_MaxComputeAtomicCounters gl_MaxComputeImageUniforms gl_MaxComputeTextureImageUnits ' +
            'gl_MaxComputeUniformComponents gl_MaxComputeWorkGroupCount gl_MaxComputeWorkGroupSize ' +
            'gl_MaxDrawBuffers gl_MaxFragmentAtomicCounterBuffers gl_MaxFragmentAtomicCounters ' +
            'gl_MaxFragmentImageUniforms gl_MaxFragmentInputComponents gl_MaxFragmentInputVectors ' +
            'gl_MaxFragmentUniformComponents gl_MaxFragmentUniformVectors gl_MaxGeometryAtomicCounterBuffers ' +
            'gl_MaxGeometryAtomicCounters gl_MaxGeometryImageUniforms gl_MaxGeometryInputComponents ' +
            'gl_MaxGeometryOutputComponents gl_MaxGeometryOutputVertices gl_MaxGeometryTextureImageUnits ' +
            'gl_MaxGeometryTotalOutputComponents gl_MaxGeometryUniformComponents gl_MaxGeometryVaryingComponents ' +
            'gl_MaxImageSamples gl_MaxImageUnits gl_MaxLights gl_MaxPatchVertices gl_MaxProgramTexelOffset ' +
            'gl_MaxTessControlAtomicCounterBuffers gl_MaxTessControlAtomicCounters gl_MaxTessControlImageUniforms ' +
            'gl_MaxTessControlInputComponents gl_MaxTessControlOutputComponents gl_MaxTessControlTextureImageUnits ' +
            'gl_MaxTessControlTotalOutputComponents gl_MaxTessControlUniformComponents ' +
            'gl_MaxTessEvaluationAtomicCounterBuffers gl_MaxTessEvaluationAtomicCounters ' +
            'gl_MaxTessEvaluationImageUniforms gl_MaxTessEvaluationInputComponents gl_MaxTessEvaluationOutputComponents ' +
            'gl_MaxTessEvaluationTextureImageUnits gl_MaxTessEvaluationUniformComponents ' +
            'gl_MaxTessGenLevel gl_MaxTessPatchComponents gl_MaxTextureCoords gl_MaxTextureImageUnits ' +
            'gl_MaxTextureUnits gl_MaxVaryingComponents gl_MaxVaryingFloats gl_MaxVaryingVectors ' +
            'gl_MaxVertexAtomicCounterBuffers gl_MaxVertexAtomicCounters gl_MaxVertexAttribs gl_MaxVertexImageUniforms ' +
            'gl_MaxVertexOutputComponents gl_MaxVertexOutputVectors gl_MaxVertexTextureImageUnits ' +
            'gl_MaxVertexUniformComponents gl_MaxVertexUniformVectors gl_MaxViewports gl_MinProgramTexelOffset ' +
            // Variables
            'gl_BackColor gl_BackLightModelProduct gl_BackLightProduct gl_BackMaterial ' +
            'gl_BackSecondaryColor gl_ClipDistance gl_ClipPlane gl_ClipVertex gl_Color ' +
            'gl_DepthRange gl_EyePlaneQ gl_EyePlaneR gl_EyePlaneS gl_EyePlaneT gl_Fog gl_FogCoord ' +
            'gl_FogFragCoord gl_FragColor gl_FragCoord gl_FragData gl_FragDepth gl_FrontColor ' +
            'gl_FrontFacing gl_FrontLightModelProduct gl_FrontLightProduct gl_FrontMaterial ' +
            'gl_FrontSecondaryColor gl_GlobalInvocationID gl_InstanceID gl_InvocationID gl_Layer gl_LightModel ' +
            'gl_LightSource gl_LocalInvocationID gl_LocalInvocationIndex gl_ModelViewMatrix ' +
            'gl_ModelViewMatrixInverse gl_ModelViewMatrixInverseTranspose gl_ModelViewMatrixTranspose ' +
            'gl_ModelViewProjectionMatrix gl_ModelViewProjectionMatrixInverse gl_ModelViewProjectionMatrixInverseTranspose ' +
            'gl_ModelViewProjectionMatrixTranspose gl_MultiTexCoord0 gl_MultiTexCoord1 gl_MultiTexCoord2 ' +
            'gl_MultiTexCoord3 gl_MultiTexCoord4 gl_MultiTexCoord5 gl_MultiTexCoord6 gl_MultiTexCoord7 ' +
            'gl_Normal gl_NormalMatrix gl_NormalScale gl_NumSamples gl_NumWorkGroups gl_ObjectPlaneQ ' +
            'gl_ObjectPlaneR gl_ObjectPlaneS gl_ObjectPlaneT gl_PatchVerticesIn gl_Point gl_PointCoord ' +
            'gl_PointSize gl_Position gl_PrimitiveID gl_PrimitiveIDIn gl_ProjectionMatrix gl_ProjectionMatrixInverse ' +
            'gl_ProjectionMatrixInverseTranspose gl_ProjectionMatrixTranspose gl_SampleID gl_SampleMask ' +
            'gl_SampleMaskIn gl_SamplePosition gl_SecondaryColor gl_TessCoord gl_TessLevelInner gl_TessLevelOuter ' +
            'gl_TexCoord gl_TextureEnvColor gl_TextureMatrix gl_TextureMatrixInverse gl_TextureMatrixInverseTranspose ' +
            'gl_TextureMatrixTranspose gl_Vertex gl_VertexID gl_ViewportIndex gl_WorkGroupID gl_WorkGroupSize gl_in gl_out ' +
            // Functions
            'EmitStreamVertex EmitVertex EndPrimitive EndStreamPrimitive abs acos acosh all any asin ' +
            'asinh atan atanh atomicAdd atomicAnd atomicCompSwap atomicCounter atomicCounterDecrement ' +
            'atomicCounterIncrement atomicExchange atomicMax atomicMin atomicOr atomicXor barrier ' +
            'bitCount bitfieldExtract bitfieldInsert bitfieldReverse ceil clamp cos cosh cross ' +
            'dFdx dFdy degrees determinant distance dot equal exp exp2 faceforward findLSB findMSB ' +
            'floatBitsToInt floatBitsToUint floor fma fract frexp ftransform fwidth greaterThan ' +
            'greaterThanEqual groupMemoryBarrier imageAtomicAdd imageAtomicAnd imageAtomicCompSwap ' +
            'imageAtomicExchange imageAtomicMax imageAtomicMin imageAtomicOr imageAtomicXor imageLoad ' +
            'imageSize imageStore imulExtended intBitsToFloat interpolateAtCentroid interpolateAtOffset ' +
            'interpolateAtSample inverse inversesqrt isinf isnan ldexp length lessThan lessThanEqual log ' +
            'log2 matrixCompMult max memoryBarrier memoryBarrierAtomicCounter memoryBarrierBuffer ' +
            'memoryBarrierImage memoryBarrierShared min mix mod modf noise1 noise2 noise3 noise4 ' +
            'normalize not notEqual outerProduct packDouble2x32 packHalf2x16 packSnorm2x16 packSnorm4x8 ' +
            'packUnorm2x16 packUnorm4x8 pow radians reflect refract round roundEven shadow1D shadow1DLod ' +
            'shadow1DProj shadow1DProjLod shadow2D shadow2DLod shadow2DProj shadow2DProjLod sign sin sinh ' +
            'smoothstep sqrt step tan tanh texelFetch texelFetchOffset texture texture1D texture1DLod ' +
            'texture1DProj texture1DProjLod texture2D texture2DLod texture2DProj texture2DProjLod ' +
            'texture3D texture3DLod texture3DProj texture3DProjLod textureCube textureCubeLod ' +
            'textureGather textureGatherOffset textureGatherOffsets textureGrad textureGradOffset ' +
            'textureLod textureLodOffset textureOffset textureProj textureProjGrad textureProjGradOffset ' +
            'textureProjLod textureProjLodOffset textureProjOffset textureQueryLevels textureQueryLod ' +
            'textureSize transpose trunc uaddCarry uintBitsToFloat umulExtended unpackDouble2x32 ' +
            'unpackHalf2x16 unpackSnorm2x16 unpackSnorm4x8 unpackUnorm2x16 unpackUnorm4x8 usubBorrow',
          literal: 'true false'
        },
        illegal: '"',
        contains: [
          hljs.C_LINE_COMMENT_MODE,
          hljs.C_BLOCK_COMMENT_MODE,
          hljs.C_NUMBER_MODE,
          {
            className: 'meta',
            begin: '#',
            end: '$'
          }
        ]
      };
    }

    /*
    Language: TOML, also INI
    Description: TOML aims to be a minimal configuration file format that's easy to read due to obvious semantics.
    Contributors: Guillaume Gomez <guillaume1.gomez@gmail.com>
    Category: common, config
    Website: https://github.com/toml-lang/toml
    */

    function ini(hljs) {
      const regex = hljs.regex;
      const NUMBERS = {
        className: 'number',
        relevance: 0,
        variants: [
          {
            begin: /([+-]+)?[\d]+_[\d_]+/
          },
          {
            begin: hljs.NUMBER_RE
          }
        ]
      };
      const COMMENTS = hljs.COMMENT();
      COMMENTS.variants = [
        {
          begin: /;/,
          end: /$/
        },
        {
          begin: /#/,
          end: /$/
        }
      ];
      const VARIABLES = {
        className: 'variable',
        variants: [
          {
            begin: /\$[\w\d"][\w\d_]*/
          },
          {
            begin: /\$\{(.*?)\}/
          }
        ]
      };
      const LITERALS = {
        className: 'literal',
        begin: /\bon|off|true|false|yes|no\b/
      };
      const STRINGS = {
        className: "string",
        contains: [hljs.BACKSLASH_ESCAPE],
        variants: [
          {
            begin: "'''",
            end: "'''",
            relevance: 10
          },
          {
            begin: '"""',
            end: '"""',
            relevance: 10
          },
          {
            begin: '"',
            end: '"'
          },
          {
            begin: "'",
            end: "'"
          }
        ]
      };
      const ARRAY = {
        begin: /\[/,
        end: /\]/,
        contains: [
          COMMENTS,
          LITERALS,
          VARIABLES,
          STRINGS,
          NUMBERS,
          'self'
        ],
        relevance: 0
      };

      const BARE_KEY = /[A-Za-z0-9_-]+/;
      const QUOTED_KEY_DOUBLE_QUOTE = /"(\\"|[^"])*"/;
      const QUOTED_KEY_SINGLE_QUOTE = /'[^']*'/;
      const ANY_KEY = regex.either(
        BARE_KEY, QUOTED_KEY_DOUBLE_QUOTE, QUOTED_KEY_SINGLE_QUOTE
      );
      const DOTTED_KEY = regex.concat(
        ANY_KEY, '(\\s*\\.\\s*', ANY_KEY, ')*',
        regex.lookahead(/\s*=\s*[^#\s]/)
      );

      return {
        name: 'TOML, also INI',
        aliases: ['toml'],
        case_insensitive: true,
        illegal: /\S/,
        contains: [
          COMMENTS,
          {
            className: 'section',
            begin: /\[+/,
            end: /\]+/
          },
          {
            begin: DOTTED_KEY,
            className: 'attr',
            starts: {
              end: /$/,
              contains: [
                COMMENTS,
                ARRAY,
                LITERALS,
                VARIABLES,
                STRINGS,
                NUMBERS
              ]
            }
          }
        ]
      };
    }

    const IDENT_RE = '[A-Za-z$_][0-9A-Za-z$_]*';
    const KEYWORDS = [
      "as", // for exports
      "in",
      "of",
      "if",
      "for",
      "while",
      "finally",
      "var",
      "new",
      "function",
      "do",
      "return",
      "void",
      "else",
      "break",
      "catch",
      "instanceof",
      "with",
      "throw",
      "case",
      "default",
      "try",
      "switch",
      "continue",
      "typeof",
      "delete",
      "let",
      "yield",
      "const",
      "class",
      // JS handles these with a special rule
      // "get",
      // "set",
      "debugger",
      "async",
      "await",
      "static",
      "import",
      "from",
      "export",
      "extends"
    ];
    const LITERALS = [
      "true",
      "false",
      "null",
      "undefined",
      "NaN",
      "Infinity"
    ];

    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects
    const TYPES = [
      // Fundamental objects
      "Object",
      "Function",
      "Boolean",
      "Symbol",
      // numbers and dates
      "Math",
      "Date",
      "Number",
      "BigInt",
      // text
      "String",
      "RegExp",
      // Indexed collections
      "Array",
      "Float32Array",
      "Float64Array",
      "Int8Array",
      "Uint8Array",
      "Uint8ClampedArray",
      "Int16Array",
      "Int32Array",
      "Uint16Array",
      "Uint32Array",
      "BigInt64Array",
      "BigUint64Array",
      // Keyed collections
      "Set",
      "Map",
      "WeakSet",
      "WeakMap",
      // Structured data
      "ArrayBuffer",
      "SharedArrayBuffer",
      "Atomics",
      "DataView",
      "JSON",
      // Control abstraction objects
      "Promise",
      "Generator",
      "GeneratorFunction",
      "AsyncFunction",
      // Reflection
      "Reflect",
      "Proxy",
      // Internationalization
      "Intl",
      // WebAssembly
      "WebAssembly"
    ];

    const ERROR_TYPES = [
      "Error",
      "EvalError",
      "InternalError",
      "RangeError",
      "ReferenceError",
      "SyntaxError",
      "TypeError",
      "URIError"
    ];

    const BUILT_IN_GLOBALS = [
      "setInterval",
      "setTimeout",
      "clearInterval",
      "clearTimeout",

      "require",
      "exports",

      "eval",
      "isFinite",
      "isNaN",
      "parseFloat",
      "parseInt",
      "decodeURI",
      "decodeURIComponent",
      "encodeURI",
      "encodeURIComponent",
      "escape",
      "unescape"
    ];

    const BUILT_IN_VARIABLES = [
      "arguments",
      "this",
      "super",
      "console",
      "window",
      "document",
      "localStorage",
      "module",
      "global" // Node.js
    ];

    const BUILT_INS = [].concat(
      BUILT_IN_GLOBALS,
      TYPES,
      ERROR_TYPES
    );

    /*
    Language: JavaScript
    Description: JavaScript (JS) is a lightweight, interpreted, or just-in-time compiled programming language with first-class functions.
    Category: common, scripting, web
    Website: https://developer.mozilla.org/en-US/docs/Web/JavaScript
    */

    /** @type LanguageFn */
    function javascript(hljs) {
      const regex = hljs.regex;
      /**
       * Takes a string like "<Booger" and checks to see
       * if we can find a matching "</Booger" later in the
       * content.
       * @param {RegExpMatchArray} match
       * @param {{after:number}} param1
       */
      const hasClosingTag = (match, { after }) => {
        const tag = "</" + match[0].slice(1);
        const pos = match.input.indexOf(tag, after);
        return pos !== -1;
      };

      const IDENT_RE$1 = IDENT_RE;
      const FRAGMENT = {
        begin: '<>',
        end: '</>'
      };
      // to avoid some special cases inside isTrulyOpeningTag
      const XML_SELF_CLOSING = /<[A-Za-z0-9\\._:-]+\s*\/>/;
      const XML_TAG = {
        begin: /<[A-Za-z0-9\\._:-]+/,
        end: /\/[A-Za-z0-9\\._:-]+>|\/>/,
        /**
         * @param {RegExpMatchArray} match
         * @param {CallbackResponse} response
         */
        isTrulyOpeningTag: (match, response) => {
          const afterMatchIndex = match[0].length + match.index;
          const nextChar = match.input[afterMatchIndex];
          if (
            // HTML should not include another raw `<` inside a tag
            // nested type?
            // `<Array<Array<number>>`, etc.
            nextChar === "<" ||
            // the , gives away that this is not HTML
            // `<T, A extends keyof T, V>`
            nextChar === ",") {
            response.ignoreMatch();
            return;
          }

          // `<something>`
          // Quite possibly a tag, lets look for a matching closing tag...
          if (nextChar === ">") {
            // if we cannot find a matching closing tag, then we
            // will ignore it
            if (!hasClosingTag(match, { after: afterMatchIndex })) {
              response.ignoreMatch();
            }
          }

          // `<blah />` (self-closing)
          // handled by simpleSelfClosing rule

          // `<From extends string>`
          // technically this could be HTML, but it smells like a type
          let m;
          const afterMatch = match.input.substr(afterMatchIndex);
          // NOTE: This is ugh, but added specifically for https://github.com/highlightjs/highlight.js/issues/3276
          if ((m = afterMatch.match(/^\s+extends\s+/))) {
            if (m.index === 0) {
              response.ignoreMatch();
              // eslint-disable-next-line no-useless-return
              return;
            }
          }
        }
      };
      const KEYWORDS$1 = {
        $pattern: IDENT_RE,
        keyword: KEYWORDS,
        literal: LITERALS,
        built_in: BUILT_INS,
        "variable.language": BUILT_IN_VARIABLES
      };

      // https://tc39.es/ecma262/#sec-literals-numeric-literals
      const decimalDigits = '[0-9](_?[0-9])*';
      const frac = `\\.(${decimalDigits})`;
      // DecimalIntegerLiteral, including Annex B NonOctalDecimalIntegerLiteral
      // https://tc39.es/ecma262/#sec-additional-syntax-numeric-literals
      const decimalInteger = `0|[1-9](_?[0-9])*|0[0-7]*[89][0-9]*`;
      const NUMBER = {
        className: 'number',
        variants: [
          // DecimalLiteral
          { begin: `(\\b(${decimalInteger})((${frac})|\\.)?|(${frac}))` +
            `[eE][+-]?(${decimalDigits})\\b` },
          { begin: `\\b(${decimalInteger})\\b((${frac})\\b|\\.)?|(${frac})\\b` },

          // DecimalBigIntegerLiteral
          { begin: `\\b(0|[1-9](_?[0-9])*)n\\b` },

          // NonDecimalIntegerLiteral
          { begin: "\\b0[xX][0-9a-fA-F](_?[0-9a-fA-F])*n?\\b" },
          { begin: "\\b0[bB][0-1](_?[0-1])*n?\\b" },
          { begin: "\\b0[oO][0-7](_?[0-7])*n?\\b" },

          // LegacyOctalIntegerLiteral (does not include underscore separators)
          // https://tc39.es/ecma262/#sec-additional-syntax-numeric-literals
          { begin: "\\b0[0-7]+n?\\b" },
        ],
        relevance: 0
      };

      const SUBST = {
        className: 'subst',
        begin: '\\$\\{',
        end: '\\}',
        keywords: KEYWORDS$1,
        contains: [] // defined later
      };
      const HTML_TEMPLATE = {
        begin: 'html`',
        end: '',
        starts: {
          end: '`',
          returnEnd: false,
          contains: [
            hljs.BACKSLASH_ESCAPE,
            SUBST
          ],
          subLanguage: 'xml'
        }
      };
      const CSS_TEMPLATE = {
        begin: 'css`',
        end: '',
        starts: {
          end: '`',
          returnEnd: false,
          contains: [
            hljs.BACKSLASH_ESCAPE,
            SUBST
          ],
          subLanguage: 'css'
        }
      };
      const TEMPLATE_STRING = {
        className: 'string',
        begin: '`',
        end: '`',
        contains: [
          hljs.BACKSLASH_ESCAPE,
          SUBST
        ]
      };
      const JSDOC_COMMENT = hljs.COMMENT(
        /\/\*\*(?!\/)/,
        '\\*/',
        {
          relevance: 0,
          contains: [
            {
              begin: '(?=@[A-Za-z]+)',
              relevance: 0,
              contains: [
                {
                  className: 'doctag',
                  begin: '@[A-Za-z]+'
                },
                {
                  className: 'type',
                  begin: '\\{',
                  end: '\\}',
                  excludeEnd: true,
                  excludeBegin: true,
                  relevance: 0
                },
                {
                  className: 'variable',
                  begin: IDENT_RE$1 + '(?=\\s*(-)|$)',
                  endsParent: true,
                  relevance: 0
                },
                // eat spaces (not newlines) so we can find
                // types or variables
                {
                  begin: /(?=[^\n])\s/,
                  relevance: 0
                }
              ]
            }
          ]
        }
      );
      const COMMENT = {
        className: "comment",
        variants: [
          JSDOC_COMMENT,
          hljs.C_BLOCK_COMMENT_MODE,
          hljs.C_LINE_COMMENT_MODE
        ]
      };
      const SUBST_INTERNALS = [
        hljs.APOS_STRING_MODE,
        hljs.QUOTE_STRING_MODE,
        HTML_TEMPLATE,
        CSS_TEMPLATE,
        TEMPLATE_STRING,
        NUMBER,
        // This is intentional:
        // See https://github.com/highlightjs/highlight.js/issues/3288
        // hljs.REGEXP_MODE
      ];
      SUBST.contains = SUBST_INTERNALS
        .concat({
          // we need to pair up {} inside our subst to prevent
          // it from ending too early by matching another }
          begin: /\{/,
          end: /\}/,
          keywords: KEYWORDS$1,
          contains: [
            "self"
          ].concat(SUBST_INTERNALS)
        });
      const SUBST_AND_COMMENTS = [].concat(COMMENT, SUBST.contains);
      const PARAMS_CONTAINS = SUBST_AND_COMMENTS.concat([
        // eat recursive parens in sub expressions
        {
          begin: /\(/,
          end: /\)/,
          keywords: KEYWORDS$1,
          contains: ["self"].concat(SUBST_AND_COMMENTS)
        }
      ]);
      const PARAMS = {
        className: 'params',
        begin: /\(/,
        end: /\)/,
        excludeBegin: true,
        excludeEnd: true,
        keywords: KEYWORDS$1,
        contains: PARAMS_CONTAINS
      };

      // ES6 classes
      const CLASS_OR_EXTENDS = {
        variants: [
          // class Car extends vehicle
          {
            match: [
              /class/,
              /\s+/,
              IDENT_RE$1,
              /\s+/,
              /extends/,
              /\s+/,
              regex.concat(IDENT_RE$1, "(", regex.concat(/\./, IDENT_RE$1), ")*")
            ],
            scope: {
              1: "keyword",
              3: "title.class",
              5: "keyword",
              7: "title.class.inherited"
            }
          },
          // class Car
          {
            match: [
              /class/,
              /\s+/,
              IDENT_RE$1
            ],
            scope: {
              1: "keyword",
              3: "title.class"
            }
          },

        ]
      };

      const CLASS_REFERENCE = {
        relevance: 0,
        match:
        regex.either(
          // Hard coded exceptions
          /\bJSON/,
          // Float32Array
          /\b[A-Z][a-z]+([A-Z][a-z]+|\d)*/,
          // CSSFactory
          /\b[A-Z]{2,}([A-Z][a-z]+|\d)+/,
          // BLAH
          // this will be flagged as a UPPER_CASE_CONSTANT instead
        ),
        className: "title.class",
        keywords: {
          _: [
            // se we still get relevance credit for JS library classes
            ...TYPES,
            ...ERROR_TYPES
          ]
        }
      };

      const USE_STRICT = {
        label: "use_strict",
        className: 'meta',
        relevance: 10,
        begin: /^\s*['"]use (strict|asm)['"]/
      };

      const FUNCTION_DEFINITION = {
        variants: [
          {
            match: [
              /function/,
              /\s+/,
              IDENT_RE$1,
              /(?=\s*\()/
            ]
          },
          // anonymous function
          {
            match: [
              /function/,
              /\s*(?=\()/
            ]
          }
        ],
        className: {
          1: "keyword",
          3: "title.function"
        },
        label: "func.def",
        contains: [ PARAMS ],
        illegal: /%/
      };

      const UPPER_CASE_CONSTANT = {
        relevance: 0,
        match: /\b[A-Z][A-Z_0-9]+\b/,
        className: "variable.constant"
      };

      function noneOf(list) {
        return regex.concat("(?!", list.join("|"), ")");
      }

      const FUNCTION_CALL = {
        match: regex.concat(
          /\b/,
          noneOf([
            ...BUILT_IN_GLOBALS,
            "super"
          ]),
          IDENT_RE$1, regex.lookahead(/\(/)),
        className: "title.function",
        relevance: 0
      };

      const PROPERTY_ACCESS = {
        begin: regex.concat(/\./, regex.lookahead(
          regex.concat(IDENT_RE$1, /(?![0-9A-Za-z$_(])/)
        )),
        end: IDENT_RE$1,
        excludeBegin: true,
        keywords: "prototype",
        className: "property",
        relevance: 0
      };

      const GETTER_OR_SETTER = {
        match: [
          /get|set/,
          /\s+/,
          IDENT_RE$1,
          /(?=\()/
        ],
        className: {
          1: "keyword",
          3: "title.function"
        },
        contains: [
          { // eat to avoid empty params
            begin: /\(\)/
          },
          PARAMS
        ]
      };

      const FUNC_LEAD_IN_RE = '(\\(' +
        '[^()]*(\\(' +
        '[^()]*(\\(' +
        '[^()]*' +
        '\\)[^()]*)*' +
        '\\)[^()]*)*' +
        '\\)|' + hljs.UNDERSCORE_IDENT_RE + ')\\s*=>';

      const FUNCTION_VARIABLE = {
        match: [
          /const|var|let/, /\s+/,
          IDENT_RE$1, /\s*/,
          /=\s*/,
          regex.lookahead(FUNC_LEAD_IN_RE)
        ],
        className: {
          1: "keyword",
          3: "title.function"
        },
        contains: [
          PARAMS
        ]
      };

      return {
        name: 'Javascript',
        aliases: ['js', 'jsx', 'mjs', 'cjs'],
        keywords: KEYWORDS$1,
        // this will be extended by TypeScript
        exports: { PARAMS_CONTAINS, CLASS_REFERENCE },
        illegal: /#(?![$_A-z])/,
        contains: [
          hljs.SHEBANG({
            label: "shebang",
            binary: "node",
            relevance: 5
          }),
          USE_STRICT,
          hljs.APOS_STRING_MODE,
          hljs.QUOTE_STRING_MODE,
          HTML_TEMPLATE,
          CSS_TEMPLATE,
          TEMPLATE_STRING,
          COMMENT,
          NUMBER,
          CLASS_REFERENCE,
          {
            className: 'attr',
            begin: IDENT_RE$1 + regex.lookahead(':'),
            relevance: 0
          },
          FUNCTION_VARIABLE,
          { // "value" container
            begin: '(' + hljs.RE_STARTERS_RE + '|\\b(case|return|throw)\\b)\\s*',
            keywords: 'return throw case',
            relevance: 0,
            contains: [
              COMMENT,
              hljs.REGEXP_MODE,
              {
                className: 'function',
                // we have to count the parens to make sure we actually have the
                // correct bounding ( ) before the =>.  There could be any number of
                // sub-expressions inside also surrounded by parens.
                begin: FUNC_LEAD_IN_RE,
                returnBegin: true,
                end: '\\s*=>',
                contains: [
                  {
                    className: 'params',
                    variants: [
                      {
                        begin: hljs.UNDERSCORE_IDENT_RE,
                        relevance: 0
                      },
                      {
                        className: null,
                        begin: /\(\s*\)/,
                        skip: true
                      },
                      {
                        begin: /\(/,
                        end: /\)/,
                        excludeBegin: true,
                        excludeEnd: true,
                        keywords: KEYWORDS$1,
                        contains: PARAMS_CONTAINS
                      }
                    ]
                  }
                ]
              },
              { // could be a comma delimited list of params to a function call
                begin: /,/,
                relevance: 0
              },
              {
                match: /\s+/,
                relevance: 0
              },
              { // JSX
                variants: [
                  { begin: FRAGMENT.begin, end: FRAGMENT.end },
                  { match: XML_SELF_CLOSING },
                  {
                    begin: XML_TAG.begin,
                    // we carefully check the opening tag to see if it truly
                    // is a tag and not a false positive
                    'on:begin': XML_TAG.isTrulyOpeningTag,
                    end: XML_TAG.end
                  }
                ],
                subLanguage: 'xml',
                contains: [
                  {
                    begin: XML_TAG.begin,
                    end: XML_TAG.end,
                    skip: true,
                    contains: ['self']
                  }
                ]
              }
            ],
          },
          FUNCTION_DEFINITION,
          {
            // prevent this from getting swallowed up by function
            // since they appear "function like"
            beginKeywords: "while if switch catch for"
          },
          {
            // we have to count the parens to make sure we actually have the correct
            // bounding ( ).  There could be any number of sub-expressions inside
            // also surrounded by parens.
            begin: '\\b(?!function)' + hljs.UNDERSCORE_IDENT_RE +
              '\\(' + // first parens
              '[^()]*(\\(' +
                '[^()]*(\\(' +
                  '[^()]*' +
                '\\)[^()]*)*' +
              '\\)[^()]*)*' +
              '\\)\\s*\\{', // end parens
            returnBegin:true,
            label: "func.def",
            contains: [
              PARAMS,
              hljs.inherit(hljs.TITLE_MODE, { begin: IDENT_RE$1, className: "title.function" })
            ]
          },
          // catch ... so it won't trigger the property rule below
          {
            match: /\.\.\./,
            relevance: 0
          },
          PROPERTY_ACCESS,
          // hack: prevents detection of keywords in some circumstances
          // .keyword()
          // $keyword = x
          {
            match: '\\$' + IDENT_RE$1,
            relevance: 0
          },
          {
            match: [ /\bconstructor(?=\s*\()/ ],
            className: { 1: "title.function" },
            contains: [ PARAMS ]
          },
          FUNCTION_CALL,
          UPPER_CASE_CONSTANT,
          CLASS_OR_EXTENDS,
          GETTER_OR_SETTER,
          {
            match: /\$[(.]/ // relevance booster for a pattern common to JS libs: `$(something)` and `$.something`
          }
        ]
      };
    }

    /*
    Language: JSON
    Description: JSON (JavaScript Object Notation) is a lightweight data-interchange format.
    Author: Ivan Sagalaev <maniac@softwaremaniacs.org>
    Website: http://www.json.org
    Category: common, protocols, web
    */

    function json(hljs) {
      const ATTRIBUTE = {
        className: 'attr',
        begin: /"(\\.|[^\\"\r\n])*"(?=\s*:)/,
        relevance: 1.01
      };
      const PUNCTUATION = {
        match: /[{}[\],:]/,
        className: "punctuation",
        relevance: 0
      };
      // normally we would rely on `keywords` for this but using a mode here allows us
      // to use the very tight `illegal: \S` rule later to flag any other character
      // as illegal indicating that despite looking like JSON we do not truly have
      // JSON and thus improve false-positively greatly since JSON will try and claim
      // all sorts of JSON looking stuff
      const LITERALS = {
        beginKeywords: [
          "true",
          "false",
          "null"
        ].join(" ")
      };

      return {
        name: 'JSON',
        contains: [
          ATTRIBUTE,
          PUNCTUATION,
          hljs.QUOTE_STRING_MODE,
          LITERALS,
          hljs.C_NUMBER_MODE,
          hljs.C_LINE_COMMENT_MODE,
          hljs.C_BLOCK_COMMENT_MODE
        ],
        illegal: '\\S'
      };
    }

    /*
    Language: Lua
    Description: Lua is a powerful, efficient, lightweight, embeddable scripting language.
    Author: Andrew Fedorov <dmmdrs@mail.ru>
    Category: common, scripting
    Website: https://www.lua.org
    */

    function lua(hljs) {
      const OPENING_LONG_BRACKET = '\\[=*\\[';
      const CLOSING_LONG_BRACKET = '\\]=*\\]';
      const LONG_BRACKETS = {
        begin: OPENING_LONG_BRACKET,
        end: CLOSING_LONG_BRACKET,
        contains: ['self']
      };
      const COMMENTS = [
        hljs.COMMENT('--(?!' + OPENING_LONG_BRACKET + ')', '$'),
        hljs.COMMENT(
          '--' + OPENING_LONG_BRACKET,
          CLOSING_LONG_BRACKET,
          {
            contains: [LONG_BRACKETS],
            relevance: 10
          }
        )
      ];
      return {
        name: 'Lua',
        keywords: {
          $pattern: hljs.UNDERSCORE_IDENT_RE,
          literal: "true false nil",
          keyword: "and break do else elseif end for goto if in local not or repeat return then until while",
          built_in:
            // Metatags and globals:
            '_G _ENV _VERSION __index __newindex __mode __call __metatable __tostring __len ' +
            '__gc __add __sub __mul __div __mod __pow __concat __unm __eq __lt __le assert ' +
            // Standard methods and properties:
            'collectgarbage dofile error getfenv getmetatable ipairs load loadfile loadstring ' +
            'module next pairs pcall print rawequal rawget rawset require select setfenv ' +
            'setmetatable tonumber tostring type unpack xpcall arg self ' +
            // Library methods and properties (one line per library):
            'coroutine resume yield status wrap create running debug getupvalue ' +
            'debug sethook getmetatable gethook setmetatable setlocal traceback setfenv getinfo setupvalue getlocal getregistry getfenv ' +
            'io lines write close flush open output type read stderr stdin input stdout popen tmpfile ' +
            'math log max acos huge ldexp pi cos tanh pow deg tan cosh sinh random randomseed frexp ceil floor rad abs sqrt modf asin min mod fmod log10 atan2 exp sin atan ' +
            'os exit setlocale date getenv difftime remove time clock tmpname rename execute package preload loadlib loaded loaders cpath config path seeall ' +
            'string sub upper len gfind rep find match char dump gmatch reverse byte format gsub lower ' +
            'table setn insert getn foreachi maxn foreach concat sort remove'
        },
        contains: COMMENTS.concat([
          {
            className: 'function',
            beginKeywords: 'function',
            end: '\\)',
            contains: [
              hljs.inherit(hljs.TITLE_MODE, {
                begin: '([_a-zA-Z]\\w*\\.)*([_a-zA-Z]\\w*:)?[_a-zA-Z]\\w*'
              }),
              {
                className: 'params',
                begin: '\\(',
                endsWithParent: true,
                contains: COMMENTS
              }
            ].concat(COMMENTS)
          },
          hljs.C_NUMBER_MODE,
          hljs.APOS_STRING_MODE,
          hljs.QUOTE_STRING_MODE,
          {
            className: 'string',
            begin: OPENING_LONG_BRACKET,
            end: CLOSING_LONG_BRACKET,
            contains: [LONG_BRACKETS],
            relevance: 5
          }
        ])
      };
    }

    /*
    Language: Makefile
    Author: Ivan Sagalaev <maniac@softwaremaniacs.org>
    Contributors: Joël Porquet <joel@porquet.org>
    Website: https://www.gnu.org/software/make/manual/html_node/Introduction.html
    Category: common
    */

    function makefile(hljs) {
      /* Variables: simple (eg $(var)) and special (eg $@) */
      const VARIABLE = {
        className: 'variable',
        variants: [
          {
            begin: '\\$\\(' + hljs.UNDERSCORE_IDENT_RE + '\\)',
            contains: [ hljs.BACKSLASH_ESCAPE ]
          },
          {
            begin: /\$[@%<?\^\+\*]/
          }
        ]
      };
      /* Quoted string with variables inside */
      const QUOTE_STRING = {
        className: 'string',
        begin: /"/,
        end: /"/,
        contains: [
          hljs.BACKSLASH_ESCAPE,
          VARIABLE
        ]
      };
      /* Function: $(func arg,...) */
      const FUNC = {
        className: 'variable',
        begin: /\$\([\w-]+\s/,
        end: /\)/,
        keywords: {
          built_in:
            'subst patsubst strip findstring filter filter-out sort ' +
            'word wordlist firstword lastword dir notdir suffix basename ' +
            'addsuffix addprefix join wildcard realpath abspath error warning ' +
            'shell origin flavor foreach if or and call eval file value'
        },
        contains: [ VARIABLE ]
      };
      /* Variable assignment */
      const ASSIGNMENT = {
        begin: '^' + hljs.UNDERSCORE_IDENT_RE + '\\s*(?=[:+?]?=)'
      };
      /* Meta targets (.PHONY) */
      const META = {
        className: 'meta',
        begin: /^\.PHONY:/,
        end: /$/,
        keywords: {
          $pattern: /[\.\w]+/,
          keyword: '.PHONY'
        }
      };
      /* Targets */
      const TARGET = {
        className: 'section',
        begin: /^[^\s]+:/,
        end: /$/,
        contains: [ VARIABLE ]
      };
      return {
        name: 'Makefile',
        aliases: [
          'mk',
          'mak',
          'make',
        ],
        keywords: {
          $pattern: /[\w-]+/,
          keyword: 'define endef undefine ifdef ifndef ifeq ifneq else endif ' +
          'include -include sinclude override export unexport private vpath'
        },
        contains: [
          hljs.HASH_COMMENT_MODE,
          VARIABLE,
          QUOTE_STRING,
          FUNC,
          ASSIGNMENT,
          META,
          TARGET
        ]
      };
    }

    /*
    Language: OCaml
    Author: Mehdi Dogguy <mehdi@dogguy.org>
    Contributors: Nicolas Braud-Santoni <nicolas.braud-santoni@ens-cachan.fr>, Mickael Delahaye <mickael.delahaye@gmail.com>
    Description: OCaml language definition.
    Website: https://ocaml.org
    Category: functional
    */

    function ocaml(hljs) {
      /* missing support for heredoc-like string (OCaml 4.0.2+) */
      return {
        name: 'OCaml',
        aliases: ['ml'],
        keywords: {
          $pattern: '[a-z_]\\w*!?',
          keyword:
            'and as assert asr begin class constraint do done downto else end ' +
            'exception external for fun function functor if in include ' +
            'inherit! inherit initializer land lazy let lor lsl lsr lxor match method!|10 method ' +
            'mod module mutable new object of open! open or private rec sig struct ' +
            'then to try type val! val virtual when while with ' +
            /* camlp4 */
            'parser value',
          built_in:
            /* built-in types */
            'array bool bytes char exn|5 float int int32 int64 list lazy_t|5 nativeint|5 string unit ' +
            /* (some) types in Pervasives */
            'in_channel out_channel ref',
          literal:
            'true false'
        },
        illegal: /\/\/|>>/,
        contains: [
          {
            className: 'literal',
            begin: '\\[(\\|\\|)?\\]|\\(\\)',
            relevance: 0
          },
          hljs.COMMENT(
            '\\(\\*',
            '\\*\\)',
            {
              contains: ['self']
            }
          ),
          { /* type variable */
            className: 'symbol',
            begin: '\'[A-Za-z_](?!\')[\\w\']*'
            /* the grammar is ambiguous on how 'a'b should be interpreted but not the compiler */
          },
          { /* polymorphic variant */
            className: 'type',
            begin: '`[A-Z][\\w\']*'
          },
          { /* module or constructor */
            className: 'type',
            begin: '\\b[A-Z][\\w\']*',
            relevance: 0
          },
          { /* don't color identifiers, but safely catch all identifiers with '*/
            begin: '[a-z_]\\w*\'[\\w\']*', relevance: 0
          },
          hljs.inherit(hljs.APOS_STRING_MODE, {className: 'string', relevance: 0}),
          hljs.inherit(hljs.QUOTE_STRING_MODE, {illegal: null}),
          {
            className: 'number',
            begin:
              '\\b(0[xX][a-fA-F0-9_]+[Lln]?|' +
              '0[oO][0-7_]+[Lln]?|' +
              '0[bB][01_]+[Lln]?|' +
              '[0-9][0-9_]*([Lln]|(\\.[0-9_]*)?([eE][-+]?[0-9_]+)?)?)',
            relevance: 0
          },
          {
            begin: /->/ // relevance booster
          }
        ]
      }
    }

    /*
    Language: PHP
    Author: Victor Karamzin <Victor.Karamzin@enterra-inc.com>
    Contributors: Evgeny Stepanischev <imbolk@gmail.com>, Ivan Sagalaev <maniac@softwaremaniacs.org>
    Website: https://www.php.net
    Category: common
    */

    /**
     * @param {HLJSApi} hljs
     * @returns {LanguageDetail}
     * */
    function php(hljs) {
      const VARIABLE = {
        className: 'variable',
        begin: '\\$+[a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*' +
          // negative look-ahead tries to avoid matching patterns that are not
          // Perl at all like $ident$, @ident@, etc.
          `(?![A-Za-z0-9])(?![$])`
      };
      const PREPROCESSOR = {
        className: 'meta',
        variants: [
          { begin: /<\?php/, relevance: 10 }, // boost for obvious PHP
          { begin: /<\?[=]?/ },
          { begin: /\?>/ } // end php tag
        ]
      };
      const SUBST = {
        className: 'subst',
        variants: [
          { begin: /\$\w+/ },
          { begin: /\{\$/, end: /\}/ }
        ]
      };
      const SINGLE_QUOTED = hljs.inherit(hljs.APOS_STRING_MODE, {
        illegal: null,
      });
      const DOUBLE_QUOTED = hljs.inherit(hljs.QUOTE_STRING_MODE, {
        illegal: null,
        contains: hljs.QUOTE_STRING_MODE.contains.concat(SUBST),
      });
      const HEREDOC = hljs.END_SAME_AS_BEGIN({
        begin: /<<<[ \t]*(\w+)\n/,
        end: /[ \t]*(\w+)\b/,
        contains: hljs.QUOTE_STRING_MODE.contains.concat(SUBST),
      });
      const STRING = {
        className: 'string',
        contains: [hljs.BACKSLASH_ESCAPE, PREPROCESSOR],
        variants: [
          hljs.inherit(SINGLE_QUOTED, {
            begin: "b'", end: "'",
          }),
          hljs.inherit(DOUBLE_QUOTED, {
            begin: 'b"', end: '"',
          }),
          DOUBLE_QUOTED,
          SINGLE_QUOTED,
          HEREDOC
        ]
      };
      const NUMBER = {
        className: 'number',
        variants: [
          { begin: `\\b0b[01]+(?:_[01]+)*\\b` }, // Binary w/ underscore support
          { begin: `\\b0o[0-7]+(?:_[0-7]+)*\\b` }, // Octals w/ underscore support
          { begin: `\\b0x[\\da-f]+(?:_[\\da-f]+)*\\b` }, // Hex w/ underscore support
          // Decimals w/ underscore support, with optional fragments and scientific exponent (e) suffix.
          { begin: `(?:\\b\\d+(?:_\\d+)*(\\.(?:\\d+(?:_\\d+)*))?|\\B\\.\\d+)(?:e[+-]?\\d+)?` }
        ],
        relevance: 0
      };
      const KEYWORDS = {
        keyword:
        // Magic constants:
        // <https://www.php.net/manual/en/language.constants.predefined.php>
        '__CLASS__ __DIR__ __FILE__ __FUNCTION__ __LINE__ __METHOD__ __NAMESPACE__ __TRAIT__ ' +
        // Function that look like language construct or language construct that look like function:
        // List of keywords that may not require parenthesis
        'die echo exit include include_once print require require_once ' +
        // These are not language construct (function) but operate on the currently-executing function and can access the current symbol table
        // 'compact extract func_get_arg func_get_args func_num_args get_called_class get_parent_class ' +
        // Other keywords:
        // <https://www.php.net/manual/en/reserved.php>
        // <https://www.php.net/manual/en/language.types.type-juggling.php>
        'array abstract and as binary bool boolean break callable case catch class clone const continue declare ' +
        'default do double else elseif empty enddeclare endfor endforeach endif endswitch endwhile enum eval extends ' +
        'final finally float for foreach from global goto if implements instanceof insteadof int integer interface ' +
        'isset iterable list match|0 mixed new object or private protected public real return string switch throw trait ' +
        'try unset use var void while xor yield',
        literal: 'false null true',
        built_in:
        // Standard PHP library:
        // <https://www.php.net/manual/en/book.spl.php>
        'Error|0 ' + // error is too common a name esp since PHP is case in-sensitive
        'AppendIterator ArgumentCountError ArithmeticError ArrayIterator ArrayObject AssertionError BadFunctionCallException BadMethodCallException CachingIterator CallbackFilterIterator CompileError Countable DirectoryIterator DivisionByZeroError DomainException EmptyIterator ErrorException Exception FilesystemIterator FilterIterator GlobIterator InfiniteIterator InvalidArgumentException IteratorIterator LengthException LimitIterator LogicException MultipleIterator NoRewindIterator OutOfBoundsException OutOfRangeException OuterIterator OverflowException ParentIterator ParseError RangeException RecursiveArrayIterator RecursiveCachingIterator RecursiveCallbackFilterIterator RecursiveDirectoryIterator RecursiveFilterIterator RecursiveIterator RecursiveIteratorIterator RecursiveRegexIterator RecursiveTreeIterator RegexIterator RuntimeException SeekableIterator SplDoublyLinkedList SplFileInfo SplFileObject SplFixedArray SplHeap SplMaxHeap SplMinHeap SplObjectStorage SplObserver SplObserver SplPriorityQueue SplQueue SplStack SplSubject SplSubject SplTempFileObject TypeError UnderflowException UnexpectedValueException UnhandledMatchError ' +
        // Reserved interfaces:
        // <https://www.php.net/manual/en/reserved.interfaces.php>
        'ArrayAccess Closure Generator Iterator IteratorAggregate Serializable Stringable Throwable Traversable WeakReference WeakMap ' +
        // Reserved classes:
        // <https://www.php.net/manual/en/reserved.classes.php>
        'Directory __PHP_Incomplete_Class parent php_user_filter self static stdClass'
      };
      return {
        case_insensitive: true,
        keywords: KEYWORDS,
        contains: [
          hljs.HASH_COMMENT_MODE,
          hljs.COMMENT('//', '$', {contains: [PREPROCESSOR]}),
          hljs.COMMENT(
            '/\\*',
            '\\*/',
            {
              contains: [
                {
                  className: 'doctag',
                  begin: '@[A-Za-z]+'
                }
              ]
            }
          ),
          hljs.COMMENT(
            '__halt_compiler.+?;',
            false,
            {
              endsWithParent: true,
              keywords: '__halt_compiler'
            }
          ),
          PREPROCESSOR,
          {
            className: 'keyword', begin: /\$this\b/
          },
          VARIABLE,
          {
            // swallow composed identifiers to avoid parsing them as keywords
            begin: /(::|->)+[a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*/
          },
          {
            className: 'function',
            relevance: 0,
            beginKeywords: 'fn function', end: /[;{]/, excludeEnd: true,
            illegal: '[$%\\[]',
            contains: [
              {
                beginKeywords: 'use',
              },
              hljs.UNDERSCORE_TITLE_MODE,
              {
                begin: '=>', // No markup, just a relevance booster
                endsParent: true
              },
              {
                className: 'params',
                begin: '\\(', end: '\\)',
                excludeBegin: true,
                excludeEnd: true,
                keywords: KEYWORDS,
                contains: [
                  'self',
                  VARIABLE,
                  hljs.C_BLOCK_COMMENT_MODE,
                  STRING,
                  NUMBER
                ]
              }
            ]
          },
          {
            className: 'class',
            variants: [
              { beginKeywords: "enum", illegal: /[($"]/ },
              { beginKeywords: "class interface trait", illegal: /[:($"]/ }
            ],
            relevance: 0,
            end: /\{/,
            excludeEnd: true,
            contains: [
              {beginKeywords: 'extends implements'},
              hljs.UNDERSCORE_TITLE_MODE
            ]
          },
          {
            beginKeywords: 'namespace',
            relevance: 0,
            end: ';',
            illegal: /[.']/,
            contains: [hljs.UNDERSCORE_TITLE_MODE]
          },
          {
            beginKeywords: 'use',
            relevance: 0,
            end: ';',
            contains: [hljs.UNDERSCORE_TITLE_MODE]
          },
          STRING,
          NUMBER
        ]
      };
    }

    /*
    Language: PHP Template
    Requires: xml.js, php.js
    Author: Josh Goebel <hello@joshgoebel.com>
    Website: https://www.php.net
    Category: common
    */

    function phpTemplate(hljs) {
      return {
        name: "PHP template",
        subLanguage: 'xml',
        contains: [
          {
            begin: /<\?(php|=)?/,
            end: /\?>/,
            subLanguage: 'php',
            contains: [
              // We don't want the php closing tag ?> to close the PHP block when
              // inside any of the following blocks:
              {
                begin: '/\\*',
                end: '\\*/',
                skip: true
              },
              {
                begin: 'b"',
                end: '"',
                skip: true
              },
              {
                begin: 'b\'',
                end: '\'',
                skip: true
              },
              hljs.inherit(hljs.APOS_STRING_MODE, {
                illegal: null,
                className: null,
                contains: null,
                skip: true
              }),
              hljs.inherit(hljs.QUOTE_STRING_MODE, {
                illegal: null,
                className: null,
                contains: null,
                skip: true
              })
            ]
          }
        ]
      };
    }

    /*
    Language: Plain text
    Author: Egor Rogov (e.rogov@postgrespro.ru)
    Description: Plain text without any highlighting.
    Category: common
    */

    function plaintext(hljs) {
      return {
        name: 'Plain text',
        aliases: [
          'text',
          'txt'
        ],
        disableAutodetect: true
      };
    }

    /*
    Language: .properties
    Contributors: Valentin Aitken <valentin@nalisbg.com>, Egor Rogov <e.rogov@postgrespro.ru>
    Website: https://en.wikipedia.org/wiki/.properties
    Category: config
    */

    /** @type LanguageFn */
    function properties(hljs) {
      // whitespaces: space, tab, formfeed
      const WS0 = '[ \\t\\f]*';
      const WS1 = '[ \\t\\f]+';
      // delimiter
      const EQUAL_DELIM = WS0 + '[:=]' + WS0;
      const WS_DELIM = WS1;
      const DELIM = '(' + EQUAL_DELIM + '|' + WS_DELIM + ')';
      const KEY = '([^\\\\:= \\t\\f\\n]|\\\\.)+';

      const DELIM_AND_VALUE = {
        // skip DELIM
        end: DELIM,
        relevance: 0,
        starts: {
          // value: everything until end of line (again, taking into account backslashes)
          className: 'string',
          end: /$/,
          relevance: 0,
          contains: [
            {
              begin: '\\\\\\\\'
            },
            {
              begin: '\\\\\\n'
            }
          ]
        }
      };

      return {
        name: '.properties',
        disableAutodetect: true,
        case_insensitive: true,
        illegal: /\S/,
        contains: [
          hljs.COMMENT('^\\s*[!#]', '$'),
          // key: everything until whitespace or = or : (taking into account backslashes)
          // case of a key-value pair
          {
            returnBegin: true,
            variants: [
              {
                begin: KEY + EQUAL_DELIM
              },
              {
                begin: KEY + WS_DELIM
              }
            ],
            contains: [
              {
                className: 'attr',
                begin: KEY,
                endsParent: true
              }
            ],
            starts: DELIM_AND_VALUE
          },
          // case of an empty key
          {
            className: 'attr',
            begin: KEY + WS0 + '$'
          }
        ]
      };
    }

    /*
    Language: Python
    Description: Python is an interpreted, object-oriented, high-level programming language with dynamic semantics.
    Website: https://www.python.org
    Category: common
    */

    function python(hljs) {
      const regex = hljs.regex;
      const IDENT_RE = /[\p{XID_Start}_]\p{XID_Continue}*/u;
      const RESERVED_WORDS = [
        'and',
        'as',
        'assert',
        'async',
        'await',
        'break',
        'class',
        'continue',
        'def',
        'del',
        'elif',
        'else',
        'except',
        'finally',
        'for',
        'from',
        'global',
        'if',
        'import',
        'in',
        'is',
        'lambda',
        'nonlocal|10',
        'not',
        'or',
        'pass',
        'raise',
        'return',
        'try',
        'while',
        'with',
        'yield'
      ];

      const BUILT_INS = [
        '__import__',
        'abs',
        'all',
        'any',
        'ascii',
        'bin',
        'bool',
        'breakpoint',
        'bytearray',
        'bytes',
        'callable',
        'chr',
        'classmethod',
        'compile',
        'complex',
        'delattr',
        'dict',
        'dir',
        'divmod',
        'enumerate',
        'eval',
        'exec',
        'filter',
        'float',
        'format',
        'frozenset',
        'getattr',
        'globals',
        'hasattr',
        'hash',
        'help',
        'hex',
        'id',
        'input',
        'int',
        'isinstance',
        'issubclass',
        'iter',
        'len',
        'list',
        'locals',
        'map',
        'max',
        'memoryview',
        'min',
        'next',
        'object',
        'oct',
        'open',
        'ord',
        'pow',
        'print',
        'property',
        'range',
        'repr',
        'reversed',
        'round',
        'set',
        'setattr',
        'slice',
        'sorted',
        'staticmethod',
        'str',
        'sum',
        'super',
        'tuple',
        'type',
        'vars',
        'zip'
      ];

      const LITERALS = [
        '__debug__',
        'Ellipsis',
        'False',
        'None',
        'NotImplemented',
        'True'
      ];

      // https://docs.python.org/3/library/typing.html
      // TODO: Could these be supplemented by a CamelCase matcher in certain
      // contexts, leaving these remaining only for relevance hinting?
      const TYPES = [
        "Any",
        "Callable",
        "Coroutine",
        "Dict",
        "List",
        "Literal",
        "Generic",
        "Optional",
        "Sequence",
        "Set",
        "Tuple",
        "Type",
        "Union"
      ];

      const KEYWORDS = {
        $pattern: /[A-Za-z]\w+|__\w+__/,
        keyword: RESERVED_WORDS,
        built_in: BUILT_INS,
        literal: LITERALS,
        type: TYPES
      };

      const PROMPT = {
        className: 'meta',
        begin: /^(>>>|\.\.\.) /
      };

      const SUBST = {
        className: 'subst',
        begin: /\{/,
        end: /\}/,
        keywords: KEYWORDS,
        illegal: /#/
      };

      const LITERAL_BRACKET = {
        begin: /\{\{/,
        relevance: 0
      };

      const STRING = {
        className: 'string',
        contains: [ hljs.BACKSLASH_ESCAPE ],
        variants: [
          {
            begin: /([uU]|[bB]|[rR]|[bB][rR]|[rR][bB])?'''/,
            end: /'''/,
            contains: [
              hljs.BACKSLASH_ESCAPE,
              PROMPT
            ],
            relevance: 10
          },
          {
            begin: /([uU]|[bB]|[rR]|[bB][rR]|[rR][bB])?"""/,
            end: /"""/,
            contains: [
              hljs.BACKSLASH_ESCAPE,
              PROMPT
            ],
            relevance: 10
          },
          {
            begin: /([fF][rR]|[rR][fF]|[fF])'''/,
            end: /'''/,
            contains: [
              hljs.BACKSLASH_ESCAPE,
              PROMPT,
              LITERAL_BRACKET,
              SUBST
            ]
          },
          {
            begin: /([fF][rR]|[rR][fF]|[fF])"""/,
            end: /"""/,
            contains: [
              hljs.BACKSLASH_ESCAPE,
              PROMPT,
              LITERAL_BRACKET,
              SUBST
            ]
          },
          {
            begin: /([uU]|[rR])'/,
            end: /'/,
            relevance: 10
          },
          {
            begin: /([uU]|[rR])"/,
            end: /"/,
            relevance: 10
          },
          {
            begin: /([bB]|[bB][rR]|[rR][bB])'/,
            end: /'/
          },
          {
            begin: /([bB]|[bB][rR]|[rR][bB])"/,
            end: /"/
          },
          {
            begin: /([fF][rR]|[rR][fF]|[fF])'/,
            end: /'/,
            contains: [
              hljs.BACKSLASH_ESCAPE,
              LITERAL_BRACKET,
              SUBST
            ]
          },
          {
            begin: /([fF][rR]|[rR][fF]|[fF])"/,
            end: /"/,
            contains: [
              hljs.BACKSLASH_ESCAPE,
              LITERAL_BRACKET,
              SUBST
            ]
          },
          hljs.APOS_STRING_MODE,
          hljs.QUOTE_STRING_MODE
        ]
      };

      // https://docs.python.org/3.9/reference/lexical_analysis.html#numeric-literals
      const digitpart = '[0-9](_?[0-9])*';
      const pointfloat = `(\\b(${digitpart}))?\\.(${digitpart})|\\b(${digitpart})\\.`;
      const NUMBER = {
        className: 'number',
        relevance: 0,
        variants: [
          // exponentfloat, pointfloat
          // https://docs.python.org/3.9/reference/lexical_analysis.html#floating-point-literals
          // optionally imaginary
          // https://docs.python.org/3.9/reference/lexical_analysis.html#imaginary-literals
          // Note: no leading \b because floats can start with a decimal point
          // and we don't want to mishandle e.g. `fn(.5)`,
          // no trailing \b for pointfloat because it can end with a decimal point
          // and we don't want to mishandle e.g. `0..hex()`; this should be safe
          // because both MUST contain a decimal point and so cannot be confused with
          // the interior part of an identifier
          {
            begin: `(\\b(${digitpart})|(${pointfloat}))[eE][+-]?(${digitpart})[jJ]?\\b`
          },
          {
            begin: `(${pointfloat})[jJ]?`
          },

          // decinteger, bininteger, octinteger, hexinteger
          // https://docs.python.org/3.9/reference/lexical_analysis.html#integer-literals
          // optionally "long" in Python 2
          // https://docs.python.org/2.7/reference/lexical_analysis.html#integer-and-long-integer-literals
          // decinteger is optionally imaginary
          // https://docs.python.org/3.9/reference/lexical_analysis.html#imaginary-literals
          {
            begin: '\\b([1-9](_?[0-9])*|0+(_?0)*)[lLjJ]?\\b'
          },
          {
            begin: '\\b0[bB](_?[01])+[lL]?\\b'
          },
          {
            begin: '\\b0[oO](_?[0-7])+[lL]?\\b'
          },
          {
            begin: '\\b0[xX](_?[0-9a-fA-F])+[lL]?\\b'
          },

          // imagnumber (digitpart-based)
          // https://docs.python.org/3.9/reference/lexical_analysis.html#imaginary-literals
          {
            begin: `\\b(${digitpart})[jJ]\\b`
          }
        ]
      };
      const COMMENT_TYPE = {
        className: "comment",
        begin: regex.lookahead(/# type:/),
        end: /$/,
        keywords: KEYWORDS,
        contains: [
          { // prevent keywords from coloring `type`
            begin: /# type:/
          },
          // comment within a datatype comment includes no keywords
          {
            begin: /#/,
            end: /\b\B/,
            endsWithParent: true
          }
        ]
      };
      const PARAMS = {
        className: 'params',
        variants: [
          // Exclude params in functions without params
          {
            className: "",
            begin: /\(\s*\)/,
            skip: true
          },
          {
            begin: /\(/,
            end: /\)/,
            excludeBegin: true,
            excludeEnd: true,
            keywords: KEYWORDS,
            contains: [
              'self',
              PROMPT,
              NUMBER,
              STRING,
              hljs.HASH_COMMENT_MODE
            ]
          }
        ]
      };
      SUBST.contains = [
        STRING,
        NUMBER,
        PROMPT
      ];

      return {
        name: 'Python',
        aliases: [
          'py',
          'gyp',
          'ipython'
        ],
        unicodeRegex: true,
        keywords: KEYWORDS,
        illegal: /(<\/|->|\?)|=>/,
        contains: [
          PROMPT,
          NUMBER,
          {
            // very common convention
            begin: /\bself\b/
          },
          {
            // eat "if" prior to string so that it won't accidentally be
            // labeled as an f-string
            beginKeywords: "if",
            relevance: 0
          },
          STRING,
          COMMENT_TYPE,
          hljs.HASH_COMMENT_MODE,
          {
            match: [
              /def/, /\s+/,
              IDENT_RE,
            ],
            scope: {
              1: "keyword",
              3: "title.function"
            },
            contains: [ PARAMS ]
          },
          {
            variants: [
              {
                match: [
                  /class/, /\s+/,
                  IDENT_RE, /\s*/,
                  /\(\s*/, IDENT_RE,/\s*\)/
                ],
              },
              {
                match: [
                  /class/, /\s+/,
                  IDENT_RE
                ],
              }
            ],
            scope: {
              1: "keyword",
              3: "title.class",
              6: "title.class.inherited",
            }
          },
          {
            className: 'meta',
            begin: /^[\t ]*@/,
            end: /(?=#)|$/,
            contains: [
              NUMBER,
              PARAMS,
              STRING
            ]
          }
        ]
      };
    }

    /*
    Language: Python REPL
    Requires: python.js
    Author: Josh Goebel <hello@joshgoebel.com>
    Category: common
    */

    function pythonRepl(hljs) {
      return {
        aliases: [ 'pycon' ],
        contains: [
          {
            className: 'meta',
            starts: {
              // a space separates the REPL prefix from the actual code
              // this is purely for cleaner HTML output
              end: / |$/,
              starts: {
                end: '$',
                subLanguage: 'python'
              }
            },
            variants: [
              {
                begin: /^>>>(?=[ ]|$)/
              },
              {
                begin: /^\.\.\.(?=[ ]|$)/
              }
            ]
          }
        ]
      };
    }

    /*
    Language: SCSS
    Description: Scss is an extension of the syntax of CSS.
    Author: Kurt Emch <kurt@kurtemch.com>
    Website: https://sass-lang.com
    Category: common, css, web
    */

    /** @type LanguageFn */
    function scss(hljs) {
      const modes = MODES(hljs);
      const PSEUDO_ELEMENTS$1 = PSEUDO_ELEMENTS;
      const PSEUDO_CLASSES$1 = PSEUDO_CLASSES;

      const AT_IDENTIFIER = '@[a-z-]+'; // @font-face
      const AT_MODIFIERS = "and or not only";
      const IDENT_RE = '[a-zA-Z-][a-zA-Z0-9_-]*';
      const VARIABLE = {
        className: 'variable',
        begin: '(\\$' + IDENT_RE + ')\\b'
      };

      return {
        name: 'SCSS',
        case_insensitive: true,
        illegal: '[=/|\']',
        contains: [
          hljs.C_LINE_COMMENT_MODE,
          hljs.C_BLOCK_COMMENT_MODE,
          // to recognize keyframe 40% etc which are outside the scope of our
          // attribute value mode
          modes.CSS_NUMBER_MODE,
          {
            className: 'selector-id',
            begin: '#[A-Za-z0-9_-]+',
            relevance: 0
          },
          {
            className: 'selector-class',
            begin: '\\.[A-Za-z0-9_-]+',
            relevance: 0
          },
          modes.ATTRIBUTE_SELECTOR_MODE,
          {
            className: 'selector-tag',
            begin: '\\b(' + TAGS.join('|') + ')\\b',
            // was there, before, but why?
            relevance: 0
          },
          {
            className: 'selector-pseudo',
            begin: ':(' + PSEUDO_CLASSES$1.join('|') + ')'
          },
          {
            className: 'selector-pseudo',
            begin: ':(:)?(' + PSEUDO_ELEMENTS$1.join('|') + ')'
          },
          VARIABLE,
          { // pseudo-selector params
            begin: /\(/,
            end: /\)/,
            contains: [ modes.CSS_NUMBER_MODE ]
          },
          modes.CSS_VARIABLE,
          {
            className: 'attribute',
            begin: '\\b(' + ATTRIBUTES.join('|') + ')\\b'
          },
          {
            begin: '\\b(whitespace|wait|w-resize|visible|vertical-text|vertical-ideographic|uppercase|upper-roman|upper-alpha|underline|transparent|top|thin|thick|text|text-top|text-bottom|tb-rl|table-header-group|table-footer-group|sw-resize|super|strict|static|square|solid|small-caps|separate|se-resize|scroll|s-resize|rtl|row-resize|ridge|right|repeat|repeat-y|repeat-x|relative|progress|pointer|overline|outside|outset|oblique|nowrap|not-allowed|normal|none|nw-resize|no-repeat|no-drop|newspaper|ne-resize|n-resize|move|middle|medium|ltr|lr-tb|lowercase|lower-roman|lower-alpha|loose|list-item|line|line-through|line-edge|lighter|left|keep-all|justify|italic|inter-word|inter-ideograph|inside|inset|inline|inline-block|inherit|inactive|ideograph-space|ideograph-parenthesis|ideograph-numeric|ideograph-alpha|horizontal|hidden|help|hand|groove|fixed|ellipsis|e-resize|double|dotted|distribute|distribute-space|distribute-letter|distribute-all-lines|disc|disabled|default|decimal|dashed|crosshair|collapse|col-resize|circle|char|center|capitalize|break-word|break-all|bottom|both|bolder|bold|block|bidi-override|below|baseline|auto|always|all-scroll|absolute|table|table-cell)\\b'
          },
          {
            begin: /:/,
            end: /[;}{]/,
            contains: [
              modes.BLOCK_COMMENT,
              VARIABLE,
              modes.HEXCOLOR,
              modes.CSS_NUMBER_MODE,
              hljs.QUOTE_STRING_MODE,
              hljs.APOS_STRING_MODE,
              modes.IMPORTANT
            ]
          },
          // matching these here allows us to treat them more like regular CSS
          // rules so everything between the {} gets regular rule highlighting,
          // which is what we want for page and font-face
          {
            begin: '@(page|font-face)',
            keywords: {
              $pattern: AT_IDENTIFIER,
              keyword: '@page @font-face'
            }
          },
          {
            begin: '@',
            end: '[{;]',
            returnBegin: true,
            keywords: {
              $pattern: /[a-z-]+/,
              keyword: AT_MODIFIERS,
              attribute: MEDIA_FEATURES.join(" ")
            },
            contains: [
              {
                begin: AT_IDENTIFIER,
                className: "keyword"
              },
              {
                begin: /[a-z-]+(?=:)/,
                className: "attribute"
              },
              VARIABLE,
              hljs.QUOTE_STRING_MODE,
              hljs.APOS_STRING_MODE,
              modes.HEXCOLOR,
              modes.CSS_NUMBER_MODE
            ]
          },
          modes.FUNCTION_DISPATCH
        ]
      };
    }

    /*
    Language: Shell Session
    Requires: bash.js
    Author: TSUYUSATO Kitsune <make.just.on@gmail.com>
    Category: common
    Audit: 2020
    */

    /** @type LanguageFn */
    function shell(hljs) {
      return {
        name: 'Shell Session',
        aliases: [ 'console', 'shellsession' ],
        contains: [
          {
            className: 'meta',
            // We cannot add \s (spaces) in the regular expression otherwise it will be too broad and produce unexpected result.
            // For instance, in the following example, it would match "echo /path/to/home >" as a prompt:
            // echo /path/to/home > t.exe
            begin: /^\s{0,3}[/~\w\d[\]()@-]*[>%$#][ ]?/,
            starts: {
              end: /[^\\](?=\s*$)/,
              subLanguage: 'bash'
            }
          }
        ]
      };
    }

    /*
    Language: Ruby
    Description: Ruby is a dynamic, open source programming language with a focus on simplicity and productivity.
    Website: https://www.ruby-lang.org/
    Author: Anton Kovalyov <anton@kovalyov.net>
    Contributors: Peter Leonov <gojpeg@yandex.ru>, Vasily Polovnyov <vast@whiteants.net>, Loren Segal <lsegal@soen.ca>, Pascal Hurni <phi@ruby-reactive.org>, Cedric Sohrauer <sohrauer@googlemail.com>
    Category: common
    */

    function ruby(hljs) {
      const regex = hljs.regex;
      const RUBY_METHOD_RE = '([a-zA-Z_]\\w*[!?=]?|[-+~]@|<<|>>|=~|===?|<=>|[<>]=?|\\*\\*|[-/+%^&*~`|]|\\[\\]=?)';
      const RUBY_KEYWORDS = {
        keyword:
          'and then defined module in return redo if BEGIN retry end for self when ' +
          'next until do begin unless END rescue else break undef not super class case ' +
          'require yield alias while ensure elsif or include attr_reader attr_writer attr_accessor ' +
          '__FILE__',
        built_in: 'proc lambda',
        literal:
          'true false nil'
      };
      const YARDOCTAG = {
        className: 'doctag',
        begin: '@[A-Za-z]+'
      };
      const IRB_OBJECT = {
        begin: '#<',
        end: '>'
      };
      const COMMENT_MODES = [
        hljs.COMMENT(
          '#',
          '$',
          {
            contains: [ YARDOCTAG ]
          }
        ),
        hljs.COMMENT(
          '^=begin',
          '^=end',
          {
            contains: [ YARDOCTAG ],
            relevance: 10
          }
        ),
        hljs.COMMENT('^__END__', '\\n$')
      ];
      const SUBST = {
        className: 'subst',
        begin: /#\{/,
        end: /\}/,
        keywords: RUBY_KEYWORDS
      };
      const STRING = {
        className: 'string',
        contains: [
          hljs.BACKSLASH_ESCAPE,
          SUBST
        ],
        variants: [
          {
            begin: /'/,
            end: /'/
          },
          {
            begin: /"/,
            end: /"/
          },
          {
            begin: /`/,
            end: /`/
          },
          {
            begin: /%[qQwWx]?\(/,
            end: /\)/
          },
          {
            begin: /%[qQwWx]?\[/,
            end: /\]/
          },
          {
            begin: /%[qQwWx]?\{/,
            end: /\}/
          },
          {
            begin: /%[qQwWx]?</,
            end: />/
          },
          {
            begin: /%[qQwWx]?\//,
            end: /\//
          },
          {
            begin: /%[qQwWx]?%/,
            end: /%/
          },
          {
            begin: /%[qQwWx]?-/,
            end: /-/
          },
          {
            begin: /%[qQwWx]?\|/,
            end: /\|/
          },
          // in the following expressions, \B in the beginning suppresses recognition of ?-sequences
          // where ? is the last character of a preceding identifier, as in: `func?4`
          {
            begin: /\B\?(\\\d{1,3})/
          },
          {
            begin: /\B\?(\\x[A-Fa-f0-9]{1,2})/
          },
          {
            begin: /\B\?(\\u\{?[A-Fa-f0-9]{1,6}\}?)/
          },
          {
            begin: /\B\?(\\M-\\C-|\\M-\\c|\\c\\M-|\\M-|\\C-\\M-)[\x20-\x7e]/
          },
          {
            begin: /\B\?\\(c|C-)[\x20-\x7e]/
          },
          {
            begin: /\B\?\\?\S/
          },
          // heredocs
          {
            // this guard makes sure that we have an entire heredoc and not a false
            // positive (auto-detect, etc.)
            begin: regex.concat(
              /<<[-~]?'?/,
              regex.lookahead(/(\w+)(?=\W)[^\n]*\n(?:[^\n]*\n)*?\s*\1\b/)
            ),
            contains: [
              hljs.END_SAME_AS_BEGIN({
                begin: /(\w+)/,
                end: /(\w+)/,
                contains: [
                  hljs.BACKSLASH_ESCAPE,
                  SUBST
                ]
              })
            ]
          }
        ]
      };

      // Ruby syntax is underdocumented, but this grammar seems to be accurate
      // as of version 2.7.2 (confirmed with (irb and `Ripper.sexp(...)`)
      // https://docs.ruby-lang.org/en/2.7.0/doc/syntax/literals_rdoc.html#label-Numbers
      const decimal = '[1-9](_?[0-9])*|0';
      const digits = '[0-9](_?[0-9])*';
      const NUMBER = {
        className: 'number',
        relevance: 0,
        variants: [
          // decimal integer/float, optionally exponential or rational, optionally imaginary
          {
            begin: `\\b(${decimal})(\\.(${digits}))?([eE][+-]?(${digits})|r)?i?\\b`
          },

          // explicit decimal/binary/octal/hexadecimal integer,
          // optionally rational and/or imaginary
          {
            begin: "\\b0[dD][0-9](_?[0-9])*r?i?\\b"
          },
          {
            begin: "\\b0[bB][0-1](_?[0-1])*r?i?\\b"
          },
          {
            begin: "\\b0[oO][0-7](_?[0-7])*r?i?\\b"
          },
          {
            begin: "\\b0[xX][0-9a-fA-F](_?[0-9a-fA-F])*r?i?\\b"
          },

          // 0-prefixed implicit octal integer, optionally rational and/or imaginary
          {
            begin: "\\b0(_?[0-7])+r?i?\\b"
          }
        ]
      };

      const PARAMS = {
        className: 'params',
        begin: '\\(',
        end: '\\)',
        endsParent: true,
        keywords: RUBY_KEYWORDS
      };

      const RUBY_DEFAULT_CONTAINS = [
        STRING,
        {
          className: 'class',
          beginKeywords: 'class module',
          end: '$|;',
          illegal: /=/,
          contains: [
            hljs.inherit(hljs.TITLE_MODE, {
              begin: '[A-Za-z_]\\w*(::\\w+)*(\\?|!)?'
            }),
            {
              begin: '<\\s*',
              contains: [
                {
                  begin: '(' + hljs.IDENT_RE + '::)?' + hljs.IDENT_RE,
                  // we already get points for <, we don't need poitns
                  // for the name also
                  relevance: 0
                }
              ]
            }
          ].concat(COMMENT_MODES)
        },
        {
          className: 'function',
          // def method_name(
          // def method_name;
          // def method_name (end of line)
          begin: regex.concat(/def\s+/, regex.lookahead(RUBY_METHOD_RE + "\\s*(\\(|;|$)")),
          relevance: 0, // relevance comes from kewords
          keywords: "def",
          end: '$|;',
          contains: [
            hljs.inherit(hljs.TITLE_MODE, {
              begin: RUBY_METHOD_RE
            }),
            PARAMS
          ].concat(COMMENT_MODES)
        },
        {
          // swallow namespace qualifiers before symbols
          begin: hljs.IDENT_RE + '::'
        },
        {
          className: 'symbol',
          begin: hljs.UNDERSCORE_IDENT_RE + '(!|\\?)?:',
          relevance: 0
        },
        {
          className: 'symbol',
          begin: ':(?!\\s)',
          contains: [
            STRING,
            {
              begin: RUBY_METHOD_RE
            }
          ],
          relevance: 0
        },
        NUMBER,
        {
          // negative-look forward attempts to prevent false matches like:
          // @ident@ or $ident$ that might indicate this is not ruby at all
          className: "variable",
          begin: '(\\$\\W)|((\\$|@@?)(\\w+))(?=[^@$?])' + `(?![A-Za-z])(?![@$?'])`
        },
        {
          className: 'params',
          begin: /\|/,
          end: /\|/,
          relevance: 0, // this could be a lot of things (in other languages) other than params
          keywords: RUBY_KEYWORDS
        },
        { // regexp container
          begin: '(' + hljs.RE_STARTERS_RE + '|unless)\\s*',
          keywords: 'unless',
          contains: [
            {
              className: 'regexp',
              contains: [
                hljs.BACKSLASH_ESCAPE,
                SUBST
              ],
              illegal: /\n/,
              variants: [
                {
                  begin: '/',
                  end: '/[a-z]*'
                },
                {
                  begin: /%r\{/,
                  end: /\}[a-z]*/
                },
                {
                  begin: '%r\\(',
                  end: '\\)[a-z]*'
                },
                {
                  begin: '%r!',
                  end: '![a-z]*'
                },
                {
                  begin: '%r\\[',
                  end: '\\][a-z]*'
                }
              ]
            }
          ].concat(IRB_OBJECT, COMMENT_MODES),
          relevance: 0
        }
      ].concat(IRB_OBJECT, COMMENT_MODES);

      SUBST.contains = RUBY_DEFAULT_CONTAINS;
      PARAMS.contains = RUBY_DEFAULT_CONTAINS;

      // >>
      // ?>
      const SIMPLE_PROMPT = "[>?]>";
      // irb(main):001:0>
      const DEFAULT_PROMPT = "[\\w#]+\\(\\w+\\):\\d+:\\d+>";
      const RVM_PROMPT = "(\\w+-)?\\d+\\.\\d+\\.\\d+(p\\d+)?[^\\d][^>]+>";

      const IRB_DEFAULT = [
        {
          begin: /^\s*=>/,
          starts: {
            end: '$',
            contains: RUBY_DEFAULT_CONTAINS
          }
        },
        {
          className: 'meta',
          begin: '^(' + SIMPLE_PROMPT + "|" + DEFAULT_PROMPT + '|' + RVM_PROMPT + ')(?=[ ])',
          starts: {
            end: '$',
            contains: RUBY_DEFAULT_CONTAINS
          }
        }
      ];

      COMMENT_MODES.unshift(IRB_OBJECT);

      return {
        name: 'Ruby',
        aliases: [
          'rb',
          'gemspec',
          'podspec',
          'thor',
          'irb'
        ],
        keywords: RUBY_KEYWORDS,
        illegal: /\/\*/,
        contains: [
          hljs.SHEBANG({
            binary: "ruby"
          })
        ]
          .concat(IRB_DEFAULT)
          .concat(COMMENT_MODES)
          .concat(RUBY_DEFAULT_CONTAINS)
      };
    }

    /*
    Language: YAML
    Description: Yet Another Markdown Language
    Author: Stefan Wienert <stwienert@gmail.com>
    Contributors: Carl Baxter <carl@cbax.tech>
    Requires: ruby.js
    Website: https://yaml.org
    Category: common, config
    */
    function yaml(hljs) {
      const LITERALS = 'true false yes no null';

      // YAML spec allows non-reserved URI characters in tags.
      const URI_CHARACTERS = '[\\w#;/?:@&=+$,.~*\'()[\\]]+';

      // Define keys as starting with a word character
      // ...containing word chars, spaces, colons, forward-slashes, hyphens and periods
      // ...and ending with a colon followed immediately by a space, tab or newline.
      // The YAML spec allows for much more than this, but this covers most use-cases.
      const KEY = {
        className: 'attr',
        variants: [
          {
            begin: '\\w[\\w :\\/.-]*:(?=[ \t]|$)'
          },
          { // double quoted keys
            begin: '"\\w[\\w :\\/.-]*":(?=[ \t]|$)'
          },
          { // single quoted keys
            begin: '\'\\w[\\w :\\/.-]*\':(?=[ \t]|$)'
          }
        ]
      };

      const TEMPLATE_VARIABLES = {
        className: 'template-variable',
        variants: [
          { // jinja templates Ansible
            begin: /\{\{/,
            end: /\}\}/
          },
          { // Ruby i18n
            begin: /%\{/,
            end: /\}/
          }
        ]
      };
      const STRING = {
        className: 'string',
        relevance: 0,
        variants: [
          {
            begin: /'/,
            end: /'/
          },
          {
            begin: /"/,
            end: /"/
          },
          {
            begin: /\S+/
          }
        ],
        contains: [
          hljs.BACKSLASH_ESCAPE,
          TEMPLATE_VARIABLES
        ]
      };

      // Strings inside of value containers (objects) can't contain braces,
      // brackets, or commas
      const CONTAINER_STRING = hljs.inherit(STRING, {
        variants: [
          {
            begin: /'/,
            end: /'/
          },
          {
            begin: /"/,
            end: /"/
          },
          {
            begin: /[^\s,{}[\]]+/
          }
        ]
      });

      const DATE_RE = '[0-9]{4}(-[0-9][0-9]){0,2}';
      const TIME_RE = '([Tt \\t][0-9][0-9]?(:[0-9][0-9]){2})?';
      const FRACTION_RE = '(\\.[0-9]*)?';
      const ZONE_RE = '([ \\t])*(Z|[-+][0-9][0-9]?(:[0-9][0-9])?)?';
      const TIMESTAMP = {
        className: 'number',
        begin: '\\b' + DATE_RE + TIME_RE + FRACTION_RE + ZONE_RE + '\\b'
      };

      const VALUE_CONTAINER = {
        end: ',',
        endsWithParent: true,
        excludeEnd: true,
        keywords: LITERALS,
        relevance: 0
      };
      const OBJECT = {
        begin: /\{/,
        end: /\}/,
        contains: [ VALUE_CONTAINER ],
        illegal: '\\n',
        relevance: 0
      };
      const ARRAY = {
        begin: '\\[',
        end: '\\]',
        contains: [ VALUE_CONTAINER ],
        illegal: '\\n',
        relevance: 0
      };

      const MODES = [
        KEY,
        {
          className: 'meta',
          begin: '^---\\s*$',
          relevance: 10
        },
        { // multi line string
          // Blocks start with a | or > followed by a newline
          //
          // Indentation of subsequent lines must be the same to
          // be considered part of the block
          className: 'string',
          begin: '[\\|>]([1-9]?[+-])?[ ]*\\n( +)[^ ][^\\n]*\\n(\\2[^\\n]+\\n?)*'
        },
        { // Ruby/Rails erb
          begin: '<%[%=-]?',
          end: '[%-]?%>',
          subLanguage: 'ruby',
          excludeBegin: true,
          excludeEnd: true,
          relevance: 0
        },
        { // named tags
          className: 'type',
          begin: '!\\w+!' + URI_CHARACTERS
        },
        // https://yaml.org/spec/1.2/spec.html#id2784064
        { // verbatim tags
          className: 'type',
          begin: '!<' + URI_CHARACTERS + ">"
        },
        { // primary tags
          className: 'type',
          begin: '!' + URI_CHARACTERS
        },
        { // secondary tags
          className: 'type',
          begin: '!!' + URI_CHARACTERS
        },
        { // fragment id &ref
          className: 'meta',
          begin: '&' + hljs.UNDERSCORE_IDENT_RE + '$'
        },
        { // fragment reference *ref
          className: 'meta',
          begin: '\\*' + hljs.UNDERSCORE_IDENT_RE + '$'
        },
        { // array listing
          className: 'bullet',
          // TODO: remove |$ hack when we have proper look-ahead support
          begin: '-(?=[ ]|$)',
          relevance: 0
        },
        hljs.HASH_COMMENT_MODE,
        {
          beginKeywords: LITERALS,
          keywords: {
            literal: LITERALS
          }
        },
        TIMESTAMP,
        // numbers are any valid C-style number that
        // sit isolated from other words
        {
          className: 'number',
          begin: hljs.C_NUMBER_RE + '\\b',
          relevance: 0
        },
        OBJECT,
        ARRAY,
        STRING
      ];

      const VALUE_MODES = [ ...MODES ];
      VALUE_MODES.pop();
      VALUE_MODES.push(CONTAINER_STRING);
      VALUE_CONTAINER.contains = VALUE_MODES;

      return {
        name: 'YAML',
        case_insensitive: true,
        aliases: [ 'yml' ],
        contains: MODES
      };
    }

    var builtIns = /*#__PURE__*/Object.freeze({
        __proto__: null,
        grmr_xml: xml,
        grmr_asciidoc: asciidoc,
        grmr_awk: awk,
        grmr_bash: bash,
        grmr_c: c,
        grmr_cmake: cmake,
        grmr_cpp: cpp,
        grmr_css: css,
        grmr_markdown: markdown,
        grmr_dart: dart,
        grmr_diff: diff,
        grmr_d: d,
        grmr_glsl: glsl,
        grmr_ini: ini,
        grmr_javascript: javascript,
        grmr_json: json,
        grmr_lua: lua,
        grmr_makefile: makefile,
        grmr_ocaml: ocaml,
        grmr_php: php,
        grmr_php_template: phpTemplate,
        grmr_plaintext: plaintext,
        grmr_properties: properties,
        grmr_python: python,
        grmr_python_repl: pythonRepl,
        grmr_scss: scss,
        grmr_shell: shell,
        grmr_ruby: ruby,
        grmr_yaml: yaml
    });

    const hljs = HighlightJS;

    for (const key of Object.keys(builtIns)) {
      // our builtInLanguages Rollup plugin has to use `_` to allow identifiers to be
      // compatible with `export` naming conventions, so we need to convert the
      // identifiers back into the more typical dash style that we use for language
      // naming via the API
      const languageName = key.replace("grmr_", "").replace("_", "-");
      hljs.registerLanguage(languageName, builtIns[key]);
    }

    return hljs;

})();
if (typeof exports === 'object' && typeof module !== 'undefined') { module.exports = hljs; }
