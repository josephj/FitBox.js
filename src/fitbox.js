/*global window:true, document:true, $:true */

(function () {

    'use strict';

    /**
     * Adjusts the font size automatically according to
     * its container's width and hiehgt.
     *
     * $(container).fitbox('option', {
     *     minFontSize: '50px',
     *     maxFontSize: '100px',
     *     adjustAfterWindowResize: false,
     *     truncateStyle: 'ellipsis'
     * });
     *
     * @constructor FitBox
     * @param container {jQuery|HTMLElement|String} The container
     * @param attrs {Object} The config object.
     */
    function FitBox(container, attrs) {
        var that = this,
            $window = $(window);
        container = $(container);
        attrs = attrs || {};

        // Init properties
        that._needTruncate = false;
        that._originalFontSize = parseInt(container.css('font-size'), 10);
        that.adjustAfterWindowResize = (attrs.adjustAfterWindowResize === true) ? true : false;
        that.container = container;
        that.debug = (attrs.debug) ? true : false;
        that.debug = true;
        that.ellipsisSelector = attrs.ellipsisSelector || null;
        that.maxFontSize = parseInt(attrs.maxFontSize, 10) || null;
        that.maxTryAmount = parseInt(attrs.maxTryAmount, 10) || 300;
        that.minFontSize = parseInt(attrs.minFontSize, 10) || null;

        // Bind resize event when adjustAfterWindowResize is true
        if (that.adjustAfterWindowResize) {
            $window.resize(function() {
                if (that.resizeTimer) {
                    clearTimeout(that.resizeTimer);
                }
                that.resizeTimer = setTimeout(function() {
                    $window.trigger('resizeEnd');
                }, 1000);
            });
            $window.on('resizeEnd', function () {that.sync();});
        }

        // Find best fit font size and apply it
        that.sync();
    }

    FitBox.prototype = {
        /**
         * Show debugging logs when debug:true
         */
        _log: function (msg, type) {
            var that = this;
            if (!that.debug || !window.console) {
                return;
            }
            type = type || 'info';
            console[type]('[FitBox] ' + msg);
        },
        /**
         * Find beginning font size
         */
        _calculateRatio: function (ratio, length) {
            ratio = Math.log(ratio);
            ratio += 1;
            return ratio;
        },
        /**
         * Get appropriate font size by cloning an invisible container
         * and change its font size by loop. Find the closest height.
         *
         * Note that it ignores both the maxFontSize and minFontSize
         * which user might set.
         */
        _getBestFontSize: function () {
            var that = this,
                $host,       // Host = container
                $proxy,      // Proxy = clonned container
                ratio,       // Host width and height ratio (fixed)
                hostWidth,   // Host width (fixed)
                hostHeight,  // Host height (fixed)
                counter,
                isAdd,
                fontSize,    // Current font size
                proxyWidth,  // Current proxy width
                proxyHeight, // Current proxy height
                step;

            that._log('_getBestFontSize() is executed');

            // Clone container as an invisible div for testing
            // different font sizes
            $host = that.container;
            $proxy = $host.clone();
            $host.parent().append($proxy);
            $proxy.css({
                'height'   : 'auto',
                'width'    : $host.width() + 'px',
                'overflow' : 'hidden',
                'position' : 'absolute',
                'left'     : '-1000em',
                'top'      : '-1000em'
            });

            // Initial values
            hostWidth = parseInt($host.width(), 10);
            hostHeight = parseInt($host.height(), 10);
            proxyWidth = parseInt($proxy[0].scrollWidth, 10);
            proxyHeight = parseInt($proxy.height(), 10);

            // Don't do anything if it's an empty block
            fontSize = parseInt($host.css('font-size'), 10);
            if (!proxyWidth || !proxyHeight || $.trim($proxy.html()).length === 0) {
                that._log('>> No text or height equals to 0', 'warn');
                return fontSize;
            }

            // Set initial font size
            // TODO - Find a better way to calculate
            ratio = that._calculateRatio(hostHeight / proxyHeight);
            fontSize = fontSize * ratio;
            $proxy.css('font-size', fontSize + 'px');
            proxyWidth = parseInt($proxy[0].scrollWidth, 10);
            proxyHeight = parseInt($proxy.height(), 10);

            if (proxyHeight > hostHeight || proxyWidth > hostWidth) { // Decrease
                isAdd = false;
                step = -1;
            } else if (proxyHeight < hostHeight && proxyWidth <= hostWidth) { // Increase
                isAdd = true;
                step = 1;
            } else {
                return fontSize; // Already the best!
            }

            while (that._shouldContinue(isAdd, [hostWidth, hostHeight], [proxyWidth, proxyHeight])) {
                // Change font size
                fontSize = parseInt($proxy.css('font-size'), 10) + step;
                $proxy.css('font-size', fontSize + 'px');
                that._log('>> Try ' + fontSize + 'px');
                // Get new width and height
                proxyHeight = parseInt($proxy.height(), 10);
                proxyWidth = parseInt($proxy[0].scrollWidth, 10);
                // Check if the amount of iterations is more than maximum try limit
                counter += 1;
                if (counter > that.maxTryAmount) {
                    that._log('>> Exceed legal detecting amount. Give up!', 'warn');
                    $proxy.remove();
                    $proxy = null;
                    return false;
                }
            }

            // Destroy proxy after getting best font size.
            $proxy.remove();
            $proxy = null;

            that._log('>> Best font size is ' + fontSize);
            return fontSize;
        },
        _shouldContinue: function (isAdd, hostSize, proxySize) {
            var result;
            if (isAdd) { // Increase
                result = (proxySize[1] < hostSize[1] && proxySize[0] <= hostSize[0]);
            } else { // Decrease
                result = (proxySize[1] > hostSize[1] || proxySize[0] > hostSize[0]);
            }
            return result;
        },
        /**
         * Set appropriate font sie according to minFontSize and maxFontSize
         * which are provided by user.
         */
        setFontSize: function (fontSize) {
            var that = this,
                maxFontSize = that.maxFontSize,
                minFontSize = that.minFontSize,
                currentFontSize = parseInt(that.container.css('font-size'), 10),
                newFontSize;

            that._log('setFontSize() is execute');

            if (that.maxFontSize && fontSize > that.maxFontSize) {
                newFontSize = that.maxFontSize;
                that._log('>> You better make the alignment to middle...');
            } else if (that.minFontSize && fontSize < that.minFontSize) {
                newFontSize = that.minFontSize;
                that.needTruncate = true;
                that._log('>> You better do the truncation...');
            } else {
                newFontSize = fontSize;
            }

            that._log('>> Initial font size is ' + currentFontSize + 'px');
            if (newFontSize !== currentFontSize) {
                that.container.css('font-size', newFontSize + 'px');
                that._log('>> New font size is ' + newFontSize + 'px');
                // Trigger a `fitbox:change` custom event.
                $(document).trigger('fitbox:change', [currentFontSize, newFontSize, that.needTruncate]);
            }
            if (that.needTruncate) {
                that.truncate();
            }
        },
        truncate: function () {
            var that = this,
                $wrapper;
            that._log('truncate() is executed');
            if (!that.container.dotdotdot) {
                console.warn('You need to install the dotdotdot jquery plugin');
                return;
            }
            $wrapper = (that.ellipsisSelector) ? that.container.find(that.ellipsisSelector) : that.container;
            $wrapper.dotdotdot();
        },
        /**
         * Find best font size and apply it
         *
         * @method sync.
         */
        sync: function () {
            var that = this,
                bestFontSize;
            bestFontSize = that._getBestFontSize();
            that.setFontSize(bestFontSize);
        }
    };

    // Make a jquery-like usage
    $.fn.fitbox = function (option, value) {
        this.each(function () {
            var $el = $(this),
                attrs,
                instance;

            // Get config object
            attrs = ($.isPlainObject(option)) ? option : {};
            attrs = $.extend($el.data(), attrs); // Accept data attributes

            // Render the fitbox
            instance = $el.data('fitbox');
            if (!instance) {
                instance = new FitBox($el, option);
                $el.data('fitbox', instance);
            }

            // Allow user to call public method via JavaScript
            if (typeof option === 'string' && instance[option]) {
                instance[option].call(instance, value);
            }
        });
    };
    $.fn.fitbox.Constructor = FitBox;

    // Promote to global
    window.FitBox = FitBox;

}());
