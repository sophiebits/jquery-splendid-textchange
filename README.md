# jQuery “splendid textchange” plugin

Simply do:

```js
// <input type="text" id="monkey">

$("#monkey").on("textchange", function() {
    // ...
});
```

and you'll receive events for every `value` change.

See http://benalpert.com/2013/06/18/a-near-perfect-oninput-shim-for-ie-8-and-9.html for more details.

## License

(c) 2013 Ben Alpert, released under the MIT license.
