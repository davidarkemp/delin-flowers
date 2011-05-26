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
            .end();

    return new LayoutEngine($flowerHolder, $items).layout();




    function LayoutEngine(container, items) {
        this.$container = $(container);
        this.items = map(items, function(item){
            return new LayoutItem(item);
        });
        this.layout = layout;


        function LayoutItem(node) {
            this.$this = $(node).css("position", "absolute");
            this.right = this.width = this.$this.outerWidth(true);
            this.bottom = this.height = this.$this.outerHeight(true);
            this.top = 0;
            this.left = 0;
        }

        LayoutItem.prototype.intercepts = function(other) {
            return (between(this.left, other.left, other.right) && between(this.top, other.top, other.bottom))
                    || (between(this.right, other.left, other.right) && between(this.bottom, other.top, other.bottom));
        };

        LayoutItem.prototype.moveTo = function(left,top) {
            this.top = top;
            this.bottom = this.top + this.height;
            this.left = left;
            this.right = this.left + this.width;

            console.log("move to ", this.left, ",", this.top)
            this.$this.css({ "top": this.top + "px", "left": this.left + "px" });
        }

        LayoutItem.prototype.moveBy = function (offset) {
            var leftOffset = offset.left || 0;
            var topOffset = offset.top || 0;
            this.moveTo(this.left + leftOffset, this.top + topOffset )
        }

        function layout(){
            var self = this;
            self.maxWidth = self.$container.width();


            var minItemWidth = min(map(this.items, function(item) { return item.width; }));
            var minItemHeight = min(map(this.items, function(item) { return item.height; }));

            var previous = [self.items[0]];
            for(var i = 1; i < self.items.length; ++i) {
                var currentItem = self.items[i];
                var currentX = 0, currentY = 0;
                currentItem.moveTo(currentX, currentY);
                var interceptor;

                while( interceptor = first(previous, function(l){ return currentItem.intercepts(l); }) ) {
                    currentX += interceptor.width;

                    if(currentX + currentItem.width > self.maxWidth) {

                        currentX = 0;
                        currentY += minItemHeight;
                    }
                    currentItem.moveTo(currentX, currentY);
                }
                previous.push(currentItem)
            }

            var rightmostPoint = max(map(self.items, function(i) { return i.right }));
            var leftOffset = Math.floor((this.maxWidth - rightmostPoint) / 2);
            each(self.items, function(i){ i.moveBy({left:leftOffset}); });
            var yPosition = max(map(self.items, function(i) { return i.bottom; }));

            this.$container.css("height", yPosition)
        }
    }

    function first(array, fn) {
        var item;
        try {
            each(array, function(i){
                item = i;
                if(!fn(i)) return;
                throw i;
            });
        } catch(e) {
            return item;
        }
        return null;
    }

    function between(candidate, min, max){
        return min <= candidate && candidate < max;
    }
    
    function range() {
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
    }

    function min(array) {
        return reduce(array, function(min,current) { return Math.min(min||current, current); });
    }


    function max(array) {
        return reduce(array, function(max, current) { return Math.max(max||current, current); });
    }

    function each(array, fn) {
        for(var i = 0; i < array.length; ++i) {
            fn(array[i],i);
        }
    }

    function map(array, fn) {
        var mapped = [];
        each(array, function(i) { mapped.push(fn(i)); });
        return mapped;
    }

    function reduce(array, fn, seed) {
        var accumulator = seed;
        each(array, function(item) {
            accumulator = fn(accumulator,item);
        });
        return accumulator;
    }

    function showImage() {

        var $this = $(this);

        var $img = $this.find("img");
        var size = [$this.width(),$this.height()];
        console.log("show",$this,size)
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
        $this.animate({ width: size[0], height: size[1] }, function() {;
            $this.find("img").attr("src", $this.data("thumbnail"));
        })
//        $flowerHolder.isotope('reLayout');
        return true;
    }
});         