const session = require("express-session");

module.exports = function(app, renderData) {
    const isAuthenticated = (req, res, next) => {
        if(req.session && req.session.userId) {
            // User is authenticated
            console.log("success")
            return next();
        }else{
            // User is not authenticated, redirect to login page
            console.log("not success")
            res.redirect(req.app.get('baseUrl')+'/login');
        }
    };

    // Handle routes
    // Homepage
    app.get('/', isAuthenticated, function(req,res){
        let newData = Object.assign({}, renderData, {sessionData:req.session});
        let posts = [];

        db.query('SELECT topic_id FROM members WHERE user_id = ?', [req.session.userId], (err, topicRows) => {
            if (err) throw err;

            // Extract topic IDs from the result
            const topicIds = topicRows.map(row => row.topic_id);

            // Step 2: Get Posts for Each Topic
            if (topicIds.length > 0) {
                const query =
                'SELECT posts.id, posts.timestamp, posts.context, users.username, topics.name as topic_name ' +
                'FROM posts ' +
                'JOIN users ON posts.user_id = users.id ' +
                'JOIN topics ON posts.topic_id = topics.id ' +
                'WHERE posts.topic_id IN (?) ' +
                'ORDER BY posts.timestamp DESC';

              db.query(query, [topicIds], (err, results) => {
                if (err) throw err;

                // Add results to newData
                newData = Object.assign({}, newData, { results });
                // Render the template with newData
                db.query(
                'CALL GetUserTopics(?);',
                [req.session.userId],
                (err, results) => {
                    if (err) throw err;
                    // Extract topic names from the result
                    const topicNamesList = results[0].map(row => row.name);
                    // Add topicNamesList to newData
                    newData = Object.assign({}, newData, { topicNamesList });
                    res.render('index.ejs', newData);
                });
              });
            } else {
              // Handle the case where the user is not a member of any topics
              console.log('User is not a member of any topics');
            }
        });
    });

    //serving login page
    app.get('/login', function(req,res){
        if(req.session && req.session.userId) {
            // User is authenticated
            res.redirect(req.app.get('baseUrl')+'/')
        }else{
            // User is not authenticated, redirect to login page
            let errorMessage = '';
            let register = {registered:false, email:"", password:""};
            if(req.query.error == 1){
                errorMessage = 'Incorrect username or password!';
            }
            else if(req.query.error == 2){
                errorMessage = 'Something went wrong. Please try agin later...';
            }
            if(req.query.registered == "true"){
                register.email = req.query.email;
                register.password = req.query.password;
                register.registered = true;
            }
            let newData = Object.assign({}, renderData, {errorMessage, register});
            res.render('login.ejs', newData);
        }
    });

    app.post('/attempt_login', (req, res) => {
        let { email, password } = req.body;

        // Fetch user from the database based on the username and password
        const query = 'SELECT * FROM users WHERE (email = ? OR username = ?) AND password = ?;'
        db.query(query, [email, email, password], (err, results) => {
            if(err){
                console.error("error logging in", err)
                res.redirect(req.app.get('baseUrl')+'/login?error=2');
            }
            else if(results.length == 1){
                // Set up the session
                req.session.userId = results[0].id;
                req.session.userEmail = results[0].email;
                req.session.username = results[0].username;
                res.redirect(req.app.get('baseUrl')+'/');
            }else{
                // User not found or password incorrect
                res.redirect(req.app.get('baseUrl')+'/login?error=1');
            }
        });
    });

    app.get('/logout', function(req,res){
        req.session.destroy((err) => {
            if (err) {
              console.error('Error destroying session:', err);
            }
            // Redirect to the login page or any other desired page after logout
            res.redirect(req.app.get('baseUrl')+'/login');
        });
    });

    //serving login page
    app.get('/register', function(req,res){
        if(req.session && req.session.userId) {
            // User is authenticated
            res.redirect(req.app.get('baseUrl')+'/')
        }else{
            // User is not authenticated, redirect to login page
            let errorMessage = '';
            if(req.query.error == 1){
                errorMessage = 'There was an error while processing your request. Please try again later.';
            }
            else if(req.query.error == 2){
                errorMessage = 'The email address you entered is already associated with a different account.';
            }
            else if(req.query.error == 3){
                errorMessage = 'The username you entered is already in use.';
            }

            let newData = Object.assign({}, renderData, {errorMessage});
            res.render('register.ejs', newData);
        }
    });

    app.post('/attempt_register', (req, res) => {
        let {First, Last, Username, email, password} = req.body;

        //remove spaces and fix name case
        First.replaceAll(" ", "");
        First = First.substring(0, 1).toUpperCase() + First.substring(1);

        Last.replaceAll(" ", "");
        Last = Last.substring(0, 1).toUpperCase() + Last.substring(1);

        // Fetch user from the database based on the username and password
        const query = `
        INSERT INTO users (first_name, last_name, username, email, password)
        VALUES
        (?, ?, ?, ?, ?);`;

        const query2 = `
        INSERT INTO members (topic_id, user_id)
        VALUES
        (1, LAST_INSERT_ID());`;     //the last bit is to add all users to the discussify topic by default

        db.query(query, [First, Last, Username, email, password], (err, results) => {
            if(err){
                console.error("error registering", err)
                if(err.sqlMessage.includes("email") && err.errno == 1062){
                    res.redirect(req.app.get('baseUrl')+'/register?error=2')
                }
                else if(err.sqlMessage.includes("username") && err.errno == 1062){
                    res.redirect(req.app.get('baseUrl')+'/register?error=3')
                }
                else{
                    res.redirect(req.app.get('baseUrl')+'/register?error=1');
                }
            }
            else{
                // Set up the session
                db.query(query2, (err, results) => {
                    if(err){
                        console.error("error registering", err)
                        res.redirect(req.app.get('baseUrl')+'/register?error=1');
                    }
                    else{
                        res.redirect(`${req.app.get('baseUrl')}/login?registered=true&password=${password}&email=${email}`);
                    }
                });
            }
        });
    });

    //list all books and their prices from database.
    app.get('/posts/:postid', isAuthenticated, function(req, res) {
        let query = `
            SELECT
                posts.id AS post_id,
                posts.timestamp,
                posts.context,
                topics.name AS topic_name,
                users.username
            FROM
                posts
            JOIN
                topics ON posts.topic_id = topics.id
            LEFT JOIN
                users ON posts.user_id = users.id
            WHERE
                posts.id = ?;
        `;

        db.query(query, [req.params.postid], (err, results) => {
            if (err) {
                res.status(404).render('404.ejs');
            }

            //pass in all relevant data for ejs template render.
            let newData = Object.assign({}, renderData, {sessionData:req.session, results});

            db.query(
                'CALL GetUserTopics(?);',
                [req.session.userId],
                (err, results) => {
                    if (err) throw err;
                    // Extract topic names from the result
                    const topicNamesList = results[0].map(row => row.name);
                    // Add topicNamesList to newData
                    newData = Object.assign({}, newData, { topicNamesList });
                    res.render("posts.ejs", newData);
            });
        });
    });

    app.get('/topics', isAuthenticated, function(req, res) {
        let query = `
            SELECT
                name
            FROM
                topics
            ORDER BY
                name ASC;
        `;

        db.query(query, (err, results) => {
            if (err) {
                res.status(404).render('404.ejs');
            }

            //pass in all relevant data for ejs template render.
            let newData = Object.assign({}, renderData, {sessionData:req.session, results});

            db.query(
                'CALL GetUserTopics(?);',
                [req.session.userId],
                (err, results) => {
                    if (err) throw err;
                    // Extract topic names from the result
                    const topicNamesList = results[0].map(row => row.name);
                    // Add topicNamesList to newData
                    newData = Object.assign({}, newData, { topicNamesList });
                    res.render("topics.ejs", newData);
            });
        });
    });

    app.get('/topics/:topic', isAuthenticated, function(req, res) {
        console.log("params"+req.params.topic)
        let query = `
        SELECT
            posts.id,
            posts.timestamp,
            posts.context,
            topics.name AS topic_name,
            users.username
        FROM
            posts
        JOIN
            topics ON posts.topic_id = topics.id
        LEFT JOIN
            users ON posts.user_id = users.id
        WHERE
            topics.name = ?;
        `;

        db.query(query, [req.params.topic], (err, results) => {
            if (err) {
                res.status(404).render('404.ejs');
            }
            console.log(results)
            //pass in all relevant data for ejs template render.
            let newData = Object.assign({}, renderData, {sessionData:req.session, results});

            db.query(
                'CALL GetUserTopics(?);',
                [req.session.userId],
                (err, results) => {
                    if (err) throw err;
                    // Extract topic names from the result
                    const topicNamesList = results[0].map(row => row.name);
                    // Add topicNamesList to newData
                    newData = Object.assign({}, newData, { topicNamesList });
                    res.render("topic.ejs", newData);
            });
        });
    });

    app.get('/users', isAuthenticated, function(req, res) {
        let query = `
            SELECT
                username
            FROM
                users
            ORDER BY
                username ASC;
        `;

        db.query(query, (err, results) => {
            if (err) {
                res.status(404).render('404.ejs');
            }

                console.log(results)
            //pass in all relevant data for ejs template render.
            let newData = Object.assign({}, renderData, {sessionData:req.session, results});

            db.query(
                'CALL GetUserTopics(?);',
                [req.session.userId],
                (err, results) => {
                    if (err) throw err;
                    // Extract topic names from the result
                    const topicNamesList = results[0].map(row => row.name);
                    // Add topicNamesList to newData
                    newData = Object.assign({}, newData, { topicNamesList });
                    res.render("users.ejs", newData);
            });
        });
    });

    app.get('/users/:user', isAuthenticated, function(req, res) {
        let query = `
            SELECT
                posts.id,
                posts.timestamp,
                posts.context,
                topics.name AS topic_name,
                users.username
            FROM
                posts
            JOIN
                topics ON posts.topic_id = topics.id
            JOIN
                users ON posts.user_id = users.id
            WHERE
                users.username = ?;
        `;

        db.query(query, [req.params.user], (err, results) => {
            if (err) {
                res.status(404).render('404.ejs');
            }

            //pass in all relevant data for ejs template render.
            let newData = Object.assign({}, renderData, {sessionData:req.session, results});

            let query = `
                SELECT
                    users.username,
                    users.first_name,
                    users.last_name,
                    users.timestamp,
                    topics.name AS topic_name
                FROM
                    users
                LEFT JOIN members ON users.id = members.user_id
                LEFT JOIN topics ON members.topic_id = topics.id
                WHERE
                    users.username = ?;
            `;

            db.query(query, [req.params.user], (err, results) => {
                if (err) {
                    res.status(404).render('404.ejs');
                }
                console.log(results)
                //pass in all relevant data for ejs template render.
                newData = Object.assign({}, newData, {user:results});

                db.query(
                    'CALL GetUserTopics(?);',
                    [req.session.userId],
                    (err, results) => {
                        if (err) throw err;
                        // Extract topic names from the result
                        const topicNamesList = results[0].map(row => row.name);
                        // Add topicNamesList to newData
                        newData = Object.assign({}, newData, { topicNamesList });
                        res.render("user.ejs", newData);
                });
            });
        });
    });

    app.get('/create', isAuthenticated, function(req, res) {
        res.redirect(req.app.get('baseUrl')+'/create/-')
    })

    app.get('/create/:topic', isAuthenticated, function(req, res) {

        let newData;
        newData = Object.assign({}, renderData, {sessionData:req.session, topic:req.params.topic});

        let query = `
            SELECT
                name
            FROM
                topics
            ORDER BY
                name ASC;
        `;

        db.query(query, (err, allTopics) => {
            if (err) {
                res.status(404).render('404.ejs');
            }

            //pass in all relevant data for ejs template render.
            newData = Object.assign({}, newData, {allTopics});

            db.query(
            'CALL GetUserTopics(?);',
            [req.session.userId],
            (err, results) => {
                if (err) throw err;
                // Extract topic names from the result
                const topicNamesList = results[0].map(row => row.name);
                // Add topicNamesList to newData
                newData = Object.assign({}, newData, {topicNamesList});
                res.render("create.ejs", newData);
            });
        });
    });

    app.post('/post/:status', isAuthenticated, function(req, res) {

        if(req.params.status == "ok"){
            let query = `
                SELECT
                    id
                FROM
                    topics
                WHERE
                    name = ?;
            `

            db.query(query, [req.body.topic_name], (err, topicID) => {
                if (err) {
                    res.status(404).render('404.ejs');
                }

                let query = `
                    INSERT INTO
                        posts (context, topic_id, user_id)
                    VALUES
                        (?, ?, ?);
                `
                db.query(query, [req.body.context, topicID[0].id, req.session.userId], (err, posted) => {
                    if (err) {
                        res.status(404).render('404.ejs');
                    }

                    let query = `
                    SELECT
                        id
                    FROM
                        posts
                    WHERE
                        topic_id = ? AND user_id = ?;
                    `

                    db.query(query, [topicID[0].id, req.session.userId], (err, postID) => {
                        if (err) {
                            res.status(404).render('404.ejs');
                        }

                        res.redirect(req.app.get('baseUrl')+"/posts/"+postID[postID.length-1].id);
                    });
                });
            });
        }
        else if(req.params.status == "join"){
            let query = `
                SELECT
                    id
                FROM
                    topics
                WHERE
                    name = ?;
            `

            db.query(query, [req.body.topic_name], (err, topicID) => {

                if (err) {
                    res.status(404).render('404.ejs');
                }

                let query = `
                    INSERT INTO
                        members (topic_id, user_id)
                    VALUES
                        (?, ?);
                `

                db.query(query, [topicID[0].id, req.session.userId], (err) => {

                    if (err) {
                        res.status(404).render('404.ejs');
                    }

                    let query = `
                        INSERT INTO
                            posts (context, topic_id, user_id)
                        VALUES
                            (?, ?, ?);
                    `
                    db.query(query, [req.body.context, topicID[0].id, req.session.userId], (err, posted) => {
                        if (err) {
                            res.status(404).render('404.ejs');
                        }

                        let query = `
                        SELECT
                            id
                        FROM
                            posts
                        WHERE
                            topic_id = ? AND user_id = ?;
                        `

                        db.query(query, [topicID[0].id, req.session.userId], (err, postID) => {
                            if (err) {
                                res.status(404).render('404.ejs');
                            }

                            res.redirect(req.app.get('baseUrl')+"/posts/"+postID[postID.length-1].id);
                        });
                    });
                });
            });
        }
        else if(req.params.status == "create"){
            let query = `
                CALL CreateTopic(?);
            `

            db.query(query, [req.body.topic_name], (err, topicID) => {
                topicID[0].id = topicID[0][0].newTopicId;
                console.log(topicID)

                if (err) {
                    res.status(404).render('404.ejs');
                }

                let query = `
                    INSERT INTO
                        members (topic_id, user_id)
                    VALUES
                        (?, ?);
                `

                db.query(query, [topicID[0].id, req.session.userId], (err) => {

                    if (err) {
                        res.status(404).render('404.ejs');
                    }

                    let query = `
                        INSERT INTO
                            posts (context, topic_id, user_id)
                        VALUES
                            (?, ?, ?);
                    `
                    db.query(query, [req.body.context, topicID[0].id, req.session.userId], (err, posted) => {
                        if (err) {
                            res.status(404).render('404.ejs');
                        }

                        let query = `
                        SELECT
                            id
                        FROM
                            posts
                        WHERE
                            topic_id = ? AND user_id = ?;
                        `

                        db.query(query, [topicID[0].id, req.session.userId], (err, postID) => {
                            if (err) {
                                res.status(404).render('404.ejs');
                            }

                            res.redirect(req.app.get('baseUrl')+"/posts/"+postID[postID.length-1].id);
                        });
                    });
                });
            });
        }

    });

    app.get('/profile', isAuthenticated, function(req, res) {
        let query = `
            SELECT
                posts.id,
                posts.timestamp,
                posts.context,
                topics.name AS topic_name,
                users.username
            FROM
                posts
            JOIN
                topics ON posts.topic_id = topics.id
            JOIN
                users ON posts.user_id = users.id
            WHERE
                users.username = ?;
        `;

        db.query(query, [req.session.username], (err, results) => {
            if (err) {
                res.status(404).render('404.ejs');
            }

            //pass in all relevant data for ejs template render.
            let newData = Object.assign({}, renderData, {sessionData:req.session, results});

            let query = `
                SELECT
                    users.username,
                    users.first_name,
                    users.last_name,
                    users.timestamp,
                    topics.name AS topic_name
                FROM
                    users
                LEFT JOIN members ON users.id = members.user_id
                LEFT JOIN topics ON members.topic_id = topics.id
                WHERE
                    users.username = ?;
            `;

            db.query(query, [req.session.username], (err, results) => {
                if (err) {
                    res.status(404).render('404.ejs');
                }
                console.log(results)
                //pass in all relevant data for ejs template render.
                newData = Object.assign({}, newData, {user:results});

                db.query(
                    'CALL GetUserTopics(?);',
                    [req.session.userId],
                    (err, results) => {
                        if (err) throw err;
                        // Extract topic names from the result
                        const topicNamesList = results[0].map(row => row.name);
                        // Add topicNamesList to newData
                        newData = Object.assign({}, newData, { topicNamesList, deleted:req.query.deleted });
                        res.render("profile.ejs", newData);
                });
            });
        });
    });

    app.get('/delete/:postID', isAuthenticated, function(req, res) {
        let query = `
        SELECT
            CASE
                WHEN COUNT(*) = 0 THEN 1  -- It's the first post
                ELSE 0                      -- It's not the first post
            END AS isFirstPost
        FROM
            posts
        WHERE
            topic_id = (SELECT topic_id FROM posts WHERE id = ?)
            AND timestamp < (SELECT timestamp FROM posts WHERE id = ?);
        `;

        db.query(query, [req.params.postID, req.params.postID], (err, isFirstPost) => {
            if (err) {
                console.error(err)
                res.status(404).render('404.ejs');
            }

            console.log(isFirstPost)


            if(isFirstPost[0].isFirstPost == 0){
                let query = `
                    DELETE FROM posts WHERE id = ?;
                `;

                db.query(query, [req.params.postID], (err, results) => {
                    if (err) {
                        res.status(404).render('404.ejs');
                    }

                    res.redirect(req.app.get('baseUrl')+'/profile?deleted=true')
                });
            }
            else if(isFirstPost[0].isFirstPost == 1){
                let query = `
                    UPDATE posts SET user_id = NULL WHERE id = ?;
                `;

                db.query(query, [req.params.postID], (err, results) => {
                    if (err) {
                        res.status(404).render('404.ejs');
                    }

                    res.redirect(req.app.get('baseUrl')+'/profile?deleted=true')
                });
            }
            else{
                res.status(404).render('404.ejs');
            }
        });
    });

    app.get('/edit/:postID', isAuthenticated, function(req, res) {
        let query = `
            SELECT
                posts.id AS post_id,
                posts.timestamp,
                posts.context,
                topics.name AS topic_name,
                users.username
            FROM
                posts
            JOIN
                topics ON posts.topic_id = topics.id
            LEFT JOIN
                users ON posts.user_id = users.id
            WHERE
                posts.id = ?;
        `;

        db.query(query, [req.params.postID, req.params.postID], (err, result) => {
            if (err) {
                console.error(err)
                res.status(404).render('404.ejs');
            }

            //verify user is creator of post
            if(result[0].username == req.session.username){
                let newData = Object.assign({}, renderData, {sessionData:req.session, results:result});

                db.query(
                    'CALL GetUserTopics(?);',
                    [req.session.userId],
                    (err, results) => {
                        if (err) throw err;
                        // Extract topic names from the result
                        const topicNamesList = results[0].map(row => row.name);
                        // Add topicNamesList to newData
                        newData = Object.assign({}, newData, { topicNamesList });
                        res.render("edit.ejs", newData);
                });
            }
            else{
                res.status(404).render('404.ejs');
            }

        });
    });

    app.get('/follow/:topic', isAuthenticated, function(req, res) {
        let query = `
            INSERT INTO
                members (topic_id, user_id)
            VALUES
            ((SELECT id FROM topics WHERE name = ?), ?);
        `;

        db.query(query, [req.params.topic, req.session.userId], (err, result) => {
            if (err) {
                console.error(err)
                res.status(404).render('404.ejs');
            }
            res.redirect(req.app.get('baseUrl')+"/topics/"+req.params.topic);
        });
    });

    app.get('/unfollow/:topic', isAuthenticated, function(req, res) {
        let query = `
            DELETE FROM
                members
            WHERE
                topic_id = (SELECT id FROM topics WHERE name = ?)
                AND
                user_id = ?;
        `;

        db.query(query, [req.params.topic, req.session.userId], (err, result) => {
            if (err) {
                console.error(err)
                res.status(404).render('404.ejs');
            }
            res.redirect(req.app.get('baseUrl')+"/topics/"+req.params.topic);
        });
    });
}
