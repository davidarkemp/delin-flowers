
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
        };
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
    }
};



function LayoutItem(node) {
        this.$this = $(node).css({"position": "absolute" });
        this.$this.data("layoutItem", this);
        this.nodeId = node.id;
        this.measure();
        this.moveTo(0,0);
    }

    LayoutItem.prototype.measure = function () {
        this.width = this.$this.outerWidth(true);
        this.height = this.$this.outerHeight(true);
    }

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
;

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

    LayoutItem.prototype.doMove = function(animate) {
        this.$this[animate?"animate":"css"]({ "top": this.top + "px", "left": this.left + "px" });
    }

    LayoutItem.prototype.toString = function() {
        return this.nodeId + " @(" + this.left + "," + this.top + ") #(" + this.right + "," + this.bottom + ")";
    };

$(function() {

    var $flowerHolder = $("#flower-holder").css("position", "relative");
    //$flowerHolder
    var $items =
    $(".item", $flowerHolder)
            .filter(":has(img)")
            .each(function() {
                var $this = $(this);
                $this
                    .toggle(function() {
                        showImage.apply($this);
                    }, function() {
                        hideImage.apply($this, [ function() { $this.removeClass("large"); } ]);
                    });
                $this.bind("afterExpand", function() { $this.addClass("large"); } );
                new Image().src = $this.find('a').attr('href');
            })

            .end()
            .each(function(i,e) {
                e.id = "item" + i;
            });

    window.layoutEngine = new LayoutEngine($flowerHolder, $items);
    return window.layoutEngine.layout();

    function LayoutEngine(container, items) {
        var _ = functional;
        this.$container = $(container);
        this.items = _.map(items, function(item){
            return new LayoutItem(item);
        });
        this.layout = layout;

        function layout(animate){
            var self = this;

            self.maxWidth = self.$container.width();

            _.each(this.items, "measure");

            var minItemWidth = _.min(_.map(this.items, function(item) { return item.width; }));
            var minItemHeight = _.min(_.map(this.items, function(item) { return item.height; }));

            var previous = [];
            for(var i = 0; i < self.items.length; ++i) {
                var currentItem = self.items[i];
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

            var rightmostPoint = _.max(_.map(self.items, function(i) { return i.right }));
            var leftOffset = Math.floor((this.maxWidth - rightmostPoint) / 2);
            if(leftOffset) _.each(self.items, function(i){ i.moveBy({left:leftOffset, top: leftOffset}); });
            _.each(self.items, "doMove", animate);
            var yPosition = _.max(_.map(self.items, function(i) { return i.bottom; }));

            this.$container.css("height", yPosition + leftOffset);
        }
    }

    function showImage(callback) {

        var $this = $(this);

        var $img = $this.find("img");
        var size = [$this.width(),$this.height()];
        console.log("show",$this,size);
        $this.data("size", size);
        $this.data("thumbnail", $img.attr("src"));

        var image = new Image();
        $(image).load(function() { expandImage($this,$img,image) });
        image.src = $this.find("a")[0].href;
    }

    function expandImage($container, $img, newImage) {
        $img.css({ width: '100%', height: '100%' })
            .attr("src", newImage.src);

        var captionHeight = $container.find('.caption').css("width", newImage.width).height();

        $container.css("zIndex", 100);

        var position = $container.position();
        var newLeft = position.left, newTop = position.top;
        if (position.left + newImage.width > $flowerHolder.width()) newLeft = position.left - ($img.width() - $container.width());
        $container.data("oldLeft", position.left);

        var e = jQuery.Event("before", { newLeft: newLeft, newTop: newTop });
        $container.trigger(e);
        if(e.cancel) return;
        $container.animate({ width: newImage.width, height: newImage.height + captionHeight, left: newLeft },
            function() {
                $container.trigger("afterExpand");
                $img.css({ width: "auto", height: "auto" });
                window.layoutEngine.layout(true);
            });
    }

    function hideImage(callback) {
        
        var $this = $(this);

        var size = $this.data("size");

        $this.animate({ width: size[0], height: size[1], left: $this.data("oldLeft") }, function() {
            $this.find("img").attr("src", $this.data("thumbnail"));
            $this.css("zIndex", 0);
            if(callback) callback();
            window.layoutEngine.layout();
        });
        return true;
    }
});         