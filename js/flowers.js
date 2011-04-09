$(function() {
    var $flowerHolder = $("#flower-holder");
    $flowerHolder
            .isotope({
                         animationEngine: 'jquery',
                         layoutMode: 'masonry',
                         masonry: { columnWidth: 20 },
                         cellsByRow : {
                             columnWidth : 200,
                             rowHeight : 200
                         }
                     })
            .children()
            .toggle(showImage, hideImage)
            .each(function() {
        var $this = $(this);
        $this.click(function() {
            $this.toggleClass("large");
        });
        new Image().src = $this.find('a').attr('href');
    });

    function showImage() {

        var $this = $(this);

        var $img = $this.find("img");
        $this.data("size", [$this.width(),$this.height()]);
        $this.data("thumbnail", $img.attr("src"));

        var image = new Image();
        $(image).load(function() {

            $img/*.css({ width: '100%', height: '100% '})*/
                    .attr("src", image.src);
            var captionHeight = $this.find('.caption').css("display", "block").height();
            $this.css({ width: image.width, height: image.height + captionHeight });
            $flowerHolder.isotope('reLayout');
        });

        image.src = $this.find("a")[0].href;


    }

    function hideImage() {
        var $this = $(this);
        var size = $this.data("size");
        $this.css({ width: size[0], height: size[1] });
        $this.find("img").attr("src", $this.data("thumbnail"));
        $flowerHolder.isotope('reLayout');
    }
});