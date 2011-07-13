
var functional = {
    between : function (candidate, min, max) {
        return min <= candidate && candidate <= max;
    },

    first : function (array, fn) {
        var item;
        try {
            functional.each(array, function(i) {
                item = i;
                if (!fn(i)) return;
                throw functional.breakToken;
            });
        } catch(e) {
            if (e !== functional.breakToken) throw e;
            return item;
        }
        return null;
    },

    breakToken: {},

    min : function (array) {
        return functional.reduce(array, function(min, current) {
            return Math.min(min || current, current);
        });
    },


    max : function (array) {
        return functional.reduce(array, function(max, current) {
            return Math.max(max || current, current);
        });
    },

    each : function (array, fn) {
        if(typeof fn == "string") {
            var method = fn;
            var args = functional.reduce(arguments,function(a,arg) { a.push(arg); return a; }, []);
            args.splice(2);
            fn = function(i) { i[method].apply(i,args); }
        }
        for (var i = 0; i < array.length; ++i) {
            fn(array[i], i);
        }
    },

    map : function (array, fn) {
        var mapped = [];
        functional.each(array, function(i) {
            mapped.push(fn(i));
        });
        return mapped;
    },

    reduce : function (array, fn) {
        var accumulator = arguments[2];
        functional.each(array, function(item) {
            accumulator = fn(accumulator, item);
        });
        return accumulator;
    },

    filter : function(array, fn) {
        var matched = [];
        functional.each(array, function(item) {
            if(fn(item))
                matched.push(item);
        });
        return matched;
    }
};

function Size(width, height) {
    this.width = width;
    this.height = height;
}

Size.prototype.isSmallerThan = function(other) {
    return other.width > this.width;
};

jQuery.fn.resizeTo = function(newWidth, newHeight) {
    var oldSize = new Size(this.width(), this.height());
    var newSize = new Size(newWidth, newHeight);
    var parameters = { oldSize: oldSize, newSize: newSize };
    this.trigger("wantsResize", parameters);
    /*return this.animate( { width: newWidth, height: newHeight }, function() {
      $(this).trigger("afterResize", parameters);
    });*/
};

jQuery.fn.loadImage = function(url) {
    this.each(function() {
        var $this = $(this);
        $this.trigger("beforeLoadImage");
        var image = new Image();
        $(image).load(function() {
            $this.trigger("imageLoaded",image);
        });
        return image.src = url;
    });
};

function LayoutItem(node,manager) {
        this.$this =
            $(node)
                .css({"position": "absolute" })
                .bind("wantsToGrow", $.proxy(this.grow, this))
                .bind("wantsToShrink", $.proxy(this.shrink, this));
        this.$this.data("layoutItem", this);
        this.manager = manager;
        this.nodeId = node.id;
        this.node = node;
        this.measure();
        this.moveTo(0,0);
    }

    LayoutItem.prototype.shrink = function(e, newSize) {
        console.log("shrink",this.nodeId,newSize)
        this.width = this.extraWidth + newSize.width;
        this.height = this.extraHeight + newSize.height;
        this.moveTo(this.left, this.top);

        this.manager.layout(true);

        this.$this.trigger("afterShrink");
    }

    LayoutItem.prototype.grow = function (e, newSize) {
        var newLeft = this.left;

        this.width = this.extraWidth + newSize.width;
        this.height = this.extraHeight + newSize.height;
        if(this.left + this.width > this.manager.maxWidth) {
            newLeft = this.right - (newSize.width + this.extraWidth);
        }

        this.moveTo(newLeft, this.top);

        this.manager.layout(true,[this]);

        this.$this.trigger("afterGrow");
    }

    LayoutItem.prototype.measure = function () {
        this.width = this.$this.outerWidth(true);
        this.extraWidth = this.width - this.$this.width();
        this.height = this.$this.outerHeight(true);
        this.extraHeight = this.height - this.$this.height();
    };

    LayoutItem.prototype.contains = function(x,y) {
        return functional.between(x, this.left, this.right)
                && functional.between(y, this.top, this.bottom);
    };
    
    LayoutItem.intercepts = function(one,other) {
        return one.contains(other.left, other.top)
                || one.contains(other.right, other.top)
                || one.contains(other.left, other.bottom)
                || one.contains(other.right, other.bottom);
    };

    LayoutItem.prototype.intercepts = function(other) {
        return LayoutItem.intercepts(this,other) || LayoutItem.intercepts(other,this);
    };

    LayoutItem.prototype.moveTo = function(left, top) {
        this.top = top;
        this.bottom = this.top + this.height - 1;
        this.left = left;
        this.right = this.left + this.width - 1;
    };

    LayoutItem.prototype.moveBy = function (offset) {
        var leftOffset = offset.left || 0;
        var topOffset = offset.top || 0;
        this.moveTo(this.left + leftOffset, this.top + topOffset )
    };

    LayoutItem.prototype.commit = function(animate) {
        var newDetails = {
            "top": this.top + "px",
            "left": this.left + "px",
            "width": (this.width - this.extraWidth) + "px",
            "height": (this.height - this.extraHeight) + "px" };
        console.log("resize",this.nodeId,newDetails);
        this.$this[animate?"animate":"css"](newDetails);
    };

    LayoutItem.prototype.toString = function() {
        return this.nodeId + " @(" + this.left + "," + this.top + ") #(" + this.right + "," + this.bottom + ")";
    };

