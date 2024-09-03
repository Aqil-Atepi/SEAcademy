// Ensure the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    const items = document.querySelectorAll(".item");
    const kapals = document.querySelectorAll("#kapalcelam");

    // Add click event to each item
    items.forEach((item, index) => {
        item.addEventListener('click', function() {
            kapals[index].classList.add('animate-pew');
            console.log("Item clicked!");

            // Remove the animation after 3 seconds
            setTimeout(() => {
                kapals[index].classList.remove('animate-pew');
                console.log("Animation removed!");
            }, 3000);
        });
    });

    function createBubble() {
        // Create a new div for the bubble
        const bubbleContainer = document.querySelector(".effect");
        const bubble = document.createElement('div');
        bubble.classList.add('bubble');

        // Randomize the size and position of the bubble
        const size = Math.random() * 50 + 50 + 'px';
        bubble.style.width = size;
        bubble.style.height = size;
        bubble.style.left = Math.random() * 100 + '%';

        // Append the bubble to the container
        bubbleContainer.append(bubble);

        // Remove the bubble after animation ends
        setTimeout(() => {
            bubble.remove();
        }, 10000); // Match the duration of the rise animation
    }

    // Create bubbles at intervals
    setInterval(createBubble, 200);

    const sub = document.getElementById("logsub");

    sub.addEventListener('click', function(){
        console.log("Aku keklik");
    });
});
