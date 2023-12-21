module.exports = function(app, renderData) {
    //Note: every redirect must be be written like this to ensure correct ur is redirected to
    //req.app.get('baseUrl')+'/login'
    //basUrl can be configured in index.js. running locally set it to /

    //checks if session cookie contains user data.
    const isAuthenticated = (req, res, next) => {
        if(req.session && req.session.userId) {
            //user is authenticated
            return next();
        }else{
            //user is not authenticated, redirect to login page
            res.redirect(req.app.get('baseUrl')+'/login');
        }
    };

    //**handling routes**

    //homepage, when user goes to websites url, authentication decides whether user gets to homepage or to login page
    app.get('/', isAuthenticated, function(req,res){
        //sessionData i srequired for every templatge page, so must be included in each route
        let newData = Object.assign({}, renderData, {sessionData:req.session});

        db.query('SELECT topic_id FROM members WHERE user_id = ?', [req.session.userId], (err, topicRows) => {
            if (err) {
                res.status(404).render('404.ejs', Object.assign({}, renderData, {sessionData:req.session}));
                throw err
            };

            //extract topic IDs from the result
            let topicIds = topicRows.map(row => row.topic_id);

            //getting posts for each topic
            let query = `
                SELECT 
                    posts.id, posts.timestamp, posts.context, users.username, topics.name as topic_name
                FROM 
                    posts
                JOIN 
                    users ON posts.user_id = users.id
                JOIN 
                    topics ON posts.topic_id = topics.id
                ${topicIds.length > 0 ? 'WHERE posts.topic_id IN (?)' : 'WHERE posts.topic_id = -1'}
                ORDER BY 
                    posts.timestamp DESC
            `;//ensure they are ordered by timestamp 

            db.query(query, [topicIds], (err, results) => {
                if (err) {
                    res.status(404).render('404.ejs', Object.assign({}, renderData, {sessionData:req.session}));
                    throw err
                };

                //add results to newData
                newData = Object.assign({}, newData, { results });
                //retrieve other information required for template
                db.query(
                'CALL GetUserTopics(?);',   //topics to list in the sidebar
                [req.session.userId],
                (err, results) => {
                    if (err) throw err;
                    //extract topic names from the result
                    const topicNamesList = results[0].map(row => row.name);
                    //add topicNamesList to newData
                    newData = Object.assign({}, newData, { topicNamesList });
                    res.render('index.ejs', newData);
                });
            });

        });
    });

    //serving login page
    app.get('/login', function(req,res){
        if(req.session && req.session.userId) {
            //user is authenticated, redirect to homepage
            res.redirect(req.app.get('baseUrl')+'/')
        }else{
            //user is not authenticated, render login page
            let errorMessage = '';
            let register = {registered:false, email:"", password:""};
            //check for error or registration status in query parameters
            if(req.query.error == 1){
                errorMessage = 'Incorrect username or password!';
            }
            else if(req.query.error == 2){
                errorMessage = 'Something went wrong. Please try again later...';
            }
            //if the user just registered, prefill the email field
            if(req.query.registered == "true"){
                register.email = req.query.email;
                register.registered = true;
            }
            //prepare data for rendering the login page
            let newData = Object.assign({}, renderData, {errorMessage, register});
            res.render('login.ejs', newData);
        }
    });

    //authenticating details and redirecting accordingly
    app.post('/attempt_login', (req, res) => {
        let { email, password } = req.body;

        //fetch user from the database based on the username and password
        const query = 'SELECT * FROM users WHERE (email = ? OR username = ?) AND password = ?;'
        db.query(query, [email, email, password], (err, results) => {
            if(err){
                console.error("error logging in", err)
                res.redirect(req.app.get('baseUrl')+'/login?error=2');
            }
            else if(results.length == 1){
                //set up the session
                req.session.userId = results[0].id;
                req.session.userEmail = results[0].email;
                req.session.username = results[0].username;
                res.redirect(req.app.get('baseUrl')+'/');
            }else{
                //user not found or password incorrect
                res.redirect(req.app.get('baseUrl')+'/login?error=1');
            }
        });
    });

    //destroys session and redirects user to login page
    app.get('/logout', function(req,res){
        req.session.destroy((err) => {
            if (err) {
              console.error('Error destroying session:', err);
            }
            //redirect to the login page or any other desired page after logout
            res.redirect(req.app.get('baseUrl')+'/login');
        });
    });

    //serving login page
    app.get('/register', function(req,res){
        if(req.session && req.session.userId) {
            //user is authenticated
            res.redirect(req.app.get('baseUrl')+'/')
        }else{
            //user is not authenticated, redirect to login page
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

    //formats user's input to maintain ddata integrity and then registers if all good, returns error messages otherwise
    app.post('/attempt_register', (req, res) => {
        let {First, Last, Username, email, password} = req.body;

        //remove spaces and fix name case
        First.replaceAll(" ", "");
        First = First.substring(0, 1).toUpperCase() + First.substring(1);

        Last.replaceAll(" ", "");
        Last = Last.substring(0, 1).toUpperCase() + Last.substring(1);

        //fetch user from the database based on the username and password
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
                //set up the session
                db.query(query2, (err, results) => {
                    if(err){
                        console.error("error registering", err)
                        res.redirect(req.app.get('baseUrl')+'/register?error=1');
                    }
                    else{
                        res.redirect(`${req.app.get('baseUrl')}/login?registered=true&email=${email}`);
                    }
                });
            }
        });
    });

    //displays full post when clicked
    app.get('/posts/:postid', isAuthenticated, function(req, res) {
        //query returns details about posts (and some related tables), found from postid. 
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
                res.status(404).render('404.ejs', Object.assign({}, renderData, {sessionData:req.session}));
            }

            //pass in all relevant data for ejs template render.
            let newData = Object.assign({}, renderData, {sessionData:req.session, results});

            //post does not exist or is deleted
            if(results.length == 0){
                res.status(404).render('404.ejs', Object.assign({}, renderData, {sessionData:req.session}));
            }

            //this bit is always the same as in the homepage route
            db.query(
                'CALL GetUserTopics(?);',
                [req.session.userId],
                (err, results) => {
                    if (err) throw err;
                    //extract topic names from the result
                    const topicNamesList = results[0].map(row => row.name);
                    //add topicNamesList to newData
                    newData = Object.assign({}, newData, { topicNamesList });
                    res.render("posts.ejs", newData);
            });
        });
    });

    //displays list of existing topics
    app.get('/topics', isAuthenticated, function(req, res) {
        //query selects name of all topics and returns in alphabetical order
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
                res.status(404).render('404.ejs', Object.assign({}, renderData, {sessionData:req.session}));
            }

            //pass in all relevant data for ejs template render.
            let newData = Object.assign({}, renderData, {sessionData:req.session, results});

            db.query(
                'CALL GetUserTopics(?);',
                [req.session.userId],
                (err, results) => {
                    if (err) throw err;
                    //extract topic names from the result
                    const topicNamesList = results[0].map(row => row.name);
                    //add topicNamesList to newData
                    newData = Object.assign({}, newData, { topicNamesList });
                    res.render("topics.ejs", newData);
            });
        });
    });

    //lists a speific topics posts
    app.get('/topics/:topic', isAuthenticated, function(req, res) {
        
        //query takes in topic name from url parameter, outputs all posts like in /posts/:psotid
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
                res.status(404).render('404.ejs', Object.assign({}, renderData, {sessionData:req.session}));
            }
            //pass in all relevant data for ejs template render.
            let newData = Object.assign({}, renderData, {sessionData:req.session, results});

            db.query(
                'CALL GetUserTopics(?);',
                [req.session.userId],
                (err, results) => {
                    if (err) throw err;
                    //extract topic names from the result
                    const topicNamesList = results[0].map(row => row.name);
                    //add topicNamesList to newData
                    newData = Object.assign({}, newData, { topicNamesList });
                    res.render("topic.ejs", newData);
            });
        });
    });

    //this works exactly like the /topics route
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
                res.status(404).render('404.ejs', Object.assign({}, renderData, {sessionData:req.session}));
            }

            //pass in all relevant data for ejs template render.
            let newData = Object.assign({}, renderData, {sessionData:req.session, results});

            db.query(
                'CALL GetUserTopics(?);',
                [req.session.userId],
                (err, results) => {
                    if (err) throw err;
                    //extract topic names from the result
                    const topicNamesList = results[0].map(row => row.name);
                    //add topicNamesList to newData
                    newData = Object.assign({}, newData, { topicNamesList });
                    res.render("users.ejs", newData);
            });
        });
    });

    //similar to /topics/:topicid, this one pulls all of a given user's posts. 
    app.get('/users/:user', isAuthenticated, function(req, res) {

        //this first query works to gegt all user information based on username
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
                res.status(404).render('404.ejs', Object.assign({}, renderData, {sessionData:req.session}));
            }

            //pass in all relevant data for ejs template render.
            let newData = Object.assign({}, renderData, {sessionData:req.session, results});

            //this second query just pulls lal posts data needed based on username
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
                    res.status(404).render('404.ejs', Object.assign({}, renderData, {sessionData:req.session}));
                }

                //pass in all relevant data for ejs template render.
                newData = Object.assign({}, newData, {user:results});

                db.query(
                    'CALL GetUserTopics(?);',
                    [req.session.userId],
                    (err, results) => {
                        if (err) throw err;
                        //extract topic names from the result
                        const topicNamesList = results[0].map(row => row.name);
                        //add topicNamesList to newData
                        newData = Object.assign({}, newData, { topicNamesList });
                        res.render("user.ejs", newData);
                });
            });
        });
    });

    //renders create a post view, automatically adds the topic to create a post in if appropriate
    app.get('/create/:topic?', isAuthenticated, function(req, res) {
        let newData;
        let selectedTopic = req.params.topic || '-'; //shorthand, use '-' if no topic is specified
    
        newData = Object.assign({}, renderData, {sessionData:req.session, topic:selectedTopic});
    
        //query return list of all existing topic alphabetically. this is later used in /post to help verify whether a topic already exists or whther we need to create one
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
                res.status(404).render('404.ejs', Object.assign({}, renderData, {sessionData:req.session}));
            }
    
            //pass in all relevant data for ejs template render.
            newData = Object.assign({}, newData, {allTopics});
    
            db.query(
                'CALL GetUserTopics(?);',
                [req.session.userId],
                (err, results) => {
                    if (err) throw err;
                    //extract topic names from the result
                    const topicNamesList = results[0].map(row => row.name);
                    //add topicNamesList to newData
                    newData = Object.assign({}, newData, {topicNamesList});
                    res.render("create.ejs", newData);
                }
            );
        });
    });
    
    //posts a new post, status is ok = topic exist, user follow, join = not followed yet, create = must create topic and follow.
    app.post('/post/:status', isAuthenticated, function(req, res) {

        if(req.params.status == "ok"){

            //query finds topic id we trying to create a post in
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
                    res.status(404).render('404.ejs', Object.assign({}, renderData, {sessionData:req.session}));
                }

                //query inserts post into posts
                let query = `
                    INSERT INTO
                        posts (context, topic_id, user_id)
                    VALUES
                        (?, ?, ?);
                `
                db.query(query, [req.body.context, topicID[0].id, req.session.userId], (err, posted) => {
                    if (err) {
                        res.status(404).render('404.ejs', Object.assign({}, renderData, {sessionData:req.session}));
                    }

                    //selects newly created posts id andd returns it so that we can then redirect to the newly created post. this is repeated in the rest of the if else chain
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
                            res.status(404).render('404.ejs', Object.assign({}, renderData, {sessionData:req.session}));
                        }

                        res.redirect(req.app.get('baseUrl')+"/posts/"+postID[postID.length-1].id);
                    });
                });
            });
        }
        //user must join topic before being able to post
        else if(req.params.status == "join"){

            //finds topic id
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
                    res.status(404).render('404.ejs', Object.assign({}, renderData, {sessionData:req.session}));
                }

                //inserts user into topic
                let query = `
                    INSERT INTO
                        members (topic_id, user_id)
                    VALUES
                        (?, ?);
                `

                db.query(query, [topicID[0].id, req.session.userId], (err) => {

                    if (err) {
                        res.status(404).render('404.ejs', Object.assign({}, renderData, {sessionData:req.session}));
                    }

                    //inserts users post into posts
                    let query = `
                        INSERT INTO
                            posts (context, topic_id, user_id)
                        VALUES
                            (?, ?, ?);
                    `
                    db.query(query, [req.body.context, topicID[0].id, req.session.userId], (err, posted) => {
                        if (err) {
                            res.status(404).render('404.ejs', Object.assign({}, renderData, {sessionData:req.session}));
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
                                res.status(404).render('404.ejs', Object.assign({}, renderData, {sessionData:req.session}));
                            }

                            res.redirect(req.app.get('baseUrl')+"/posts/"+postID[postID.length-1].id);
                        });
                    });
                });
            });
        }
        else if(req.params.status == "create"){
            //used a procedure for this one as this chain was not already very redundant;
            // it creates the new topic and returns its topic id (saved one db.query() lol)
            let query = `
                CALL CreateTopic(?);
            `

            db.query(query, [req.body.topic_name], (err, topicID) => {
                topicID[0].id = topicID[0][0].newTopicId;

                if (err) {
                    res.status(404).render('404.ejs', Object.assign({}, renderData, {sessionData:req.session}));
                }

                //inserts user into topic
                let query = `
                    INSERT INTO
                        members (topic_id, user_id)
                    VALUES
                        (?, ?);
                `

                db.query(query, [topicID[0].id, req.session.userId], (err) => {

                    if (err) {
                        res.status(404).render('404.ejs', Object.assign({}, renderData, {sessionData:req.session}));
                    }

                    //inserts users post into posts
                    let query = `
                        INSERT INTO
                            posts (context, topic_id, user_id)
                        VALUES
                            (?, ?, ?);
                    `
                    db.query(query, [req.body.context, topicID[0].id, req.session.userId], (err, posted) => {
                        if (err) {
                            res.status(404).render('404.ejs', Object.assign({}, renderData, {sessionData:req.session}));
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
                                res.status(404).render('404.ejs', Object.assign({}, renderData, {sessionData:req.session}));
                            }

                            res.redirect(req.app.get('baseUrl')+"/posts/"+postID[postID.length-1].id);
                        });
                    });
                });
            });
        }

    });

    //this one renders the user personal profile which allows them to edit or delete posts
    app.get('/profile', isAuthenticated, function(req, res) {
        //works the same as /users/:userid
        //pull all posts data from user
        //the difference is that his time it does it from the sessions user id to avoid users getting access to each others editable profiles
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
                res.status(404).render('404.ejs', Object.assign({}, renderData, {sessionData:req.session}));
            }

            //pass in all relevant data for ejs template render.
            let newData = Object.assign({}, renderData, {sessionData:req.session, results});

            //pulling all user info
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
                    res.status(404).render('404.ejs', Object.assign({}, renderData, {sessionData:req.session}));
                }
                //pass in all relevant data for ejs template render.
                newData = Object.assign({}, newData, {user:results});

                db.query(
                    'CALL GetUserTopics(?);',
                    [req.session.userId],
                    (err, results) => {
                        if (err) throw err;
                        //extract topic names from the result
                        const topicNamesList = results[0].map(row => row.name);
                        //add topicNamesList to newData
                        newData = Object.assign({}, newData, { topicNamesList, deleted:req.query.deleted });
                        res.render("profile.ejs", newData);
                });
            });
        });
    });

    //deletes a post...
    app.get('/delete/:postID', isAuthenticated, function(req, res) {

        //this query was interesting as i ensure that user's post is not a "topic starter" post.
        // so the CASE returns 0 or 1 depending on that
        let query = `
            SELECT
                CASE
                    WHEN COUNT(*) = 0 THEN 1 
                    ELSE 0                   
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
                res.status(404).render('404.ejs', Object.assign({}, renderData, {sessionData:req.session}));
            }

            //and then we delete post
            if(isFirstPost[0].isFirstPost == 0){
                let query = `
                    DELETE FROM posts WHERE id = ?;
                `;

                db.query(query, [req.params.postID], (err, results) => {
                    if (err) {
                        res.status(404).render('404.ejs', Object.assign({}, renderData, {sessionData:req.session}));
                    }

                    res.redirect(req.app.get('baseUrl')+'/profile?deleted=true')
                });
            }
            //or maybe we dont?
            else if(isFirstPost[0].isFirstPost == 1){

                //updates the posts data to remove user's reference to it
                let query = `
                    UPDATE posts SET user_id = NULL WHERE id = ?;
                `;

                db.query(query, [req.params.postID], (err, results) => {
                    if (err) {
                        res.status(404).render('404.ejs', Object.assign({}, renderData, {sessionData:req.session}));
                    }

                    res.redirect(req.app.get('baseUrl')+'/profile?deleted=true')
                });
            }
            else{
                res.status(404).render('404.ejs', Object.assign({}, renderData, {sessionData:req.session}));
            }
        });
    });

    //renders the 'edit' post view
    app.get('/edit/:postID', isAuthenticated, function(req, res) {

        //returns post data, the one that is being edited
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
                res.status(404).render('404.ejs', Object.assign({}, renderData, {sessionData:req.session}));
            }

            //verify user is creator of post. comparing posts username to session username
            if(result[0].username == req.session.username){
                let newData = Object.assign({}, renderData, {sessionData:req.session, results:result});

                db.query(
                    'CALL GetUserTopics(?);',
                    [req.session.userId],
                    (err, results) => {
                        if (err) throw err;
                        //extract topic names from the result
                        const topicNamesList = results[0].map(row => row.name);
                        //add topicNamesList to newData
                        newData = Object.assign({}, newData, { topicNamesList });
                        res.render("edit.ejs", newData);
                });
            }
            else{
                res.status(404).render('404.ejs', Object.assign({}, renderData, {sessionData:req.session}));
            }

        });
    });

    //updates the edited post
    app.post('/edit/submit/:postID', isAuthenticated, function(req, res) {

        //pulls the username to verify once again 
        let query = `
            SELECT
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
                res.status(404).render('404.ejs', Object.assign({}, renderData, {sessionData:req.session}));
            }

            //verify user is creator of post
            if(result[0].username == req.session.username){
                
                //update post data
                let query = `
                    UPDATE 
                        posts
                    SET 
                        context = ?
                    WHERE 
                        id = ?;
                `;
        
                db.query(query, [req.body.context, parseInt(req.params.postID)], (err, result) => {
                    if (err) {
                        console.error(err)
                        res.status(404).render('404.ejs', Object.assign({}, renderData, {sessionData:req.session}));
                    }

                    res.redirect(req.app.get('baseUrl')+"/posts/"+req.params.postID);
                });
            }
            else{
                res.status(404).render('404.ejs', Object.assign({}, renderData, {sessionData:req.session}));
            }

        });
    });

    //follows topic...
    app.get('/follow/:topic', isAuthenticated, function(req, res) {
        //takes in topic name (find id) and user id and then inserts user into topic (memebers table)
        let query = `
            INSERT INTO
                members (topic_id, user_id)
            VALUES
            ((SELECT id FROM topics WHERE name = ?), ?);
        `;

        db.query(query, [req.params.topic, req.session.userId], (err, result) => {
            if (err) {
                console.error(err)
                res.status(404).render('404.ejs', Object.assign({}, renderData, {sessionData:req.session}));
            }
            res.redirect(req.app.get('baseUrl')+"/topics/"+req.params.topic);
        });
    });

    //same thing but UPDATE is now DELETE
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
                res.status(404).render('404.ejs', Object.assign({}, renderData, {sessionData:req.session}));
            }
            res.redirect(req.app.get('baseUrl')+"/topics/"+req.params.topic);
        });
    });

    //searches posts, topics and users. seperately.
    app.get('/search', isAuthenticated, function(req, res) {

        //define a couple of variables to remove redundancy
        let type = req.query.resulttype;    //posts users or topics??
        let searchQuery = req.query.query;  //the search query

        let posts = [], topics = [],  users = []; //empty arrays for each, helps render view easily by reducing undefined errors

        //this fucntion simply renders the page, handles data that is required in each case below as well.
        let renderPage = function(newData) {
            // Function to render the page with the given data
            db.query(
                'CALL GetUserTopics(?);',
                [req.session.userId],
                (err, results) => {
                    if (err) throw err;
                    const topicNamesList = results[0].map(row => row.name);
                    newData = Object.assign({}, newData, { topicNamesList, searched:req.query.query, resulttype:req.query.resulttype });
                    res.render("search.ejs", newData);
                }
            );
        };
    
        //if user want to see them topics
        if (type == "topics") { //find topics

            //simple selects topics that are similar to s query
            let query = `
                SELECT
                    name AS topic_name
                FROM
                    topics
                WHERE
                    name LIKE ?;
            `;

            //the stuff surrounding the sql parameter ensure it is entered correctly
            db.query(query, [`%${searchQuery}%`], (err, topics) => {
                if (err) {
                    res.status(404).render('404.ejs', Object.assign({}, renderData, {sessionData:req.session}));
                }
                let newData = Object.assign({}, renderData, { sessionData: req.session, query:{posts, topics, users}});
                renderPage(newData);
            });

        //if user wants to search ursers list
        } else if (type == "users") {   //find users
            //adjusted query to search for users
            let query = `
                SELECT
                    username
                FROM
                    users
                WHERE
                    username LIKE ?;`;
            db.query(query, [`%${searchQuery}%`], (err, users) => {
                if (err) {
                    res.status(404).render('404.ejs', Object.assign({}, renderData, {sessionData:req.session}));
                }
                let newData = Object.assign({}, renderData, { sessionData: req.session, query:{posts, topics, users}});
                renderPage(newData);
            });

        //if none of the others, default to posts
        } else {

            //select posts and data needed
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
                    posts.context LIKE ?;`;

            db.query(query, [`%${searchQuery}%`], (err, posts) => {
                if (err) {
                    res.status(404).render('404.ejs', Object.assign({}, renderData, {sessionData:req.session}));
                }
                let newData = Object.assign({}, renderData, { sessionData: req.session, query:{posts, topics, users}});
                renderPage(newData);
                console.log(posts)
            });
        }
    });
    
    //simply redirects to a post
    app.get('/about', isAuthenticated, function(req, res) {

        res.redirect(req.app.get("baseUrl")+"/posts/1")

    });
}