$(function() {

    var imageQueueLength = 0;
    var $flowerHolder = $("#flower-holder").css("position", "relative");
    $flowerHolder
        .delegate("div", "wantsResize", function(e,o) {
            var eventName =
                o.oldSize.isSmallerThan(o.newSize)
                    ? "wantsToGrow"
                    : "wantsToShrink";
            $(this).trigger(eventName, o.newSize);
        })
        .delegate("div", "imageLoaded", function(e, image) {
            expandImage($(this), image);
        })
        .delegate("div", "afterGrow", function() { $(this).addClass("large"); })
        .delegate("div", "afterShrink", function() { $(this).removeClass("large")})
        .delegate("div:has(img)", "click", function(e) {
            e.preventDefault();
            var $this = $(this);
            var action = $this.hasClass("large") ? hideImage : showImage;
            action.apply($this);
        });

    var $items =
        $(".item", $flowerHolder)
            .each(function(i,e) {
                e.id = "item" + i;
            });

    window.layoutEngine = new LayoutEngine($flowerHolder, $items);
    return window.layoutEngine.layout();

    function LayoutEngine(container, items) {
        //noinspection UnnecessaryLocalVariableJS
        var _ = functional;
        var self = this;
        this.$container = $(container);
        this.items = _.map(items, function(item){
            return new LayoutItem(item,self);
        });
        this.maxWidth = this.$container.width();

        this.layout = layout;

        function layout(animate, fixedSize){

            fixedSize = fixedSize || [];

            var minItemWidth = _.min(_.map(this.items, function(item) { return item.width; }));
            var minItemHeight = _.min(_.map(this.items, function(item) { return item.height; }));

            var previous = _.map(fixedSize, function(e) { return e; });

            var toLayout = _.filter(self.items, function(item) { return fixedSize.indexOf(item) == -1; } );
            for(var i = 0; i < toLayout.length; ++i) {
                var currentItem = toLayout[i];
                var currentX = 0, currentY = 0;
                currentItem.moveTo(currentX, currentY);
                var count = 0;
                var interceptor;
                while( (interceptor = _.first(previous, function(l){ return currentItem.intercepts(l) }))
                        && (count < previous.length) ) {
                    
                    currentX = interceptor.right+1;

                    if(currentX + currentItem.width >= self.maxWidth) {
                        currentX = 0;
                        currentItem.moveTo(currentX, currentY);

                        if(interceptor = _.first(previous, function(l) { return l.intercepts(currentItem)})) {
                            currentY = Math.min(interceptor.bottom, currentItem.bottom )+ 1;
                            currentItem.moveTo(currentX, currentY);
                        }
                        count = 0;
                    } else {
                        count++;
                    }
                    currentItem.moveTo(currentX, currentY);

                }
                if(count > previous.length) {
                    throw "WTF?!?";
                }
                
                previous.push(currentItem)
            }

            var rightmostPoint = _.max(_.map(toLayout, function(i) { return i.right }));
            var leftOffset = Math.floor((self.maxWidth - rightmostPoint) / 2);
            if(leftOffset) _.each(toLayout, function(i){ i.moveBy({left:leftOffset, top: leftOffset}); });
            _.each(self.items, "commit", animate);
            var yPosition = _.max(_.map(toLayout, function(i) { return i.bottom; }));


            this.$container.css("height", yPosition + leftOffset);
        }
    }


    function showImage(callback) {

        var $this = $(this);

        imageQueueLength += 1;

        return $this.loadImage($this.find("a").get(0).href);
    }

    function expandImage($container, newImage) {
        if(--imageQueueLength > 0) return;

        var $targetImage = $container.find("img");
        var size = [$container.width(),$container.height()];

        $container.data("size", size);
        $container.data("thumbnail", $targetImage.attr("src"));

        $targetImage.css({ width: '100%', height: '100%' })
            .attr("src", newImage.src);

        var captionHeight = $container.find('.caption').css("width", newImage.width).height();

        $container.css("zIndex", 100);

        var position = $container.position();
        var newLeft = position.left, newTop = position.top;
        if (position.left + newImage.width > $flowerHolder.width()) newLeft = position.left - ($targetImage.width() - $container.width());
        $container.data("oldLeft", position.left);

        $container.resizeTo(newImage.width, newImage.height + captionHeight);
    }

    function hideImage(callback) {
        
        var $this = $(this);

        var size = $this.data("size");


        var newWidth = size[0];
        var newHeight = size[1];
        var newLeft = $this.data("oldLeft");

        $this.resizeTo(newWidth, newHeight);

        return true;
    }
});         