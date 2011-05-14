$(function() {



    var $flowerHolder = $("#flower-holder");
    //$flowerHolder
    $(".item:has(img)", $flowerHolder)
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
            });

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