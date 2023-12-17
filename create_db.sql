# Create database script for the forum app

# Create the database
CREATE DATABASE forumApp;
USE forumApp;

# Create the tables
CREATE TABLE users(
    id          INT PRIMARY KEY AUTO_INCREMENT,
    first_name  VARCHAR(20) NOT NULL,
    last_name   VARCHAR(20) NOT NULL,
    username    VARCHAR(20) UNIQUE NOT NULL,
    email       VARCHAR(255) UNIQUE,
    password    VARCHAR(255),
    timestamp   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE topics(
    id          INT PRIMARY KEY AUTO_INCREMENT,
    name        VARCHAR(20) NOT NULL UNIQUE
);

CREATE TABLE members(
    topic_id    INT,
    user_id     INT,
    FOREIGN KEY (topic_id) REFERENCES topics(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE posts(
    id          INT PRIMARY KEY AUTO_INCREMENT,
    timestamp   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    context     TEXT NOT NULL,
    topic_id    INT,
    user_id     INT,
    FOREIGN KEY (topic_id) REFERENCES topics(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);


DELIMITER //

CREATE PROCEDURE GetUserTopics(IN userIdParam INT)
BEGIN
    SELECT topics.name
    FROM topics
    INNER JOIN members ON topics.id = members.topic_id
    WHERE members.user_id = userIdParam;
END //

DELIMITER ;

DELIMITER //

CREATE PROCEDURE CreateTopic(IN newTopicName VARCHAR(20))
BEGIN
    INSERT INTO topics (name) VALUES (newTopicName);
    SELECT LAST_INSERT_ID() AS newTopicId;
END//

DELIMITER ;


# Create the app user and give it access to the database
CREATE USER 'appuser'@'localhost' IDENTIFIED WITH mysql_native_password BY 'app2027';
GRANT ALL PRIVILEGES ON forumApp.* TO 'appuser'@'localhost';
