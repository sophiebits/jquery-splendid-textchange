/**
 * jQuery "splendid textchange" plugin, v1.2 alpha2
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

    var queueEventTargetForNotification = null;
    var activeElement = null;
    var notificationQueue = [];
    var watchedEvents = "keyup keydown";
        // 90% of the time, keydown and keyup aren't necessary. IE 8 fails
        // to fire propertychange on the first input event after setting
        // `value` from a script and fires only keydown, keypress, keyup.
        // Catching keyup usually gets it and catching keydown lets us fire
        // an event for the first keystroke if user does a key repeat
        // (it'll be a little delayed: right before the second keystroke).


    // Return true if the specified element can generate
    // change notifications (i.e. can be used by users to input values).
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


    // Update the specified target so that we can track its value changes.
    // Returns true if extensions were successfully installed, false otherwise.
    function installValueExtensionsOn(target) {
        if (target.valueExtensions) {
            return true;
        }
        if (!hasInputCapabilities(target)) {
            return false;
        }

        // add extensions container
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

        // subscribe once, never unsubcribe
        $(target)
            .on("propertychange", queueEventTargetForNotification)
            .on("dragend", function onSplendidDragend(e) {
                window.setTimeout(function onSplendidDragendDelayed() {
                    queueEventTargetForNotification(e);
                }, 0);
            });

        return true;
    }


    // Fire "textchange" event for each queued element whose value changed.
    function processNotificationQueue() {
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
                target.valueExtensions.current = targetValue;
                $(target).trigger("textchange");
            }
        }
    }


    // If target element of the specified event has not yet been
    // queued for notification, queue it now.
    queueEventTargetForNotification = function queueEventTargetForNotification(e) {
        var target = e.target;
        if (installValueExtensionsOn(target) && target.valueExtensions.current !== target.value) {
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


    // Mark the specified target element as "active" and add event listeners to it.
    function startWatching(target) {
        activeElement = target;
        $(activeElement).on(watchedEvents, queueEventTargetForNotification);
    }


    // Remove the event listeners from the "active" element and set "active" to null.
    function stopWatching() {
        if (activeElement) {
            $(activeElement).off(watchedEvents, queueEventTargetForNotification);
            activeElement = null;
        }
    }


    // In IE 8, we can capture almost all .value changes by adding a
    // propertychange handler (in "installValueExtensionsOn").
    //
    // In IE 9, propertychange/input fires for most input events but is buggy
    // and doesn't fire when text is deleted, but conveniently,
    // "selectionchange" appears to fire in all of the remaining cases so
    // we catch those.
    //
    // In either case, we don't want to call the event handler if the
    // value is changed from JS so we redefine a setter for `.value`
    // that allows us to ignore those changes (in "installValueExtensionsOn").
    $(document)
        .on("focusin", function onSplendidFocusin(e) {
            // stopWatching() should be a noop here but we call it just in
            // case we missed a blur event somehow.
            stopWatching();

            if (installValueExtensionsOn(e.target)) {
                startWatching(e.target);
            }
        })

        .on("focusout", stopWatching)

        .on("input", queueEventTargetForNotification)

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
                        queueEventTargetForNotification(e);
                    }
                }
            }
        });

}(jQuery));
