/*global window:true, document:true, $:true */

(function () {

    'use strict';

    /**
     * Adjusts the font size automatically according to its container's width and hiehgt
     *
     * new FitBox(container, {
     *     minFontSize: '50px', // Default null
     *     maxFontSize: '100px', // Default null
     *     adjustAfterWindowResize: false, // Default false
     *     truncateStyle: 'ellipsis'
     * });
     *
     * OR...
     *
     * $(container).fitBox('option', {
     *     minFontSize: '50px',
     *     maxFontSize: '100px',
     *     adjustAfterWindowResize: false,
     *     truncateStyle: 'ellipsis'
     * });
     *
     * @constructor  Fitbox
     */
    function FitBox(container, attrs) {
        var that = this;
        that.container = $(container);
        that.clone = null;
        attrs = attrs || {};
        that.debug = (attrs.debug) ? true : false;
        that.init(attrs);
        that.bind();
        that.render(that.container);
    }

    FitBox.MAX_TRY_AMOUNT = 300;

    FitBox.prototype = {
        NAME: 'stackla.fitbox',
        log: function (msg, type) {
            var that = this;
            if (!that.debug) {
                return;
            }
            type = type || 'info';
            console[type]('[FitBox] ' + msg);
        },
        _calculateRatio: function (ratio, length) {
            ratio = Math.log(ratio);
            ratio += 1;
            return ratio;
        },
        /**
         * Get appropriate font size by cloning an invisible container
         * and change its font size by loop. Find the closest height.
         *
         * NOTE: This method ignores both the maxFontSize and minFontSize
         *       which user might set.
         */
        getBestFontSize: function () {
            var that = this,
                $host = that.container,
                $proxy = $host.clone(),
                counter = 0,
                fontSize = parseInt($host.css('font-size'), 10),
                originalFontSize = fontSize,
                hostHeight,  // Containter height
                proxyHeight, // Clone height
                proxyWidth,
                ratio;

            that.log('getBestFontSize() is executed');

            // Clone container to an invisible element for testing different font sizes.
            $proxy.addClass('fitbox-proxy');
            $host.parent().append($proxy);
            $proxy.css({
                'background-color': 'yellow',
                'width'    : $host.width() + 'px',
                'overflow' : 'hidden',
                'height'   : 'auto',
                'position' : 'absolute',
                'left'     : '0',
                'bottom'   : 'auto'
            });

            that.log([
                '',
                'hostWidth = '+ $host.width(),
                'hostHeight = '+ $host.height(),
                'proxyWidth = '+ $proxy.width(),
                'proxyHeight = '+ $proxy.height()
            ].join('\n'));

            // Initial height.
            hostHeight = parseInt($host.height(), 10);
            proxyWidth = parseInt($proxy.width(), 10);
            proxyHeight = parseInt($proxy.height(), 10);
            that.log('getBestFontSize() - proxyHeight:hostHeight = ' + proxyHeight + ':' + hostHeight);

            // Don't do anything if it's an empty block.
            if (proxyWidth === 0 || proxyHeight === 0 || $.trim($proxy.html()).length === 0) {
                that.log('No text or height equals to 0');
                return fontSize;
            }

            ratio = that._calculateRatio(hostHeight / proxyHeight);
            fontSize = fontSize * ratio;
            $proxy.css('font-size', fontSize + 'px');
            proxyHeight = $proxy.height();

            if (proxyHeight > hostHeight) {
                that.log('getBestFontSize() - should DECREASE font size');
                do {
                    fontSize = parseInt($proxy.css('font-size'), 10) - 1;
                    $proxy.css('font-size', fontSize + 'px');
                    that.log('getBestFontSize() - try ' + fontSize + 'px');
                    proxyHeight = $proxy.height();
                    counter += 1;
                    if (counter > FitBox.MAX_TRY_AMOUNT) {
                        that.log('getBestFontSize() - Exceed legal detecting amount. Give up!', 'warn');
                        $proxy.remove();
                        $proxy = null;
                        return originalFontSize;
                    }
                } while (proxyHeight > hostHeight);
                fontSize -= 1;
            } else if (proxyHeight < hostHeight) {
                that.log('getBestFontSize() - should INCREASE font size');
                do {
                    fontSize = parseInt($proxy.css('font-size'), 10) + 1;
                    $proxy.css('font-size', fontSize + 'px');
                    that.log('getBestFontSize() - try ' + fontSize + 'px');
                    proxyHeight = $proxy.height();
                    counter += 1;
                    if (counter > FitBox.MAX_TRY_AMOUNT) {
                        that.log('getBestFontSize() - Exceed legal detecting amount. Give up!', 'warn');
                        $proxy.remove();
                        $proxy = null;
                        return originalFontSize;
                    }
                } while (proxyHeight < hostHeight);
                fontSize -= 1;
            }

            // Destroy proxy because we got the best font size.
            $proxy.remove();
            $proxy = null;

            that.log('getBsetFontSize() - best font size is ' + fontSize);
            return fontSize;
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

            that.log('setFontSize() is execute');

            if (that.maxFontSize && fontSize > that.maxFontSize) {
                newFontSize = that.maxFontSize;
                that.log('setFontSize() - You better make the alignment to middle...');
            } else if (that.minFontSize && fontSize < that.minFontSize) {
                newFontSize = that.minFontSize;
                that.needTruncate = true;
                that.log('setFontSize() - You better do the truncation...');
            } else {
                newFontSize = fontSize;
            }

            that.log('setFontSize() - Initial font size is ' + currentFontSize + 'px');
            if (newFontSize !== currentFontSize) {
                that.container.css('font-size', newFontSize + 'px');
                that.log('setFontSize() - New font size is ' + newFontSize + 'px');
                // Trigger a `fitbox:change` custom event.
                $(document).trigger('fitbox:change', [currentFontSize, newFontSize, that.needTruncate]);
            }
            if (that.needTruncate) {
                that.truncate();
            }
            that.log('========================');
        },
        sync: function () {
            var that = this,
                bestFontSize;
            bestFontSize = that.getBestFontSize();
            that.setFontSize(bestFontSize);
        },
        truncate: function () {
            var that = this,
                $wrapper;
            that.log('truncate() is executed');
            if (!that.container.dotdotdot) {
                console.warn('You need to install the dotdotdot jquery plugin');
                return;
            }
            $wrapper = (that.ellipsisSelector) ? that.container.find(that.ellipsisSelector) : that.container;
            $wrapper.dotdotdot();
        },
        init: function (attrs) {
            var that = this;
            that.log('init() is executed');
            that.needTruncate = false;
            that.ellipsisSelector = attrs.ellipsisSelector || null;
            that.minFontSize = parseInt(attrs.minFontSize, 10) || null;
            that.maxFontSize = parseInt(attrs.maxFontSize, 10) || null;
            that.adjustAfterWindowResize = (attrs.adjustAfterWindowResize === true) ? true : false;
        },
        bind: function () {
            var that = this;
            that.log('bind() is executed');

            if (!that.adjustAfterWindowResize) {
                return false;
            }

            // Trigger font size change only for once.
            $(window).resize(function() {
                if (that.resizeTimer) {
                    clearTimeout(that.resizeTimer);
                }
                that.resizeTimer = setTimeout(function() {
                    $(window).trigger('resizeEnd');
                }, 1000);
            });

            $(window).on('resizeEnd', function () {that.sync();});
        },
        render: function (container) {
            var that = this;
            that.log('render() is executed');
            that.sync();
        }
    };

    // Make a jquery-like usage
    $.fn.fitBox = function (options) {
        $.each(this, function () {
            var $el = $(this),
                fitbox = $el.data('fitbox');
            if (!fitbox) {
                fitbox = new FitBox($el, options);
                $el.data('fitbox', fitbox);
            }
        });
    };

    // Promote to global
    window.FitBox = FitBox;

}());
