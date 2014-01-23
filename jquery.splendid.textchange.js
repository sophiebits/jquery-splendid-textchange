/**
 * jQuery "splendid textchange" plugin, v1.2 alpha1
 * http://benalpert.com/2013/06/18/a-near-perfect-oninput-shim-for-ie-8-and-9.html
 *
 * (c) 2013 Ben Alpert, released under the MIT license
 */

/*global jQuery: false */
/*jslint browser: true, white: true, vars: true */

(function($) {
"use strict";

    // Determine if this is a modern browser (i.e. not IE 9 or older),
    // in which case the "input" event is exactly what we want so simply
    // mirror it as "textchange" event
    var testNode = document.createElement("input");
    var isInputSupported = (testNode.oninput !== undefined &&
        ((document.documentMode || 100) > 9));
    if (isInputSupported) {
        $(document).on("input", function mirrorInputEvent(e) {
            $(e.target).trigger("textchange");
        });

        return;
    }

var activeElement = null;
var activeElementValue = null;
var activeElementValueProp = null;
var activeElementValueOverride = false; // track whether "activeElement.value" property was overridden in "startWatching" so that it can be restored in "stopWatching"

/**
 * (For old IE.) Replacement getter/setter for the `value` property that
 * gets set on the active element.
 */
var newValueProp =  {
    get: function() {
        return activeElementValueProp.get.call(this);
    },
    set: function(val) {
        activeElementValue = val;
        activeElementValueProp.set.call(this, val);
    }
};

    /**
     * (For old IE.) Return true if the specified element can generate
     * change notifications (i.e. can be used by users to input values).
     */
    function hasInputCapabilities(elem) {
        // The HTML5 spec lists many more types than `text` and `password` on
        // which the input event is triggered but none of them exist in IE 8 or
        // 9, so we don't check them here
        return (
            (elem.nodeName === "INPUT" &&
                (elem.type === "text" || elem.type === "password")) ||
            elem.nodeName === "TEXTAREA"
        );
    }

    /**
     * (For old IE.) If value of activeElement is different from current value
     * (activeElementValue), update the current value and trigger "textchange"
     * event on activeElement.
     */
    function updateValueAndTriggerTextChange() {
        if (activeElement && activeElement.value !== activeElementValue) {
            activeElementValue = activeElement.value;
            $(activeElement).trigger("textchange");
        }
    }

/**
 * (For old IE.) Starts tracking propertychange events on the passed-in element
 * and override the value property so that we can distinguish user events from
 * value changes in JS.
 */
var startWatching = function(target) {
    activeElement = target;
    activeElementValue = target.value;

    if (target.constructor && target.constructor.prototype) { // target.constructor is undefined in quirks mode
        activeElementValueProp = Object.getOwnPropertyDescriptor(
            target.constructor.prototype, "value");
        Object.defineProperty(activeElement, "value", newValueProp);
        activeElementValueOverride = true;
    }

    activeElement.attachEvent("onpropertychange", updateValueAndTriggerTextChange);
};

/**
 * (For old IE.) Removes the event listeners from the currently-tracked
 * element, if any exists.
 */
var stopWatching = function() {
    if (!activeElement) { return; }

    if (activeElementValueOverride) {
        // delete restores the original property definition
        delete activeElement.value;
        activeElementValueOverride = false;
    }
    activeElement.detachEvent("onpropertychange", updateValueAndTriggerTextChange);

    activeElement = null;
    activeElementValue = null;
    activeElementValueProp = null;
};

    $(document)
        .on("focusin", function(e) {
            // In IE 8, we can capture almost all .value changes by adding a
            // propertychange handler and looking for events with propertyName
            // equal to 'value'.
            // In IE 9, propertychange fires for most input events but is buggy
            // and doesn't fire when text is deleted, but conveniently,
            // selectionchange appears to fire in all of the remaining cases so
            // we catch those and forward the event if the value has changed.
            // In either case, we don't want to call the event handler if the
            // value is changed from JS so we redefine a setter for `.value`
            // that updates our activeElementValue variable, allowing us to
            // ignore those changes.
            if (hasInputCapabilities(e.target)) {
                // stopWatching() should be a noop here but we call it just in
                // case we missed a blur event somehow.
                stopWatching();
                startWatching(e.target);
            }
        })

        .on("focusout", stopWatching)

        .on("selectionchange keyup keydown", updateValueAndTriggerTextChange);
            // On the selectionchange event, e.target is just document which
            // isn't helpful for us so just check activeElement instead.
            //
            // 90% of the time, keydown and keyup aren't necessary. IE 8 fails
            // to fire propertychange on the first input event after setting
            // `value` from a script and fires only keydown, keypress, keyup.
            // Catching keyup usually gets it and catching keydown lets us fire
            // an event for the first keystroke if user does a key repeat
            // (it'll be a little delayed: right before the second keystroke).
            // Other input methods (e.g., paste) seem to fire selectionchange
            // normally.

}(jQuery));
