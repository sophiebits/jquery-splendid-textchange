/**
 * jQuery "splendid textchange" plugin, v1.2 alpha1
 * http://benalpert.com/2013/06/18/a-near-perfect-oninput-shim-for-ie-8-and-9.html
 *
 * (c) 2013 Ben Alpert, released under the MIT license
 */

/*global jQuery: false */
/*jslint browser: true, vars: true */

(function initSplendidTextChange($) {
    "use strict";

    // Determine if this is a modern browser (i.e. not IE 9 or older);
    // if it is, the "input" event is exactly what we want so simply
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


    // ********* OLD IE (9 and older) *********

    var queueActiveElementForNotification = null;
    var activeElement = null;
    var notificationQueue = [];
    var watchedEvents = "keyup keydown";
        // 90% of the time, keydown and keyup aren't necessary. IE 8 fails
        // to fire propertychange on the first input event after setting
        // `value` from a script and fires only keydown, keypress, keyup.
        // Catching keyup usually gets it and catching keydown lets us fire
        // an event for the first keystroke if user does a key repeat
        // (it'll be a little delayed: right before the second keystroke).
        // Other input methods (e.g., paste) seem to fire selectionchange
        // normally.

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
     * (For old IE.)
     */
    function installValueExtensionsOn(target) {
        if (!target.valueExtensions) { // we haven't installed extensions yet (or "target" is not an input-capable element)
            if (hasInputCapabilities(target)) {
                if (window.console) { window.console.log("Installing value extensions on " + target.id); }
                target.valueExtensions = {
                    current: null // not setting "current" initially (to "target.value") allows drag & drop operations (from outside the control) to send change notifications
                };

                // attempt to override "target.value" property
                // so that it prevents "propertychange" event from firing
                // (for consistency with "input" event behaviour)
                if (target.constructor && target.constructor.prototype) { // target.constructor is undefined in quirks mode
                    var descriptor = Object.getOwnPropertyDescriptor(target.constructor.prototype, "value");
                    Object.defineProperty(target, "value", { // override once, never delete
                        get: function () {
                            return descriptor.get.call(this);
                        },
                        set: function (val) {
                            target.valueExtensions.current = val;
                            descriptor.set.call(this, val);
                        }
                    });
                }

                $(target)
                    .on("propertychange", queueActiveElementForNotification) // subscribe once, never unsuncribe
                    .on("dragend", function (e) {
                        window.setTimeout(function () {
                            queueActiveElementForNotification(e);
                        }, 0);
                    });
            }
        }
    }

    /**
     * (For old IE.) For each queued element: if value of the element is
     * different from current value, update the current value and trigger
     * "textchange" event on that element.
     */
    function processNotificationQueue() {
        if (window.console) { window.console.log("Processing notifications: " + notificationQueue.length); }

        // remember the current notification queue (for processing)
        // + create a new queue so that if "textchange" event handlers
        // cause new notification requests to be queued, they will be
        // added to the new queue and handled in the next tick
        var q = notificationQueue;
        notificationQueue = [];

        var target, targetValue, i, l;
        for (i = 0, l = q.length; i < l; i += 1) {
            target = q[i];
            targetValue = target.value;
            if (target.valueExtensions.current !== targetValue) {
                if (window.console) { window.console.log("Before textchange for " + target.id + ": \"" + target.valueExtensions.current + "\", \"" + targetValue + "\""); }
                target.valueExtensions.current = targetValue;
                $(target).trigger("textchange");
            }
        }
    }

    /**
     * (For old IE.) If activeElement has not yet been queued for
     * notification, queue it now.
     */
    queueActiveElementForNotification = function queueActiveElementForNotification(e) {
        if (window.console) { window.console.log("Queue: " + e.type + ", " + e.target.id + ", \"" + e.target.value + "\""); }

        var target = e.target;
        if (target !== activeElement) {
            installValueExtensionsOn(target);
        }

        if (target.valueExtensions && target.valueExtensions.current !== target.value) {
            if (window.console) { window.console.log("Queue accepted"); }
            var i, l;
            for (i = 0, l = notificationQueue.length; i < l; i += 1) {
                if (notificationQueue[i] === target) {
                    break;
                }
            }
            if (i >= l) { // "target" is not yet queued
                notificationQueue.push(target);

                if (l === 0) { // we just queued the first item, schedule processor in the next tick
                    window.setTimeout(processNotificationQueue, 0);
                }
            }
        }
    };

    /**
     * (For old IE.) Marks the specified target element as currently
     * tracked element and adds event listeners to it.
     */
    function startWatching(target) {
        if (window.console) { window.console.log("Start watching " + target.id); }
        activeElement = target;
        $(activeElement).on(watchedEvents, queueActiveElementForNotification);
    }

    /**
     * (For old IE.) Removes the event listeners from the currently tracked
     * element and sets currently tracked element to null.
     */
    function stopWatching() {
        if (activeElement) {
            if (window.console) { window.console.log("Stop watching " + activeElement.id); }
            $(activeElement).off(watchedEvents, queueActiveElementForNotification);
            activeElement = null;
        }
    }

    $(document)
        .on("focusin", function (e) {
            // stopWatching() should be a noop here but we call it just in
            // case we missed a blur event somehow.
            stopWatching();

            // In IE 8, we can capture almost all .value changes by adding a
            // propertychange handler.
            // In IE 9, propertychange/input fires for most input events but is buggy
            // and doesn't fire when text is deleted, but conveniently,
            // selectionchange appears to fire in all of the remaining cases so
            // we catch those and forward the event if the value has changed.
            // In either case, we don't want to call the event handler if the
            // value is changed from JS so we redefine a setter for `.value`
            // that updates our activeElement.valueExtensions.current variable,
            // allowing us to ignore those changes.
            installValueExtensionsOn(e.target);
            if (e.target.valueExtensions) {
                startWatching(e.target);
            }
        })

        .on("focusout", stopWatching)

        .on("input", queueActiveElementForNotification)

        .on("selectionchange", function onSplendidSelectionChange(e) {
            // IE sets "e.target" to "document" in "onselectionchange"
            // event (not very useful); use document.selection instead
            // to determine actual target element
            if (document.selection) {
                var r = document.selection.createRange();
                if (r) {
                    var p = r.parentElement();
                    if (p) {
                        e.target = p;
                        queueActiveElementForNotification(e);
                    }
                }
            }
        });

}(jQuery));
