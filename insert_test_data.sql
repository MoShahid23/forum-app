# Insert data into the tables

USE forumApp;

INSERT INTO users (first_name, last_name, username, email, password)
VALUES
('Discussify', 'Admin', 'discussify_admin', 'admin@discussify.com', 'admin');


INSERT INTO topics (name)
VALUES
('discussify');


INSERT INTO members (topic_id, user_id)
VALUES
(1, 1);

DELIMITER ||
INSERT INTO posts (context, topic_id, user_id)
VALUES
('<h2>Welcome to Discussify!</h2><div class="paragraph">This post is brief outline of some of Discussify''s features:<br><br><h3>Exploring Topics</h3><br>Engage in discussions identified by the &lt;topic&gt; tags. By default, you are in the Discussify topic. Further topics can be discovered on the <a href="/topics">topics </a>page. Simply go there, select a topic and click follow if you''re interested.<br><br><h3>Your Profile and Posts</h3><br>Your personal porfile is accessible through the top-right menu. Delete or edit your posts, navigate through your joined topics, and observe your profile''s activity on your <a href="/profile">profile </a>page.<br><br><h3>Create a New Topic</h3><br>If a topic does not already exist, then:<br><br>Go to the <a href="/">homepage </a>.<br>Create a new post.<br>Enter your topic''s name.<br><br>This allows you to initiate discussions effortlessly. By creating a new post and assigning a topic name, you automatically become the "topic starter", assuming a prominent role in discussions on that topic''s page.<br><br><h3>You can also format your posts a little</h3><br>Headings like the one above:<br>&lt;*h&gt;Your Heading Here&lt;h*&gt;.<br><br><br><a href="#"> Include links like this with: </a><br>&lt;*link="https://yourlinkhere.com"&gt; Link name here &lt;l*&gt;<br><br>You can quickly enter the syntax for these by clicking the buttons on the create post screen.<br><br><br>--------------------------------<br>Access this information any time through the <a href="/about">about </a> page.That''s it for now, future updates will be available in here, the &lt;discussify&gt; topic page.</div>',
1, 1)||
DELIMITER ;