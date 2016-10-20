
var surrogateCodePoint = 0xD800;
var surrogate = String.fromCharCode(surrogateCodePoint);
var splitRegex = /([\uD800-\uDBFF])(?![\uDC00-\uDFFF])/;

function hyperReplaceImpl(parts, regexs, options) {
    var n = 0;
    var inserts = [];
    function addInsert(x) {
        if (n >= 1024)
            throw new Exception('hyper-replace can only do 1024 replacements in one go');
        inserts.push(x);
        return String.fromCharCode(surrogateCodePoint + (n++));
    }
    function expand(s) {
        var results = s.split(splitRegex).map(function (s, i) {
            if (i % 2 === 0) {
                return s;
            }
            else {
                var index = s.charCodeAt(0) - surrogateCodePoint;
                return inserts[index];
            }
        });
        if (results.length === 1 && typeof(results[0]) === 'string') {
            return results[0];
        }
       else {
            return results;
        }
    }

    var s = parts.map(function (x) {
        if (typeof(x) === 'string') {
            return x;
        }
        else {
            return addInsert(x);
        }
    }).join("");

    while (true) {
        var s0 = s;
        regexs.forEach(function (r) {
            var repl = r.repl;
            if (typeof(repl) === 'function') {
                s = s.replace(r.regex, function () {
                    var args = [].slice.call(arguments).map(function (arg) {
                        if (typeof(arg) === 'string') {
                            return expand(arg);
                        }
                        else {
                            return arg;
                        }
                    });
                    var result = repl.apply(this, args);
                    return addInsert(result);
                });
            }
            else if (typeof(repl) === 'string') {
                s = s.replace(r.regex, repl);
            }
            else {
                s = s.replace(r.regex, addInsert(repl));
            }
        });
        if (!options.applyUntilEquilibrium || s === s0) {
            break;
        }
    };

    return expand(s);
}

function hyperReplace(x, arg1, arg2, arg3) {
    if (typeof(x) === 'string')
        x = [x];
    if (!Array.isArray(x))
        return x
    if (arg1 instanceof RegExp)
        return hyperReplaceImpl(x, [{regex: arg1, repl: arg2}], arg3 || {});
    else if (Array.isArray(arg1)) {
        return hyperReplaceImpl(x, arg1, arg2 || {});
    }
    else {
        return hyperReplaceImpl(x, [arg1], arg2 || {});
    }
}

module.exports = hyperReplace;
module.exports.impl = hyperReplaceImpl;
