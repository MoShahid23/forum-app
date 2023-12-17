
//password warning
if(document.getElementById("lname-input")){
    firstClick = true;
    document.getElementById("password-input").addEventListener("click", function(){
        if(document.getElementById("lname-input")){
            if(firstClick){
                firstClick=false;
                alert("Note: This website is part of an assignment. Please be aware that any passwords entered here are not secured for privacy.");
            }
        }
    });
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

    if(title.value != ""){
        titleView.innerHTML = title.value;
    }
    else{
        titleView.innerHTML = "Title not entered";
    }

    if(body.value != ""){
        bodyView.innerHTML = body.value.split("\n").filter((line, index, array) => {
            //if the line is not empty or there is a non-empty line following
            return line.trim() !== "" || array.slice(index + 1).some(nextLine => nextLine.trim() !== "");
        }).join("<br>")
        .replaceAll("<*h>", "<h3>").replaceAll("<h*>", "</h3>")
        .replaceAll("<*l link = ", "<a href=").replaceAll("<l*>", "</a>");
    }
    else{
        bodyView.innerHTML = "Post body text not entered";
    }

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
    }else{
        console.log("false")
        document.getElementById("submitButton").innerText = "please fill in all the fields"
        document.getElementById("submitButton").style.backgroundColor = "red";
    }
}

if(document.getElementsByTagName("form").length>1 && document.getElementsByTagName("form")[1].classList.contains("create-post")){
    let existingTopics = [];
    for(option of document.querySelectorAll(".create-post option")){
        existingTopics.push(option.value);
    }

    let followedTopics = [];
    for(topic of document.querySelectorAll(".followed-topic")){
        followedTopics.push(topic.innerText.replaceAll("<", "").replaceAll(">", ""));
    }

    let baseUrl = document.querySelector('.create-post').action.replace("/create/", "");

    document.addEventListener("input",  displayPostPreview(followedTopics, existingTopics, baseUrl));
    document.addEventListener("click",  displayPostPreview(followedTopics, existingTopics, baseUrl));

    document.addEventListener("input", () => displayPostPreview(followedTopics, existingTopics, baseUrl));
    document.addEventListener("click", () => displayPostPreview(followedTopics, existingTopics, baseUrl));

    document.getElementById("insert-sub").addEventListener("click", function(){
        let body = document.getElementById("selectedBody");
        body.value = body.value+"\n"+"<*h> type sub-heading here... <j*>"
    });

    document.getElementById("insert-link").addEventListener("click", function(){
        let body = document.getElementById("selectedBody");
        body.value = body.value+"\n"+"<*l link = 'insert link in here'> type link name here... <l*>"
    });

    document.getElementById("submitButton").addEventListener("click", function(){
        let body = document.querySelector(".post-data");
        let topic = document.getElementById("selectedTopic");

        let selectedTopic = document.createElement('input');
        selectedTopic.type = 'hidden';
        selectedTopic.name = 'topic_name';
        selectedTopic.value = topic.value;

        let postContext = document.createElement('input');
        postContext.type = 'hidden';
        postContext.name = 'context';
        postContext.value = body.innerHTML;

        // Append the hidden input to the form
        document.querySelector('.create-post').appendChild(selectedTopic);
        document.querySelector('.create-post').appendChild(postContext);

        if( document.getElementById("submitButton").innerText != "please fill in all the fields"){
            document.querySelector('.create-post').submit();
        }
    })
}