# Insert data into the tables

USE forumApp;

INSERT INTO users (first_name, last_name, username, email, password)
VALUES
('Discussify', 'Admin', 'discussify', 'admin@discussify.com', 'admin');


INSERT INTO topics (name)
VALUES
('discussify');


INSERT INTO members (topic_id, user_id)
VALUES
(1, 1);

INSERT INTO posts (context, topic_id, user_id)
VALUES
('<h2>Welcome to Discussify!</h2><div class="paragraph">In this post, I will outline the key functionalities of this site.<h3>How does it work?</h3>You can post whatever you want here about whatever topic that comes to mind. Conveniently, posts are organized via"Topics". If a "Topic" does not already exist, your post about a topic one will create one automatically. Anyone else that is interested in the topic can add their own posts in the topic.<h3>What data of mine is visible?</h3>Your first and last names, username and any post created by you is visible publicly on your profile. Your posts will show up in search results and topic searches.</div>', 1, 1);


INSERT INTO posts (context, topic_id, user_id)
VALUES
('<h2>Welcome to Discussify!</h2><div class="paragraph">In this post df a dfas f asf das da sd as das d asd a das d asd, I will outline the key functionalities of this site. bruh burh burh rub burh burh burubh burh<h3>How does it work?</h3>You can post whatever you want here about whatever topic that comes to mind. Conveniently, posts are organized via"Topics". If a "Topic" does not already exist, your post about a topic one will create one automatically. Anyone else that is interested in the topic can add their own posts in the topic.<h3>What data of mine is visible?</h3>Your first and last names, username and any post created by you is visible publicly on your profile. Your posts will show up in search results and topic searches.</div>', 1, 1);


INSERT INTO topics (name)
VALUES
('science');

INSERT INTO members (topic_id, user_id)
VALUES
(3, 2);


INSERT INTO posts (context, topic_id, user_id)
VALUES
('<h2>forg</h2><div class="paragraph">frog <img src="https://www.google.com/url?sa=i&url=https%3A%2F%2Fwww.dkfindout.com%2Fuk%2Fanimals-and-nature%2Famphibians%2Ffrogs-and-toads%2F&psig=AOvVaw2S5H70YgyOk_ZRnXAYf2Lz&ust=1702767192659000&source=images&cd=vfe&opi=89978449&ved=0CBIQjRxqFwoTCODchJ_EkoMDFQAAAAAdAAAAABAE" /></div>', 3, 2);