// Ensure the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    const items = document.querySelectorAll(".item");
    const kapals = document.querySelectorAll("#kapalcelam");

    items.forEach((item, index) => {
        item.addEventListener('click', function() {
            // Add the class that triggers the animation to the corresponding kapal
            kapals[index].classList.add('animate-pew');
            console.log("Click!");

            setTimeout(() => {
                console.log("UnClick!");
                kapals[index].classList.remove('animate-pew');
            }, 3000);
        });
    });

    // Function to create a bubble
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
});
