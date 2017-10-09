$(document).ready(function(){
	$('.info').on('mouseenter', function(e){
		$(e.target).children('h1').css({"opacity": "1"});
		$(e.target).children('img').css({"opacity": "1"});
	})
	$('.info').on('mouseleave', function(e){
		$(e.target).children('h1').css({"opacity": "0"});
		$(e.target).children('img').css({"opacity": "0.5"});
	})
})
