CREATE DATABASE my_database;
USE my_database;

CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL
);

CREATE TABLE categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE questions (
    question_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    is_anonymous BOOLEAN DEFAULT FALSE,
    comments_enabled BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE question_categories (
    question_id INT NOT NULL,
    category_id INT NOT NULL,
    PRIMARY KEY (question_id, category_id),
    FOREIGN KEY (question_id) REFERENCES questions(question_id),
    FOREIGN KEY (category_id) REFERENCES categories(category_id)
);

CREATE TABLE options (
    option_id INT AUTO_INCREMENT PRIMARY KEY,
    question_id INT NOT NULL,
    option_text VARCHAR(255) NOT NULL,
    FOREIGN KEY (question_id) REFERENCES questions(question_id)
);

CREATE TABLE responses (
    response_id INT AUTO_INCREMENT PRIMARY KEY,
    question_id INT NOT NULL,
    user_id INT NOT NULL,
    option_id INT NULL,
    comment_text TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (question_id) REFERENCES questions(question_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (option_id) REFERENCES options(option_id)
);

CREATE TABLE user_preferences (
    user_id INT NOT NULL,
    category_id INT NOT NULL,
    PRIMARY KEY (user_id, category_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (category_id) REFERENCES categories(category_id)
);