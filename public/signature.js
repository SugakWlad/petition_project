$(document).ready(function(){
	
	var canvas = document.getElementById('canv');
	var context = canvas.getContext('2d');

	context.strokeStyle = 'black';
	context.lineWidth = 1;
	context.beginPath();

	$('#canv').on('mousedown', function(e){
		context.moveTo(e.offsetX, e.offsetY);
		$('#canv').on('mousemove', function(e){
			context.lineTo(e.offsetX, e.offsetY);
			context.stroke();
		})
	});

	$('#canv').on('mouseup', function(){
		$('#canv').off('mousemove');
		document.getElementById('siginput').value = canvas.toDataURL();
	})

	$('#canv').on('touchstart', function(e){
		var posX = e.touches[0].pageX - e.touches[0].target.offsetLeft;     
		var posY = e.touches[0].pageY - e.touches[0].target.offsetTop;
		context.moveTo(posX, posY);
		$('#canv').on('touchmove', function(e){
			posX = e.touches[0].pageX - e.touches[0].target.offsetLeft;     
			posY = e.touches[0].pageY - e.touches[0].target.offsetTop;
			context.lineTo(posX, posY);
			context.stroke();
		})
	})

	$('#canv').on('touchend', function(){
		$('#canv').off('touchstart');
		document.getElementById('siginput').value = canvas.toDataURL();
	})

})
