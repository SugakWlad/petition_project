
var bcrypt = require('bcryptjs');
var hb = require('express-handlebars');
const express = require('express');
const app = express();
var spicedPg = require('spiced-pg');
var router = express.Router();
const csrf = require('csurf');
const csrfProtection = csrf();
var db = spicedPg(process.env.DATABASE_URL || require('./secrets.json').db);
var redis = require('redis');
var client = redis.createClient({
    host: process.env.REDIS_URL || 'localhost'
});
const session = require('express-session');
const Store = require('connect-redis')(session);
app.use(session({
    store: new Store({
        host:  'localhost',
        url: process.env.REDIS_URL
    }),
    resave: false,
    saveUninitialized: true,
    secret: process.env.sessionSecret || require('./secrets.json').sessionSecret
}));

var count = 1;
var time = 60;
var loginText;
client.on('error', function(err) {
    console.log(err);
});

app.engine('handlebars', hb({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');
app.use('/public', express.static(__dirname + '/public'));
app.use(require('body-parser').urlencoded({
    extended: false
}));

app.use(function(req, res, next){
	if(req.session.user){
		// loginText = 'Log out';
		if(req.session.user.user_id){
			if(req.url == '/registration' || req.url == '/login' || req.url =='/profile' || req.url == '/petition' || req.url == '/petition?'){
				res.redirect('/petition/thanks');
			}else{
				next();
			}
		}else{
			if(req.url == '/petition' || req.url == '/profile' || req.url == '/profile/edit'){
				next();
			}else{	
				res.redirect('/petition');
			}
		}
	}else{
		// loginText = 'Log in';
		if(req.url == '/login' || req.url == '/registration' || req.url == '/home' || req.url == '/home?'){
			next();
		}else{
			res.redirect('/registration');
		}
	}
});

app.get('/', function(req, res){
	res.redirect('/home');
});

app.get('/home', function(req, res){
	res.render('home', {'loginText': loginText});
})

app.get('/registration', csrfProtection, function(req, res){
	res.render('registration', {
		csrfToken: req.csrfToken(),
		'loginText': loginText
	});
});

app.post('/registration', csrfProtection, function(req, res){
	registration(req, res);
});

app.get('/login', csrfProtection, function(req, res){
	res.render('login', {
		csrfToken: req.csrfToken(),
		'loginText': loginText
	});
})

app.post('/login', csrfProtection, function(req, res){
	login(req, res);
})

app.get('/profile', csrfProtection, function(req, res){
	res.render('profile', {
		csrfToken: req.csrfToken(),
		'loginText': loginText
	});
})

app.post('/profile', csrfProtection, function(req, res){
	setProfile(req, res).then(function(results){
		res.redirect('/petition');
	}).catch(function(err){
		console.log(err);
	});
});

app.get('/petition', csrfProtection, function(req, res) {
    res.render('petition', {
    	csrfToken: req.csrfToken(),
    	'loginText': loginText
    });
});

app.post('/petition', csrfProtection, function(req, res){
	setPetition(req, res);
});

app.get('/petition/thanks', function(req, res){
	getSignature(req.session.user.user_id).then(function(imgUrl){
		getNumOfSigners().then(function(num){
			res.render('thanks', {
				'img': imgUrl,
				'signers': num,
				'loginText': loginText
			});
		})
	}).catch(function(err){
		res.redirect('/petition');
		console.log(err);
	})
});

app.get('/petition/signers', function(req, res){
	getSigners().then(function(signers){
		res.render('signers', {
			'results': signers,
			'loginText': loginText
		});
	});
});

app.get('/profile/edit', csrfProtection, function(req, res){
	getUser(req, res);
})

app.post('/profile/edit', csrfProtection, function(req, res){
	updateUser(req, res);
})

app.get('/petition/thanks/sure', function(req, res){
	res.render('thanks', {
		sure: true,
		'loginText': loginText
	})
})

app.get('/petition/delete', function(req, res){
	deleteSignature(req).then(function(){
		res.redirect('/petition');
	})
})

app.get('/petition/signers/:city', function(req, res){
	getSignersByCity(req.params.city).then(function(signers){
		res.render('cities', {
			'city': req.params.city,
			'results': signers,
			'loginText': loginText
		})
	})
})

app.get('/logout', function(req, res){
	req.session.destroy(function(err){
		if(err){
			console.log(err);
		}
		res.redirect('/registration');
	})
})

app.listen(process.env.PORT || 8080, function(){
	console.log('Listening on port 8080...');
})






function hashPassword(plainTextPassword) {
    return new Promise(function(resolve, reject) {
        bcrypt.genSalt(function(err, salt) {
            if (err) {
                return reject(err);
            }
            bcrypt.hash(plainTextPassword, salt, function(err, hash) {
                if (err) {
                    return reject(err);
                }
                resolve(hash);
            });
        });
    });
}

function checkPassword(textEnteredInLoginForm, hashedPasswordFromDatabase) {
    return new Promise(function(resolve, reject) {
        bcrypt.compare(textEnteredInLoginForm, hashedPasswordFromDatabase, function(err, doesMatch) {
            if (err) {
                reject(err);
            } else {
                resolve(doesMatch);
            }
        });
    });
}

function registration(req, res){
	if(req.body.first_name == '' || req.body.first_name == '' || req.body.email == '' || req.body.password == ''){
		return res.render('registration', {
			empty : true,
			first_name: req.body.first_name,
			last_name: req.body.last_name,
			email: req.body.email,
			csrfToken: req.csrfToken(),
			'loginText': loginText
		});
	}
	hashPassword(req.body.password).then(function(results){
		var dataArr = [toCapitalLetter(req.body.first_name), toCapitalLetter(req.body.last_name), req.body.email, results];
		db.query('INSERT INTO users (first_name, last_name, email, password) VALUES ($1, $2, $3, $4) RETURNING id;', dataArr).then(function(results){
			req.session.user = {
				id: results.rows[0].id
			}
			res.redirect('/profile');
		}).catch(function(err){
			console.log('REGISTRATION: ', err);
		});
	});
}

function login(req, res){
	if(req.body.email == '' || req.body.password == ''){
		return res.render('login', {
			empty: true,
			email: req.body.email,
			csrfToken: req.csrfToken()
		});
	}
	db.query('SELECT id, password FROM users WHERE email = $1', [req.body.email]).then(function(results){
		checkPassword(req.body.password, results.rows[0].password).then(function(doesMatch){
			db.query('SELECT user_id FROM user_profiles WHERE user_id = $1', [results.rows[0].id]).then(function(result){
				if(doesMatch){
					req.session.user = {
						id: results.rows[0].id,
						user_id: result.rows[0].user_id
					}
					res.redirect('/petition/thanks');
				}else{
					client.get('password', function(err, data){
						if(err){
							console.log(err);
						}
						console.log(data);
						count += Number(data);

						if(count == 3){
							time = 90;
							res.redirect('/registration');
						}else if(count > 3){
							time *= 2;
						}
						count++;
					})
					client.setex('password', time, count, function(err, data){
						res.redirect('/login');
					})
				}
			})
		})
	}).catch(function(err){
		console.log(err);
		res.render('registration');
	})
}

function setPetition(req, res){
	if(req.body.signature == ''){
		return res.render('petition', {
			empty : true,
			csrfToken: req.csrfToken()
		});
	}

	var dataArr = [req.session.user.id, req.body.signature];
	db.query('INSERT INTO signatures (user_id, signature) VALUES ($1, $2);', dataArr).then(function(results){
		client.del('signers', function(err, data){
			if(err){
				console.log(err);
			}
		})
		req.session.user.user_id = req.session.user.id;
		res.redirect('/petition/thanks');
	}).catch(function(err){
		console.log('sendpetition', err);
		res.render('petition', {
			'error' : true,
			'loginText': loginText
		});
	});
}

function getSignature(user){
	var dataArr = [user];
	return new Promise(function(res, rej){
		db.query('SELECT signature FROM signatures WHERE user_id = $1', dataArr).then(function(results){
			res(results.rows[0].signature);
		}).catch(function(err){
			console.log(err);
			rej(err);
		})
	})
}

function getNumOfSigners(){
	return new Promise(function(res, rej){
		db.query('SELECT COUNT(*) FROM signatures').then(function(results){
			res(results.rows[0].count);
		}).catch(function(err){
			console.log(err);
			rej(err);
		})
	})
}

function getSigners(){
	return new Promise(function(res, rej){
		client.get('signers', function(err, data){
			if(err){
				console.log(err);
			}if(data){
				res(JSON.parse(data));
			}else{
				db.query(`SELECT users.first_name, users.last_name, user_profiles.age, user_profiles.city, user_profiles.homepage 
					FROM users 
					JOIN signatures 
					ON users.id = signatures.user_id 
					JOIN user_profiles 
					ON users.id = user_profiles.user_id`).then(function(results){
					client.set('signers', JSON.stringify(results.rows), function(err, data){
						if(err){
							console.log(err);
						}
					});
					res(results.rows);
				}).catch(function(err){
					rej(err);
				})
			}
		});
	})
}

function setProfile(req, res){
	var dataArr = [req.session.user.id, req.body.age || null, toCapitalLetter(req.body.city), req.body.homepage];
	return new Promise(function(res, rej){
		db.query(`INSERT INTO user_profiles (user_id, age, city, homepage) VALUES ($1, $2, $3, $4)`, dataArr).then(function(results){
			res();
		}).catch(function(err){
			rej(err);
		})
	})
}



function getSignersByCity(city){
	return new Promise(function(res,rej){
		db.query(`SELECT users.first_name, users.last_name, user_profiles.age, user_profiles.city, user_profiles.homepage 
		FROM users 
		JOIN signatures ON users.id = signatures.user_id 
		JOIN user_profiles ON signatures.user_id = user_profiles.user_id
		WHERE user_profiles.city = $1`, [city]).then(function(results){
			res(results.rows);
		}).catch(function(err){
			rej(err);
		})
	})
}

function getUser(req, res, error){
	Promise.all([
		getUserInfo(req.session.user.id),
		getUserProfile(req.session.user.id)
	]).then(function(results){
		res.render('edit', {
			'first_name': results[0].first_name,
			'last_name': results[0].last_name,
			'email': results[0].email,
			'age': results[1].age,
			'city': results[1].city,
			'homepage': results[1].homepage,
			'error': error,
			csrfToken: req.csrfToken(),
			'loginText': loginText
		});
	}).catch(function(err){
		console.log(err);
	})
}

function getUserInfo(id){
	return new Promise(function(res, rej){
		db.query(`SELECT first_name, last_name, email, password FROM users WHERE id = $1;`, [id]).then(function(results){
			res(results.rows[0]);
		}).catch(function(err){
			rej(err);
		})
	})
}

function getUserProfile(id){
	return new Promise(function(res, rej){
		db.query(`SELECT age, city, homepage FROM user_profiles WHERE user_id = $1;`, [id]).then(function(results){
			res(results.rows[0]);
		}).catch(function(err){
			rej(err);
		})
	})
}

function editUserInfo(data){
	return new Promise(function(res, rej){
		if(data[3] === false){
			db.query('UPDATE users SET first_name = $1, last_name = $2, email = $3 WHERE id = $5', data).then(function(){
				res();
			}).catch(function(err){
				rej(err);
			})
		}else{
			db.query('UPDATE users SET first_name = $1, last_name = $2, email = $3, password = $4 WHERE id = $5', data).then(function(){
				res();
			}).catch(function(err){
				rej(err);
			})
		}
	})
}

function editUserProfile(data){
	return new Promise(function(res, rej){
		db.query('UPDATE user_profiles SET age = $1, city = $2, homepage = $3 WHERE user_id = $4', data).then(function(){
			res();
		}).catch(function(err){
			rej(err);
		})
	})
}

function updateUser(req, res){
	if(req.body.first_name == '' || req.body.last_name == '' || req.body.email == '' || req.body.password == ''){
		return res.render('edit', {
			empty : true,
			first_name: req.body.first_name,
			last_name: req.body.last_name,
			email: req.body.email,
			age: req.body.age,
			city: req.body.city,
			homepage: req.body.homepage,
			csrfToken: req.csrfToken(),
		});
	}
	hashPassword(req.body.password).then(function(results){
		req.body.password = results;
		req.body.age = req.body.age || null;
		req.body.first_name = toCapitalLetter(req.body.first_name);
		req.body.last_name = toCapitalLetter(req.body.last_name);
		req.body.city = toCapitalLetter(req.body.city);
		var infoArr = [];
		for(var key in req.body){
			if(key !== '_csrf'){
				infoArr.push(req.body[key]);
			}
		}
		var profileArr = infoArr.splice(4, 6);
		infoArr.push(req.session.user.id);
		profileArr.push(req.session.user.id);
		Promise.all([
			editUserProfile(profileArr),
			editUserInfo(infoArr)
		]).then(function(){
			res.redirect('/petition/thanks');
		}).catch(function(err){
			console.log(err);
			getUser(req, res, true);
		})
	})
}

function deleteSignature(req){
	return new Promise(function(res, rej){
		db.query('DELETE FROM signatures WHERE user_id = $1', [req.session.user.user_id]).then(function(){
			req.session.user.user_id = null;
			res();
		}).catch(function(err){
			rej(err);
		})
	})
}

function toCapitalLetter(str){
	return str.charAt(0).toUpperCase() + str.substr(1);
}


// document.ready
// git push heroku HEAD:wlad
// heroku open


