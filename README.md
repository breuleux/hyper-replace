
hyper-replace
=============

The point of `hyper-replace` is to be able to replace patterns in
strings by things that aren't strings. Here are a few things
`hyper-replace` can help you with:

* Replace all occurrences of a pattern (a hashtag, a youtube URL,
  etc.) in a comment by a React component. `hyper-replace` will return
  a suitable array of children. This will, of course, work just as
  well for other frameworks!
* Parse simple markup to a structure, for example Markdown to
  virtual-dom, instead of outputting a string in a specific format
  like HTML.

`hyper-replace` returns an array of string parts interspersed with
arbitrary objects. It is also powerful enough to apply regular
expressions to that same data structure, which means that you can
compose calls to it.

## Basic usage

    var hyperReplace = require('hyper-replace');
    hyperReplace('I have the __POWER__!',
                 {pattern: /__([^_]+)__/g,
                  replacement: (_, text) => ({tag: 'strong', children: text})});

    // => ['I have the ', {tag: 'strong', children: 'POWER'}, '!']

`hyper-replace` can also operate on mixed arrays of strings and
objects. Example:

    hyperReplace(['This is __', {tag: 'em', children: 'very important'}, '__'],
                 {pattern: /__([^_]+)__/g,
                  replacement: (_, text) => ({tag: 'strong', children: text})});

    // => ['This is ',
    //     {tag: 'strong', children: [{tag: 'em', children: 'very important'}]}]

Note that because of this feature, the arguments given to the
replacement function (the first of which is the full match, and the
others are the groups in the regular expression) may not be
strings. They may either be a string or an array of strings and
objects spanned by the match.

## Multiple patterns

For convenience, hyperReplace can take a list of patterns:

    hyperReplace('__Emphasis__ on `code`',
                 [{pattern: /__([^_]+)__/g,
                   replacement: (_, text) => ({tag: 'strong', children: text})},
                  {pattern: /`([^`]+)`/g,
                   replacement: (_, text) => ({tag: 'code', children: text})}]);

    // => [{tag: 'strong', children: 'Emphasis'},
    //      ' on ',
    //     {tag: 'code', children: 'code'}]

### Overlapping patterns

The other in which the patterns are specified matters: `hyperReplace`
will apply them in that order. Furthermore, all replacements are
"closed off": all patterns see the previous replacements as surrogate
(invalid) characters, so while they can contain or encompass them,
they can't intersect. (This is arguably a feature: you don't have to
worry that the return value of a replacement function will interfere
with the next pattern).

If you wish to match patterns that can be nested, your two options
are:

* Call `hyperReplace` recursively in the replacement function.
* Apply the patterns from the inside out (smaller first). The
  `applyUntilEquilibrium` option, described below, can help.

### Apply until equilibrium

`hyperReplace` can be told to apply one or more patterns over and over
until there is nothing left to replace. This must be used wisely.

    hyperReplace('<span>Do <i>not</i> <s>parse HTML</s> like this</span>',
                 /<([a-z]+)>([^<>]*)<\/\1>/g,
                 (_, tag, text) => ({tag: tag, children: text}),
                 {applyUntilEquilibrium: true});

    // => [{tag: 'span',
    //      children: ['Do ',
    //                 {tag: 'i', children: 'not'},
    //                 ' ',
    //                 {tag: 's', children: 'parse HTML'},
    //                 ' like this']}]

Basically, the regular expression will start by matching the innermost
tags (that don't contain sub-tags) and will replace them all by
surrogates. Once that's done, the second innermost tags become
innermost, so you can apply the pattern again, and so on, until you
get to the top level.

## How it works

When it is given a list like `['I ate ', chowder, ' and ', cake]`,
`hyperReplace` stashes all non-strings in an array and creates the
string `'I ate \uD801 and \uD802'`. Characters in the `\uD800-\uDBFF`
range are supposed to be used in surrogate pairs in the high
position. They are invalid characters on their own, so they make for
good placeholders.

So `\uD801` is a placeholder for the first non-string element in the
array, `\uD802` stands for the second, and so on. Then, when a
replacement is made, the replacement is stashed in the list and a new
surrogate is put in its place in the string.

At the end, the string is split along the lone surrogates we
introduced and filled in with the appropriate objects. This is also
done with the match strings before they are given to a replacement
function, so the placeholders are never exposed.

## Limitations

* It is only guaranteed to work on valid Unicode strings.
* It'll choke if it has to do more than 1024 replacements, because
  then it runs out of surrogates. An exception will be raised if the
  limit is reached. (This should be fixable, I'm just waiting to run
  into the problem, or for somebody else to.)

