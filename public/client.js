
if(document.querySelector("#deleteForm button")){
    //attaches event listener to the delete delte buttons on users profile. also pops up a confirmation before submitting thee request
    let delButtons = document.querySelectorAll("#deleteForm button");
    for(let delBtn of delButtons){
        delBtn.addEventListener("click", function(){
            var result = window.confirm("Are you sure you want to delete this post?");
            if (result) {
                delBtn.parentElement.submit();
            }
        });
    }
}


if(document.getElementsByClassName("dropdown")[0]){

    //if anything other than dropdown button is clicked, disable the drop down.
    document.addEventListener("click", function(){
        if(document.getElementsByClassName("dropdown")[0].classList.contains('active') && document.getElementsByClassName("dropbtn")[0] != document.activeElement){
            document.getElementsByClassName("dropdown")[0].classList.toggle('active');
        }
    })

    //if drop down button is clicked, activate  dropdown.
    document.getElementsByClassName("dropdown")[0].addEventListener("click", function(){
        document.getElementsByClassName("dropdown")[0].classList.toggle('active');
    })
}

let displayPostPreview = function(followed, existing, baseUrl){
    let topic = document.getElementById("selectedTopic");
    let title = document.getElementById("selectedTitle");
    let body = document.getElementById("selectedBody");

    let topicView = document.querySelector(".metadata-topic");
    let titleView = document.querySelector(".post-data h2");
    let bodyView = document.querySelector(".post-data .paragraph");

    //since i used the same bit of code for both creating and editing posts, some of it is only applicable when creating and so must be handled 
    try{
        if(topic.value != ""){
            topic.value = topic.value.replaceAll(" ", "");
            topic.value = topic.value.toLowerCase();
            topic.value = topic.value.replace(/[^a-z]/g, '');

            topicView.innerHTML = "&lt;"+topic.value+"&gt;"
            topicView.setAttribute("href", "/topics/"+topic.value);
        }
        else{
            topicView.innerHTML = "&lt;Topic not selected&gt;"
            topicView.setAttribute("href", "/topics/");
        }
    }
    catch{

    }

    if(title.value != ""){
        titleView.innerHTML = title.value;
    }
    else{
        titleView.innerHTML = "Title not entered";
    }

    //this part helps clean up the textarea's value to ensure text doesn't cause erors in db and also allows for the post formattiung to work.
    if(body.value != ""){
        bodyView.innerHTML = body.value
        .replaceAll("<*h>", "({(h3)})").replaceAll("<h*>", "({(/h3)})")
        .replaceAll("<*link=", "({(a href=").replaceAll("<l*>", "({(/a)})").replaceAll('">', '")})')
        .replaceAll("<", "&lt;").replaceAll("<", "&gt;")
        .replaceAll("({(", "<").replaceAll(")})", ">")
        .split("\n")
        .filter((line, index, array) => {
            //if the line is not empty or there is a non-empty line following
            return line.trim() !== "" || array.slice(index + 1).some(nextLine => nextLine.trim() !== "");
        }).join("<br>");
    }
    else{
        bodyView.innerHTML = "Post body text not entered";
    }

    //if creating a post
    if(!document.title.includes("Edit post")){
        //if all fields are filledd
        if(body.value!="" && topic.value!="" && title.value!=""){
            if(followed.includes(topic.value)){
                //yes can post
                document.querySelector('.create-post').action = baseUrl+"/post/ok"
                document.getElementById("submitButton").innerText = "create post?"
            }
            else if(!followed.includes(topic.value) && existing.includes(topic.value)){
                //yes u cna post but need join first
                document.querySelector('.create-post').action = baseUrl+"/post/join"
                document.getElementById("submitButton").innerText = "join topic and create post?"
            }
            else{
                //it doe not exist yet but u can post after create
                document.querySelector('.create-post').action = baseUrl+"/post/create"
                document.getElementById("submitButton").innerText = "create topic and post?"
            }
            document.getElementById("submitButton").style.backgroundColor = "yellowgreen";
        }else{ //ask to fill in fields
            document.getElementById("submitButton").innerText = "please fill in all the fields"
            document.getElementById("submitButton").style.backgroundColor = "red";
        }
    }else{ //editing post
        if(body.value!=""  && title.value!=""){
            document.getElementById("submitButton").style.backgroundColor = "yellowgreen";
            document.getElementById("submitButton").innerText = "Save edit"
        }else{
            document.getElementById("submitButton").innerText = "please fill in all the fields"
            document.getElemaentById("submitButton").style.backgroundColor = "red";
        }
    }

}

if(document.getElementsByTagName("form").length>1 && document.getElementsByTagName("form")[1].classList.contains("create-post")){
    //gets exisitng and followed topics from the html elemnts (the topic select thing and the sidebar)
    let existingTopics = [];
    for(option of document.querySelectorAll(".create-post option")){
        existingTopics.push(option.value);
    }

    let followedTopics = [];
    for(topic of document.querySelectorAll(".followed-topic")){
        followedTopics.push(topic.innerText.replaceAll("<", "").replaceAll(">", ""));
    }

    let baseUrl = document.querySelector('.create-post').action.replace("/post", "");
    
    //functions are atached, the arrays and basUrl are passed in
    document.addEventListener("input", () => displayPostPreview(followedTopics, existingTopics, baseUrl));
    document.addEventListener("click", () => displayPostPreview(followedTopics, existingTopics, baseUrl));

    //activate the functions once to read all the fields and change the actgion of the submit button on page load
    document.body.click();

    //insert formatting buttons and what they do
    document.getElementById("insert-sub").addEventListener("click", function(){
        let body = document.getElementById("selectedBody");
        body.value = body.value+'\n<*h> type sub-heading here... <h*>'
    });

    document.getElementById("insert-link").addEventListener("click", function(){
        let body = document.getElementById("selectedBody");
        body.value = body.value+'\n<*link="insert link in here"> type link name here... <l*>'
    });

    //stuff to do when post edit or create is submitted
    document.getElementById("submitButton").addEventListener("click", function(){
        let body = document.querySelector(".post-data");

        let postContext = document.createElement('input');
        postContext.type = 'hidden';
        postContext.name = 'context';
        postContext.value = body.innerHTML.replaceAll("'", "''");

        //append the hidden input to the form
        document.querySelector('.create-post').appendChild(postContext);

        //if creating a post also set topic
        if(!document.title.includes("Edit post")){
            let topic = document.getElementById("selectedTopic");

            let selectedTopic = document.createElement('input');
            selectedTopic.type = 'hidden';
            selectedTopic.name = 'topic_name';
            selectedTopic.value = topic.value;

            document.querySelector('.create-post').appendChild(selectedTopic);
        }

        //submit if everything is filled in
        if( document.getElementById("submitButton").innerText != "please fill in all the fields"){
            document.querySelector('.create-post').submit();
        }
    })
}

//activate sidebar about button 
if(document.querySelector(".subheading")){
    if(document.querySelector(".subheading").innerText == "discussify's post"){
        document.querySelector("#sidebar > a:nth-child(4)").classList.toggle("active")
    }
}
