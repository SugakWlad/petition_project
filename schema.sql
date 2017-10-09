DROP TABLE IF EXISTS signatures;
DROP TABLE IF EXISTS user_profiles;
DROP TABLE IF EXISTS users;

CREATE TABLE signatures(
	id SERIAL primary key,
	user_id INTEGER REFERENCES users(id) NOT NULL,
	signature TEXT NOT NULL,
	_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users(
	id SERIAL primary key,
	first_name VARCHAR(255) NOT NULL,
	last_name VARCHAR(255) NOT NULL,
	email TEXT NOT NULL UNIQUE,
	password VARCHAR(200) NOT NULL,
	_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_profiles(
	id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    age INT,
    city VARCHAR(255),
    homepage TEXT
);