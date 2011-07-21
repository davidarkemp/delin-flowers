
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
    },

    identity : function(o) {
        return o;
    },

    debounce: function(f, wait) {

        var timeout;

        function debounced() {
            if (timeout) timeout = undefined;
            f.apply(this, arguments);
        }

        return function() {
            if(timeout) clearTimeout(timeout);
            return timeout = setTimeout(debounced, wait);
        }
    }
};

function Size(width, height) {
    this.width = width;
    this.height = height;
}

Size.prototype.isSmallerThan = function(other) {
    return other.width > this.width;
};

jQuery.fn.resizeTo = function(newWidth, newHeight, suspendLayout) {
//    console.log("resizeTo",newWidth,newHeight,suspendLayout);
    var oldSize = new Size(this.width(), this.height());
    var newSize = new Size(newWidth, newHeight);
    var parameters = { oldSize: oldSize, newSize: newSize };
    this.trigger("wantsResize", [parameters, suspendLayout]);
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
            setTimeout(function() {
                $this.trigger("imageLoaded", image);}, 1000);

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

    LayoutItem.prototype.shrink = function(e, newSize, suspendLayout) {

        this.width = this.extraWidth + newSize.width;
        this.height = this.extraHeight + newSize.height;
        this.moveTo(this.left, this.top);

        if(suspendLayout) return;

        this.manager.layout(true);
    }

    LayoutItem.prototype.grow = function (e, newSize, suspendLayout) {
        var newLeft = this.left;

        this.width = this.extraWidth + newSize.width;
        this.height = this.extraHeight + newSize.height;
        if(this.left + this.width > this.manager.maxWidth) {
            newLeft = this.right - (newSize.width + this.extraWidth);
        }

        this.moveTo(newLeft, this.top);

        if(suspendLayout) return;

        this.manager.layout(true);
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

        var $container = this.$this;
        function currentDimensions() {
            return new Size($container.outerWidth(true), $container.outerHeight(true));
        }

        var currentSize = currentDimensions();
        var self = this;
        var newDetails = {
            "top": this.top + "px",
            "left": this.left + "px",
            "width": (this.width - this.extraWidth) + "px",
            "height": (this.height - this.extraHeight) + "px" };

        if(animate)
            $container.animate(newDetails, raiseCommitted);
        else {
            $container.css(newDetails);
            raiseCommitted();
        }

        function raiseCommitted() {
            self.$this.trigger("resized", { newSize: currentDimensions(), oldSize: currentSize });
        }
    };

    LayoutItem.prototype.toString = function() {
        return this.nodeId + " @(" + this.left + "," + this.top + ") #(" + this.right + "," + this.bottom + ")";
    };

$(function() {

    var imageQueueLength = 0;
    var $flowerHolder = $("#flower-holder").css("position", "relative");
    $flowerHolder
        .delegate("div", "wantsResize", function(e,o,suspendLayout) {
//            console.log("Wants Resize",o,suspendLayout)
            var eventName =
                o.oldSize.isSmallerThan(o.newSize)
                    ? "wantsToGrow"
                    : "wantsToShrink";
            $(this).trigger(eventName, [o.newSize, suspendLayout]);
        })
        .delegate("div", "imageLoaded", function(e, image) {
            expandImage($(this), image);
        })
        .delegate("div", "resized", function(e,o) {
            var eventName;
            if (o.oldSize.isSmallerThan(o.newSize)) {
                eventName = "afterGrow";
            } else if (o.newSize.isSmallerThan(o.oldSize)) {
                eventName = "afterShrink";
            } else {
                eventName = null;
            }

//            console.log("resized",o.newSize,o.oldSize,eventName);
            if(!eventName) return;
                $(this).trigger(eventName);
        })
        .delegate("div", "afterGrow", function() { $(this).addClass("large"); })
        .delegate("div", "afterShrink", function() { $(this).removeClass("large")})
        .delegate("div:has(img)", "click", function(e) {
            e.preventDefault();
            var $this = $(this);
            if(!$this.hasClass("large")) {
                $flowerHolder.find(".item.large").each(function() {
                    hideImage.apply(this,[true])
                });
            }

            var action = $this.hasClass("large") ? hideImage : showImage;
            action.apply($this);
        });

    var imageCount = 0;
    var $items =
        $(".item", $flowerHolder)
            .each(function(i,e) {
                e.id = "item" + i;
            })
        .find("img")
        .each(function() {
                ++imageCount
                var $img = $(this);
                var handler = function() {
                    $img.unbind('load').unbind('error');
                    if(--imageCount == 0)
                        window.layoutEngine.layout();

                }
                
                $img.one("load", handler ).one("error", handler)
            });

    $("#filter-menu").delegate("a", "click", function() {
        var filter = $(this).data("filter");
        console.log("filter", filter);
        $flowerHolder.find(".item")
            .filter(filter).filter(":hidden").show().end().end()
            .filter(":not("+filter+")").filter(":visible").hide();
            
        window.layoutEngine.layout(true);
        return false;
    });

    return window.layoutEngine = new LayoutEngine($flowerHolder, $items);

    function LayoutEngine(container, items) {
        //noinspection UnnecessaryLocalVariableJS
        var _ = functional;
        var self = this;
        this.$container = $(container);
        this.items = _.map(items, function(item){
            return new LayoutItem(item,self);
        });

        this.reset = function() {
        
            this.maxWidth = this.$container.width();
            this.rightmostPoint = undefined;
            this.layout = layout;
            this.leftOffset = 0;
        };

        this.reset();

        var resizeHandler = _.debounce(function() {
            console.log("window resized");
            self.reset();
            self.layout(true);
        },500);

        $(window).bind("resize",resizeHandler);

        function layout(animate, fixedSize){

//            console.log("layout")
            fixedSize = fixedSize || [];

            var minItemWidth = _.min(_.map(this.items, function(item) { return item.width; }));
            var minItemHeight = _.min(_.map(this.items, function(item) { return item.height; }));

            var previous = _.map(fixedSize, _.identity);

            var toLayout = _.filter(self.items, function(item) { return item.$this.is(":visible") && fixedSize.indexOf(item) == -1; } );
            for(var i = 0; i < toLayout.length; ++i) {
                var currentItem = toLayout[i];
                var currentX = self.leftOffset;
                var currentY = self.leftOffset;
                currentItem.moveTo(currentX, currentY);
                var count = 0;
                var interceptor;
                var overlaps = function(l) {
                    return currentItem.intercepts(l);
                };
                while( (interceptor = _.first(previous, overlaps)) && (count < previous.length)) {



                    currentX = interceptor.right + 1;

                    if (currentX + currentItem.width >= self.maxWidth) {
                        currentX = self.leftOffset;
                        currentItem.moveTo(currentX, currentY);

                        if (interceptor = _.first(previous, overlaps)) {
                            currentY = Math.min(interceptor.bottom, currentItem.bottom) + 1;
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

            if(typeof self.rightmostPoint === "undefined") {
//                console.log("adjusting")
                self.rightmostPoint = _.max(_.map(toLayout, function(i) { return i.right }));
                self.leftOffset = Math.floor((self.maxWidth - self.rightmostPoint) / 2);
                if(self.leftOffset)
                    _.each(toLayout, function(i){ i.moveBy({left:self.leftOffset, top: self.leftOffset}); });
            }
            _.each(self.items, "commit", animate);
            var yPosition = _.max(_.map(previous, function(i) { return i.bottom; }));


            this.$container[animate?"animate":"css"]( { "height": yPosition + self.leftOffset*2 });
        }
    }


    function showImage(callback) {

        var $this = $(this);

        imageQueueLength += 1;

        return $this.addClass("loading").loadImage($this.find("a").get(0).href);
    }

    function expandImage($container, newImage) {
        $container.removeClass("loading");
        if(--imageQueueLength > 0) return;

        var $targetImage = $container.find("img");
        var size = [$container.width(),$container.height()];

        $container.data("size", size);
        $container.data("thumbnail", $targetImage.attr("src"));

        $targetImage//.css({ width: '100%', height: '100%' })
            .attr("src", newImage.src);

        var captionHeight = $container.find('.caption').css("width", newImage.width).height();

        $container.css("zIndex", 100);

        var position = $container.position();
        var newLeft = position.left, newTop = position.top;
        if (position.left + newImage.width > $flowerHolder.width()) newLeft = position.left - ($targetImage.width() - $container.width());
        $container.data("oldLeft", position.left);

        $targetImage.animate(new Size(newImage.width, newImage.height));

        $container.one("resized", function() {
            $targetImage.css(new Size(newImage.width, newImage.height));
        });

        $container.resizeTo(newImage.width, newImage.height + captionHeight);
    }

    function hideImage(suspendLayout) {
//        console.log("hideImage",suspendLayout);
        var $this = $(this);

        var size = $this.data("size");

        var newWidth = size[0];
        var newHeight = size[1];
        var $targetImage = $this.find("img");

        $this.one("resized", function() {
//            console.log("resized",$this.get(0).id)
            $targetImage.attr("src", $this.data("thumbnail"))
                .css(new Size(newWidth, newHeight));
        });

        $this.resizeTo(newWidth, newHeight, suspendLayout);

        return true;
    }
});         