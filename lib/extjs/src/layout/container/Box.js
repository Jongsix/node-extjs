/*

This file is part of Ext JS 4

Copyright (c) 2011 Sencha Inc

Contact:  http://www.sencha.com/contact

Commercial Usage
Licensees holding valid commercial licenses may use this file in accordance with the Commercial Software License Agreement provided with the Software or, alternatively, in accordance with the terms contained in a written agreement between you and Sencha.

If you are unsure which license is appropriate for your use, please contact the sales department at http://www.sencha.com/contact.

*/
/**
 * @class Ext.layout.container.Box
 * @extends Ext.layout.container.Container
 * <p>Base Class for HBoxLayout and VBoxLayout Classes. Generally it should not need to be used directly.</p>
 */

Ext.define('Ext.layout.container.Box', {

    /* Begin Definitions */

    alias: ['layout.box'],
    extend: 'Ext.layout.container.Container',
    alternateClassName: 'Ext.layout.BoxLayout',

    requires: [
        'Ext.layout.container.boxOverflow.None',
        'Ext.layout.container.boxOverflow.Menu',
        'Ext.layout.container.boxOverflow.Scroller',
        'Ext.util.Format',
        'Ext.dd.DragDropManager'
    ],

    /* End Definitions */

    /**
     * @cfg {Boolean/Number/Object} animate
     * <p>If truthy, child Component are <i>animated</i> into position whenever the Container
     * is layed out. If this option is numeric, it is used as the animation duration in milliseconds.</p>
     * <p>May be set as a property at any time.</p>
     */

    /**
     * @cfg {Object} defaultMargins
     * <p>If the individual contained items do not have a <tt>margins</tt>
     * property specified or margin specified via CSS, the default margins from this property will be
     * applied to each item.</p>
     * <br><p>This property may be specified as an object containing margins
     * to apply in the format:</p><pre><code>
{
    top: (top margin),
    right: (right margin),
    bottom: (bottom margin),
    left: (left margin)
}</code></pre>
     * <p>This property may also be specified as a string containing
     * space-separated, numeric margin values. The order of the sides associated
     * with each value matches the way CSS processes margin values:</p>
     * <div class="mdetail-params"><ul>
     * <li>If there is only one value, it applies to all sides.</li>
     * <li>If there are two values, the top and bottom borders are set to the
     * first value and the right and left are set to the second.</li>
     * <li>If there are three values, the top is set to the first value, the left
     * and right are set to the second, and the bottom is set to the third.</li>
     * <li>If there are four values, they apply to the top, right, bottom, and
     * left, respectively.</li>
     * </ul></div>
     */
    defaultMargins: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
    },

    /**
     * @cfg {String} padding
     * <p>Sets the padding to be applied to all child items managed by this layout.</p>
     * <p>This property must be specified as a string containing
     * space-separated, numeric padding values. The order of the sides associated
     * with each value matches the way CSS processes padding values:</p>
     * <div class="mdetail-params"><ul>
     * <li>If there is only one value, it applies to all sides.</li>
     * <li>If there are two values, the top and bottom borders are set to the
     * first value and the right and left are set to the second.</li>
     * <li>If there are three values, the top is set to the first value, the left
     * and right are set to the second, and the bottom is set to the third.</li>
     * <li>If there are four values, they apply to the top, right, bottom, and
     * left, respectively.</li>
     * </ul></div>
     */
    padding: '0',
    // documented in subclasses
    pack: 'start',

    /**
     * @cfg {String} pack
     * Controls how the child items of the container are packed together. Acceptable configuration values
     * for this property are:
     * <div class="mdetail-params"><ul>
     * <li><b><tt>start</tt></b> : <b>Default</b><div class="sub-desc">child items are packed together at
     * <b>left</b> side of container</div></li>
     * <li><b><tt>center</tt></b> : <div class="sub-desc">child items are packed together at
     * <b>mid-width</b> of container</div></li>
     * <li><b><tt>end</tt></b> : <div class="sub-desc">child items are packed together at <b>right</b>
     * side of container</div></li>
     * </ul></div>
     */
    /**
     * @cfg {Number} flex
     * This configuration option is to be applied to <b>child <tt>items</tt></b> of the container managed
     * by this layout. Each child item with a <tt>flex</tt> property will be flexed <b>horizontally</b>
     * according to each item's <b>relative</b> <tt>flex</tt> value compared to the sum of all items with
     * a <tt>flex</tt> value specified.  Any child items that have either a <tt>flex = 0</tt> or
     * <tt>flex = undefined</tt> will not be 'flexed' (the initial size will not be changed).
     */

    type: 'box',
    scrollOffset: 0,
    itemCls: Ext.baseCSSPrefix + 'box-item',
    targetCls: Ext.baseCSSPrefix + 'box-layout-ct',
    innerCls: Ext.baseCSSPrefix + 'box-inner',

    bindToOwnerCtContainer: true,

    // availableSpaceOffset is used to adjust the availableWidth, typically used
    // to reserve space for a scrollbar
    availableSpaceOffset: 0,

    // whether or not to reserve the availableSpaceOffset in layout calculations
    reserveOffset: true,

    /**
     * @cfg {Boolean} shrinkToFit
     * True (the default) to allow fixed size components to shrink (limited to their
     * minimum size) to avoid overflow. False to preserve fixed sizes even if they cause
     * overflow.
     */
    shrinkToFit: true,

    /**
     * @cfg {Boolean} clearInnerCtOnLayout
     */
    clearInnerCtOnLayout: false,

    flexSortFn: function (a, b) {
        var maxParallelPrefix = 'max' + this.parallelPrefixCap,
            infiniteValue = Infinity;
        a = a.component[maxParallelPrefix] || infiniteValue;
        b = b.component[maxParallelPrefix] || infiniteValue;
        // IE 6/7 Don't like Infinity - Infinity...
        if (!isFinite(a) && !isFinite(b)) {
            return false;
        }
        return a - b;
    },

    // Sort into *descending* order.
    minSizeSortFn: function(a, b) {
        return b.available - a.available;
    },

    constructor: function(config) {
        var me = this;

        me.callParent(arguments);

        // The sort function needs access to properties in this, so must be bound.
        me.flexSortFn = Ext.Function.bind(me.flexSortFn, me);

        me.initOverflowHandler();
    },

    /**
     * @private
     * Returns the current size and positioning of the passed child item.
     * @param {Ext.Component} child The child Component to calculate the box for
     * @return {Object} Object containing box measurements for the child. Properties are left,top,width,height.
     */
    getChildBox: function(child) {
        child = child.el || this.owner.getComponent(child).el;
        var size = child.getBox(false, true);
        return {
            left: size.left,
            top: size.top,
            width: size.width,
            height: size.height
        };
    },

    /**
     * @private
     * Calculates the size and positioning of the passed child item.
     * @param {Ext.Component} child The child Component to calculate the box for
     * @return {Object} Object containing box measurements for the child. Properties are left,top,width,height.
     */
    calculateChildBox: function(child) {
        var me = this,
            boxes = me.calculateChildBoxes(me.getVisibleItems(), me.getLayoutTargetSize()).boxes,
            ln = boxes.length,
            i = 0;

        child = me.owner.getComponent(child);
        for (; i < ln; i++) {
            if (boxes[i].component === child) {
                return boxes[i];
            }
        }
    },

    /**
     * @private
     * Calculates the size and positioning of each item in the box. This iterates over all of the rendered,
     * visible items and returns a height, width, top and left for each, as well as a reference to each. Also
     * returns meta data such as maxSize which are useful when resizing layout wrappers such as this.innerCt.
     * @param {Array} visibleItems The array of all rendered, visible items to be calculated for
     * @param {Object} targetSize Object containing target size and height
     * @return {Object} Object containing box measurements for each child, plus meta data
     */
    calculateChildBoxes: function(visibleItems, targetSize) {
        var me = this,
            math = Math,
            mmax = math.max,
            infiniteValue = Infinity,
            undefinedValue,

            parallelPrefix = me.parallelPrefix,
            parallelPrefixCap = me.parallelPrefixCap,
            perpendicularPrefix = me.perpendicularPrefix,
            perpendicularPrefixCap = me.perpendicularPrefixCap,
            parallelMinString = 'min' + parallelPrefixCap,
            perpendicularMinString = 'min' + perpendicularPrefixCap,
            perpendicularMaxString = 'max' + perpendicularPrefixCap,

            parallelSize = targetSize[parallelPrefix] - me.scrollOffset,
            perpendicularSize = targetSize[perpendicularPrefix],
            padding = me.padding,
            parallelOffset = padding[me.parallelBefore],
            paddingParallel = parallelOffset + padding[me.parallelAfter],
            perpendicularOffset = padding[me.perpendicularLeftTop],
            paddingPerpendicular =  perpendicularOffset + padding[me.perpendicularRightBottom],
            availPerpendicularSize = mmax(0, perpendicularSize - paddingPerpendicular),

            innerCtBorderWidth = me.innerCt.getBorderWidth(me.perpendicularLT + me.perpendicularRB),

            isStart = me.pack == 'start',
            isCenter = me.pack == 'center',
            isEnd = me.pack == 'end',

            constrain = Ext.Number.constrain,
            visibleCount = visibleItems.length,
            nonFlexSize = 0,
            totalFlex = 0,
            desiredSize = 0,
            minimumSize = 0,
            maxSize = 0,
            boxes = [],
            minSizes = [],
            calculatedWidth,

            i, child, childParallel, childPerpendicular, childMargins, childSize, minParallel, tmpObj, shortfall,
            tooNarrow, availableSpace, minSize, item, length, itemIndex, box, oldSize, newSize, reduction, diff,
            flexedBoxes, remainingSpace, remainingFlex, flexedSize, parallelMargins, calcs, offset,
            perpendicularMargins, stretchSize;

        //gather the total flex of all flexed items and the width taken up by fixed width items
        for (i = 0; i < visibleCount; i++) {
            child = visibleItems[i];
            childPerpendicular = child[perpendicularPrefix];
            if (!child.flex || !(me.align == 'stretch' || me.align == 'stretchmax')) {
                if (child.componentLayout.initialized !== true) {
                    me.layoutItem(child);
                }
            }

            childMargins = child.margins;
            parallelMargins = childMargins[me.parallelBefore] + childMargins[me.parallelAfter];

            // Create the box description object for this child item.
            tmpObj = {
                component: child,
                margins: childMargins
            };

            // flex and not 'auto' width
            if (child.flex) {
                totalFlex += child.flex;
                childParallel = undefinedValue;
            }
            // Not flexed or 'auto' width or undefined width
            else {
                if (!(child[parallelPrefix] && childPerpendicular)) {
                    childSize = child.getSize();
                }
                childParallel = child[parallelPrefix] || childSize[parallelPrefix];
                childPerpendicular = childPerpendicular || childSize[perpendicularPrefix];
            }

            nonFlexSize += parallelMargins + (childParallel || 0);
            desiredSize += parallelMargins + (child.flex ? child[parallelMinString] || 0 : childParallel);
            minimumSize += parallelMargins + (child[parallelMinString] || childParallel || 0);

            // Max height for align - force layout of non-laid out subcontainers without a numeric height
            if (typeof childPerpendicular != 'number') {
                // Clear any static sizing and revert to flow so we can get a proper measurement
                // child['set' + perpendicularPrefixCap](null);
                childPerpendicular = child['get' + perpendicularPrefixCap]();
            }

            // Track the maximum perpendicular size for use by the stretch and stretchmax align config values.
            // Ensure that the tracked maximum perpendicular size takes into account child min[Width|Height] settings!
            maxSize = mmax(maxSize, mmax(childPerpendicular, child[perpendicularMinString]||0) + childMargins[me.perpendicularLeftTop] + childMargins[me.perpendicularRightBottom]);

            tmpObj[parallelPrefix] = childParallel || undefinedValue;
            tmpObj.dirtySize = child.componentLayout.lastComponentSize ? (tmpObj[parallelPrefix] !== child.componentLayout.lastComponentSize[parallelPrefix]) : false;
            tmpObj[perpendicularPrefix] = childPerpendicular || undefinedValue;
            boxes.push(tmpObj);
        }

        // Only calculate parallel overflow indicators if we are not auto sizing
        if (!me.autoSize) {
            shortfall = desiredSize - parallelSize;
            tooNarrow = minimumSize > parallelSize;
        }

        //the space available to the flexed items
        availableSpace = mmax(0, parallelSize - nonFlexSize - paddingParallel - (me.reserveOffset ? me.availableSpaceOffset : 0));

        if (tooNarrow) {
            for (i = 0; i < visibleCount; i++) {
                box = boxes[i];
                minSize = visibleItems[i][parallelMinString] || visibleItems[i][parallelPrefix] || box[parallelPrefix];
                box.dirtySize = box.dirtySize || box[parallelPrefix] != minSize;
                box[parallelPrefix] = minSize;
            }
        }
        else {
            //all flexed items should be sized to their minimum size, other items should be shrunk down until
            //the shortfall has been accounted for
            if (shortfall > 0) {
                /*
                 * When we have a shortfall but are not tooNarrow, we need to shrink the width of each non-flexed item.
                 * Flexed items are immediately reduced to their minWidth and anything already at minWidth is ignored.
                 * The remaining items are collected into the minWidths array, which is later used to distribute the shortfall.
                 */
                for (i = 0; i < visibleCount; i++) {
                    item = visibleItems[i];
                    minSize = item[parallelMinString] || 0;

                    //shrink each non-flex tab by an equal amount to make them all fit. Flexed items are all
                    //shrunk to their minSize because they're flexible and should be the first to lose size
                    if (item.flex) {
                        box = boxes[i];
                        box.dirtySize = box.dirtySize || box[parallelPrefix] != minSize;
                        box[parallelPrefix] = minSize;
                    } else if (me.shrinkToFit) {
                        minSizes.push({
                            minSize: minSize,
                            available: boxes[i][parallelPrefix] - minSize,
                            index: i
                        });
                    }
                }

                //sort by descending amount of width remaining before minWidth is reached
                Ext.Array.sort(minSizes, me.minSizeSortFn);

                /*
                 * Distribute the shortfall (difference between total desired size of all items and actual size available)
                 * between the non-flexed items. We try to distribute the shortfall evenly, but apply it to items with the
                 * smallest difference between their size and minSize first, so that if reducing the size by the average
                 * amount would make that item less than its minSize, we carry the remainder over to the next item.
                 */
                for (i = 0, length = minSizes.length; i < length; i++) {
                    itemIndex = minSizes[i].index;

                    if (itemIndex == undefinedValue) {
                        continue;
                    }
                    item = visibleItems[itemIndex];
                    minSize = minSizes[i].minSize;

                    box = boxes[itemIndex];
                    oldSize = box[parallelPrefix];
                    newSize = mmax(minSize, oldSize - math.ceil(shortfall / (length - i)));
                    reduction = oldSize - newSize;

                    box.dirtySize = box.dirtySize || box[parallelPrefix] != newSize;
                    box[parallelPrefix] = newSize;
                    shortfall -= reduction;
                }
                tooNarrow = (shortfall > 0);
            }
            else {
                remainingSpace = availableSpace;
                remainingFlex = totalFlex;
                flexedBoxes = [];

                // Create an array containing *just the flexed boxes* for allocation of remainingSpace
                for (i = 0; i < visibleCount; i++) {
                    child = visibleItems[i];
                    if (isStart && child.flex) {
                        flexedBoxes.push(boxes[Ext.Array.indexOf(visibleItems, child)]);
                    }
                }
                // The flexed boxes need to be sorted in ascending order of maxSize to work properly
                // so that unallocated space caused by maxWidth being less than flexed width
                // can be reallocated to subsequent flexed boxes.
                Ext.Array.sort(flexedBoxes, me.flexSortFn);

                // Calculate the size of each flexed item, and attempt to set it.
                for (i = 0; i < flexedBoxes.length; i++) {
                    calcs = flexedBoxes[i];
                    child = calcs.component;
                    childMargins = calcs.margins;

                    flexedSize = math.ceil((child.flex / remainingFlex) * remainingSpace);

                    // Implement maxSize and minSize check
                    flexedSize = Math.max(child['min' + parallelPrefixCap] || 0, math.min(child['max' + parallelPrefixCap] || infiniteValue, flexedSize));

                    // Remaining space has already had all parallel margins subtracted from it, so just subtract consumed size
                    remainingSpace -= flexedSize;
                    remainingFlex -= child.flex;

                    calcs.dirtySize = calcs.dirtySize || calcs[parallelPrefix] != flexedSize;
                    calcs[parallelPrefix] = flexedSize;
                }
            }
        }

        if (isCenter) {
            parallelOffset += availableSpace / 2;
        }
        else if (isEnd) {
            parallelOffset += availableSpace;
        }

        // Fix for left and right docked Components in a dock component layout. This is for docked Headers and docked Toolbars.
        // Older Microsoft browsers do not size a position:absolute element's width to match its content.
        // So in this case, in the updateInnerCtSize method we may need to adjust the size of the owning Container's element explicitly based upon
        // the discovered max width. So here we put a calculatedWidth property in the metadata to facilitate this.
        if (me.owner.dock && (Ext.isIE6 || Ext.isIE7 || Ext.isIEQuirks) && !me.owner.width && me.direction == 'vertical') {

            calculatedWidth = maxSize + me.owner.el.getPadding('lr') + me.owner.el.getBorderWidth('lr');
            if (me.owner.frameSize) {
                calculatedWidth += me.owner.frameSize.left + me.owner.frameSize.right;
            }
            // If the owning element is not sized, calculate the available width to center or stretch in based upon maxSize
            availPerpendicularSize = Math.min(availPerpendicularSize, targetSize.width = maxSize + padding.left + padding.right);
        }

        //finally, calculate the left and top position of each item
        for (i = 0; i < visibleCount; i++) {
            child = visibleItems[i];
            calcs = boxes[i];

            childMargins = calcs.margins;

            perpendicularMargins = childMargins[me.perpendicularLeftTop] + childMargins[me.perpendicularRightBottom];

            // Advance past the "before" margin
            parallelOffset += childMargins[me.parallelBefore];

            calcs[me.parallelBefore] = parallelOffset;
            calcs[me.perpendicularLeftTop] = perpendicularOffset + childMargins[me.perpendicularLeftTop];

            if (me.align == 'stretch') {
                stretchSize = constrain(availPerpendicularSize - perpendicularMargins, child[perpendicularMinString] || 0, child[perpendicularMaxString] || infiniteValue);
                calcs.dirtySize = calcs.dirtySize || calcs[perpendicularPrefix] != stretchSize;
                calcs[perpendicularPrefix] = stretchSize;
            }
            else if (me.align == 'stretchmax') {
                stretchSize = constrain(maxSize - perpendicularMargins, child[perpendicularMinString] || 0, child[perpendicularMaxString] || infiniteValue);
                calcs.dirtySize = calcs.dirtySize || calcs[perpendicularPrefix] != stretchSize;
                calcs[perpendicularPrefix] = stretchSize;
            }
            else if (me.align == me.alignCenteringString) {
                // When calculating a centered position within the content box of the innerCt, the width of the borders must be subtracted from
                // the size to yield the space available to center within.
                // The updateInnerCtSize method explicitly adds the border widths to the set size of the innerCt.
                diff = mmax(availPerpendicularSize, maxSize) - innerCtBorderWidth - calcs[perpendicularPrefix];
                if (diff > 0) {
                    calcs[me.perpendicularLeftTop] = perpendicularOffset + Math.round(diff / 2);
                }
            }

            // Advance past the box size and the "after" margin
            parallelOffset += (calcs[parallelPrefix] || 0) + childMargins[me.parallelAfter];
        }

        return {
            boxes: boxes,
            meta : {
                calculatedWidth: calculatedWidth,
                maxSize: maxSize,
                nonFlexSize: nonFlexSize,
                desiredSize: desiredSize,
                minimumSize: minimumSize,
                shortfall: shortfall,
                tooNarrow: tooNarrow
            }
        };
    },

    onRemove: function(comp){
        this.callParent(arguments);
        if (this.overflowHandler) {
            this.overflowHandler.onRemove(comp);
        }
    },

    /**
     * @private
     */
    initOverflowHandler: function() {
        var handler = this.overflowHandler;

        if (typeof handler == 'string') {
            handler = {
                type: handler
            };
        }

        var handlerType = 'None';
        if (handler && handler.type !== undefined) {
            handlerType = handler.type;
        }

        var constructor = Ext.layout.container.boxOverflow[handlerType];
        if (constructor[this.type]) {
            constructor = constructor[this.type];
        }

        this.overflowHandler = Ext.create('Ext.layout.container.boxOverflow.' + handlerType, this, handler);
    },

    /**
     * @private
     * Runs the child box calculations and caches them in childBoxCache. Subclasses can used these cached values
     * when laying out
     */
    onLayout: function() {
        this.callParent();
        // Clear the innerCt size so it doesn't influence the child items.
        if (this.clearInnerCtOnLayout === true && this.adjustmentPass !== true) {
            this.innerCt.setSize(null, null);
        }

        var me = this,
            targetSize = me.getLayoutTargetSize(),
            items = me.getVisibleItems(),
            calcs = me.calculateChildBoxes(items, targetSize),
            boxes = calcs.boxes,
            meta = calcs.meta,
            handler, method, results;

        if (me.autoSize && calcs.meta.desiredSize) {
            targetSize[me.parallelPrefix] = calcs.meta.desiredSize;
        }

        //invoke the overflow handler, if one is configured
        if (meta.shortfall > 0) {
            handler = me.overflowHandler;
            method = meta.tooNarrow ? 'handleOverflow': 'clearOverflow';

            results = handler[method](calcs, targetSize);

            if (results) {
                if (results.targetSize) {
                    targetSize = results.targetSize;
                }

                if (results.recalculate) {
                    items = me.getVisibleItems();
                    calcs = me.calculateChildBoxes(items, targetSize);
                    boxes = calcs.boxes;
                }
            }
        } else {
            me.overflowHandler.clearOverflow();
        }

        /**
         * @private
         * @property layoutTargetLastSize
         * @type Object
         * Private cache of the last measured size of the layout target. This should never be used except by
         * BoxLayout subclasses during their onLayout run.
         */
        me.layoutTargetLastSize = targetSize;

        /**
         * @private
         * @property childBoxCache
         * @type Array
         * Array of the last calculated height, width, top and left positions of each visible rendered component
         * within the Box layout.
         */
        me.childBoxCache = calcs;

        me.updateInnerCtSize(targetSize, calcs);
        me.updateChildBoxes(boxes);
        me.handleTargetOverflow(targetSize);
    },
    
    animCallback: Ext.emptyFn,

    /**
     * Resizes and repositions each child component
     * @param {Object[]} boxes The box measurements
     */
    updateChildBoxes: function(boxes) {
        var me = this,
            i = 0,
            length = boxes.length,
            animQueue = [],
            dd = Ext.dd.DDM.getDDById(me.innerCt.id), // Any DD active on this layout's element (The BoxReorderer plugin does this.)
            oldBox, newBox, changed, comp, boxAnim, animCallback;

        for (; i < length; i++) {
            newBox = boxes[i];
            comp = newBox.component;

            // If a Component is being drag/dropped, skip positioning it.
            // Accomodate the BoxReorderer plugin: Its current dragEl must not be positioned by the layout
            if (dd && (dd.getDragEl() === comp.el.dom)) {
                continue;
            }

            changed = false;

            oldBox = me.getChildBox(comp);

            // If we are animating, we build up an array of Anim config objects, one for each
            // child Component which has any changed box properties. Those with unchanged
            // properties are not animated.
            if (me.animate) {
                // Animate may be a config object containing callback.
                animCallback = me.animate.callback || me.animate;
                boxAnim = {
                    layoutAnimation: true,  // Component Target handler must use set*Calculated*Size
                    target: comp,
                    from: {},
                    to: {},
                    listeners: {}
                };
                // Only set from and to properties when there's a change.
                // Perform as few Component setter methods as possible.
                // Temporarily set the property values that we are not animating
                // so that doComponentLayout does not auto-size them.
                if (!isNaN(newBox.width) && (newBox.width != oldBox.width)) {
                    changed = true;
                    // boxAnim.from.width = oldBox.width;
                    boxAnim.to.width = newBox.width;
                }
                if (!isNaN(newBox.height) && (newBox.height != oldBox.height)) {
                    changed = true;
                    // boxAnim.from.height = oldBox.height;
                    boxAnim.to.height = newBox.height;
                }
                if (!isNaN(newBox.left) && (newBox.left != oldBox.left)) {
                    changed = true;
                    // boxAnim.from.left = oldBox.left;
                    boxAnim.to.left = newBox.left;
                }
                if (!isNaN(newBox.top) && (newBox.top != oldBox.top)) {
                    changed = true;
                    // boxAnim.from.top = oldBox.top;
                    boxAnim.to.top = newBox.top;
                }
                if (changed) {
                    animQueue.push(boxAnim);
                }
            } else {
                if (newBox.dirtySize) {
                    if (newBox.width !== oldBox.width || newBox.height !== oldBox.height) {
                        me.setItemSize(comp, newBox.width, newBox.height);
                    }
                }
                // Don't set positions to NaN
                if (isNaN(newBox.left) || isNaN(newBox.top)) {
                    continue;
                }
                comp.setPosition(newBox.left, newBox.top);
            }
        }

        // Kick off any queued animations
        length = animQueue.length;
        if (length) {

            // A function which cleans up when a Component's animation is done.
            // The last one to finish calls the callback.
            var afterAnimate = function(anim) {
                // When we've animated all changed boxes into position, clear our busy flag and call the callback.
                length -= 1;
                if (!length) {
                    me.animCallback(anim);
                    me.layoutBusy = false;
                    if (Ext.isFunction(animCallback)) {
                        animCallback();
                    }
                }
            };

            var beforeAnimate = function() {
                me.layoutBusy = true;
            };

            // Start each box animation off
            for (i = 0, length = animQueue.length; i < length; i++) {
                boxAnim = animQueue[i];

                // Clean up the Component after. Clean up the *layout* after the last animation finishes
                boxAnim.listeners.afteranimate = afterAnimate;

                // The layout is busy during animation, and may not be called, so set the flag when the first animation begins
                if (!i) {
                    boxAnim.listeners.beforeanimate = beforeAnimate;
                }
                if (me.animate.duration) {
                    boxAnim.duration = me.animate.duration;
                }
                comp = boxAnim.target;
                delete boxAnim.target;
                // Stop any currently running animation
                comp.stopAnimation();
                comp.animate(boxAnim);
            }
        }
    },

    /**
     * @private
     * Called by onRender just before the child components are sized and positioned. This resizes the innerCt
     * to make sure all child items fit within it. We call this before sizing the children because if our child
     * items are larger than the previous innerCt size the browser will insert scrollbars and then remove them
     * again immediately afterwards, giving a performance hit.
     * Subclasses should provide an implementation.
     * @param {Object} currentSize The current height and width of the innerCt
     * @param {Object} calculations The new box calculations of all items to be laid out
     */
    updateInnerCtSize: function(tSize, calcs) {
        var me = this,
            mmax = Math.max,
            align = me.align,
            padding = me.padding,
            width = tSize.width,
            height = tSize.height,
            meta = calcs.meta,
            innerCtWidth,
            innerCtHeight;

        if (me.direction == 'horizontal') {
            innerCtWidth = width;
            innerCtHeight = meta.maxSize + padding.top + padding.bottom + me.innerCt.getBorderWidth('tb');

            if (align == 'stretch') {
                innerCtHeight = height;
            }
            else if (align == 'middle') {
                innerCtHeight = mmax(height, innerCtHeight);
            }
        } else {
            innerCtHeight = height;
            innerCtWidth = meta.maxSize + padding.left + padding.right + me.innerCt.getBorderWidth('lr');

            if (align == 'stretch') {
                innerCtWidth = width;
            }
            else if (align == 'center') {
                innerCtWidth = mmax(width, innerCtWidth);
            }
        }
        me.getRenderTarget().setSize(innerCtWidth || undefined, innerCtHeight || undefined);

        // If a calculated width has been found (and this only happens for auto-width vertical docked Components in old Microsoft browsers)
        // then, if the Component has not assumed the size of its content, set it to do so.
        if (meta.calculatedWidth && me.owner.el.getWidth() > meta.calculatedWidth) {
            me.owner.el.setWidth(meta.calculatedWidth);
        }

        if (me.innerCt.dom.scrollTop) {
            me.innerCt.dom.scrollTop = 0;
        }
    },

    /**
     * @private
     * This should be called after onLayout of any BoxLayout subclass. If the target's overflow is not set to 'hidden',
     * we need to lay out a second time because the scrollbars may have modified the height and width of the layout
     * target. Having a Box layout inside such a target is therefore not recommended.
     * @param {Object} previousTargetSize The size and height of the layout target before we just laid out
     * @param {Ext.container.Container} container The container
     * @param {Ext.Element} target The target element
     * @return True if the layout overflowed, and was reflowed in a secondary onLayout call.
     */
    handleTargetOverflow: function(previousTargetSize) {
        var target = this.getTarget(),
            overflow = target.getStyle('overflow'),
            newTargetSize;

        if (overflow && overflow != 'hidden' && !this.adjustmentPass) {
            newTargetSize = this.getLayoutTargetSize();
            if (newTargetSize.width != previousTargetSize.width || newTargetSize.height != previousTargetSize.height) {
                this.adjustmentPass = true;
                this.onLayout();
                return true;
            }
        }

        delete this.adjustmentPass;
    },

    // private
    isValidParent : function(item, target, position) {
        // Note: Box layouts do not care about order within the innerCt element because it's an absolutely positioning layout
        // We only care whether the item is a direct child of the innerCt element.
        var itemEl = item.el ? item.el.dom : Ext.getDom(item);
        return (itemEl && this.innerCt && itemEl.parentNode === this.innerCt.dom) || false;
    },

    // Overridden method from AbstractContainer.
    // Used in the base AbstractLayout.beforeLayout method to render all items into.
    getRenderTarget: function() {
        if (!this.innerCt) {
            // the innerCt prevents wrapping and shuffling while the container is resizing
            this.innerCt = this.getTarget().createChild({
                cls: this.innerCls,
                role: 'presentation'
            });
            this.padding = Ext.util.Format.parseBox(this.padding);
        }
        return this.innerCt;
    },

    // private
    renderItem: function(item, target) {
        this.callParent(arguments);
        var me = this,
            itemEl = item.getEl(),
            style = itemEl.dom.style,
            margins = item.margins || item.margin;

        // Parse the item's margin/margins specification
        if (margins) {
            if (Ext.isString(margins) || Ext.isNumber(margins)) {
                margins = Ext.util.Format.parseBox(margins);
            } else {
                Ext.applyIf(margins, {top: 0, right: 0, bottom: 0, left: 0});
            }
        } else {
            margins = Ext.apply({}, me.defaultMargins);
        }

        // Add any before/after CSS margins to the configured margins, and zero the CSS margins
        margins.top    += itemEl.getMargin('t');
        margins.right  += itemEl.getMargin('r');
        margins.bottom += itemEl.getMargin('b');
        margins.left   += itemEl.getMargin('l');
        margins.height  = margins.top  + margins.bottom;
        margins.width   = margins.left + margins.right;
        style.marginTop = style.marginRight = style.marginBottom = style.marginLeft = '0';

        // Item must reference calculated margins.
        item.margins = margins;
    },

    /**
     * @private
     */
    destroy: function() {
        Ext.destroy(this.innerCt, this.overflowHandler);
        this.callParent(arguments);
    }
});
