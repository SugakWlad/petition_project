$(document).ready(function(){
	if($('#pempty').text() === 'Please, fill all red spots in.'){
		var elemArr = $('.importand');
		for (var i = 0; i < elemArr.length; i++){
			if(!elemArr[i].value){
				$(elemArr[i]).css({"backgroundColor": "rgba(255, 23, 23, 0.46)"})
			}
			
		}
	}
})