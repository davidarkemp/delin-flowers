
var functional = {
between : function (candidate, min, max){
        return min <= candidate && candidate <= max;
    },

first : function (array, fn) {
        var item;
        try {
            functional.each(array, function(i){
                item = i;
                if(!fn(i)) return;
                throw functional.breakToken;
            });
        } catch(e) {
            if(e !== functional.breakToken) throw e;
            return item;
        }
        return null;
    },

    breakToken: {},

    range : function () {
        var start, count;
        if(arguments.length == 1) {
            start = 0; count = arguments[0];
        } else if ( arguments.length == 2 ) {
            start = arguments[0]; count = arguments[2];
        } else {
            throw "expected 1 or 2 arguments"
        }
        var arr = [];
        for(var i = 0; i < count; ++count) {
            arr.push(i+start);
        }
        return arr;
    },

    min : function (array) {
        return functional.reduce(array, function(min,current) { return Math.min(min||current, current); });
    },


    max : function (array) {
        return functional.reduce(array, function(max, current) { return Math.max(max||current, current); });
    },

    each : function (array, fn) {
        for(var i = 0; i < array.length; ++i) {
            fn(array[i],i);
        }
    },

    map : function (array, fn) {
        var mapped = [];
        functional.each(array, function(i) { mapped.push(fn(i)); });
        return mapped;
    },

    reduce : function (array, fn ) {
        var accumulator = arguments[2];
        functional.each(array, function(item) {
            accumulator = fn(accumulator,item);
        });
        return accumulator;
    }
}

function LayoutItem(node) {
        this.$this = $(node).css("position", "absolute");
        this.width = this.$this.outerWidth(true);
        this.height = this.$this.outerHeight(true);
        this.moveTo(0,0);
    }

    //TODO: fix this for when items overlap LHS to RHS, but bottom is below bottom
    LayoutItem.prototype.intercepts = function(other) {
        return (functional.between(this.left, other.left, other.right) && functional.between(this.top, other.top, other.bottom))
                || (functional.between(other.left, this.left, this.right) && functional.between(other.top, this.top, this.bottom))
    };

    LayoutItem.prototype.moveTo = function(left, top) {
        this.top = top;
        this.bottom = this.top + this.height;
        this.left = left;
        this.right = this.left + this.width;

        this.$this.css({ "top": this.top + "px", "left": this.left + "px" });
    };

    LayoutItem.prototype.moveBy = function (offset) {
        var leftOffset = offset.left || 0;
        var topOffset = offset.top || 0;
        this.moveTo(this.left + leftOffset, this.top + topOffset )
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
                        $this.addClass("large");
                    }, function() {
                        $this.removeClass("large");
                        hideImage.apply($this);
                    });
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

        function layout(){
            var self = this;

            self.maxWidth = self.$container.width();


            var minItemWidth = _.min(_.map(this.items, function(item) { return item.width; }));
            var minItemHeight = _.min(_.map(this.items, function(item) { return item.height; }));

            var previous = [];
            for(var i = 0; i < self.items.length; ++i) {
                var currentItem = self.items[i];
                var currentX = 0, currentY = 0;
                currentItem.moveTo(currentX, currentY);
                var count = 0;
                var interceptor;
                while( (interceptor = _.first(previous, function(l){ return currentItem.intercepts(l); })) ) {
                    console.log(currentItem.$this[0].id," intercepts with ",interceptor.$this[0].id);

                    currentX += interceptor.width + 1;

                    if(currentX + currentItem.width >= self.maxWidth) {
                        currentX = 0;
                        currentY += minItemHeight + 1;
                    }
                    currentItem.moveTo(currentX, currentY);
                }
                if(count > previous.length) {
                    throw "WTF?!?";
                }
                console.log(currentItem.$this[0].id, " resting at ", currentItem.left,",",currentItem.top)
                previous.push(currentItem)
            }

            var rightmostPoint = _.max(_.map(self.items, function(i) { return i.right }));
            var leftOffset = Math.floor((this.maxWidth - rightmostPoint) / 2);
            if(leftOffset) _.each(self.items, function(i){ i.moveBy({left:leftOffset}); });
            var yPosition = _.max(_.map(self.items, function(i) { return i.bottom; }));

            this.$container.css("height", yPosition)
        }
    }

    function showImage() {

        var $this = $(this);

        var $img = $this.find("img");
        var size = [$this.width(),$this.height()];
        console.log("show",$this,size);
        $this.data("size", size);
        $this.data("thumbnail", $img.attr("src"));

        var image = new Image();
        $(image).load(function() {

            $img.css({ width: '100%', height: '100% '})
                    .attr("src", image.src);
            var captionHeight = $this.find('.caption')/*.css("display", "block")*/.height();
            $this.animate({ width: image.width, height: image.height + captionHeight },
            function() { /*$flowerHolder.isotope('reLayout');*/ });
        });

        image.src = $this.find("a")[0].href;


    }

    function hideImage() {
        
        var $this = $(this);

        var size = $this.data("size");
        console.log("hide",$this,size);
        $this.animate({ width: size[0], height: size[1] }, function() {
            $this.find("img").attr("src", $this.data("thumbnail"));
        });
//        $flowerHolder.isotope('reLayout');
        return true;
    }
});         