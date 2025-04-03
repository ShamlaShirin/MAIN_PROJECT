document.addEventListener("DOMContentLoaded", function () {
    const chatButton = document.getElementById("chat-button");
    const chatContainer = document.getElementById("chat-container");
    const closeChat = document.getElementById("close-chat");
    const sendMessage = document.getElementById("send-message");
    const userMessageInput = document.getElementById("user-message");
    const chatMessages = document.getElementById("chat-messages");
    
    // Display welcome message when page loads
    appendMessage("Chatbot", "Hi there! How can I help you ?");
    
    chatButton.addEventListener("click", () => {
        chatContainer.style.display = "flex";
    });
    
    closeChat.addEventListener("click", () => {
        chatContainer.style.display = "none";
    });
    
    sendMessage.addEventListener("click", () => {
        sendUserMessage();
    });
    
    userMessageInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            sendUserMessage();
        }
    });
    
    function sendUserMessage() {
        const message = userMessageInput.value.trim();
        console.log("messagemessage",message)
        if (!message) return;
        
        appendMessage("You", message);
        userMessageInput.value = "";
        
        fetch("/chatbot", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ message }),
        })
            .then((response) => response.json())
            .then((data) => {
                console.log(data,"data")
                appendMessage("Chatbot", data.reply);
            })
            .catch((error) => {
                console.error("Error:", error);
                appendMessage("Chatbot", "Sorry, I couldn't process your request. Please try again.");
            });
    }
    
    function appendMessage(sender, message) {
        const messageElement = document.createElement("div");
        messageElement.className = sender === "You" ? "user-message message" : "bot-message message";
        
        // Convert URLs to clickable links
        message = convertUrlsToLinks(message);
        
        messageElement.innerHTML = message;
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function convertUrlsToLinks(text) {
        // Regular expression to match URLs
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        
        return text.replace(urlRegex, function(url) {
            return `<a href="${url}" target="_blank">${url}</a>`;
        });
    }
});