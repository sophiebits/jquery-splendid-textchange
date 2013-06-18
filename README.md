# jQuery “splendid textchange” plugin

This plugin provides a synthetic event called textchange which simulates the input event in all browsers, abstracting over cross-browser differences.

Simply do:

```js
// <input type="text" id="monkey">

$("#monkey").on("textchange", function() {
    // ...
});
```

and you'll receive events for every `value` change, just as you would if the input event worked properly in all browsers.

See my blog post “[A near-perfect oninput shim for IE 8 and 9](http://benalpert.com/2013/06/18/a-near-perfect-oninput-shim-for-ie-8-and-9.html)” for more details.

## Support

Supports IE 8, IE 9, and modern browsers.

Tested in jQuery 1.10; should work in 1.7+.

## Why “splendid”?

Zurb already has an [unrelated textchange plugin](http://zurb.com/playground/jquery-text-change-custom-event) and I suck at names, sorry.

## License

(c) 2013 Ben Alpert, released under the MIT license.
